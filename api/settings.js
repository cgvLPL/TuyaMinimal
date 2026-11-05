// GET  /api/settings              → shared settings (custom icons)
// POST /api/settings { icons: { deviceId: iconKey | null } }   → merge and save
const { handler } = require('./_lib/http');
const { TuyaError } = require('./_lib/tuya');
const store = require('./_lib/store');

const DEV = /^[A-Za-z0-9_-]{1,64}$/, ICON = /^[a-z]{1,16}$/;

module.exports = handler(['GET', 'POST'], async (req, body) => {
  if (!store.enabled()) throw new TuyaError('Sync needs storage. See the README section "Sync and users".', 'no_storage', 503);
  const settings = await store.getJSON('settings', { icons: {} });
  settings.icons = settings.icons || {};
  if (req.method === 'GET') return settings;
  const changes = body.icons && typeof body.icons === 'object' ? body.icons : {};
  const entries = Object.entries(changes);
  if (entries.length > 100) throw new TuyaError('Too many changes at once.', 'bad_request', 400);
  for (const [id, key] of entries) {
    if (!DEV.test(id)) continue;
    if (key === null) delete settings.icons[id];
    else if (typeof key === 'string' && ICON.test(key)) settings.icons[id] = key;
  }
  await store.setJSON('settings', settings);
  return settings;
});
