// POST /api/rename  { deviceId, code, name }  → renames one outlet of a multi-outlet device
const { call, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');
const store = require('../_lib/store');

module.exports = handler(['POST'], async (req, body) => {
  const deviceId = requireId(body.deviceId, 'device');
  if (!deviceId.startsWith('ew-')) await access.requireDevice(req.user, deviceId);
  const code = typeof body.code === 'string' && /^switch_(usb)?\d{1,2}$/.test(body.code) ? body.code : null;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!code) throw new TuyaError('Invalid outlet.', 'bad_request', 400);
  if (!name || name.length > 40) throw new TuyaError('Names must be 1 to 40 characters.', 'bad_request', 400);
  // eWeLink devices don't exist in Tuya, so the name can't go through Tuya's
  // multiple-name API. It's saved as an app-layer name that spec.js returns.
  if (deviceId.startsWith('ew-')) {
    const homeId = typeof body.homeId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.homeId) ? body.homeId : null;
    if (!homeId) throw new TuyaError('Invalid home.', 'bad_request', 400);
    access.requireHome(req.user, homeId);
    if (!store.enabled()) throw new TuyaError('Sync needs storage. See the README section "Sync and users".', 'no_storage', 503);
    const settings = await store.getJSON('settings', { icons: {} });
    const assigned = (settings.ewelinkHomes && settings.ewelinkHomes[homeId]) || [];
    if (!assigned.includes(deviceId)) throw new TuyaError('That eWeLink device is not assigned to this home.', 'forbidden', 403);
    settings.ewelinkNames = settings.ewelinkNames || {};
    settings.ewelinkNames[deviceId] = settings.ewelinkNames[deviceId] || {};
    settings.ewelinkNames[deviceId][code] = name;
    await store.setJSON('settings', settings);
    await activity.log(req, { kind: 'edit', homeId,
      text: 'renamed an outlet of ' + activity.deviceName(deviceId, body.deviceName) + ' to "' + activity.clean(name, 40) + '"' });
    return { ok: true, code, name };
  }
  await call('PUT', `/v1.0/devices/${deviceId}/multiple-name`, { identifier: code, name });
  await activity.log(req, { kind: 'edit', homeId: typeof body.homeId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.homeId) ? body.homeId : null,
    text: 'renamed an outlet of ' + activity.deviceName(deviceId, body.deviceName) + ' to "' + activity.clean(name, 40) + '"' });
  return { ok: true, code, name };
});
