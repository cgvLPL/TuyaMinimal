// POST /api/automation  { homeId, automationId, enabled }
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');

module.exports = handler(['POST'], async (req, body) => {
  const homeId = requireId(body.homeId, 'home');
  access.requireHome(req.user, homeId);
  const id = requireId(body.automationId, 'automation');
  const action = body.enabled ? 'enable' : 'disable';
  await call('PUT', `/v1.0/homes/${homeId}/automations/${id}/actions/${action}`);
  await activity.log(req, { kind: 'automation', homeId,
    text: (body.enabled ? 'turned on' : 'turned off') + ' the automation ' + (body.name ? '"' + activity.clean(body.name, 40) + '"' : '') });
  return { ok: true, enabled: !!body.enabled };
});
