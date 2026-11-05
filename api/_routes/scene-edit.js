// POST /api/scene-edit
//   { op: 'create', homeId, name, background?, actions }
//   { op: 'update', homeId, sceneId, name, background?, actions }
//   { op: 'delete', homeId, sceneId }
// actions use Tuya's format: { action_executor, entity_id, executor_property }
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const { DEFAULT_BACKGROUND, cleanActions, bad } = require('../_lib/rules');

module.exports = handler(['POST'], async (req, body) => {
  const homeId = requireId(String(body.homeId || ''), 'home');
  if (body.op === 'delete') {
    const sceneId = requireId(String(body.sceneId || ''), 'scene');
    await call('DELETE', `/v1.0/homes/${homeId}/scenes/${sceneId}`);
    return { ok: true };
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 40) throw bad('Scene names must be 1 to 40 characters.');
  const background = typeof body.background === 'string' && /^https:\/\/[^\s"]{1,300}$/.test(body.background)
    ? body.background : DEFAULT_BACKGROUND;
  const payload = { name, background, actions: cleanActions(body.actions) };

  if (body.op === 'create') {
    const id = await call('POST', `/v1.0/homes/${homeId}/scenes`, payload);
    return { ok: true, sceneId: String(id) };
  }
  if (body.op === 'update') {
    const sceneId = requireId(String(body.sceneId || ''), 'scene');
    await call('PUT', `/v1.0/homes/${homeId}/scenes/${sceneId}`, payload);
    return { ok: true, sceneId };
  }
  throw bad('Unknown operation.');
}, { admin: true });
