// Minimal eWeLink Cloud (OpenAPI V2) client for Vercel serverless functions.
// No dependencies: uses Node 18+ built-in fetch and crypto.
// Mirrors api/_lib/tuya.js: env config, HMAC signing, fetch + 8 s timeout, error class.
const crypto = require('crypto');
const store = require('./store');
const { cached } = require('./cache');
const { TuyaError } = require('./tuya');

const HOSTS = {
  as: 'https://as-apia.coolkit.cc',   // Asia (Ray's account)
  us: 'https://us-apia.coolkit.cc',   // Americas
  eu: 'https://eu-apia.coolkit.cc',   // Europe
  cn: 'https://cn-apia.coolkit.cn'    // Mainland China
};
const AUTH_PAGE = 'https://c2ccdn.coolkit.cc/oauth/index.html';
// Where eWeLink sends the user back after authorizing. The client detects ?code= + region=
// on load and exchanges the code. No new serverless function file needed.
const REDIRECT_URL = 'https://tuya-minimal.vercel.app/';
const TOKEN_KEY = 'ewelink:token';
const TIMEOUT_MS = 8000;   // per request to eWeLink, like Tuya

// Two ways in:
//  - official: your own APPID/APPSECRET from the eWeLink Developer Center + OAuth.
//  - unofficial: sign in with the account email/password the way the eWeLink app
//    does, using the app's own (publicly known) credentials. No certification
//    needed, but it is not a supported interface and CoolKit can change it at any
//    time. Set EWELINK_EMAIL + EWELINK_PASSWORD on the server to use it; if both
//    are set the account login wins, and removing them falls back to the official
//    app. The first pair is authorized on the Asia host; the second is a fallback.
const APP_PAIRS = [
  { appid: 'R8Oq3y0eSZSYdKccHlrQzT1ACCOUT9Gv', secret: '1ve5Qk9GXfUhKAn1svnKwpAlxXkMarru' },
  { appid: 'oeVkj2lYFGnJu5XUtWisfW4utiN4u9Mq', secret: '6Nz4n0xA8s8qdxQf2GqurZj2Fs55FUvM' }
];

function mode() {
  if (process.env.EWELINK_EMAIL && process.env.EWELINK_PASSWORD) return 'unofficial';
  if (process.env.EWELINK_APPID && process.env.EWELINK_APPSECRET) return 'official';
  return null;
}

function isConfigured() {
  return mode() !== null;
}

function config() {
  const m = mode();
  if (m === 'unofficial') {
    // Env can override the app credentials; otherwise the app's own pairs.
    const pairs = (process.env.EWELINK_APPID && process.env.EWELINK_APPSECRET)
      ? [{ appid: process.env.EWELINK_APPID, secret: process.env.EWELINK_APPSECRET }, ...APP_PAIRS]
      : APP_PAIRS;
    return { mode: m, appid: pairs[0].appid, secret: pairs[0].secret, pairs, email: process.env.EWELINK_EMAIL, password: process.env.EWELINK_PASSWORD };
  }
  if (m === 'official') return { mode: m, appid: process.env.EWELINK_APPID, secret: process.env.EWELINK_APPSECRET };
  throw new TuyaError('eWeLink is not set up on the server yet.', 'not_configured', 503);
}

// The secret that signed a stored token (refresh calls must sign with the same app).
function secretForAppid(appid, cfg) {
  if (cfg && cfg.pairs) { const p = cfg.pairs.find((x) => x.appid === appid); if (p) return p.secret; }
  const p = APP_PAIRS.find((x) => x.appid === appid);
  if (p) return p.secret;
  return cfg && cfg.secret;
}

const NONCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function nonce() {
  let s = '';
  for (let i = 0; i < 8; i++) s += NONCE_CHARS[Math.floor(Math.random() * NONCE_CHARS.length)];
  return s;
}

// HMAC-SHA256 with the app secret, Base64. Doc example: HMAC('abc', 'ABC_123')
// → v1+mfNY2ukxswM8sZOTg99srZsVnUVv9DGXeav1096M=
function sign(secret, message) {
  return crypto.createHmac('sha256', secret).update(message, 'utf8').digest('base64');
}
// Authorize-page signature: the message is "clientId_seq".
function signAuth(appid, seq, secret) {
  return sign(secret, appid + '_' + seq);
}
// Signed pre-token calls. GET signs the parameters sorted alphabetically, joined with '&';
// POST signs the whole JSON body.
function signGet(secret, params) {
  const keys = Object.keys(params || {}).sort();
  return sign(secret, keys.map((k) => k + '=' + params[k]).join('&'));
}
function signPost(secret, body) {
  return sign(secret, typeof body === 'string' ? body : JSON.stringify(body));
}

