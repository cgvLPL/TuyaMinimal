// Records who did what in the app (only when the Neon database is set up). Logging never blocks
// or breaks an action: it gives up after a short wait and ignores errors.
const store = require('./store');
const { peek } = require('./cache');

const clean = (t, n) => String(t == null ? '' : t).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n || 60);

function deviceName(id, fallback) {
  const all = peek('userdevs');
  const d = Array.isArray(all) ? all.find((x) => x.id === id) : null;
  return clean((d && d.name) || fallback || 'a device');
}

// Turns Tuya commands into a sentence about the device, e.g. "turned on Kettle plug",
// "changed the brightness of Desk lamp", "turned off outlet 2 of Power strip".
function describe(commands, name) {
  const d = name || 'a device';
  const v = {};
  for (const c of commands || []) v[c.code] = c.value;
  const sw = Object.keys(v).filter((c) => /^switch(_led|_\d+|_usb\d+)?$/.test(c) && typeof v[c] === 'boolean');
  if (sw.length > 1) {
    const on = sw.filter((c) => v[c]).length;
    return (on === sw.length ? 'turned on all outlets of ' : on === 0 ? 'turned off all outlets of ' : 'changed the outlets of ') + d;
  }
  if (sw.length === 1) {
    const m = sw[0].match(/^switch_(usb)?(\d+)$/);
    const verb = v[sw[0]] ? 'turned on ' : 'turned off ';
    // Only mention the outlet for real multi-outlet codes (switch_2, switch_usb1...); a power-on that
    // comes with other settings is described by those settings instead.
    const others = Object.keys(v).filter((c) => c !== sw[0] && c !== 'work_mode');
    if (!others.length || !v[sw[0]]) return verb + (m && sw[0] !== 'switch_1' ? (m[1] ? 'USB ' : 'outlet ') + m[2] + ' of ' : '') + d;
  }
  if ('colour_data_v2' in v || 'colour_data' in v) return 'changed the colour of ' + d;
  if ('bright_value_v2' in v || 'bright_value' in v) return 'changed the brightness of ' + d;
  if ('temp_value_v2' in v || 'temp_value' in v) return 'changed the white tone of ' + d;
  if ('temp_set' in v) return 'changed the temperature of ' + d;
  if ('mode' in v) return 'changed the mode of ' + d;
  if (v.control === 'open') return 'opened ' + d;
  if (v.control === 'close') return 'closed ' + d;
  if (v.control === 'stop') return 'stopped ' + d;
  if ('percent_control' in v) return 'moved ' + d + ' to ' + v.percent_control + '%';
  if ('fan_speed_percent' in v) return 'changed the fan speed of ' + d;
  if (v.work_mode === 'white') return 'switched ' + d + ' to white light';
  return 'changed ' + d;
}

async function log(req, entry) {
  if (!store.enabled() || !req.user) return;
  const write = store.addActivity({
    userId: req.user.id, userName: req.user.name, homeId: entry.homeId || null, kind: entry.kind, text: entry.text
  }).catch(() => null);
  await Promise.race([write, new Promise((r) => setTimeout(r, 400))]);
}

module.exports = { log, describe, deviceName, clean };
