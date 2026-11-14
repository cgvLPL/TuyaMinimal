// Device firmware (OTA) updates.
// GET  /api/firmware?deviceId=..           → { channels: [{ channel, current, target, available, upgrading, desc }] }
// POST /api/firmware { deviceId, channel } → { ok: true }  (starts the update on that channel)
// The check reads the upgrade list for the device; a channel whose upgrade_status is 1
// has an update waiting, 2 means it is already updating. Starting an update confirms
// the channel number from that list. Works for Wi-Fi and Zigbee devices; Bluetooth
// and gateway sub-devices update through their own hub instead.
const { call, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');

const bad = (m) => new TuyaError(m, 'bad_request', 400);

function channelsOf(result) {
  const list = Array.isArray(result) ? result : (result ? [result] : []);
  return list.map((c) => ({
    channel: typeof c.module_type === 'number' ? c.module_type : (typeof c.channel === 'number' ? c.channel : 0),
    current: c.current_version != null ? String(c.current_version) : '',
    target: c.upgrade_version != null ? String(c.upgrade_version) : '',
    available: c.upgrade_status === 1,
    upgrading: c.upgrade_status === 2,
    desc: typeof c.upgrade_desc === 'string' ? c.upgrade_desc : ''
  })).filter((c) => c.current || c.target);
}

module.exports = handler(['GET', 'POST'], async (req, body) => {
  const q = req.method === 'GET' ? (req.query || {}) : body;
  const deviceId = requireId(String(q.deviceId || ''), 'device');
  await access.requireDevice(req.user, deviceId);

  if (req.method === 'GET') {
    const result = await call('GET', `/v1.0/iot-03/devices/${deviceId}/upgrade-infos`);
    return { channels: channelsOf(result) };
  }

  const channel = Number(body.channel);
  if (!Number.isInteger(channel) || channel < 0) throw bad('Invalid firmware channel.');
  await call('POST', `/v1.0/iot-03/devices/${deviceId}/confirm-upgrade`, { module_type: channel });
  await activity.log(req, { kind: 'device', text: 'started a firmware update on ' + activity.deviceName(deviceId, body.name) });
  return { ok: true };
});
