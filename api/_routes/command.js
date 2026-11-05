// POST /api/command  { deviceId, commands: [{ code, value }] }
const { call, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');

const CODE = /^[a-z0-9_]{1,48}$/;

module.exports = handler(['POST'], async (req, body) => {
  const deviceId = requireId(body.deviceId, 'device');
  await access.requireDevice(req.user, deviceId);
  const commands = Array.isArray(body.commands) ? body.commands : [];
  const isHsv = (v) => v && typeof v === 'object' && !Array.isArray(v) &&
    ['h', 's', 'v'].every((k) => Number.isInteger(v[k]) && v[k] >= 0 && v[k] <= 1000) && Object.keys(v).length === 3;
  const ok = commands.length > 0 && commands.length <= 12 && commands.every((c) =>
    c && CODE.test(c.code) && (
      (['boolean', 'number', 'string'].includes(typeof c.value) && (typeof c.value !== 'string' || c.value.length <= 64)) ||
      (/^colour_data(_v2)?$/.test(c.code) && isHsv(c.value))));
  if (!ok) throw new TuyaError('Invalid commands.', 'bad_request', 400);
  const result = await call('POST', `/v1.0/devices/${deviceId}/commands`, {
    commands: commands.map((c) => ({ code: c.code, value: typeof c.value === 'object' ? { h: c.value.h, s: c.value.s, v: c.value.v } : c.value }))
  });
  await activity.log(req, { kind: 'device', homeId: typeof body.homeId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.homeId) ? body.homeId : null,
    text: activity.describe(commands, activity.deviceName(deviceId, body.name)) });
  return { ok: result !== false };
});
