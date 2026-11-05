// The app's only serverless function. Vercel's free (Hobby) plan allows 12 functions per
// deployment, so every endpoint lives in api/_routes/ (folders starting with "_" aren't
// deployed as functions) and is reached through here: /api/router?r=<name>&...
const routes = {
  state: require('./_routes/state'),
  status: require('./_routes/status'),
  command: require('./_routes/command'),
  spec: require('./_routes/spec'),
  scene: require('./_routes/scene'),
  'scene-edit': require('./_routes/scene-edit'),
  automation: require('./_routes/automation'),
  'automation-edit': require('./_routes/automation-edit'),
  rename: require('./_routes/rename'),
  ir: require('./_routes/ir'),
  login: require('./_routes/login'),
  logout: require('./_routes/logout'),
  users: require('./_routes/users'),
  settings: require('./_routes/settings'),
  weather: require('./_routes/weather'),
  energy: require('./_routes/energy'),
  activity: require('./_routes/activity'),
  irspec: require('./_routes/irspec')
};

module.exports = async (req, res) => {
  const name = String((req.query && req.query.r) || '');
  const route = Object.prototype.hasOwnProperty.call(routes, name) ? routes[name] : null;
  if (!route) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Unknown endpoint.', code: 'not_found' }));
  }
  return route(req, res);
};
