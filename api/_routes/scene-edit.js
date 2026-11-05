// POST /api/scene-edit
//   { op: 'create', homeId, name, background?, actions }
//   { op: 'update', homeId, sceneId, name, background?, actions }
//   { op: 'delete', homeId, sceneId }
// actions use Tuya's format: { action_executor, entity_id, executor_property }
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const { DEFAULT_BACKGROUND, cleanActions, bad, withIrFallback } = require('../_lib/rules');
const activity = require('../_lib/activity');

module.exports = handler(['POST'], async (req, body) => {
  const homeId = requireId(String(body.homeId || ''), 'home');
  if (body.op === 'delete') {
    const sceneId = requireId(String(body.sceneId || ''), 'scene');
    await call('DELETE', `/v1.0/homes/${homeId}/scenes/${sceneId}`);
    await activity.log(req, { kind: 'edit', homeId, text: 'deleted the scene ' + (body.name ? '"' + activity.clean(body.name, 40) + '"' : '') });
    return { ok: true };
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 40) throw bad('Scene names must be 1 to 40 characters.');
  const background = typeof body.background === 'string' && /^https:\/\/[^\s"]{1,300}$/.test(body.background)
    ? body.background : DEFAULT_BACKGROUND;
  const payload = { name, background, actions: cleanActions(body.actions) };

  if (body.op === 'create') {
    const id = await withIrFallback(payload.actions, body.irEntities, (actions) => call('POST', `/v1.0/homes/${homeId}/scenes`, Object.assign({}, payload, { actions })));
    await activity.log(req, { kind: 'edit', homeId, text: 'created the scene "' + activity.clean(name, 40) + '"' });
    return { ok: true, sceneId: String(id) };
  }
  if (body.op === 'update') {
    const sceneId = requireId(String(body.sceneId || ''), 'scene');
    await withIrFallback(payload.actions, body.irEntities, (actions) => call('PUT', `/v1.0/homes/${homeId}/scenes/${sceneId}`, Object.assign({}, payload, { actions })));
    await activity.log(req, { kind: 'edit', homeId, text: 'edited the scene "' + activity.clean(name, 40) + '"' });
    return { ok: true, sceneId };
  }
  throw bad('Unknown operation.');
}, { admin: true });
