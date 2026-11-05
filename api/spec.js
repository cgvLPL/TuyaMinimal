// GET /api/spec?deviceId=...  → value ranges, scales and modes for a device's controls
const { call } = require('./_lib/tuya');
const { handler, requireId } = require('./_lib/http');

function parse(values) {
  if (!values) return {};
  if (typeof values === 'object') return values;
  try { return JSON.parse(values); } catch (e) { return {}; }
}

module.exports = handler(['GET'], async (req) => {
  const deviceId = requireId(String((req.query && req.query.deviceId) || ''), 'device');
  const r = await call('GET', `/v1.0/devices/${deviceId}/specifications`);
  const out = {};
  for (const f of [...(r.status || []), ...(r.functions || [])]) {
    out[f.code] = Object.assign({ type: f.type }, parse(f.values), out[f.code] || {});
  }
  // Mark which codes can be written (functions) vs. only read (status).
  const writable = (r.functions || []).map((f) => f.code);
  return { deviceId, category: r.category, codes: out, writable };
});
