// GET /api/state?homeId=... → homes, rooms, devices, scenes, automations
const { call, config } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const store = require('../_lib/store');

// The Tuya app saves a readable description next to actions it makes (IR remote buttons and AC
// settings are otherwise stored as raw IR codes). Pass a small copy along so the app can say what
// the action does. Only short text survives; codes and long blobs are dropped.
function actionDisplay(a) {
  const src = [a.extra_property, a.action_display_new, a.action_display, a.extraProperty, a.actionDisplayNew].find((v) => v && typeof v === 'object');
  if (!src) return undefined;
  const out = {};
  let n = 0;
  const keep = (v) => (typeof v === 'string' && v.length <= 40) || typeof v === 'number' || typeof v === 'boolean';
  for (const [k, v] of Object.entries(src)) {
    if (n >= 12 || typeof k !== 'string' || k.length > 40) break;
    if (keep(v)) { out[k] = v; n++; }
    else if (Array.isArray(v) && v.length <= 4 && v.every(keep)) { out[k] = v; n++; }
  }
  return n ? out : undefined;
}

const IR_HUBS = ['wnykq', 'hwktwkq'];  // universal IR remote / IR hub categories
// Categories that are certainly not IR blasters (so we don't probe them).
const NOT_HUBS = ['dj', 'dd', 'fwd', 'xdd', 'dc', 'tgq', 'gyd', 'kg', 'cz', 'pc', 'tdq', 'kt', 'wk', 'qn',
  'cl', 'clkg', 'fs', 'mcs', 'pir', 'ywbj', 'rqbj', 'sj', 'sp', 'ms', 'mal', 'sgbj', 'cs', 'jsq', 'xxj'];
const envHubs = () => String(process.env.TUYA_IR_HUB || '').split(',').map((x) => x.trim()).filter(Boolean);

// Reads AC settings reported on an infrared_ac device itself, if any.
function acStateFromStatus(statusList) {
  const st = {};
  for (const s of statusList || []) st[s.code] = s.value;
  const num = (...keys) => { for (const k of keys) if (st[k] != null && !Number.isNaN(Number(st[k]))) return Number(st[k]); return null; };
  const powerRaw = st.power ?? st.switch ?? st.Power;
  return {
    power: powerRaw === true || String(powerRaw) === '1' || String(powerRaw).toLowerCase() === 'true',
    mode: num('mode', 'M') ?? 0,
    temp: num('temp', 'T', 'temp_set') ?? 24,
    wind: num('wind', 'F', 'fan') ?? 0
  };
}
const IR_AC_CATEGORY = 5;              // Tuya IR category ID for air conditioners

function pickDevice(d, roomOf) {
  // Only forward what the app needs. Never forward local_key or IP details.
  const status = {};
  for (const s of d.status || []) status[s.code] = s.value;
  return {
    id: d.id,
    name: d.name,
    category: d.category,
    product: d.product_name || '',
    online: !!d.online,
    status,
    room: roomOf[d.id] || '',
    ir: d.ir || undefined,
    sensorOnly: d.sensorOnly || undefined
  };
}

