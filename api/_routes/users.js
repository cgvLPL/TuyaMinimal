// GET  /api/users                                   → list users (admins)
// POST /api/users { op: 'create', name, password, role }   (admins)
// POST /api/users { op: 'role', id, role }                  (admins)
// POST /api/users { op: 'delete', id }                      (admins)
// POST /api/users { op: 'password', current, password }     (any signed-in user except the owner)
const crypto = require('crypto');
const { handler, requireId } = require('../_lib/http');
const { TuyaError } = require('../_lib/tuya');
const auth = require('../_lib/auth');
const store = require('../_lib/store');
const activity = require('../_lib/activity');

const bad = (m) => new TuyaError(m, 'bad_request', 400);
const ROLES = ['admin', 'member'];

function checkPassword(pw, users, exceptId) {
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 128) throw bad('Passwords need at least 8 characters.');
  // Sign-in is by password only, so every password must be unique.
  if (auth.safeEqual(pw, process.env.APP_PASSWORD) || users.some((u) => u.id !== exceptId && auth.verifyPassword(pw, u.hash))) {
    throw bad('Choose a different password; that one is already in use.');
  }
}

module.exports = handler(['GET', 'POST'], async (req, body) => {
  if (!store.enabled()) throw new TuyaError('Users need storage. See the README section "Sync and users".', 'no_storage', 503);
  const users = await auth.listUsers();
  const isAdmin = req.user.role === 'admin';
  const list = () => ({ users: users.map(auth.publicUser) });

  if (req.method === 'GET') {
    if (!isAdmin) throw new TuyaError('Only admins can do this.', 'forbidden', 403);
    return list();
  }

  if (body.op === 'password') {
    if (req.user.owner) throw bad('The owner password is APP_PASSWORD; change it in Vercel.');
    const me = users.find((u) => u.id === req.user.id);
    if (!me || !auth.verifyPassword(String(body.current || ''), me.hash)) throw bad('Your current password isn\'t right.');
    checkPassword(body.password, users, me.id);
    me.hash = auth.hashPassword(body.password);
    await auth.saveUsers(users);
    await activity.log(req, { kind: 'people', text: 'changed their password' });
    return { ok: true };
  }

  if (!isAdmin) throw new TuyaError('Only admins can do this.', 'forbidden', 403);

  if (body.op === 'create') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 30) throw bad('Names must be 1 to 30 characters.');
    if (name.toLowerCase() === 'owner' || users.some((u) => u.name.toLowerCase() === name.toLowerCase())) throw bad('That name is taken.');
    if (users.length >= 20) throw bad('You can have up to 20 users.');
    const role = ROLES.includes(body.role) ? body.role : 'member';
    checkPassword(body.password, users, null);
    users.push({ id: 'u_' + crypto.randomBytes(6).toString('hex'), name, role, hash: auth.hashPassword(body.password), created: Date.now() });
    await auth.saveUsers(users);
    await activity.log(req, { kind: 'people', text: 'added ' + activity.clean(name, 30) + ' as ' + (role === 'admin' ? 'an admin' : 'a member') });
    return list();
  }

  const id = requireId(String(body.id || ''), 'user');
  const target = users.find((u) => u.id === id);
  if (!target) throw bad('That user doesn\'t exist anymore.');

  if (body.op === 'homes') {
    // null = every home; otherwise a list of home IDs. Applies to members (admins always see every home).
    if (body.homes === null) delete target.homes;
    else if (Array.isArray(body.homes) && body.homes.length <= 50 && body.homes.every((h) => /^[A-Za-z0-9_-]{1,64}$/.test(String(h)))) {
      target.homes = body.homes.map(String);
    } else throw bad('Invalid homes.');
    await auth.saveUsers(users);
    await activity.log(req, { kind: 'people', text: (target.homes ? 'limited ' + target.name + ' to ' + target.homes.length + (target.homes.length === 1 ? ' home' : ' homes') : 'gave ' + target.name + ' access to all homes') });
    return list();
  }
  if (body.op === 'role') {
    if (!ROLES.includes(body.role)) throw bad('Invalid role.');
    target.role = body.role;
    await auth.saveUsers(users);
    await activity.log(req, { kind: 'people', text: 'made ' + target.name + ' ' + (body.role === 'admin' ? 'an admin' : 'a member') });
    return list();
  }
  if (body.op === 'delete') {
    // Their sessions stop working immediately, because sessions are checked against this list.
    await auth.saveUsers(users.filter((u) => u.id !== id));
    await activity.log(req, { kind: 'people', text: 'removed ' + target.name });
    return { users: users.filter((u) => u.id !== id).map(auth.publicUser) };
  }
  throw bad('Unknown operation.');
});