// ---------- Token in the shared KV store (never sent to the client) ----------
async function loadToken() {
  try { return await store.getJSON(TOKEN_KEY, null); } catch (e) { return null; }
}
async function saveToken(tok) {
  await store.setJSON(TOKEN_KEY, tok);
}
async function clearToken() {
  try { await store.del(TOKEN_KEY); } catch (e) { /* already gone */ }
}
async function isLinked() {
  const tok = await loadToken();
  if (tok && tok.at) return true;
  // Account-login mode signs in on demand, so a configured server counts as linked.
  return mode() === 'unofficial';
}

// Sign in with the account email/password (unofficial mode). Tries each app
// credential pair; error 10004 means "wrong region" and carries the right one.
// Stores the token like the OAuth flow does, tagged with the app that issued it.
async function loginWithPassword(cfg) {
  cfg = cfg || config();
  if (cfg.mode !== 'unofficial') throw new TuyaError('Account login is not set up on the server.', 'not_configured', 503);
  const payload = { email: cfg.email, password: cfg.password, countryCode: '+86' };
  const body = JSON.stringify(payload);
  let region = 'as';
  let lastErr = null;
  for (const pair of cfg.pairs) {
    for (let hop = 0; hop < 2; hop++) {
      let res;
      try {
        res = await fetch(HOSTS[region] + '/v2/user/login', {
          method: 'POST',
          headers: { 'X-CK-Appid': pair.appid, 'X-CK-Nonce': nonce(), 'Content-Type': 'application/json', Authorization: 'Sign ' + signPost(pair.secret, body) },
          body, signal: AbortSignal.timeout(TIMEOUT_MS)
        });
      } catch (e) {
        if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw new TuyaError('eWeLink took too long to answer. Try again in a moment.', 'timeout', 504);
        throw new TuyaError('Could not reach eWeLink.', 'network');
      }
      let json;
      try { json = await res.json(); } catch (e) { throw new TuyaError('eWeLink sent an unreadable response (HTTP ' + res.status + ').', 'bad_response'); }
      if (json.error === 0 && json.data && json.data.at) {
        const d = json.data;
        const tok = {
          at: d.at, rt: d.rt || '', region: d.region || region,
          atExp: d.atExpiredTime || Date.now() + 29 * 864e5,
          rtExp: d.rtExpiredTime || Date.now() + 59 * 864e5,
          appid: pair.appid, apikey: (d.user && d.user.apikey) || '', mode: 'unofficial'
        };
        await saveToken(tok);
        return tok;
      }
      if (json.error === 10004 && json.data && json.data.region && HOSTS[json.data.region]) { region = json.data.region; continue; }
      if (json.error === 407) { lastErr = new TuyaError('eWeLink refused the app sign-in. It may have changed; the official link still works.', 407, 403); break; }
      if (json.error === 10014) throw new TuyaError('The eWeLink account or password on the server is wrong.', 10014, 401);
      lastErr = new TuyaError(json.msg || 'eWeLink sign-in failed.', json.error || 'bad_response', 502);
      break;
    }
  }
  throw lastErr || new TuyaError('eWeLink sign-in failed.', 'bad_response', 502);
}