// IR blasters: hide the hub itself and show each remote set up on it (AC, TV, fan...) instead.
async function expandIrRemotes(list, warnings) {
  const forced = envHubs();
  const hasRemotes = list.some((d) => String(d.category || '').startsWith('infrared'));
  const sure = (d) => IR_HUBS.includes(d.category) || forced.includes(d.id);
  // Known hub categories, hubs named in TUYA_IR_HUB, and (only if remotes exist) a few unknown devices.
  const hubs = list.filter((d) => sure(d) ||
    (hasRemotes && !NOT_HUBS.includes(d.category) && !String(d.category || '').startsWith('infrared'))).slice(0, 10);
  if (!hubs.length) return attachHubless(list);
  const byId = new Map(list.map((d) => [d.id, d]));
  const hide = new Set();
  const extra = [];

  await Promise.all(hubs.map(async (hub) => {
    let remotes;
    try {
      remotes = await remotesOf(hub.id);
    } catch (e) {
      if (sure(hub)) warnings.push('IR remotes for ' + hub.name + ': ' + e.message + '. Authorize the IR Control Hub service in your cloud project.');
      return;
    }
    if (!Array.isArray(remotes) || !remotes.length) return; // no remotes yet: keep showing the hub
    // Blasters with a built-in thermometer stay, but only as a source of readings.
    const reads = (hub.status || []).some((x) => ['va_temperature', 'va_humidity', 'temp_current', 'humidity_value'].includes(x.code));
    if (reads) hub.sensorOnly = true; else hide.add(hub.id);
    await Promise.all(remotes.map(async (r) => {
      const id = String(r.remote_id);
      const known = byId.get(id);
      const categoryId = Number(r.category_id);
      const category = (known && known.category) || 'infrared';
      const isAc = categoryId === IR_AC_CATEGORY || category === 'infrared_ac';
      const ir = { hub: hub.id, categoryId, remoteIndex: r.remote_index != null ? Number(r.remote_index) : null, ac: isAc,
        brand: r.brand_name ? String(r.brand_name).slice(0, 40) : null };
      if (isAc) {
        try {
          const st = await acStatus(hub.id, id);
          ir.state = {
            power: String(st.power) === '1',
            mode: Number(st.mode) || 0,
            temp: Number(st.temp) || 24,
            wind: Number(st.wind) || 0
          };
        } catch (e) {
          ir.state = acStateFromStatus(known && known.status);
        }
      }
      const device = Object.assign({}, known || { id, name: r.remote_name || 'Remote', category, status: [] }, {
        online: hub.online,
        ir,
        hubRoomFrom: hub.id
      });
      if (known) hide.add(id);
      extra.push(device);
    }));
  }));

  return attachHubless(list.filter((d) => !hide.has(d.id)).concat(extra));
}

// IR AC settings, shared for a few seconds between the early fetch and the real one.
const acStatus = (hubId, remoteId) =>
  cached('acst:' + hubId + ':' + remoteId, 3000, () => call('GET', `/v2.0/infrareds/${hubId}/remotes/${remoteId}/ac/status`));

// Starts the IR remote lookups as soon as the device list is in, so they run alongside the
// home, room and scene calls instead of after them. expandIrRemotes() then finds them ready.
function prefetchIr(list) {
  const forced = envHubs();
  const hasRemotes = list.some((d) => String(d.category || '').startsWith('infrared'));
  const hubs = list.filter((d) => IR_HUBS.includes(d.category) || forced.includes(d.id) ||
    (hasRemotes && !NOT_HUBS.includes(d.category) && !String(d.category || '').startsWith('infrared'))).slice(0, 10);
  for (const hub of hubs) {
    remotesOf(hub.id)
      .then((remotes) => {
        for (const r of Array.isArray(remotes) ? remotes : []) {
          if (Number(r.category_id) === IR_AC_CATEGORY) acStatus(hub.id, String(r.remote_id)).catch(() => {});
        }
      })
      .catch(() => {});
  }
}

// Remotes whose blaster wasn't found are still controllable through the standard instruction set.
function attachHubless(list) {
  return list.map((d) => {
    const cat = String(d.category || '');
    if (d.ir || !cat.startsWith('infrared')) return d;
    const ac = cat === 'infrared_ac';
    return Object.assign({}, d, { ir: { hub: null, categoryId: null, ac, state: ac ? acStateFromStatus(d.status) : undefined } });
  });
}

// Rooms, room membership, home membership and IR remote lists rarely change, so a warm server
// keeps them for a minute (shared with the access checks). That makes the full refresh faster.
const { cached, SLOW, clear: clearCache, persisted, forget, persistedKeys, flushPersisted } = require('../_lib/cache');
// How long remembered lookups stay good (they're also refreshed whenever they turn out wrong).
const KEEP_HOMES = 6 * 3600 * 1000, KEEP_ROOMS = 30 * 60 * 1000, KEEP_REMOTES = 6 * 3600 * 1000;
const ids = (list) => (Array.isArray(list) ? list : []).map((d) => ({ id: String(d.id || d.dev_id) }));
const remotesOf = (hubId) => persisted('p:remotes:' + hubId, KEEP_REMOTES, () => call('GET', `/v2.0/infrareds/${hubId}/remotes`)
  .then((list) => (Array.isArray(list) ? list : []).map((r) => ({ remote_id: r.remote_id, category_id: r.category_id,
    remote_index: r.remote_index, brand_name: r.brand_name, remote_name: r.remote_name }))));
const access = require('../_lib/access');

async function settle(promise, fallback) {
  try { return { value: await promise }; } catch (e) { return { value: fallback, error: e.message }; }
}

let lastFresh = 0;

