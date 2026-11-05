// Sign-in: the owner uses APP_PASSWORD; with storage set up, extra users each get their own password.
// Signing in returns a session token, so passwords aren't sent with every request.
const crypto = require('crypto');
const store = require('./store');
const { TuyaError } = require('./tuya');

const OWNER = { id: 'owner', name: process.env.OWNER_NAME || 'Owner', role: 'admin', owner: true };
const SESSION_DAYS = 180;
const MAX_FAILS = 10, FAIL_WINDOW = 15 * 60;

const sha = (t) => crypto.createHash('sha256').update(String(t)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 32);
  return 'scrypt$' + salt.toString('hex') + '$' + key.toString('hex');
}
function verifyPassword(pw, stored) {
  const [kind, saltHex, keyHex] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !saltHex || !keyHex) return false;
  const key = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 32);
  return crypto.timingSafeEqual(key, Buffer.from(keyHex, 'hex'));
}
const publicUser = (u) => ({ id: u.id, name: u.name, role: u.role, owner: !!u.owner, homes: Array.isArray(u.homes) ? u.homes : null });

async function listUsers() { return store.enabled() ? store.getJSON('users', []) : []; }
async function saveUsers(list) { await store.setJSON('users', list); }

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unknown';
}
async function checkRate(req) {
  if (!store.enabled()) return;
  if (await store.count('fail:' + clientIp(req)) >= MAX_FAILS) {
    throw new TuyaError('Too many wrong attempts. Try again in 15 minutes.', 'rate_limited', 429);
  }
}
async function noteFail(req) {
  if (store.enabled()) await store.incr('fail:' + clientIp(req), FAIL_WINDOW).catch(() => null);
}

function requireOwnerPassword() {
  if (!process.env.APP_PASSWORD) throw new TuyaError('Server is missing APP_PASSWORD.', 'not_configured', 503);
}

// Who is making this request? Returns a user or null.
async function resolve(req) {
  requireOwnerPassword();
  const given = String(req.headers['x-app-key'] || '');
  if (!given) return null;
  if (safeEqual(given, process.env.APP_PASSWORD)) return OWNER;
  if (given.startsWith('sess_') && store.enabled()) {
    const s = await store.getJSON('sess:' + sha(given).toString('hex'), null);
    if (s) {
      if (s.uid === 'owner') return OWNER;
      const u = (await listUsers()).find((x) => x.id === s.uid);
      if (u) return publicUser(u);
    }
  }
  return null;
}

async function login(req, password) {
  requireOwnerPassword();
  await checkRate(req);
  let user = null;
  if (password && safeEqual(password, process.env.APP_PASSWORD)) user = OWNER;
  else if (password) user = (await listUsers()).find((u) => verifyPassword(password, u.hash)) || null;
  if (!user) {
    await noteFail(req);
    throw new TuyaError('That password isn\'t right.', 'unauthorized', 401);
  }
  if (!store.enabled()) return { token: password, user: publicUser(user) }; // no storage: keep using the password
  const token = 'sess_' + crypto.randomBytes(32).toString('base64url');
  await store.setJSON('sess:' + sha(token).toString('hex'), { uid: user.id, at: Date.now() }, SESSION_DAYS * 86400);
  return { token, user: publicUser(user) };
}

async function logout(req) {
  const given = String(req.headers['x-app-key'] || '');
  if (given.startsWith('sess_') && store.enabled()) await store.del('sess:' + sha(given).toString('hex'));
}

module.exports = { OWNER, resolve, login, logout, hashPassword, verifyPassword, listUsers, saveUsers, publicUser, checkRate, noteFail, safeEqual };
