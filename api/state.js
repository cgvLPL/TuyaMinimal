// GET /api/state?homeId=... → homes, rooms, devices, scenes, automations
const { call, config } = require('./_lib/tuya');
const { handler, requireId } = require('./_lib/http');

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
      remotes = await call('GET', `/v2.0/infrareds/${hub.id}/remotes`);
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
      const ir = { hub: hub.id, categoryId, remoteIndex: r.remote_index != null ? Number(r.remote_index) : null, ac: isAc };
      if (isAc) {
        try {
          const st = await call('GET', `/v2.0/infrareds/${hub.id}/remotes/${id}/ac/status`);
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

// Remotes whose blaster wasn't found are still controllable through the standard instruction set.
function attachHubless(list) {
  return list.map((d) => {
    const cat = String(d.category || '');
    if (d.ir || !cat.startsWith('infrared')) return d;
    const ac = cat === 'infrared_ac';
    return Object.assign({}, d, { ir: { hub: null, categoryId: null, ac, state: ac ? acStateFromStatus(d.status) : undefined } });
  });
}

async function settle(promise, fallback) {
  try { return { value: await promise }; } catch (e) { return { value: fallback, error: e.message }; }
}

module.exports = handler(['GET'], async (req) => {
  const { uid } = config();
  const [devices, homesRes] = await Promise.all([
    call('GET', `/v1.0/users/${uid}/devices`),
    settle(call('GET', `/v1.0/users/${uid}/homes`), [])
  ]);
  const homes = (homesRes.value || []).map((h) => ({ id: String(h.home_id), name: h.name }));
  const wanted = req.query && req.query.homeId ? requireId(String(req.query.homeId), 'home') : null;
  const home = homes.find((h) => h.id === wanted) || homes[0] || null;

  const warnings = [];
  if (homesRes.error) warnings.push('Homes: ' + homesRes.error);
  let rooms = [], scenes = [], automations = [];
  const roomOf = {};
  let inHome = null; // Set of device IDs that belong to the selected home

  if (home) {
    const [homeDevsRes, roomsRes, scenesRes, autosRes] = await Promise.all([
      settle(call('GET', `/v1.0/homes/${home.id}/devices`), null),
      settle(call('GET', `/v1.0/homes/${home.id}/rooms`), {}),
      settle(call('GET', `/v1.0/homes/${home.id}/scenes`), []),
      settle(call('GET', `/v1.0/homes/${home.id}/automations`), [])
    ]);
    for (const [label, r] of [['Rooms', roomsRes], ['Scenes', scenesRes], ['Automations', autosRes]]) {
      if (r.error) warnings.push(label + ': ' + r.error);
    }
    const rawRooms = Array.isArray(roomsRes.value) ? roomsRes.value : (roomsRes.value.rooms || []);
    rooms = rawRooms.map((r) => ({ id: String(r.room_id), name: r.name }));
    const lists = await Promise.all(rooms.map((r) =>
      settle(call('GET', `/v1.0/homes/${home.id}/rooms/${r.id}/devices`), [])));
    lists.forEach((l, i) => { for (const d of l.value || []) roomOf[d.id || d.dev_id] = rooms[i].name; });

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
        props: a.executor_property && typeof a.executor_property === 'object' ? a.executor_property : {}
      }))
    }));
    automations = (autosRes.value || []).map((a) => ({
      id: String(a.automation_id), name: a.name, enabled: !!a.enabled
    }));
  }

  const homeDevices = (devices || []).filter((d) => !inHome || inHome.has(d.id));
  const irDevices = await expandIrRemotes(homeDevices, warnings);

  return {
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
