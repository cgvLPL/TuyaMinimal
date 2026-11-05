// Home restrictions: an admin can limit a member to certain homes. These checks run on the server,
// so a restricted member can't see or control other homes' devices even by calling the API directly.
const { call, config, TuyaError } = require('./tuya');
const { cached, SLOW } = require('./cache');

const IR_HUBS = ['wnykq', 'hwktwkq'];

function restricted(user) { return !!user && user.role !== 'admin' && Array.isArray(user.homes); }
function homeAllowed(user, homeId) { return !restricted(user) || user.homes.includes(String(homeId)); }
function requireHome(user, homeId) {
  if (!homeAllowed(user, homeId)) throw new TuyaError('You don\'t have access to this home.', 'forbidden', 403);
}

async function homeDeviceIds(homeId) {
  const ids = new Set();
  try {
    const list = await cached('homedevs:' + homeId, SLOW, () => call('GET', `/v1.0/homes/${homeId}/devices`));
    if (Array.isArray(list)) { list.forEach((d) => ids.add(d.id || d.dev_id)); return ids; }
  } catch (e) { /* fall back to rooms */ }
  try {
    const r = await cached('rooms:' + homeId, SLOW, () => call('GET', `/v1.0/homes/${homeId}/rooms`));
    const rooms = Array.isArray(r) ? r : (r && r.rooms) || [];
    for (const room of rooms) {
      const devs = await cached('roomdevs:' + homeId + ':' + room.room_id, SLOW,
        () => call('GET', `/v1.0/homes/${homeId}/rooms/${room.room_id}/devices`));
      (devs || []).forEach((d) => ids.add(d.id || d.dev_id));
    }
  } catch (e) { /* nothing more we can do: unknown devices stay hidden */ }
  return ids;
}

// null = no restriction. Otherwise the set of device IDs this user may see and control,
// including IR remotes set up on blasters inside their homes.
async function allowedDeviceIds(user) {
  if (!restricted(user)) return null;
  const ids = new Set();
  for (const homeId of user.homes) (await homeDeviceIds(homeId)).forEach((id) => ids.add(id));
  try {
    const { uid } = config();
    const all = await cached('userdevs', 15000, () => call('GET', `/v1.0/users/${uid}/devices`));
    const hubs = (all || []).filter((d) => ids.has(d.id) && IR_HUBS.includes(d.category));
    for (const hub of hubs) {
      try {
        const remotes = await cached('remotes:' + hub.id, SLOW, () => call('GET', `/v2.0/infrareds/${hub.id}/remotes`));
        (remotes || []).forEach((r) => ids.add(String(r.remote_id)));
      } catch (e) { /* no IR service */ }
    }
  } catch (e) { /* keep what we have */ }
  return ids;
}

async function requireDevice(user, deviceId) {
  const ids = await allowedDeviceIds(user);
  if (ids && !ids.has(deviceId)) throw new TuyaError('You don\'t have access to this device.', 'forbidden', 403);
}

module.exports = { restricted, homeAllowed, requireHome, allowedDeviceIds, requireDevice };