// One request to eWeLink. `auth` is { sign: true } for pre-token calls (the
// Authorization header carries the HMAC of the body) or { bearer: token } for
// calls made with an access token. eWeLink answers { error, msg, data }; error 0 = ok.
async function rawRequest(cfg, host, method, path, bodyObj, auth) {
  const body = bodyObj === undefined ? '' : JSON.stringify(bodyObj);
  const headers = {
    'X-CK-Appid': cfg.appid,
    'X-CK-Nonce': nonce(),
    'Content-Type': 'application/json'
  };
  if (auth && auth.sign) headers.Authorization = 'Sign ' + signPost(cfg.secret, body);
  else if (auth && auth.bearer) headers.Authorization = 'Bearer ' + auth.bearer;
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const timedOut = (e) => e && (e.name === 'TimeoutError' || e.name === 'AbortError');
  let res;
  try {
    res = await fetch(host + path, { method, headers, body: body || undefined, signal });
  } catch (e) {
    if (timedOut(e)) throw new TuyaError('eWeLink took too long to answer. Try again in a moment.', 'timeout', 504);
    throw new TuyaError('Could not reach eWeLink.', 'network');
  }
  let json;
  try {
    json = await res.json();
  } catch (e) {
    if (timedOut(e)) throw new TuyaError('eWeLink took too long to answer. Try again in a moment.', 'timeout', 504);
    throw new TuyaError('eWeLink sent an unreadable response (HTTP ' + res.status + ').', 'bad_response');
  }
  if (typeof json.error !== 'number') throw new TuyaError('eWeLink sent an unreadable response.', 'bad_response', 502);
  if (json.error !== 0) {
    // Server-side only (no bodies or tokens): makes control failures diagnosable
    // from the runtime logs instead of guessing from the app's toast.
    console.error('eWeLink API error:', method, path, 'error', json.error, '-', json.msg || '');
    const msg = json.msg || 'eWeLink returned an error.';
    // 401/402: token problems. 407: this appid may not call that interface.
    // 412: free quota exceeded. 30017: the device's brand isn't authorized for this appid.
    if (json.error === 401 || json.error === 402) throw new TuyaError(msg, json.error, 401);
    if (json.error === 407) throw new TuyaError('This eWeLink app is not allowed to use that feature.', 407, 403);
    if (json.error === 412) throw new TuyaError('The free eWeLink allowance for this month is used up.', 412, 503);
    if (json.error === 30017) throw new TuyaError('This device\'s brand isn\'t authorized for this eWeLink app. It needs a brand-authorization letter from CoolKit.', 30017, 403);
    throw new TuyaError(msg, json.error, 502);
  }
  return json.data || {};
}

async function refreshToken(cfg, tok) {
  const signCfg = { appid: tok.appid || cfg.appid, secret: secretForAppid(tok.appid, cfg) };
  let data;
  try {
    data = await rawRequest(signCfg, HOSTS[tok.region] || HOSTS.as, 'POST', '/v2/user/refresh', { rt: tok.rt }, { sign: true });
  } catch (e) {
    if (e.code === 401 || e.code === 402) throw new TuyaError('Your eWeLink link expired. Link your account again in Me.', 'not_linked', 401);
    throw e;
  }
  const next = {
    at: data.at, rt: data.rt || tok.rt, region: tok.region,
    atExp: data.atExpiredTime || Date.now() + 29 * 864e5,
    rtExp: data.rtExpiredTime || Date.now() + 59 * 864e5,
    appid: tok.appid || cfg.appid, apikey: tok.apikey || '', mode: tok.mode || cfg.mode
  };
  await saveToken(next);
  return next;
}

// The access token, refreshed when it has (nearly) expired.
async function getAccessToken(cfg) {
  const tok = await loadToken();
  if (tok && tok.at && tok.atExp && tok.atExp > Date.now() + 60000) return tok;
  if (tok && tok.at && tok.rt) {
    try { return await refreshToken(cfg, tok); }
    catch (e) {
      if (cfg.mode === 'unofficial') return loginWithPassword(cfg);
      throw e;
    }
  }
  if (cfg.mode === 'unofficial') return loginWithPassword(cfg);
  throw new TuyaError('eWeLink is not linked. Link your account in Me.', 'not_linked', 401);
}

// Authenticated call. Retries once with a fresh token if eWeLink says the token is stale.
async function callAuthed(method, path, bodyObj) {
  const cfg = config();
  let tok = await getAccessToken(cfg);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const callCfg = tok.appid ? { appid: tok.appid, secret: cfg.secret } : cfg;
      return await rawRequest(callCfg, HOSTS[tok.region] || HOSTS.as, method, path, bodyObj, { bearer: tok.at });
    } catch (e) {
      if ((e.code === 401 || e.code === 402) && attempt === 0) {
        if (tok.rt) { try { tok = await refreshToken(cfg, tok); continue; } catch (e2) { if (cfg.mode !== 'unofficial') throw e2; } }
        if (cfg.mode === 'unofficial') { tok = await loginWithPassword(cfg); continue; }
      }
      throw e;
    }
  }
}

