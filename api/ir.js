// IR remotes set up on a Tuya IR blaster.
// GET  /api/ir?hubId=..&remoteId=..                      → keys of a non-AC remote
// POST /api/ir { hubId, remoteId, action: 'ac', power, mode, temp, wind }
// POST /api/ir { hubId, remoteId, action: 'key', categoryId, key, keyId }
const { call, TuyaError } = require('./_lib/tuya');
const { handler, requireId } = require('./_lib/http');

const int = (v, min, max, label) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new TuyaError('Invalid ' + label + '.', 'bad_request', 400);
  return n;
};

module.exports = handler(['GET', 'POST'], async (req, body) => {
  const q = req.method === 'GET' ? (req.query || {}) : body;
  const hubId = requireId(String(q.hubId || ''), 'IR blaster');
  const remoteId = requireId(String(q.remoteId || ''), 'remote');

  if (req.method === 'GET') {
    const r = await call('GET', `/v2.0/infrareds/${hubId}/remotes/${remoteId}/keys`);
    const keys = (r && r.key_list || []).map((k) => ({ key: k.key, keyId: k.key_id, name: k.key_name || k.key }));
    return { keys, categoryId: r && r.category_id != null ? Number(r.category_id) : null };
  }

  if (body.action === 'ac') {
    const cmd = {
      power: int(body.power, 0, 1, 'power'),
      mode: int(body.mode, 0, 4, 'mode'),
      temp: int(body.temp, 16, 32, 'temperature'),
      wind: int(body.wind, 0, 3, 'fan speed')
    };
    await call('POST', `/v2.0/infrareds/${hubId}/air-conditioners/${remoteId}/scenes/command`, cmd);
    return { ok: true, state: Object.assign(cmd, { power: cmd.power === 1 }) };
  }

  if (body.action === 'key') {
    const key = typeof body.key === 'string' && /^[A-Za-z0-9_+\-]{1,40}$/.test(body.key) ? body.key : null;
    if (!key) throw new TuyaError('Invalid key.', 'bad_request', 400);
    const payload = { category_id: int(body.categoryId, 0, 999, 'category'), key };
    if (body.keyId != null) payload.key_id = int(body.keyId, 0, 100000, 'key ID');
    await call('POST', `/v2.0/infrareds/${hubId}/remotes/${remoteId}/raw/command`, payload);
    return { ok: true };
  }

  throw new TuyaError('Unknown IR action.', 'bad_request', 400);
});
