// POST /api/automation  { homeId, automationId, enabled }
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');

module.exports = handler(['POST'], async (req, body) => {
  const homeId = requireId(body.homeId, 'home');
  const id = requireId(body.automationId, 'automation');
  const action = body.enabled ? 'enable' : 'disable';
  await call('PUT', `/v1.0/homes/${homeId}/automations/${id}/actions/${action}`);
  return { ok: true, enabled: !!body.enabled };
});