// One home's devices, rooms (with each room's devices), scenes and automations, all started at once.
// Rooms are followed straight away by their device lists, without waiting for scenes.
function homeCalls(homeId) {
  const rooms = settle(persisted('p:rooms:' + homeId, KEEP_ROOMS, () => call('GET', `/v1.0/homes/${homeId}/rooms`)
    .then((r) => ({ rooms: (Array.isArray(r) ? r : (r && r.rooms) || []).map((x) => ({ room_id: x.room_id, name: x.name })) }))), {})
    .then(async (res) => {
      const raw = Array.isArray(res.value) ? res.value : ((res.value && res.value.rooms) || []);
      const list = raw.map((r) => ({ id: String(r.room_id), name: r.name }));
      const lists = await Promise.all(list.map((r) =>
        settle(persisted('p:roomdevs:' + homeId + ':' + r.id, KEEP_ROOMS, () => call('GET', `/v1.0/homes/${homeId}/rooms/${r.id}/devices`).then(ids)), [])));
      return { res, rooms: list, lists };
    });
  return {
    homeDevs: settle(persisted('p:homedevs:' + homeId, KEEP_ROOMS, () => call('GET', `/v1.0/homes/${homeId}/devices`).then(ids)), null),
    rooms,
    scenes: settle(call('GET', `/v1.0/homes/${homeId}/scenes`), []),
    autos: settle(call('GET', `/v1.0/homes/${homeId}/automations`), [])
  };
}

