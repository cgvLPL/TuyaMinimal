// GET /api/spec?deviceId=...  → value ranges, scales and modes for a device's controls,
// plus custom names for multi-outlet devices (e.g. "Switch 1" renamed to "Lamp").
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');

function parse(values) {
  if (!values) return {};
  if (typeof values === 'object') return values;
  try { return JSON.parse(values); } catch (e) { return {}; }
}

// Tuya documents this endpoint under two spellings, so try both.
async function channelNames(deviceId) {
  for (const path of ['multiple-name', 'multiple-names']) {
    try {
      const list = await call('GET', `/v1.0/devices/${deviceId}/${path}`);
      const names = {};
      for (const n of list || []) {
        if (n && n.identifier && n.identifier !== 'main' && n.name) names[n.identifier] = String(n.name);
      }
      return names;
    } catch (e) { /* try the other spelling */ }
  }
  return {};
}

module.exports = handler(['GET'], async (req) => {
  const deviceId = requireId(String((req.query && req.query.deviceId) || ''), 'device');
  await access.requireDevice(req.user, deviceId);
  const r = await call('GET', `/v1.0/devices/${deviceId}/specifications`);
  const codes = {};
  for (const f of [...(r.status || []), ...(r.functions || [])]) {
    codes[f.code] = Object.assign({ type: f.type }, parse(f.values), codes[f.code] || {});
  }
  const writable = (r.functions || []).map((f) => f.code);
  const switchCount = Object.keys(codes).filter((c) => /^switch_(usb)?\d+$/.test(c)).length;
  const names = switchCount >= 2 ? await channelNames(deviceId) : {};
  return { deviceId, category: r.category, codes, writable, names };
});
