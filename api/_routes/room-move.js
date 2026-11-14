// POST /api/room-move  { deviceId, homeId, roomId, fromRoomId, roomName, deviceName }
// → moves a device to another room in Tuya, so it no longer needs the Tuya app.
// Adds the device to the new room first (Tuya moves it there), then best-effort
// removes it from the old room (a no-op if the add already moved it), and drops
// the cached room membership so the next state read shows the new room.
const { call, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');
const { forget } = require('../_lib/cache');

module.exports = handler(['POST'], async (req, body) => {
  const deviceId = requireId(body.deviceId, 'device');
  await access.requireDevice(req.user, deviceId);
  const homeId = typeof body.homeId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.homeId) ? body.homeId : null;
  const roomId = typeof body.roomId === 'string' && /^\d{1,20}$/.test(body.roomId) ? body.roomId : null;
  const fromRoomId = typeof body.fromRoomId === 'string' && /^\d{1,20}$/.test(body.fromRoomId) ? body.fromRoomId : null;
  if (!homeId) throw new TuyaError('Invalid home.', 'bad_request', 400);
  if (!roomId) throw new TuyaError('Invalid room.', 'bad_request', 400);
  if (fromRoomId && fromRoomId === roomId) return { ok: true, roomId, moved: false };
  await call('POST', `/v1.0/homes/${homeId}/rooms/${roomId}/devices`, { device_ids: [deviceId] });
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
