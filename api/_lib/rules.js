// Shared validation for scene and automation actions (Tuya's format).
const { TuyaError } = require('./tuya');
const { requireId } = require('./http');

const DEFAULT_BACKGROUND = 'https://images.tuyacn.com/smart/rule/cover/sport.png';
const EXECUTORS = ['dpIssue', 'delay', 'device_issue', 'device_group_issue', 'irIssue', 'irIssueVii', 'ruleTrigger', 'ruleEnable', 'ruleDisable', 'deviceGroupDpIssue', 'toggle', 'dpStep'];
const bad = (msg) => new TuyaError(msg, 'bad_request', 400);
const PROP_KEY = /^[A-Za-z0-9_+\-]{1,48}$/;

function cleanValue(v, depth) {
  if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) return v;
  if (typeof v === 'string' && v.length <= 256) return v;
  // Actions kept from the Tuya app (e.g. IR) can carry small nested objects; pass them through.
  if (v && typeof v === 'object' && depth < 3) {
    const out = Array.isArray(v) ? [] : {};
    for (const [k, x] of Object.entries(v)) out[k] = cleanValue(x, depth + 1);
    return out;
  }
  throw bad('Invalid action value.');
}

function cleanActions(list) {
  if (!Array.isArray(list) || list.length < 1 || list.length > 40) throw bad('A scene needs 1 to 40 actions.');
  if (JSON.stringify(list).length > 20000) throw bad('This scene is too large.');
  const out = list.map((a) => {
    if (!a || !EXECUTORS.includes(a.action_executor)) throw bad('Unsupported action type.');
    const action = { action_executor: a.action_executor };
    if (a.action_executor === 'delay') {
      const p = a.executor_property || {};
      const parts = ['hours', 'minutes', 'seconds'].map((k) => {
        const n = Number(p[k] || 0);
        if (!Number.isInteger(n) || n < 0 || n > 59) throw bad('Invalid delay.');
        return n;
      });
      if (!parts.some((n) => n > 0)) throw bad('A delay must be longer than 0 seconds.');
      action.executor_property = { hours: String(parts[0]), minutes: String(parts[1]), seconds: String(parts[2]) };
      return action;
    }
    if (a.entity_id) action.entity_id = requireId(String(a.entity_id), 'device');
    const props = a.executor_property || {};
    if (typeof props !== 'object' || Array.isArray(props)) throw bad('Invalid action.');
    action.executor_property = {};
    for (const [k, v] of Object.entries(props)) {
      if (!PROP_KEY.test(k)) throw bad('Invalid action code.');
      action.executor_property[k] = cleanValue(v, 0);
    }
    if (a.action_executor === 'dpIssue' && !Object.keys(action.executor_property).length) throw bad('Every device needs something to do.');
    return action;
  });
  if (out[out.length - 1].action_executor === 'delay') throw bad('A scene can\'t end with a delay.');
  return out;
}


// IR remotes in scenes and automations: Tuya accepts their standard instructions as device
// actions; some accounts expect the IR-specific action type instead. Try one, then the other.
function irVariants(actions, irIds) {
  const set = new Set((Array.isArray(irIds) ? irIds : []).map(String));
  if (!set.size || !actions.some((a) => set.has(a.entity_id) && a.action_executor === 'dpIssue')) return [actions];
  return [actions, actions.map((a) => (set.has(a.entity_id) && a.action_executor === 'dpIssue' ? Object.assign({}, a, { action_executor: 'irIssue' }) : a))];
}
async function withIrFallback(actions, irIds, send) {
  let firstErr = null;
  for (const variant of irVariants(actions, irIds)) {
    try { return await send(variant); } catch (e) { if (!firstErr) firstErr = e; }
  }
  throw firstErr;
}

module.exports = { DEFAULT_BACKGROUND, cleanValue, cleanActions, bad, PROP_KEY, withIrFallback };
