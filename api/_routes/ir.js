// IR remotes set up on a Tuya IR blaster ("Smart IR remote").
// GET  /api/ir?hubId=..&remoteId=..   → buttons of a non-AC remote
// POST /api/ir { hubId, remoteId, action: 'ac', power, mode, temp, wind, changed: [...] }
// POST /api/ir { hubId, remoteId, action: 'key', categoryId, key, keyId, std }
// hubId may be 'none' when the blaster couldn't be identified; then the remote is controlled
// through Tuya's standard instruction set for IR devices (PowerOn, PowerOff, T, M, F, ...).
const { call, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');

const int = (v, min, max, label) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new TuyaError('Invalid ' + label + '.', 'bad_request', 400);
  return n;
};
const KEY = /^[A-Za-z0-9_+\-]{1,40}$/;

async function deviceCommands(remoteId, commands) {
  return call('POST', `/v1.0/devices/${remoteId}/commands`, { commands });
}

// Standard-instruction AC control: send only what changed, so the AC doesn't beep four times.
async function acStandard(remoteId, cmd, changed) {
  if (!cmd.power) return deviceCommands(remoteId, [{ code: 'PowerOff', value: 'PowerOff' }]);
  const list = [];
  if (changed.includes('power')) list.push({ code: 'PowerOn', value: 'PowerOn' });
  if (changed.includes('mode')) list.push({ code: 'M', value: cmd.mode });
  if (changed.includes('temp')) list.push({ code: 'T', value: cmd.temp });
  if (changed.includes('wind')) list.push({ code: 'F', value: cmd.wind });
  if (!list.length) list.push({ code: 'T', value: cmd.temp });
  return deviceCommands(remoteId, list);
}

module.exports = handler(['GET', 'POST'], async (req, body) => {
  const q = req.method === 'GET' ? (req.query || {}) : body;
  const hubId = requireId(String(q.hubId || 'none'), 'IR blaster');
  const remoteId = requireId(String(q.remoteId || ''), 'remote');
  const viaHub = hubId !== 'none';
  await access.requireDevice(req.user, remoteId);

  if (req.method === 'GET') {
    if (viaHub) {
      try {
        const r = await call('GET', `/v2.0/infrareds/${hubId}/remotes/${remoteId}/keys`);
        const keys = (r && r.key_list || []).map((k) => ({ key: k.key, keyId: k.key_id, name: k.key_name || k.key }));
        return { keys, categoryId: r && r.category_id != null ? Number(r.category_id) : null };
      } catch (e) { /* fall back to the standard instruction set below */ }
    }
    const spec = await call('GET', `/v1.0/devices/${remoteId}/specifications`);
    const keys = (spec.functions || [])
      .filter((f) => KEY.test(f.code))
      .map((f) => ({ key: f.code, name: f.name || f.code, std: true }));
    return { keys, categoryId: null };
  }

  if (body.action === 'ac') {
    const cmd = {
      power: int(body.power, 0, 1, 'power'),
      mode: int(body.mode, 0, 4, 'mode'),
      temp: int(body.temp, 16, 32, 'temperature'),
      wind: int(body.wind, 0, 3, 'fan speed')
    };
    const changed = Array.isArray(body.changed) ? body.changed.filter((c) => ['power', 'mode', 'temp', 'wind'].includes(c)) : [];
    let route = 'hub';
    if (viaHub) {
      try {
        await call('POST', `/v2.0/infrareds/${hubId}/air-conditioners/${remoteId}/scenes/command`, cmd);
      } catch (e) {
        route = 'standard';
        try { await acStandard(remoteId, cmd, changed); } catch (e2) { throw e; }
      }
    } else {
      route = 'standard';
      await acStandard(remoteId, cmd, changed);
    }
    const MODES = ['Cool', 'Heat', 'Auto', 'Fan', 'Dry'];
    await activity.log(req, { kind: 'device', homeId: typeof body.homeId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.homeId) ? body.homeId : null,
      text: (cmd.power ? 'set ' + activity.deviceName(remoteId, body.name) + ' to ' + MODES[cmd.mode] + ', ' + cmd.temp + '°' : 'turned off ' + activity.deviceName(remoteId, body.name)) });
    return { ok: true, route, state: Object.assign({}, cmd, { power: cmd.power === 1 }) };
  }

  if (body.action === 'key') {
    const key = typeof body.key === 'string' && KEY.test(body.key) ? body.key : null;
    if (!key) throw new TuyaError('Invalid key.', 'bad_request', 400);
    if (body.std || !viaHub) {
      await deviceCommands(remoteId, [{ code: key, value: key }]);
      return { ok: true };
    }
    const payload = { category_id: int(body.categoryId, 0, 999, 'category'), key };
    if (body.keyId != null) payload.key_id = int(body.keyId, 0, 100000, 'key ID');
    await call('POST', `/v2.0/infrareds/${hubId}/remotes/${remoteId}/raw/command`, payload);
    return { ok: true };
  }

  throw new TuyaError('Unknown IR action.', 'bad_request', 400);
});
