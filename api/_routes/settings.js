// GET  /api/settings              → shared settings (custom icons, card order)
// POST /api/settings { icons: { deviceId: iconKey | null } }   → merge and save
// POST /api/settings { order: { homeId, ids: [deviceId, ...] } } → save the card order for one home
// POST /api/settings { hidden: { homeId, ids: [deviceId, ...] } } → devices hidden from Home in one home
// POST /api/settings { shown: { homeId, ids: [deviceId, ...] } } → reading devices made visible on Home in one home
// POST /api/settings { floors: { homeId, list: [{ id, name }], room: { roomName: floorId } } } → the home's floors
const { handler } = require('../_lib/http');
const { TuyaError } = require('../_lib/tuya');
const store = require('../_lib/store');
const access = require('../_lib/access');

const DEV = /^[A-Za-z0-9_-]{1,64}$/, ICON = /^[a-z]{1,16}$/;

module.exports = handler(['GET', 'POST'], async (req, body) => {
  if (!store.enabled()) throw new TuyaError('Sync needs storage. See the README section "Sync and users".', 'no_storage', 503);
  const settings = await store.getJSON('settings', { icons: {} });
  settings.icons = settings.icons || {};
  settings.order = settings.order || {};
  settings.hidden = settings.hidden || {};
  settings.shown = settings.shown || {};
  settings.floors = settings.floors || {};
  if (req.method === 'GET') return settings;
  if (body.order && typeof body.order === 'object') {
    const homeId = String(body.order.homeId || '');
    if (!DEV.test(homeId)) throw new TuyaError('Unknown home.', 'bad_request', 400);
    access.requireHome(req.user, homeId);
    const ids = Array.isArray(body.order.ids) ? body.order.ids.filter((x) => typeof x === 'string' && DEV.test(x)) : null;
    if (!ids || ids.length > 500) throw new TuyaError('Bad order.', 'bad_request', 400);
    if (ids.length) settings.order[homeId] = Array.from(new Set(ids)); else delete settings.order[homeId];
  }
  if (body.hidden && typeof body.hidden === 'object') {
    const homeId = String(body.hidden.homeId || '');
    if (!DEV.test(homeId)) throw new TuyaError('Unknown home.', 'bad_request', 400);
    access.requireHome(req.user, homeId);
    const ids = Array.isArray(body.hidden.ids) ? body.hidden.ids.filter((x) => typeof x === 'string' && DEV.test(x)) : null;
    if (!ids || ids.length > 500) throw new TuyaError('Bad list of hidden devices.', 'bad_request', 400);
    if (ids.length) settings.hidden[homeId] = Array.from(new Set(ids)); else delete settings.hidden[homeId];
  }
  if (body.shown && typeof body.shown === 'object') {
    const homeId = String(body.shown.homeId || '');
    if (!DEV.test(homeId)) throw new TuyaError('Unknown home.', 'bad_request', 400);
    access.requireHome(req.user, homeId);
    const ids = Array.isArray(body.shown.ids) ? body.shown.ids.filter((x) => typeof x === 'string' && DEV.test(x)) : null;
    if (!ids || ids.length > 500) throw new TuyaError('Bad list of shown sensors.', 'bad_request', 400);
    if (ids.length) settings.shown[homeId] = Array.from(new Set(ids)); else delete settings.shown[homeId];
  }
  if (body.floors && typeof body.floors === 'object') {
    // Floors of one home: [{ id, name }] and which floor each room is on.
    const homeId = String(body.floors.homeId || '');
    if (!DEV.test(homeId)) throw new TuyaError('Unknown home.', 'bad_request', 400);
    access.requireHome(req.user, homeId);
    const FID = /^[a-z0-9]{1,16}$/;
    const list = (Array.isArray(body.floors.list) ? body.floors.list : []).slice(0, 12)
      .filter((f) => f && FID.test(String(f.id)) && typeof f.name === 'string' && f.name.trim())
      .map((f) => ({ id: String(f.id), name: f.name.trim().slice(0, 30) }));
    const room = {};
    const raw = body.floors.room && typeof body.floors.room === 'object' ? body.floors.room : {};
    Object.entries(raw).slice(0, 300).forEach(([r, id]) => {
      if (typeof r === 'string' && r.length <= 80 && list.some((f) => f.id === id)) room[r] = id;
    });
    if (list.length) settings.floors[homeId] = { list, room }; else delete settings.floors[homeId];
  }
  const changes = body.icons && typeof body.icons === 'object' ? body.icons : {};
  const entries = Object.entries(changes);
  if (entries.length > 100) throw new TuyaError('Too many changes at once.', 'bad_request', 400);
  for (const [id, key] of entries) {
    if (!DEV.test(id)) continue;
    if (key === null) delete settings.icons[id];
    else if (typeof key === 'string' && ICON.test(key)) settings.icons[id] = key;
  }
  await store.setJSON('settings', settings);
  return settings;
});
