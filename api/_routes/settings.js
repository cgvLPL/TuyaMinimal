// GET  /api/settings              → shared settings (custom icons, card order)
// POST /api/settings { icons: { deviceId: iconKey | null } }   → merge and save
// POST /api/settings { order: { homeId, ids: [deviceId, ...] } } → save the card order for one home
// POST /api/settings { hidden: { homeId, ids: [deviceId, ...] } } → devices hidden from Home in one home
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
