// Device firmware (OTA) updates.
// GET  /api/firmware?deviceId=..           → { channels: [{ channel, current, target, available, upgrading, desc }] }
// POST /api/firmware { deviceId, channel } → { ok: true }  (starts the update on that channel)
// Uses the current OTA API (/v1.0/devices/…), not the deprecated /v1.0/iot-03 "Devices
// OTA" group — that group needs a separate subscription, which is why the check
// refused with "not subscribed" on 2.91.25. The current endpoint is part of the
// standard device API. The check reads the upgrade list for the device; a channel
// whose upgrade_status is 1 (hardware prepared) has an update waiting, 2 means it
// is already updating. Starting an update confirms the channel number from that
// list. Works for Wi-Fi and Zigbee devices; Bluetooth and gateway sub-devices
// update through their own hub instead. If Tuya still refuses with a permission
// error, the route answers { notSubscribed: true } instead of failing, so the
// device page can say so calmly rather than show an error on every device.
const { call, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const access = require('../_lib/access');
const activity = require('../_lib/activity');

const bad = (m) => new TuyaError(m, 'bad_request', 400);

function channelOf(c) {
  const m = c.module_type;
  if (typeof m === 'number' && Number.isInteger(m)) return m;
  if (typeof m === 'string' && /^\d+$/.test(m)) return Number(m);
  if (typeof c.channel === 'number' && Number.isInteger(c.channel)) return c.channel;
  return 0;
}

function channelsOf(result) {
  const list = Array.isArray(result) ? result : (result ? [result] : []);
  const mapped = list.map((c) => ({
    channel: channelOf(c),
    current: c.current_version != null ? String(c.current_version) : '',
    target: c.upgrade_version != null ? String(c.upgrade_version) : '',
    available: c.upgrade_status === 1,
    upgrading: c.upgrade_status === 2,
    desc: typeof c.upgrade_desc === 'string' ? c.upgrade_desc : '',
    module: typeof c.module_desc === 'string' ? c.module_desc : ''
  })).filter((c) => c.current || c.target);
  // A device often reports the same firmware on two modules (e.g. Wi-Fi and MCU)
  // with the same version. Collapse identical rows so the section does not show
  // the same Version twice; genuinely different channels keep their module label.
  const seen = new Set();
  return mapped.filter((c) => {
    const key = [c.current, c.target, c.available, c.upgrading].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isPermissionRefusal(e) {
  if (!e) return false;
  if (e.code === 1106 || e.code === '1106') return true;
  const m = String(e.message || '');
  return /permission|not subscribed|No permissions|not authorized|illegal permission/i.test(m);
}

module.exports = handler(['GET', 'POST'], async (req, body) => {
  const q = req.method === 'GET' ? (req.query || {}) : body;
  const deviceId = requireId(String(q.deviceId || ''), 'device');
  await access.requireDevice(req.user, deviceId);

  if (req.method === 'GET') {
    let result;
    try {
      result = await call('GET', `/v1.0/devices/${deviceId}/upgrade-infos`);
    } catch (e) {
      if (isPermissionRefusal(e)) return { channels: [], notSubscribed: true };
      throw e;
    }
    return { channels: channelsOf(result) };
  }

  const channel = Number(body.channel);
  if (!Number.isInteger(channel) || channel < 0) throw bad('Invalid firmware channel.');
  await call('PUT', `/v1.0/devices/${deviceId}/confirm-upgrade`, { module_type: channel });
  await activity.log(req, { kind: 'device', text: 'started a firmware update on ' + activity.deviceName(deviceId, body.name) });
  return { ok: true };
});
