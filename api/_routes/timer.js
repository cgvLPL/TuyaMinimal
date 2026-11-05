// Device timers (Tuya cloud scheduled tasks), for "turn off in 30 min" and similar.
// GET  /api/timer?deviceId=..                      → { timers: [...] }
// POST /api/timer { op: 'add', deviceId, homeId, name, time: 'HH:MM', date: 'YYYYMMDD', timezone, power, functions }
// POST /api/timer { op: 'delete', deviceId, homeId, name, timerId }
const { call, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');

const bad = (m) => new TuyaError(m, 'bad_request', 400);
const CODE = /^switch(_led|_\d+|_usb\d+)?$/;

module.exports = handler(['GET', 'POST'], async (req, body) => {
  const q = req.method === 'GET' ? (req.query || {}) : body;
  const deviceId = requireId(String(q.deviceId || ''), 'device');
  await access.requireDevice(req.user, deviceId);

  if (req.method === 'GET') {
    const list = await call('GET', `/v2.0/cloud/timer/device/${deviceId}`);
    return {
      timers: (Array.isArray(list) ? list : []).map((t) => ({
        id: String(t.timer_id || t.time_id || ''), name: t.alias_name || '', time: t.time, date: t.date,
        loops: t.loops || '0000000', timezone: t.timezone_id || '', functions: t.functions || []
      })).filter((t) => t.id)
    };
  }

  const homeId = typeof body.homeId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.homeId) ? body.homeId : null;
  const name = activity.deviceName(deviceId, body.name);

  if (body.op === 'delete') {
    const timerId = requireId(String(body.timerId || ''), 'timer');
    try { await call('DELETE', `/v2.0/cloud/timer/device/${deviceId}/batch?timer_ids=${timerId}`); }
    catch (e) { await call('DELETE', `/v2.0/cloud/timer/device/${deviceId}?timer_ids=${timerId}`); }
    await activity.log(req, { kind: 'device', homeId, text: 'cancelled a timer on ' + name });
    return { ok: true };
  }

  if (body.op === 'add') {
    if (!/^\d{2}:\d{2}$/.test(String(body.time))) throw bad('Invalid time.');
    if (!/^\d{8}$/.test(String(body.date))) throw bad('Invalid date.');
    if (typeof body.timezone !== 'string' || !/^[A-Za-z_+\-\/0-9]{1,48}$/.test(body.timezone)) throw bad('Invalid time zone.');
    const fns = Array.isArray(body.functions) ? body.functions : [];
    if (!fns.length || fns.length > 8 || !fns.every((f) => f && CODE.test(f.code) && typeof f.value === 'boolean')) throw bad('Invalid timer action.');
    const on = !!body.power;
    const r = await call('POST', `/v2.0/cloud/timer/device/${deviceId}`, {
      alias_name: 'Home: turn ' + (on ? 'on' : 'off'), time: body.time, timezone_id: body.timezone,
      date: body.date, loops: '0000000', functions: fns.map((f) => ({ code: f.code, value: f.value }))
    });
    await activity.log(req, { kind: 'device', homeId, text: 'set ' + name + ' to turn ' + (on ? 'on' : 'off') + ' at ' + body.time });
    return { ok: true, timerId: r && (r.timer_id || r.time_id) ? String(r.timer_id || r.time_id) : null };
  }
  throw bad('Unknown operation.');
});
