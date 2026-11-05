// POST /api/login { password } → { token, user }
const { handler } = require('./_lib/http');
const auth = require('./_lib/auth');
const store = require('./_lib/store');

module.exports = handler(['POST'], async (req, body) => {
  const password = typeof body.password === 'string' ? body.password : '';
  const r = await auth.login(req, password);
  return Object.assign(r, { sync: store.enabled() });
}, { public: true });
