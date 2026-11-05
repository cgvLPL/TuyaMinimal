// GET /api/activity?homeId=..&before=<ms> → recent activity for a home, newest first
const { handler, requireId } = require('../_lib/http');
const { TuyaError } = require('../_lib/tuya');
const store = require('../_lib/store');
const access = require('../_lib/access');

module.exports = handler(['GET'], async (req) => {
  if (!store.enabled()) throw new TuyaError('The activity log needs the database. See "Sync and users" in the README.', 'no_storage', 503);
  const q = req.query || {};
  const homeId = requireId(String(q.homeId || ''), 'home');
  access.requireHome(req.user, homeId);
  const before = Number(q.before) || 0;
  const rows = await store.listActivity({ homeId, includeGlobal: req.user.role === 'admin', before: before || undefined, limit: 50 });
  return {
    entries: rows.map((r) => ({ id: r.id, at: Number(r.at), who: r.user_name || 'Someone', kind: r.kind, text: r.text, home: !!r.home_id })),
    more: rows.length === 50
  };
});
