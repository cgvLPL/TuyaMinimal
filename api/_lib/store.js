// Optional shared storage (Upstash Redis, added from Vercel's Storage tab).
// Used to sync settings across devices and to keep user accounts.
// Talks to Upstash's REST API with plain fetch, so no packages are needed.
const { TuyaError } = require('./tuya');

const PREFIX = 'tuyahome:';
function cfg() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}
const enabled = () => !!cfg();

async function cmd(args) {
  const c = cfg();
  if (!c) throw new TuyaError('Storage is not set up. See the README section "Sync and users".', 'no_storage', 503);
  let res, json = {};
  try {
    res = await fetch(c.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + c.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    json = await res.json();
  } catch (e) {
    throw new TuyaError('Could not reach storage.', 'storage', 502);
  }
  if (!res.ok || json.error) throw new TuyaError('Storage error: ' + (json.error || res.status), 'storage', 502);
  return json.result;
}

async function getJSON(key, fallback) {
  const v = await cmd(['GET', PREFIX + key]);
  if (v == null) return fallback;
  try { return JSON.parse(v); } catch (e) { return fallback; }
}
async function setJSON(key, value, ttlSeconds) {
  const args = ['SET', PREFIX + key, JSON.stringify(value)];
  if (ttlSeconds) args.push('EX', String(ttlSeconds));
  await cmd(args);
}
async function del(key) { await cmd(['DEL', PREFIX + key]); }
async function count(key) { return Number(await cmd(['GET', PREFIX + key])) || 0; }
async function incr(key, ttlSeconds) {
  const n = await cmd(['INCR', PREFIX + key]);
  if (n === 1) await cmd(['EXPIRE', PREFIX + key, String(ttlSeconds)]);
  return n;
}

module.exports = { enabled, getJSON, setJSON, del, count, incr };
