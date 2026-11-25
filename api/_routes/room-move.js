// POST /api/room-move  { deviceId, homeId, roomId, fromRoomId, roomName, deviceName }
// → moves a device to another room in Tuya, so it no longer needs the Tuya app.
// Tuya's "add a device to a room" call sets the room's device list to exactly the
// IDs sent — sending just the moved device kicked the room's other devices out
// (seen live 2026-11-20). So the route first reads the room's current devices
// and sends the full list: everyone already there, plus the moved device. If the
// room can't be read, the move is refused rather than risking the room's devices.
// Then it best-effort removes the device from the old room (a no-op if the add
// already moved it), and drops the cached room membership so the next state read
// shows the new room.
const { call, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');
const store = require('../_lib/store');
const { forget } = require('../_lib/cache');

module.exports = handler(['POST'], async (req, body) => {
  const deviceId = requireId(body.deviceId, 'device');
  if (!deviceId.startsWith('ew-')) await access.requireDevice(req.user, deviceId);
  const homeId = typeof body.homeId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.homeId) ? body.homeId : null;
  const roomId = typeof body.roomId === 'string' && /^\d{1,20}$/.test(body.roomId) ? body.roomId : null;
  const fromRoomId = typeof body.fromRoomId === 'string' && /^\d{1,20}$/.test(body.fromRoomId) ? body.fromRoomId : null;
  if (!homeId) throw new TuyaError('Invalid home.', 'bad_request', 400);
  if (!roomId) throw new TuyaError('Invalid room.', 'bad_request', 400);
  // eWeLink devices (2.93.24) don't exist in Tuya, so a room move can't go through
  // Tuya's room API (it answered "permission deny"). Instead the chosen room is
  // saved as an app-layer override that state.js prefers over the eWeLink
  // room-name match. The device must be assigned to this home first.
  if (deviceId.startsWith('ew-')) {
    access.requireHome(req.user, homeId);
    if (!store.enabled()) throw new TuyaError('Sync needs storage. See the README section "Sync and users".', 'no_storage', 503);
    const settings = await store.getJSON('settings', { icons: {} });
    const assigned = (settings.ewelinkHomes && settings.ewelinkHomes[homeId]) || [];
    if (!assigned.includes(deviceId)) throw new TuyaError('That eWeLink device is not assigned to this home.', 'forbidden', 403);
    settings.ewelinkRooms = settings.ewelinkRooms || {};
    settings.ewelinkRooms[deviceId] = roomId;
    await store.setJSON('settings', settings);
    const roomName = typeof body.roomName === 'string' ? activity.clean(body.roomName, 40) : 'a room';
    await activity.log(req, { kind: 'edit', homeId,
      text: 'moved ' + activity.deviceName(deviceId, body.deviceName) + ' to ' + roomName });
    return { ok: true, roomId, moved: true };
  }
  if (fromRoomId && fromRoomId === roomId) return { ok: true, roomId, moved: false };
  // Read who's already in the room, so the add keeps them there. Refuse the move
  // if the room can't be read — sending only the moved device would empty it.
  let inRoom;
  try {
    inRoom = await call('GET', `/v1.0/homes/${homeId}/rooms/${roomId}/devices`);
  } catch (e) {
    throw new TuyaError('Couldn\'t read the room\'s devices, so nothing was moved.', 'room_read_failed', 502);
  }
  if (!Array.isArray(inRoom)) throw new TuyaError('Couldn\'t read the room\'s devices, so nothing was moved.', 'room_read_failed', 502);
  const ids = [];
  for (const d of inRoom) {
    const id = d && (d.id || d.dev_id);
    if (typeof id === 'string' && id && !ids.includes(id)) ids.push(id);
  }
  if (!ids.includes(deviceId)) ids.push(deviceId);
  await call('POST', `/v1.0/homes/${homeId}/rooms/${roomId}/devices`, { device_ids: ids });
  if (fromRoomId) {
    try { await call('DELETE', `/v1.0/homes/${homeId}/rooms/${fromRoomId}/devices`, { device_ids: [deviceId] }); } catch (e) { /* the add already moved it */ }
  }
  forget('p:roomdevs:' + homeId + ':' + roomId);
  if (fromRoomId) forget('p:roomdevs:' + homeId + ':' + fromRoomId);
  const roomName = typeof body.roomName === 'string' ? activity.clean(body.roomName, 40) : 'a room';
  await activity.log(req, { kind: 'edit', homeId,
    text: 'moved ' + activity.deviceName(deviceId, body.deviceName) + ' to ' + roomName });
  return { ok: true, roomId, moved: true };
});
