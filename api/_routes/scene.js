// POST /api/scene  { homeId, sceneId }  → runs a tap-to-run scene
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');

module.exports = handler(['POST'], async (req, body) => {
  const homeId = requireId(body.homeId, 'home');
  access.requireHome(req.user, homeId);
  const sceneId = requireId(body.sceneId, 'scene');
  await call('POST', `/v1.0/homes/${homeId}/scenes/${sceneId}/trigger`);
  return { ok: true };
});
