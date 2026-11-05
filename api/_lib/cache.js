// Short-lived in-memory cache shared by all endpoints of a warm serverless instance.
const store = new Map();
async function cached(key, ttlMs, fn) {
  const hit = store.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  const value = await fn();
  store.set(key, { value, until: Date.now() + ttlMs });
  return value;
}
function peek(key) { const hit = store.get(key); return hit && hit.until > Date.now() ? hit.value : undefined; }
module.exports = { cached, peek, clear: () => store.clear(), SLOW: 60 * 1000 };
