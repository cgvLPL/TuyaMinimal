// Device status report logs (Tuya keeps about 7 days on the free plan).
const { call } = require('./tuya');
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

// Pages through report logs for one code (query keys kept in alphabetical order for signing).
async function reportLogs(deviceId, code, start, end, maxPages) {
  const logs = [];
  let key = '';
  for (let page = 0; page < (maxPages || 30); page++) {
    const q = 'codes=' + code + '&end_time=' + end + (key ? '&last_row_key=' + encodeURIComponent(key) : '') + '&size=100&start_time=' + start;
    const r = await call('GET', `/v2.0/cloud/thing/${deviceId}/report-logs?${q}`);
    for (const l of (r && r.logs) || []) logs.push({ t: Number(l.event_time), v: num(l.value) });
    if (!r || !r.has_more || !r.last_row_key) break;
    key = r.last_row_key;
  }
  return logs.filter((l) => l.v != null && Number.isFinite(l.t)).sort((a, b) => a.t - b.t);
}


module.exports = { reportLogs };
