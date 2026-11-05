const crypto = require('crypto');
const { TuyaError } = require('./tuya');

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

// Every endpoint requires the APP_PASSWORD you set in Vercel.
// Without it, anyone who found your URL could control your devices.
function authorized(req) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    throw new TuyaError('Server is missing APP_PASSWORD.', 'not_configured', 503);
  }
  const given = String(req.headers['x-app-key'] || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function handler(methods, fn) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '));
        return send(res, 405, { error: 'Method not allowed.' });
      }
      if (!authorized(req)) {
        return send(res, 401, { error: 'Wrong app password.', code: 'unauthorized' });
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