// The authorize URL the Link button opens. The user signs in on eWeLink's page and
// is sent back to REDIRECT_URL with ?code=...&region=... (the code is valid 30 s).
function authUrl() {
  const cfg = config();
  if (cfg.mode === 'unofficial') throw new TuyaError('This server signs in with the eWeLink account directly; there is no sign-in page.', 'bad_request', 400);
  const seq = String(Date.now());
  const q = new URLSearchParams({
    clientId: cfg.appid,
    seq,
    authorization: signAuth(cfg.appid, seq, cfg.secret),
    redirectUrl: REDIRECT_URL,
    grantType: 'authorization_code',
    state: nonce() + nonce(),
    nonce: nonce(),
    showQRCode: 'false'
  });
  return AUTH_PAGE + '?' + q.toString();
}

// Swap the authorize code for tokens and store them. The region comes back with the code.
async function exchangeCode(code, region) {
  const cfg = config();
  if (cfg.mode === 'unofficial') throw new TuyaError('This server signs in with the eWeLink account directly; there is no sign-in page.', 'bad_request', 400);
  const host = HOSTS[region] || HOSTS.as;
  const data = await rawRequest(cfg, host, 'POST', '/v2/user/oauth/token',
    { code, redirectUrl: REDIRECT_URL, grantType: 'authorization_code' }, { sign: true });
  if (!data.accessToken) throw new TuyaError('eWeLink did not return a token.', 'bad_response', 502);
  const tok = {
    at: data.accessToken, rt: data.refreshToken, region,
    atExp: data.atExpiredTime || Date.now() + 29 * 864e5,
    rtExp: data.rtExpiredTime || Date.now() + 59 * 864e5
  };
  await saveToken(tok);
  return tok;
}

// Take the link away on eWeLink's side too (best effort), then forget the stored token.
async function revoke() {
  const cfg = config();
  const tok = await loadToken();
  if (cfg.mode === 'official' && tok && tok.at) {
    try { await rawRequest(cfg, HOSTS[tok.region] || HOSTS.as, 'DELETE', '/v2/user/oauth/token', undefined, { bearer: tok.at }); } catch (e) { /* local unlink still stands */ }
  }
  await clearToken();
}

// GET /v2/family → homes with their rooms.
async function getFamilies() {
  const data = await callAuthed('GET', '/v2/family');
  return Array.isArray(data.familyList) ? data.familyList : [];
}

// GET /v2/device/thing?familyid=...&num=0 → all things in a family (paged past 30).
async function getThings(familyId) {
  let beginIndex = 0;
  const out = [];
  for (;;) {
    const data = await callAuthed('GET', '/v2/device/thing?familyid=' + encodeURIComponent(familyId) + '&num=0' + (beginIndex ? '&beginIndex=' + beginIndex : ''));
    const list = Array.isArray(data.thingList) ? data.thingList : [];
    out.push(...list);
    const total = typeof data.total === 'number' ? data.total : list.length;
    if (out.length >= total || !list.length) break;
    beginIndex = out.length;
  }
  return out;
}

// GET /v2/device/thing/status?type=1&id=...&params= (empty = all params).
async function getStatus(id) {
  const data = await callAuthed('GET', '/v2/device/thing/status?type=1&id=' + encodeURIComponent(id) + '&params=');
  return (data && data.params) || {};
}

// POST /v2/device/thing/status { type: 1, id, params }. Multi-channel devices
// reject a plain { switch } (eWeLink answers "device control failed") — they
// want { switches: [{ switch, outlet }] }. The device's own reported params
// (from the cached thing list) say which shape it speaks, so translate when the
// device reports switches but no switch. Unknown shape: send as-is.
async function setStatus(id, params) {
  let out = params;
  if (params && typeof params.switch === 'string') {
    const outlet = Number.isInteger(params.outlet) && params.outlet >= 0 ? params.outlet : 0;
    out = { switch: params.switch };
    try {
      const things = await getAllThings();
      const t = things.find((x) => x.deviceid === String(id));
      if (t && t.params && Array.isArray(t.params.switches) && typeof t.params.switch !== 'string') {
        out = { switches: [{ switch: params.switch, outlet }] };
      }
    } catch (e) { /* shape unknown: send the single-switch form */ }
  }
  await callAuthed('POST', '/v2/device/thing/status', { type: 1, id, params: out });
  return true;
}

