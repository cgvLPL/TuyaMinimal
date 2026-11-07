// Short-lived in-memory cache shared by all endpoints of a warm serverless instance.
const store = new Map();
// Requests that arrive while the same lookup is already running wait for it instead of repeating it.
const inflight = new Map();
async function cached(key, ttlMs, fn) {
  const hit = store.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    try {
      const value = await fn();
      store.set(key, { value, until: Date.now() + ttlMs });
      return value;
    } finally { inflight.delete(key); }
  })();
  inflight.set(key, p);
  return p;
}
function peek(key) { const hit = store.get(key); return hit && hit.until > Date.now() ? hit.value : undefined; }
const SLOW = 60 * 1000;

// ---------- Remembered between cold starts (needs the database) ----------
// Homes, rooms, which devices are in which room, and IR remotes rarely change. A fresh server
// instance would have to ask Tuya for all of them again (several rounds of waiting), so they're
// also kept in the database as one small record and reused for a while. Only IDs and names are
// stored, never device keys. "Refresh now" in the app throws them away.
const DB_KEY = 'tuyacache';
let blobP = null, blob = null, dirty = false;
function db() { return require('./store'); }
function loadPersisted() {
  if (!db().enabled()) return Promise.resolve(null);
  if (!blobP) {
    blobP = db().getJSON(DB_KEY, {})
      .then((b) => (blob = b && typeof b === 'object' && !Array.isArray(b) ? b : {}))
      .catch(() => (blob = {}));
  }
  return blobP;
}
// Like cached(), but a database copy younger than maxAgeMs is used when memory has nothing.
async function persisted(key, maxAgeMs, fn) {
  const hit = store.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  const b = await loadPersisted();
  const e = b && b[key];
  if (e && typeof e.at === 'number' && Date.now() - e.at < maxAgeMs) {
    store.set(key, { value: e.value, until: Date.now() + SLOW });
    return e.value;
  }
  const value = await cached(key, SLOW, fn);
  if (blob) { blob[key] = { at: Date.now(), value }; dirty = true; }
  return value;
}
// Drop one remembered entry (when it turned out to be out of date).
function forget(key) {
  store.delete(key);
  if (blob && blob[key]) { delete blob[key]; dirty = true; }
}
// Every key that was remembered (so callers can start follow-up lookups early).
async function persistedKeys(prefix) {
  const b = await loadPersisted();
  return b ? Object.keys(b).filter((k) => k.startsWith(prefix)).map((k) => [k, b[k].value]) : [];
}
// Saves changes to the database: one small write, only when something was looked up again.
async function flushPersisted() {
  if (!dirty || !blob) return;
  dirty = false;
  // Keep the record small: drop entries older than a day.
  for (const k of Object.keys(blob)) if (Date.now() - blob[k].at > 24 * 3600 * 1000) delete blob[k];
  try { await db().setJSON(DB_KEY, blob); } catch (e) { /* not critical */ }
}
function clear() {
  store.clear();
  if (db().enabled()) { blob = {}; blobP = Promise.resolve(blob); dirty = true; }
}

module.exports = { cached, peek, clear, SLOW, persisted, forget, persistedKeys, flushPersisted };
