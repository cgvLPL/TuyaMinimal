// POST /api/command  { deviceId, commands: [{ code, value }] }
const { call, TuyaError } = require('./_lib/tuya');
const { handler, requireId } = require('./_lib/http');

const CODE = /^[a-z0-9_]{1,48}$/;

module.exports = handler(['POST'], async (req, body) => {
  const deviceId = requireId(body.deviceId, 'device');
  const commands = Array.isArray(body.commands) ? body.commands : [];
  const ok = commands.length > 0 && commands.length <= 12 && commands.every((c) =>
    c && CODE.test(c.code) && ['boolean', 'number', 'string'].includes(typeof c.value) &&
    (typeof c.value !== 'string' || c.value.length <= 64));
  if (!ok) throw new TuyaError('Invalid commands.', 'bad_request', 400);
  const result = await call('POST', `/v1.0/devices/${deviceId}/commands`, {
    commands: commands.map((c) => ({ code: c.code, value: c.value }))
  });
  return { ok: result !== false };
});
