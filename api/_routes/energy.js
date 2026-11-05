// GET /api/energy?deviceId=..&today=YYYYMMDD → energy use for plugs that measure power.
// Uses Tuya's data statistics for the add_ele data point: daily kWh for the last 7 days, and the total.
// Live watts/volts/amps come with the normal device status, so they aren't fetched here.
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const { cached } = require('../_lib/cache');
const access = require('../_lib/access');

const pad = (n) => String(n).padStart(2, '0');
function addDays(ymd, delta) {
  const d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8) + delta));
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
}
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

module.exports = handler(['GET'], async (req) => {
  const q = req.query || {};
  const deviceId = requireId(String(q.deviceId || ''), 'device');
  await access.requireDevice(req.user, deviceId);
  const today = /^\d{8}$/.test(String(q.today || '')) ? String(q.today) : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const start = addDays(today, -6);

  return cached('energy:' + deviceId + ':' + today, 5 * 60 * 1000, async () => {
    let days = null, total = null;
    try {
      const r = await call('GET', `/v1.0/devices/${deviceId}/statistics/days?code=add_ele&end_day=${today}&start_day=${start}`);
      const map = (r && r.days) || {};
      days = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(start, i);
        days.push({ day, kwh: num(map[day]) ?? 0 });
      }
    } catch (e) { /* this plug or project has no daily statistics */ }
    try {
      const r = await call('GET', `/v1.0/devices/${deviceId}/statistics/total?code=add_ele`);
      total = num(r && r.total);
    } catch (e) { /* no total */ }
    return {
      available: !!days || total != null,
      today: days ? days[days.length - 1].kwh : null,
      week: days ? Math.round(days.reduce((a, d) => a + d.kwh, 0) * 1000) / 1000 : null,
      days, total
    };
  });
});
