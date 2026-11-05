// POST /api/logout → ends this device's session
const { handler } = require('./_lib/http');
const auth = require('./_lib/auth');

module.exports = handler(['POST'], async (req) => { await auth.logout(req); return { ok: true }; });
