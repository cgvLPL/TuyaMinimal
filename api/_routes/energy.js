// GET /api/energy?deviceId=..&today=YYYYMMDD&tzo=<minutes east of UTC>
// Energy use for plugs that measure power, for the last 7 days. Tries, in order:
//   1. Tuya data statistics for add_ele (needs the product to have statistics configured)
//   2. The device's status report logs for add_ele (energy increments), summed per day
//   3. The report logs for cur_power (watts), integrated over time: an estimate
// Each step falls through when Tuya refuses it or has nothing, and the reasons are returned,
// so the app can say what to fix instead of just "not available".
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const { cached, SLOW } = require('../_lib/cache');
const access = require('../_lib/access');

const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
function addDays(ymd, delta) {
  const d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8) + delta));
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
}
// Local midnight of ymd, as a UTC timestamp, for a timezone offset in minutes east of UTC.
function startOf(ymd, tzo) { return Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)) - tzo * 60000; }
function localDay(ts, tzo) {
  const d = new Date(ts + tzo * 60000);
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
}
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const round3 = (x) => Math.round(x * 1000) / 1000;

async function specFor(deviceId) {
  return cached('spec:' + deviceId, SLOW, async () => {
    const r = await call('GET', `/v1.0/devices/${deviceId}/specifications`);
    const out = {};
    for (const f of [...(r.status || []), ...(r.functions || [])]) {
      let v = f.values;
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = {}; } }
      out[f.code] = v || {};
    }
    return out;
  });
}

// Pages through report logs for one code (query keys kept in alphabetical order for signing).
async function reportLogs(deviceId, code, start, end) {
  const logs = [];
  let key = '';
  for (let page = 0; page < 30; page++) {
    const q = 'codes=' + code + '&end_time=' + end + (key ? '&last_row_key=' + encodeURIComponent(key) : '') + '&size=100&start_time=' + start;
    const r = await call('GET', `/v2.0/cloud/thing/${deviceId}/report-logs?${q}`);
    for (const l of (r && r.logs) || []) logs.push({ t: Number(l.event_time), v: num(l.value) });
    if (!r || !r.has_more || !r.last_row_key) break;
    key = r.last_row_key;
  }
  return logs.filter((l) => l.v != null && Number.isFinite(l.t)).sort((a, b) => a.t - b.t);
}

function emptyDays(first) { return Array.from({ length: 7 }, (_, i) => ({ day: addDays(first, i), kwh: 0 })); }
function summary(days, total, source) {
  return {
    available: true, source,
    today: round3(days[days.length - 1].kwh),
    week: round3(days.reduce((a, d) => a + d.kwh, 0)),
    days: days.map((d) => ({ day: d.day, kwh: round3(d.kwh) })),
    total: total == null ? null : round3(total)
  };
}

module.exports = handler(['GET'], async (req) => {
  const q = req.query || {};
  const deviceId = requireId(String(q.deviceId || ''), 'device');
  await access.requireDevice(req.user, deviceId);
  const tzo = Math.max(-840, Math.min(840, parseInt(q.tzo, 10) || 0));
  const today = /^\d{8}$/.test(String(q.today || '')) ? String(q.today) : localDay(Date.now(), tzo);
  const first = addDays(today, -6);

  return cached('energy:' + deviceId + ':' + today + ':' + tzo, 5 * 60 * 1000, async () => {
    const reasons = [];
    let total = null;
    try { total = num((await call('GET', `/v1.0/devices/${deviceId}/statistics/total?code=add_ele`)).total); }
    catch (e) { reasons.push('Total: ' + e.message); }

    // 1. Daily statistics
    try {
      const r = await call('GET', `/v1.0/devices/${deviceId}/statistics/days?code=add_ele&end_day=${today}&start_day=${first}`);
      const map = (r && r.days) || {};
      const days = emptyDays(first).map((d) => ({ day: d.day, kwh: num(map[d.day]) || 0 }));
      if (days.some((d) => d.kwh > 0)) return summary(days, total, 'statistics');
      reasons.push('Daily statistics: no data');
    } catch (e) { reasons.push('Daily statistics: ' + e.message); }

    const start = startOf(first, tzo), end = Math.min(Date.now(), startOf(today, tzo) + DAY);
    let spec = {};
    try { spec = await specFor(deviceId); } catch (e) { /* use defaults */ }

    // 2. add_ele increments from the report log
    try {
      const sp = spec.add_ele || {};
      const scale = typeof sp.scale === 'number' ? sp.scale : 3;
      const toKwh = (v) => (v / Math.pow(10, scale)) / (String(sp.unit || '').toLowerCase() === 'wh' ? 1000 : 1);
      const logs = await reportLogs(deviceId, 'add_ele', start, end);
      if (logs.length) {
        const days = emptyDays(first);
        for (const l of logs) {
          const day = days.find((d) => d.day === localDay(l.t, tzo));
          if (day) day.kwh += toKwh(l.v);
        }
        return summary(days, total, 'logs');
      }
      reasons.push('Energy log: no reports in the last 7 days');
    } catch (e) { reasons.push('Energy log: ' + e.message); }

    // 3. Estimate from wattage reports
    try {
      const sp = spec.cur_power || {};
      const scale = typeof sp.scale === 'number' ? sp.scale : 1;
      const logs = await reportLogs(deviceId, 'cur_power', start - DAY, end); // a day earlier for the starting level
      if (logs.length) {
        const days = emptyDays(first);
        for (let i = 0; i < logs.length; i++) {
          const watts = logs[i].v / Math.pow(10, scale);
          const from = Math.max(logs[i].t, start);
          const to = Math.min(i + 1 < logs.length ? logs[i + 1].t : end, end);
          if (to <= from || watts <= 0) continue;
          // Split the interval across local days.
          let t = from;
          while (t < to) {
            const dayKey = localDay(t, tzo);
            const dayEnd = startOf(dayKey, tzo) + DAY;
            const seg = Math.min(to, dayEnd) - t;
            const day = days.find((d) => d.day === dayKey);
            if (day) day.kwh += (watts * seg) / 3600000 / 1000;
            t += seg;
          }
        }
        return summary(days, total, 'estimate');
      }
      reasons.push('Power log: no reports in the last 7 days');
    } catch (e) { reasons.push('Power log: ' + e.message); }

    if (total != null) return { available: true, source: 'total', today: null, week: null, days: null, total, reasons };
    return { available: false, reasons };
  });
});