// Every thing in every family, with its family and room names attached. Shared for ~30 s
// between the state, status and eWeLink routes, so a refresh cycle costs one list call.
async function getAllThings() {
  return cached('ewelink:things', 30000, async () => {
    const fams = await getFamilies();
    const all = [];
    for (const fam of fams) {
      const things = await getThings(String(fam.id));
      for (const t of things) {
        if (t.itemType === 3) continue;   // groups aren't devices
        const d = t.itemData || {};
        const room = (fam.roomList || []).find((r) => String(r.id) === String(d.family && d.family.roomid));
        // Learn real channel counts: generic firmware can report more channels
        // than the hardware has; the UIID is what the eWeLink app renders from.
        console.log('eWeLink thing:', String(d.deviceid || ''), 'uiid', d.extra && d.extra.uiid,
          'channels', d.params && Array.isArray(d.params.switches) ? d.params.switches.length : 1,
          'model', d.productModel || '');
        all.push({
          deviceid: String(d.deviceid || ''),
          name: d.name || '',
          brandName: d.brandName || '',
          productModel: d.productModel || '',
          uiid: d.extra && d.extra.uiid,
          online: !!d.online,
          params: (d.params && typeof d.params === 'object') ? d.params : {},
          familyId: String(fam.id),
          familyName: fam.name || '',
          roomId: room ? String(room.id) : '',
          roomName: room ? room.name : ''
        });
      }
    }
    return all;
  });
}

// Real channel counts by UIID. The eWeLink app renders each device from its
// UIID's template; generic firmware often reports MORE channels in
// params.switches than the hardware has (a dual-port adapter reporting 4).
// Entries are learned from live devices (see the thing log in getAllThings);
// unknown UIIDs use the reported count.
const CHANNELS_BY_UIID = {
  // 'uiid': channels
};
function channelCap(uiid) {
  const n = CHANNELS_BY_UIID[String(uiid)];
  return Number.isInteger(n) && n > 0 ? n : 0; // 0 = no cap
}

// On/off state from either params shape: single-channel devices report
// params.switch; multi-channel ones report params.switches[{switch, outlet}].
// switchStatus builds the Tuya-style status map the client enumerates switches
// from (switch_1, switch_2, ... — one per outlet, in outlet order), capped at
// the device's real channel count when known.
function switchStatus(params, maxChannels) {
  const st = {};
  if (params && typeof params.switch === 'string') { st.switch_1 = params.switch === 'on'; return st; }
  if (params && Array.isArray(params.switches)) {
    params.switches.forEach((s, i) => {
      if (!s) return;
      const o = Number(s.outlet);
      const outlet = Number.isInteger(o) && o >= 0 ? o : i;
      if (maxChannels && outlet >= maxChannels) return;
      st['switch_' + (outlet + 1)] = s.switch === 'on';
    });
  }
  if (!Object.keys(st).length) st.switch_1 = false;
  return st;
}

// The first outlet's state (the one the tile toggles).
function switchState(params) {
  return switchStatus(params).switch_1 === true;
}

// v1: on/off switches/plugs only. A multi-channel device exposes every outlet
// as its own switch (switch_1, switch_2, ...), so the device page lists them
// all and Arrange can split them into separate tiles, like Tuya strips.
function mapThing(t) {
  return {
    id: 'ew-' + t.deviceid,
    name: t.name || 'eWeLink device',
    category: 'cz',
    product: [t.brandName, t.productModel].filter(Boolean).join(' ') || 'eWeLink plug',
    online: !!t.online,
    status: switchStatus(t.params, channelCap(t.uiid)),
    room: t.roomName || '',
    ew: true
  };
}

// Tuya-style commands [{ code: 'switch_1'|'switch_2'|..., value: bool }] →
// eWeLink params { switch, outlet } (switch_N is outlet N-1). setStatus turns
// that into the shape the device speaks. Anything else isn't a switch in v1.
function commandParams(commands) {
  const c = (commands || []).find((x) => x && /^switch_\d+$/.test(x.code || ''));
  if (!c || typeof c.value !== 'boolean') return null;
  const outlet = parseInt(c.code.slice('switch_'.length), 10) - 1;
  return { switch: c.value ? 'on' : 'off', outlet: outlet >= 0 ? outlet : 0 };
}

module.exports = {
  isConfigured, isLinked, config, mode, loginWithPassword, authUrl, exchangeCode, revoke,
  getFamilies, getThings, getStatus, setStatus, getAllThings,
  mapThing, commandParams, switchState, switchStatus, channelCap, signAuth, signGet, signPost, nonce,
  REDIRECT_URL, TOKEN_KEY
};
