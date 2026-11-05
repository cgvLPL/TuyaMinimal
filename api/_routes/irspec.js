// GET /api/irspec?deviceId=.. → the commands an IR remote supports in scenes and automations
// (Tuya's standard instruction set for IR devices: PowerOn, PowerOff, T, M, F for ACs; keys for others).
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const { cached } = require('../_lib/cache');
const access = require('../_lib/access');

module.exports = handler(['GET'], async (req) => {
  const deviceId = requireId(String((req.query && req.query.deviceId) || ''), 'device');
  await access.requireDevice(req.user, deviceId);
  return cached('irspec:' + deviceId, 10 * 60 * 1000, async () => {
    try {
      const r = await call('GET', `/v2.0/iot-03/automations/infrared/devices/${deviceId}/specifications`);
      const modes = (r.mode_range || []).map((m) => Number(m.mode)).filter((m) => Number.isInteger(m));
      return {
        available: true, isAc: !!r.is_ac,
        functions: (r.functions || []).map((f) => ({ code: String(f.code), name: String(f.name || f.code) })).filter((f) => /^[A-Za-z0-9_+\-]{1,40}$/.test(f.code)),
        modes
      };
    } catch (e) {
      return { available: false, error: e.message };
    }
  });
});
