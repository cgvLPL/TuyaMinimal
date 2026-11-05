// GET /api/status?ids=a,b,c → { at, devices: { id: { online, status } } }
// A light, single-request poll for live device states. The full /api/state call (homes, rooms,
// scenes...) runs less often; this one keeps switches and readings current between them.
const { call, config, TuyaError } = require('./_lib/tuya');
const { handler } = require('./_lib/http');

const ID = /^[A-Za-z0-9_-]{1,64}$/;

module.exports = handler(['GET'], async (req) => {
  const raw = String((req.query && req.query.ids) || '');
  const ids = raw ? raw.split(',').filter((x) => ID.test(x)) : [];
  if (ids.length > 300) throw new TuyaError('Too many devices.', 'bad_request', 400);
  const wanted = new Set(ids);
  const { uid } = config();
  const list = await call('GET', `/v1.0/users/${uid}/devices`);
  const devices = {};
  for (const d of list || []) {
    if (wanted.size && !wanted.has(d.id)) continue;
    const status = {};
    for (const s of d.status || []) status[s.code] = s.value;
    devices[d.id] = { online: !!d.online, status };
  }
  return { at: Date.now(), devices };
});