module.exports = handler(['GET'], async (req) => {
  const { uid } = config();
  // "Refresh now" skips the cache, but at most once every 15 seconds per server instance,
  // so repeated taps (or a stuck client) can't burn through the Tuya API allowance.
  if (req.query && req.query.fresh && Date.now() - lastFresh > 15000) { lastFresh = Date.now(); clearCache(); }
  const wanted = req.query && req.query.homeId ? requireId(String(req.query.homeId), 'home') : null;

  // Everything that doesn't depend on something else starts now, side by side:
  // the saved settings, the device list, the home list, and (when the app says which home it's
  // showing) that home's devices, rooms, scenes and automations. Before, these ran in 4–5 waves.
  const settingsP = store.enabled()
    ? store.getJSON('settings', { icons: {} }).then((v) => ({ value: v }), (e) => ({ error: e.message }))
    : Promise.resolve(null);
  const early = wanted && access.homeAllowed(req.user, wanted) ? homeCalls(wanted) : null;
  // Remembered IR remotes let the AC settings be fetched right away, not after two other lookups.
  persistedKeys('p:remotes:').then((list) => {
    for (const [key, remotes] of list) {
      const hubId = key.slice('p:remotes:'.length);
      for (const r of Array.isArray(remotes) ? remotes : []) {
        if (Number(r.category_id) === IR_AC_CATEGORY) acStatus(hubId, String(r.remote_id)).catch(() => {});
      }
    }
  }).catch(() => {});
  const [devices, homesRes] = await Promise.all([
    call('GET', `/v1.0/users/${uid}/devices`),
    settle(persisted('p:homes', KEEP_HOMES, () => call('GET', `/v1.0/users/${uid}/homes`)
      .then((list) => (Array.isArray(list) ? list : []).map((h) => ({ home_id: h.home_id, name: h.name })))), [])
  ]);
  prefetchIr(devices || []);
  const homes = (homesRes.value || []).map((h) => ({ id: String(h.home_id), name: h.name }))
    .filter((h) => access.homeAllowed(req.user, h.id));
  const home = homes.find((h) => h.id === wanted) || homes[0] || null;

  const warnings = [];
  if (homesRes.error) warnings.push('Homes: ' + homesRes.error);
  let rooms = [], scenes = [], automations = [];
  const roomOf = {};
  let inHome = null; // Set of device IDs that belong to the selected home

  if (home) {
    const hc = early && home.id === wanted ? early : homeCalls(home.id);
    const [homeDevsRes, roomData, scenesRes, autosRes] = await Promise.all([hc.homeDevs, hc.rooms, hc.scenes, hc.autos]);
    const roomsRes = roomData.res, lists = roomData.lists;
    for (const [label, r] of [['Rooms', roomsRes], ['Scenes', scenesRes], ['Automations', autosRes]]) {
      if (r.error) warnings.push(label + ': ' + r.error);
    }
    rooms = roomData.rooms;
    lists.forEach((l, i) => { for (const d of l.value || []) roomOf[d.id || d.dev_id] = rooms[i].name; });

    // A remembered home device list can be out of date (a device added in the Tuya app since).
    // If a live device isn't in any home we know of, look this home's list up again.
    if (Array.isArray(homeDevsRes.value)) {
      const known = new Set(homeDevsRes.value.map((d) => d.id || d.dev_id));
      for (const [, list] of await persistedKeys('p:homedevs:')) for (const d of Array.isArray(list) ? list : []) known.add(d.id);
      if ((devices || []).some((d) => !known.has(d.id) && !String(d.category || '').startsWith('infrared'))) {
        forget('p:homedevs:' + home.id);
        const again = await settle(persisted('p:homedevs:' + home.id, KEEP_ROOMS, () => call('GET', `/v1.0/homes/${home.id}/devices`).then(ids)), null);
        if (Array.isArray(again.value)) homeDevsRes.value = again.value;
      }
    }
    // The user's device list covers every home, so keep only this home's devices.
    if (Array.isArray(homeDevsRes.value)) {
      inHome = new Set(homeDevsRes.value.map((d) => d.id || d.dev_id));
    } else if (homes.length > 1) {
      // Fallback when the home-devices API isn't authorized: use room membership.
      inHome = new Set(Object.keys(roomOf));
      warnings.push('Home devices: ' + (homeDevsRes.error || 'unavailable') +
        '. Showing only devices assigned to a room in this home.');
    }

    scenes = (scenesRes.value || []).map((s) => ({
      id: String(s.scene_id),
      name: s.name || s.scene_name,
      actions: (s.actions || []).length,
      background: s.background || '',
      // Full action list, so scenes can be edited in the app.
      steps: (s.actions || []).map((a) => ({
        executor: a.action_executor,
        entity: a.entity_id || '',
        props: a.executor_property && typeof a.executor_property === 'object' ? a.executor_property : {},
        display: actionDisplay(a)
      }))
    }));
    // Conditions and actions come along (when Tuya includes them) so the app can say what each one does.
    automations = (autosRes.value || []).map((a) => ({
      id: String(a.automation_id), name: a.name, enabled: !!a.enabled,
      match_type: Number(a.match_type) || 1,
      conditions: (Array.isArray(a.conditions) ? a.conditions : []).slice(0, 10).map((c) => ({
        entity_type: Number(c.entity_type), entity_id: c.entity_id || '',
        entity_name: typeof c.entity_name === 'string' ? c.entity_name.slice(0, 60) : '',
        display: c.display && typeof c.display === 'object' ? c.display : {}
      })),
      actions: (Array.isArray(a.actions) ? a.actions : []).slice(0, 40).map((x) => ({
        action_executor: x.action_executor, entity_id: x.entity_id || '',
        executor_property: x.executor_property && typeof x.executor_property === 'object' ? x.executor_property : {},
        display: actionDisplay(x)
      }))
    }));
  }

  let homeDevices = (devices || []).filter((d) => !inHome || inHome.has(d.id));
  if (access.restricted(req.user)) {
    // A restricted member only ever gets devices proven to be in one of their homes.
    if (!home) { homeDevices = []; warnings.push('No homes are assigned to you yet. Ask an admin.'); }
    else {
      const allowed = await access.allowedDeviceIds(req.user);
      homeDevices = homeDevices.filter((d) => allowed.has(d.id));
    }
    scenes = home ? scenes : []; automations = home ? automations : [];
  }
  const irDevices = await expandIrRemotes(homeDevices, warnings);

  let settings = null;
  const st = await settingsP;
  if (st && st.error) warnings.push('Sync: ' + st.error);
  else if (st) {
    settings = st.value;
    // Only this home's card order goes out.
    const all = settings.order || {};
    settings.order = home && Array.isArray(all[home.id]) ? { [home.id]: all[home.id] } : {};
  }

  await flushPersisted();
  return {
    me: req.user,
    sync: store.enabled(),
    settings,
    homes,
    homeId: home ? home.id : null,
    rooms: rooms.map((r) => r.name),
    devices: irDevices.map((d) => {
      const out = pickDevice(d, roomOf);
      if (!out.room && d.hubRoomFrom) out.room = roomOf[d.hubRoomFrom] || '';
      return out;
    }),
    scenes,
    automations,
    warnings,
    at: Date.now()
  };
});
