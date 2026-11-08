// GET /api/status?ids=a,b,c[&ir=hubId:remoteId,...] → { at, devices: { id: { online, status } }, irac: { remoteId: { power, mode, temp, wind } } }
// IR air conditioners have no status of their own in the device list; their last settings (from any
// phone or the Tuya app) come from the IR hub, so another device's change shows here too.
// A light, single-request poll for live device states. The full /api/state call (homes, rooms,
// scenes...) runs less often; this one keeps switches and readings current between them.
const { call, config, TuyaError } = require('../_lib/tuya');
const { handler } = require('../_lib/http');
const access = require('../_lib/access');
const { cached } = require('../_lib/cache');

// Every open screen polls this. Within a couple of seconds they all share one Tuya call.
const STATUS_TTL = 2500;
// IR AC settings change less often; screens share one answer per AC for a few seconds.
const IR_TTL = 5000;

const ID = /^[A-Za-z0-9_-]{1,64}$/;

module.exports = handler(['GET'], async (req) => {
  const raw = String((req.query && req.query.ids) || '');
  const ids = raw ? raw.split(',').filter((x) => ID.test(x)) : [];
  if (ids.length > 300) throw new TuyaError('Too many devices.', 'bad_request', 400);
  const wanted = new Set(ids);
  const { uid } = config();
  const list = await cached('userdevs:' + uid, STATUS_TTL, () => call('GET', `/v1.0/users/${uid}/devices`));
  const allowed = await access.allowedDeviceIds(req.user);
  const devices = {};
  for (const d of list || []) {
    if (wanted.size && !wanted.has(d.id)) continue;
    if (allowed && !allowed.has(d.id)) continue;
    const status = {};
    for (const s of d.status || []) status[s.code] = s.value;
    devices[d.id] = { online: !!d.online, status };
  }
  const irac = {};
  const pairs = String((req.query && req.query.ir) || '').split(',').map((x) => x.split(':'))
    .filter((p) => p.length === 2 && ID.test(p[0]) && ID.test(p[1])).slice(0, 20);
  await Promise.all(pairs.map(async ([hub, remote]) => {
    if (allowed && !allowed.has(remote) && !allowed.has(hub)) return;
    try {
      const st = await cached('acst:' + hub + ':' + remote, IR_TTL, () => call('GET', `/v2.0/infrareds/${hub}/remotes/${remote}/ac/status`));
      if (st) irac[remote] = { power: String(st.power) === '1', mode: Number(st.mode) || 0, temp: Number(st.temp) || 24, wind: Number(st.wind) || 0 };
    } catch (e) { /* that AC just isn't updated this time */ }
  }));
  return { at: Date.now(), devices, irac };
});
