// POST /api/rename  { deviceId, code, name }  → renames one outlet of a multi-outlet device
const { call, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');

module.exports = handler(['POST'], async (req, body) => {
  const deviceId = requireId(body.deviceId, 'device');
  await access.requireDevice(req.user, deviceId);
  const code = typeof body.code === 'string' && /^switch_(usb)?\d{1,2}$/.test(body.code) ? body.code : null;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!code) throw new TuyaError('Invalid outlet.', 'bad_request', 400);
  if (!name || name.length > 40) throw new TuyaError('Names must be 1 to 40 characters.', 'bad_request', 400);
  await call('PUT', `/v1.0/devices/${deviceId}/multiple-name`, { identifier: code, name });
  await activity.log(req, { kind: 'edit', homeId: typeof body.homeId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.homeId) ? body.homeId : null,
    text: 'renamed an outlet of ' + activity.deviceName(deviceId, body.deviceName) + ' to "' + activity.clean(name, 40) + '"' });
  return { ok: true, code, name };
});
