// Automations ("when X, do Y"), admins only.
// GET  /api/automation-edit?homeId=..&id=..   → full automation (conditions, actions...)
// POST /api/automation-edit { op: 'create' | 'update', homeId, automationId?, name, match_type,
//                             conditions, actions, background?, preconditions?, condition_rule? }
// POST /api/automation-edit { op: 'delete', homeId, automationId }
const { call } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const { DEFAULT_BACKGROUND, cleanValue, cleanActions, bad, PROP_KEY, withIrFallback } = require('../_lib/rules');
const access = require('../_lib/access');
const activity = require('../_lib/activity');

const ENTITY = /^[A-Za-z0-9_\-:.]{1,64}$/;

function cleanDisplay(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw bad('Every condition needs details.');
  const out = {};
  for (const [k, v] of Object.entries(d)) {
    if (!PROP_KEY.test(k)) throw bad('Invalid condition.');
    out[k] = cleanValue(v, 0);
  }
  return out;
}

function cleanConditions(list) {
  if (!Array.isArray(list) || list.length < 1 || list.length > 10) throw bad('An automation needs 1 to 10 conditions.');
  return list.map((c, i) => {
    const type = Number(c && c.entity_type);
    if (![1, 3, 6, 15].includes(type)) throw bad('Unsupported condition type.');
    const id = String(c.entity_id || (type === 6 ? 'timer' : ''));
    if (!ENTITY.test(id)) throw bad('Invalid condition.');
    const display = cleanDisplay(c.display);
    if (type === 6) {
      if (!/^\d{2}:\d{2}$/.test(String(display.time || ''))) throw bad('Schedules need a time.');
      if (display.loops !== undefined && !/^[01]{7}$/.test(String(display.loops))) throw bad('Invalid days.');
    }
    if (type === 1 && !['==', '>', '<'].includes(display.operator)) throw bad('Invalid comparison.');
    return { entity_type: type, entity_id: id, order_num: i + 1, display };
  });
}

module.exports = handler(['GET', 'POST'], async (req, body) => {
  const q = req.method === 'GET' ? (req.query || {}) : body;
  const homeId = requireId(String(q.homeId || ''), 'home');
  access.requireHome(req.user, homeId);

  if (req.method === 'GET') {
    const id = requireId(String(q.id || ''), 'automation');
    const a = await call('GET', `/v1.0/homes/${homeId}/automations/${id}`);
    return {
      id: String(a.automation_id || id), name: a.name || '', enabled: !!a.enabled,
      match_type: Number(a.match_type) || 1, condition_rule: a.condition_rule || '',
      background: a.background || '', preconditions: a.preconditions || [],
      conditions: a.conditions || [], actions: a.actions || []
    };
  }

  if (body.op === 'delete') {
    const id = requireId(String(body.automationId || ''), 'automation');
    await call('DELETE', `/v1.0/homes/${homeId}/automations/${id}`);
    await activity.log(req, { kind: 'edit', homeId, text: 'deleted the automation ' + (body.name ? '"' + activity.clean(body.name, 40) + '"' : '') });
    return { ok: true };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 40) throw bad('Automation names must be 1 to 40 characters.');
  const match = Number(body.match_type);
  if (![1, 2, 3].includes(match)) throw bad('Choose whether any or all conditions must be met.');
  const payload = {
    name,
    background: typeof body.background === 'string' && /^https:\/\/[^\s"]{1,300}$/.test(body.background) ? body.background : DEFAULT_BACKGROUND,
    match_type: match,
    conditions: cleanConditions(body.conditions),
    actions: cleanActions(body.actions)
  };
  if (match === 3) {
    if (typeof body.condition_rule !== 'string' || !/^[c0-9\s&|()!]{1,200}$/.test(body.condition_rule)) throw bad('Invalid condition rule.');
    payload.condition_rule = body.condition_rule;
  }
  if (Array.isArray(body.preconditions) && body.preconditions.length) {
    if (body.preconditions.length > 5) throw bad('Too many preconditions.');
    payload.preconditions = body.preconditions.map((p) => cleanValue(p, 0));
  }

  if (body.op === 'create') {
    const id = await withIrFallback(payload.actions, body.irEntities, (actions) => call('POST', `/v1.0/homes/${homeId}/automations`, Object.assign({}, payload, { actions })));
    await activity.log(req, { kind: 'edit', homeId, text: 'created the automation "' + activity.clean(name, 40) + '"' });
    return { ok: true, automationId: String(id) };
  }
  if (body.op === 'update') {
    const id = requireId(String(body.automationId || ''), 'automation');
    await withIrFallback(payload.actions, body.irEntities, (actions) => call('PUT', `/v1.0/homes/${homeId}/automations/${id}`, Object.assign({}, payload, { actions })));
    await activity.log(req, { kind: 'edit', homeId, text: 'edited the automation "' + activity.clean(name, 40) + '"' });
    return { ok: true, automationId: id };
  }
  throw bad('Unknown operation.');
}, { admin: true });
