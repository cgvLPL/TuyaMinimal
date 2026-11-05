// GET /api/state?homeId=... → homes, rooms, devices, scenes, automations
const { call, config } = require('./_lib/tuya');
const { handler, requireId } = require('./_lib/http');

function pickDevice(d, roomOf) {
  // Only forward what the app needs. Never forward local_key or IP details.
  const status = {};
  for (const s of d.status || []) status[s.code] = s.value;
  return {
    id: d.id,
    name: d.name,
    category: d.category,
    product: d.product_name || '',
    online: !!d.online,
    status,
    room: roomOf[d.id] || ''
  };
}

async function settle(promise, fallback) {
  try { return { value: await promise }; } catch (e) { return { value: fallback, error: e.message }; }
}

module.exports = handler(['GET'], async (req) => {
  const { uid } = config();
  const [devices, homesRes] = await Promise.all([
    call('GET', `/v1.0/users/${uid}/devices`),
    settle(call('GET', `/v1.0/users/${uid}/homes`), [])
  ]);
  const homes = (homesRes.value || []).map((h) => ({ id: String(h.home_id), name: h.name }));
  const wanted = req.query && req.query.homeId ? requireId(String(req.query.homeId), 'home') : null;
  const home = homes.find((h) => h.id === wanted) || homes[0] || null;

  const warnings = [];
  if (homesRes.error) warnings.push('Homes: ' + homesRes.error);
  let rooms = [], scenes = [], automations = [];
  const roomOf = {};

  if (home) {
    const [roomsRes, scenesRes, autosRes] = await Promise.all([
      settle(call('GET', `/v1.0/homes/${home.id}/rooms`), {}),
      settle(call('GET', `/v1.0/homes/${home.id}/scenes`), []),
      settle(call('GET', `/v1.0/homes/${home.id}/automations`), [])
    ]);
    for (const [label, r] of [['Rooms', roomsRes], ['Scenes', scenesRes], ['Automations', autosRes]]) {
      if (r.error) warnings.push(label + ': ' + r.error);
    }
    const rawRooms = Array.isArray(roomsRes.value) ? roomsRes.value : (roomsRes.value.rooms || []);
    rooms = rawRooms.map((r) => ({ id: String(r.room_id), name: r.name }));
    const lists = await Promise.all(rooms.map((r) =>
      settle(call('GET', `/v1.0/homes/${home.id}/rooms/${r.id}/devices`), [])));
    lists.forEach((l, i) => { for (const d of l.value || []) roomOf[d.id || d.dev_id] = rooms[i].name; });

    scenes = (scenesRes.value || []).map((s) => ({
      id: String(s.scene_id), name: s.name, actions: (s.actions || []).length
    }));
    automations = (autosRes.value || []).map((a) => ({
      id: String(a.automation_id), name: a.name, enabled: !!a.enabled
    }));
  }

  return {
    homes,
    homeId: home ? home.id : null,
    rooms: rooms.map((r) => r.name),
    devices: (devices || []).map((d) => pickDevice(d, roomOf)),
    scenes,
    automations,
    warnings,
    at: Date.now()
  };
});
