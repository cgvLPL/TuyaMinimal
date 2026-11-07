// Minimal Tuya Cloud (OpenAPI) client for Vercel serverless functions.
// No dependencies: uses Node 18+ built-in fetch and crypto.
const crypto = require('crypto');

const HOSTS = {
  us: 'https://openapi.tuyaus.com',          // Western America
  'us-e': 'https://openapi-ueaz.tuyaus.com', // Eastern America
  eu: 'https://openapi.tuyaeu.com',          // Central Europe
  'eu-w': 'https://openapi-weaz.tuyaeu.com', // Western Europe
  cn: 'https://openapi.tuyacn.com',          // China
  in: 'https://openapi.tuyain.com',          // India
  sg: 'https://openapi-sg.iotbing.com'       // Singapore
};

class TuyaError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status || 502;
  }
}

function config() {
  const clientId = process.env.TUYA_CLIENT_ID;
  const secret = process.env.TUYA_CLIENT_SECRET;
  const uid = process.env.TUYA_UID;
  const region = (process.env.TUYA_REGION || 'us').toLowerCase();
  const host = HOSTS[region];
  if (!clientId || !secret || !uid) {
    throw new TuyaError('Server is missing TUYA_CLIENT_ID, TUYA_CLIENT_SECRET or TUYA_UID.', 'not_configured', 503);
  }
  if (!host) {
    throw new TuyaError('TUYA_REGION must be one of: ' + Object.keys(HOSTS).join(', '), 'not_configured', 503);
  }
  return { clientId, secret, uid, host };
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Tuya signature (HMAC-SHA256):
// stringToSign = METHOD \n sha256(body) \n (signed headers, empty) \n path?sortedQuery
// signed       = clientId + accessToken(if any) + t + nonce + stringToSign
function signRequest(cfg, { method, path, body, accessToken, t, nonce }) {
  const stringToSign = [method.toUpperCase(), sha256(body || ''), '', path].join('\n');
  const payload = cfg.clientId + (accessToken || '') + t + nonce + stringToSign;
  return crypto.createHmac('sha256', cfg.secret).update(payload, 'utf8').digest('hex').toUpperCase();
}

// Token cache lives as long as the warm serverless instance.
let tokenCache = null;
const TIMEOUT_MS = 8000;   // per request to Tuya

async function rawRequest(cfg, method, path, bodyObj, accessToken) {
  const body = bodyObj === undefined ? '' : JSON.stringify(bodyObj);
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const headers = {
    client_id: cfg.clientId,
    sign_method: 'HMAC-SHA256',
    t,
    nonce,
    sign: signRequest(cfg, { method, path, body, accessToken, t, nonce }),
    'Content-Type': 'application/json'
  };
  if (accessToken) headers.access_token = accessToken;

  // Give up after a few seconds so a slow Tuya answer can't hold the function (and the app) hostage.
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const timedOut = (e) => e && (e.name === 'TimeoutError' || e.name === 'AbortError');
  let res;
  try {
    res = await fetch(cfg.host + path, { method, headers, body: body || undefined, signal });
  } catch (e) {
    if (timedOut(e)) throw new TuyaError('Tuya Cloud took too long to answer. Try again in a moment.', 'timeout', 504);
    throw new TuyaError('Could not reach Tuya Cloud.', 'network');
  }
  let json;
  try {
    json = await res.json();
  } catch (e) {
    if (timedOut(e)) throw new TuyaError('Tuya Cloud took too long to answer. Try again in a moment.', 'timeout', 504);
    throw new TuyaError('Tuya Cloud sent an unreadable response (HTTP ' + res.status + ').', 'bad_response');
  }
  return json;
}

let tokenInFlight = null;
async function getToken(cfg, force) {
  if (!force && tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  if (!tokenInFlight) tokenInFlight = fetchToken(cfg).finally(() => { tokenInFlight = null; });
  return tokenInFlight;
}

async function fetchToken(cfg) {
  const json = await rawRequest(cfg, 'GET', '/v1.0/token?grant_type=1');
  if (!json.success) throw new TuyaError('Tuya rejected the API credentials: ' + json.msg, json.code, 502);
  const r = json.result;
  tokenCache = {
    token: r.access_token,
    expiresAt: Date.now() + Math.max(60, (r.expire_time || 3600) - 120) * 1000
  };
  return tokenCache.token;
}

// Authenticated call. Retries once if the cached token has gone stale.
async function call(method, path, bodyObj) {
  const cfg = config();
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getToken(cfg, attempt > 0);
    const json = await rawRequest(cfg, method, path, bodyObj, token);
    if (json.success) return json.result;
    const tokenProblem = json.code === 1010 || json.code === 1011 || json.code === 1012;
    if (tokenProblem && attempt === 0) { tokenCache = null; continue; }
    const status = json.code === 1106 ? 403 : 502;
    throw new TuyaError(json.msg || 'Tuya Cloud returned an error.', json.code, status);
  }
}

// Fetches the access token ahead of time (e.g. while the session is being checked), so the first
// real call doesn't wait for it. Errors are ignored here; the real call reports them.
function warm() {
  try { getToken(config()).catch(() => {}); } catch (e) { /* not configured */ }
}

module.exports = { call, config, signRequest, TuyaError, HOSTS, warm };
