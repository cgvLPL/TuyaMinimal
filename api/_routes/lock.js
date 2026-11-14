// Smart lock: remote unlock/lock, unlock history, guest (temporary) passwords.
// GET  /api/lock?deviceId=..                → { history: [...], passwords: [...] }
// POST /api/lock { op: 'unlock', deviceId } → { ok: true }
// POST /api/lock { op: 'lock', deviceId }   → { ok: true }
// Remote unlock is a two-step ticket flow: first get a password ticket, then open the
// door password-free with the ticket_id. No password encryption is needed for the
// password-free path. Creating a temporary (guest) password needs AES encryption of
// the new code with the ticket key, which is not verified against a real lock yet —
// so the guest-code list here is read-only. Remote locking only works on all-in-one
// Wi-Fi locks; other locks refuse the lock call and keep working by hand.
const { call, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');

const bad = (m) => new TuyaError(m, 'bad_request', 400);

const METHOD_LABEL = {
  unlock_fingerprint: 'Fingerprint',
  unlock_password: 'PIN code',
  unlock_temporary: 'Guest code',
  unlock_dynamic: 'Dynamic code',
  unlock_card: 'Card',
  unlock_face: 'Face',
  unlock_key: 'Key',
  unlock_identity_card: 'ID card',
  unlock_emergency: 'Emergency code',
  unlock_remote: 'Remote unlock',
  unlock_app: 'App unlock'
};

function toMs(v) {
  const n = Number(v);
  if (!n) return null;
  if (n > 1e12) return n;            // already milliseconds
  if (n > 1e9) return n * 1000;      // seconds
  return null;
}

function methodOf(log) {
  const raw = log && (typeof log.status === 'string' ? log.status : log.code || log.type || log.method || '');
  const code = String(raw || '');
  if (METHOD_LABEL[code]) return METHOD_LABEL[code];
  // The status sometimes arrives as a list of { code, value } pairs; take the unlock one.
  if (Array.isArray(log.status)) {
    const hit = log.status.find((s) => s && typeof s.code === 'string' && /^unlock_/.test(s.code));
    if (hit) return METHOD_LABEL[hit.code] || hit.code.replace(/^unlock_/, '').replace(/_/g, ' ');
  }
  return code ? code.replace(/^unlock_/, '').replace(/_/g, ' ') : 'Unlock';
}

async function ticket(deviceId) {
  const t = await call('POST', `/v1.0/devices/${deviceId}/door-lock/password-ticket`);
  const id = t && t.ticket_id ? String(t.ticket_id) : '';
  if (!id) throw new TuyaError('Tuya did not return an unlock ticket.', 'no_ticket', 502);
  return id;
}

module.exports = handler(['GET', 'POST'], async (req, body) => {
  const q = req.method === 'GET' ? (req.query || {}) : body;
  const deviceId = requireId(String(q.deviceId || ''), 'device');
  await access.requireDevice(req.user, deviceId);

  if (req.method === 'GET') {
    const now = Math.floor(Date.now() / 1000);
    const weekAgo = now - 7 * 24 * 3600;
    const logs = await call('GET', `/v1.0/devices/${deviceId}/door-lock/open-logs?page_no=1&page_size=20&start_time=${weekAgo}&end_time=${now}`);
    const list = Array.isArray(logs) ? logs : (logs && Array.isArray(logs.logs) ? logs.logs : []);
    const history = list.map((l) => ({
      at: toMs(l.time ?? l.event_time ?? l.create_time ?? l.timestamp),
      method: methodOf(l),
      detail: typeof l.user === 'string' ? l.user : (typeof l.name === 'string' ? l.name : '')
    })).filter((h) => h.at);
    // Guest codes are a bonus: if this lock does not support them, show the history alone.
    let passwords = [];
    try {
      const pw = await call('GET', `/v1.0/devices/${deviceId}/door-lock/temp-passwords`);
      const arr = Array.isArray(pw) ? pw : (pw && Array.isArray(pw.passwords) ? pw.passwords : []);
      passwords = arr.map((p) => ({
        id: String(p.password_id || p.id || ''),
        name: String(p.name || p.alias || p.password_name || ''),
        validFrom: toMs(p.effective_time ?? p.valid_from ?? p.start_time),
        validTo: toMs(p.invalid_time ?? p.valid_to ?? p.end_time),
        frozen: p.status === 'frozen' || p.freeze === true
      })).filter((p) => p.id);
    } catch (e) { passwords = []; }
    return { history, passwords };
  }

  const name = activity.deviceName(deviceId, body.name);
  if (body.op === 'unlock') {
    const tid = await ticket(deviceId);
    await call('POST', `/v1.0/devices/${deviceId}/door-lock/password-free/open-door`, { ticket_id: tid });
    await activity.log(req, { kind: 'device', text: 'unlocked ' + name + ' remotely' });
    return { ok: true };
  }
  if (body.op === 'lock') {
    const tid = await ticket(deviceId);
    await call('POST', `/v1.0/smart-lock/devices/${deviceId}/password-free/door-operate`, { ticket_id: tid, open: false });
    await activity.log(req, { kind: 'device', text: 'locked ' + name + ' remotely' });
    return { ok: true };
  }
  throw bad('Unknown operation.');
});
