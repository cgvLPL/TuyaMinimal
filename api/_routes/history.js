// GET /api/history?deviceId=..&codes=va_temperature,va_humidity&hours=24|168
// → { series: { code: { scale, points: [[t, v], ...] } } }  (raw values; the app applies the scale)
// Built from the device's status report log and averaged into at most ~120 points per series.
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const { cached, SLOW } = require('../_lib/cache');
const access = require('../_lib/access');
const { reportLogs } = require('../_lib/logs');

const ALLOWED = /^(va_temperature|temp_current|va_humidity|humidity_value|co2_value|pm25_value|cur_power)$/;

module.exports = handler(['GET'], async (req) => {
  const q = req.query || {};
  const deviceId = requireId(String(q.deviceId || ''), 'device');
  await access.requireDevice(req.user, deviceId);
  const codes = String(q.codes || '').split(',').filter((c) => ALLOWED.test(c)).slice(0, 3);
  const hours = Number(q.hours) === 168 ? 168 : 24;
  const end = Date.now(), start = end - hours * 3600000;
  return cached('history:' + deviceId + ':' + codes.join(',') + ':' + hours, 5 * 60 * 1000, async () => {
    let spec = {};
    try {
      spec = await cached('spec:' + deviceId, SLOW, async () => {
        const r = await call('GET', `/v1.0/devices/${deviceId}/specifications`);
        const out = {};
        for (const f of [...(r.status || []), ...(r.functions || [])]) {
          let v = f.values; if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = {}; } }
          out[f.code] = v || {};
        }
        return out;
      });
    } catch (e) { /* defaults */ }
    const series = {}, reasons = [];
    for (const code of codes) {
      try {
        const logs = await reportLogs(deviceId, code, start, end, hours === 168 ? 40 : 15);
        const buckets = 120, size = (end - start) / buckets, sums = new Array(buckets).fill(0), counts = new Array(buckets).fill(0);
        for (const l of logs) {
          const b = Math.min(buckets - 1, Math.max(0, Math.floor((l.t - start) / size)));
          sums[b] += l.v; counts[b]++;
        }
        const points = [];
        for (let b = 0; b < buckets; b++) if (counts[b]) points.push([Math.round(start + (b + 0.5) * size), sums[b] / counts[b]]);
        series[code] = { scale: typeof (spec[code] || {}).scale === 'number' ? spec[code].scale : null, points };
      } catch (e) { reasons.push(code + ': ' + e.message); }
    }
    return { hours, start, end, series, reasons };
  });
});
