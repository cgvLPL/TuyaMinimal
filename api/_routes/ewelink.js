// eWeLink account link (2.93.00).
// GET  /api/ewelink            → { linked, appConfigured }
// POST /api/ewelink { action: 'auth-url' }                   → { url } (admin)
// POST /api/ewelink { action: 'exchange', code, region }     → { ok, linked } (admin)
// POST /api/ewelink { action: 'unlink' }                     → { ok } (admin)
// POST /api/ewelink { action: 'devices' }                    → { devices: [{ id, name, online, room, homeId }] }
const { handler } = require('../_lib/http');
const { TuyaError } = require('../_lib/tuya');
const ew = require('../_lib/ewelink');
const store = require('../_lib/store');

const REGIONS = ['as', 'us', 'eu', 'cn'];

function needAdmin(req) {
  if (!req.user || req.user.role !== 'admin') throw new TuyaError('Only admins can do this.', 'forbidden', 403);
}

// ew-<deviceid> → the Tuya home it's assigned to (or nothing).
async function deviceAssignments() {
  let s;
  try { s = await store.getJSON('settings', { icons: {} }); } catch (e) { s = { icons: {} }; }
  const homes = (s && s.ewelinkHomes) || {};
  const byId = {};
  for (const [homeId, ids] of Object.entries(homes)) {
    for (const id of Array.isArray(ids) ? ids : []) byId[id] = homeId;
  }
  return byId;
}

module.exports = handler(['GET', 'POST'], async (req, body) => {
  if (req.method === 'GET') {
    return { linked: await ew.isLinked(), appConfigured: ew.isConfigured(), mode: ew.mode() };
  }
  const action = body && body.action;
  if (action === 'devices') {
    const things = await ew.getAllThings();
    const assigned = await deviceAssignments();
    return {
      devices: things.map((t) => {
        const m = ew.mapThing(t);
        return { id: m.id, name: m.name, online: m.online, room: m.room, homeId: assigned[m.id] || null };
      })
    };
  }
  needAdmin(req);
  if (action === 'login') {
    if (ew.mode() !== 'unofficial') throw new TuyaError('This server uses the eWeLink sign-in page.', 'bad_request', 400);
    await ew.loginWithPassword();
    return { ok: true, linked: true };
  }
  if (action === 'auth-url') return { url: ew.authUrl() };
  if (action === 'exchange') {
    const code = typeof body.code === 'string' ? body.code : '';
    const region = REGIONS.includes(body.region) ? body.region : 'as';
    if (!code || code.length > 256) throw new TuyaError('Invalid authorization code.', 'bad_request', 400);
    await ew.exchangeCode(code, region);
    return { ok: true, linked: true };
  }
  if (action === 'unlink') {
    await ew.revoke();
    return { ok: true };
  }
  throw new TuyaError('Unknown action.', 'bad_request', 400);
});
