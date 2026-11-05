const { TuyaError } = require('./tuya');
const auth = require('./auth');

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

// opts.public: no sign-in needed (only the login endpoint). opts.admin: admins only.
function handler(methods, fn, opts) {
  opts = opts || {};
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '));
        return send(res, 405, { error: 'Method not allowed.' });
      }
      if (!opts.public) {
        await auth.checkRate(req);
        const user = await auth.resolve(req);
        if (!user) {
          await auth.noteFail(req);
          return send(res, 401, { error: 'Please sign in again.', code: 'unauthorized' });
        }
        if (opts.admin && user.role !== 'admin') {
          return send(res, 403, { error: 'Only admins can do this.', code: 'forbidden' });
        }
        req.user = user;
      }
      const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
      const data = await fn(req, body);
      send(res, 200, data === undefined ? { ok: true } : data);
    } catch (e) {
      const status = e instanceof TuyaError ? e.status : 500;
      const message = e instanceof TuyaError ? e.message : 'Unexpected server error.';
      if (!(e instanceof TuyaError)) console.error(e);
      send(res, status, { error: message, code: e.code || 'server_error' });
    }
  };
}

function safeJson(text) {
  try { return JSON.parse(text); } catch (e) { return {}; }
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;
function requireId(value, label) {
  if (typeof value !== 'string' || !ID.test(value)) {
    throw new TuyaError('Invalid ' + label + '.', 'bad_request', 400);
  }
  return value;
}

module.exports = { handler, requireId, send };
