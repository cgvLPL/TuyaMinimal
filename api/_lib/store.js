// Optional shared storage in a Neon Postgres database (added from Vercel's Storage tab).
// Used to sync settings across devices and to keep user accounts and sign-in sessions.
// Everything lives in one small key/value table that's created automatically.
const { TuyaError } = require('./tuya');

const TABLE = 'tuyahome_kv';
const url = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || '';
const enabled = () => !!url();

let sqlFn = null, ready = null;
function client() {
  if (!enabled()) throw new TuyaError('The database is not set up. See the README section "Sync and users".', 'no_storage', 503);
  if (!sqlFn) {
    let neon;
    try { ({ neon } = require('@neondatabase/serverless')); }
    catch (e) { throw new TuyaError('The Neon database driver is missing. Make sure package.json lists @neondatabase/serverless, then redeploy.', 'storage', 500); }
    sqlFn = neon(url());
  }
  return sqlFn;
}
async function q(text, params) {
  const sql = client();
  try {
    return await sql.query(text, params || []);
  } catch (e) {
    throw new TuyaError('Database error: ' + (e && e.message ? e.message : 'unknown'), 'storage', 502);
  }
}
async function setup() {
  if (!ready) {
    ready = q(`CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at BIGINT)`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}
// Expired rows are ignored when read and cleared out now and then.
async function sweep() {
  if (Math.random() < 0.05) await q(`DELETE FROM ${TABLE} WHERE expires_at IS NOT NULL AND expires_at <= $1`, [Date.now()]).catch(() => null);
}

async function getJSON(key, fallback) {
  await setup();
  const rows = await q(`SELECT value FROM ${TABLE} WHERE key = $1 AND (expires_at IS NULL OR expires_at > $2)`, [key, Date.now()]);
  if (!rows.length) return fallback;
  try { return JSON.parse(rows[0].value); } catch (e) { return fallback; }
}
async function setJSON(key, value, ttlSeconds) {
  await setup();
  const expires = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  await q(`INSERT INTO ${TABLE} (key, value, expires_at) VALUES ($1, $2, $3)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
    [key, JSON.stringify(value), expires]);
  await sweep();
}
async function del(key) {
  await setup();
  await q(`DELETE FROM ${TABLE} WHERE key = $1`, [key]);
}
async function count(key) {
  await setup();
  const rows = await q(`SELECT value FROM ${TABLE} WHERE key = $1 AND (expires_at IS NULL OR expires_at > $2)`, [key, Date.now()]);
  return rows.length ? Number(rows[0].value) || 0 : 0;
}
// Counter that starts again from 1 once its time window has passed.
async function incr(key, ttlSeconds) {
  await setup();
  const now = Date.now(), until = now + ttlSeconds * 1000;
  const rows = await q(`INSERT INTO ${TABLE} (key, value, expires_at) VALUES ($1, '1', $3)
    ON CONFLICT (key) DO UPDATE SET
      value = CASE WHEN ${TABLE}.expires_at IS NOT NULL AND ${TABLE}.expires_at <= $2 THEN '1'
                   ELSE CAST(CAST(${TABLE}.value AS INTEGER) + 1 AS TEXT) END,
      expires_at = CASE WHEN ${TABLE}.expires_at IS NOT NULL AND ${TABLE}.expires_at <= $2 THEN $3
                        ELSE ${TABLE}.expires_at END
    RETURNING value`, [key, now, until]);
  return rows.length ? Number(rows[0].value) : 1;
}

module.exports = { enabled, getJSON, setJSON, del, count, incr };
