/* Home: a minimal PWA for Tuya devices. No framework, no build step. */
(function () {
  'use strict';

  // ---------- Storage (guarded: private mode can throw) ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  // ---------- State ----------
  const S = {
    mode: new URLSearchParams(location.search).has('demo') ? 'demo' : (store.get('mode') || 'live'),
    key: store.get('appKey') || '',
    homeId: store.get('homeId') || '',
    data: null,
    loading: false,
    gate: null,          // null | 'login' | 'setup'
    gateError: '',
    room: 'All',
    specs: {},           // deviceId -> { codes, writable } | 'loading'
    sceneState: {},      // sceneId -> 'running' | 'done'
    dragging: false,
    renaming: null,
    iconPicking: null,
    pinEntry: '',        // digits typed on the keypad
    pinStage: 'enter',   // PIN setup: 'enter' then 'confirm'
    pinFirst: '',
    pinError: '',
    pinBusy: false,
    irKeys: {},          // remoteId -> { keys, categoryId } | 'loading' | { error }
    irSent: {},
    editor: null,        // scene being created or edited          // remoteId + key -> true briefly after a button is sent   // deviceId whose icon picker is open
    icons: readIcons(),  // deviceId -> icon key, saved on this device      // { id, code } while an outlet name is being edited
    installPrompt: null
  };
  if (S.mode === 'demo') store.set('mode', 'demo');

  function readIcons() {
    try { return JSON.parse(store.get('icons') || '{}') || {}; } catch (e) { return {}; }
  }
  function saveIcons() { store.set('icons', JSON.stringify(S.icons)); }

  // ---------- PIN lock ----------
  // With a PIN set, the app password is stored encrypted (AES-GCM) with a key derived
  // from the PIN (PBKDF2). Without the PIN the stored password can't be read.
  const PIN_MIN = 4, PIN_MAX = 8, PIN_TRIES = 5, AUTO_LOCK_MS = 5 * 60 * 1000;
  const te = new TextEncoder(), td = new TextDecoder();
  const toB64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
  const fromB64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  function readVault() {
    try { const v = JSON.parse(store.get('pinVault') || 'null'); return v && v.ct ? v : null; } catch (e) { return null; }
  }
  async function pinKey(pin, salt) {
    const base = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function sealVault(pin, secret) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await pinKey(pin, salt), te.encode(secret));
    return { v: 1, len: pin.length, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
  }
  async function openVault(pin, vault) {
    try {
      const key = await pinKey(pin, fromB64(vault.salt));
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(vault.iv) }, key, fromB64(vault.ct));
      return td.decode(pt);
    } catch (e) { return null; } // wrong PIN: the authentication tag doesn't match
  }
  function wipeVault() { store.del('pinVault'); store.del('pinFails'); }
  const pinSupported = !!(window.crypto && crypto.subtle && window.isSecureContext);

  const wide = window.matchMedia('(min-width: 900px)');

  // ---------- Helpers ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (sel, root) => (root || document).querySelector(sel);

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ---------- Routing (#devices, #scenes, #me, #device/<id>) ----------
  function route() {
    const h = location.hash.replace(/^#/, '');
    if (h.startsWith('device/')) return { view: 'device', id: decodeURIComponent(h.slice(7)) };
    if (h.startsWith('scene/')) return { view: 'scene-edit', id: decodeURIComponent(h.slice(6)) };
    if (h === 'scenes' || h === 'me') return { view: h };
    return { view: 'devices' };
  }
  function go(hash) {
    if (location.hash === '#' + hash) render(); else location.hash = hash;
  }

  // ---------- API ----------
  async function api(path, opts) {
    opts = opts || {};
    if (S.mode === 'demo') return Demo.handle(path, opts);
    const headers = { 'x-app-key': S.key };
    if (opts.body) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch('/api/' + path, {
        method: opts.method || 'GET',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) {
      const err = new Error(navigator.onLine ? 'Could not reach your server.' : 'You are offline.');
      err.code = 'network';
      throw err;
    }
    let json = {};
    try { json = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok) {
      const err = new Error(json.error || 'Request failed (HTTP ' + res.status + ').');
      err.code = json.code || (res.status === 401 ? 'unauthorized' : 'error');
      err.status = res.status;
      throw err;
    }
    return json;
  }

  async function refresh(opts) {
    opts = opts || {};
    if (S.mode === 'live' && !S.key) { S.gate = 'login'; render(); return; }
    if (S.loading) { S.refreshAgain = true; return; }
    S.loading = true;
    if (!S.data) render();
    try {
      const q = S.homeId ? '?homeId=' + encodeURIComponent(S.homeId) : '';
      const data = await api('state' + q);
      S.data = data;
      S.gate = null;
      if (data.homeId) { S.homeId = data.homeId; store.set('homeId', data.homeId); }
      prefetchLightSpecs();
    } catch (e) {
      if (e.code === 'unauthorized') {
        const hadPin = !!readVault();
        wipeVault();
        S.gate = 'login';
        S.gateError = hadPin
          ? 'Your app password was changed on the server. Enter the new one, then set up your PIN again.'
          : 'That password does not match APP_PASSWORD on your server.';
        S.key = ''; store.del('appKey');
      } else if (e.code === 'not_configured') {
        S.gate = 'setup'; S.gateError = e.message;
      } else if (!opts.silent) {
        toast(e.message);
      }
    } finally {
      S.loading = false;
      if (!S.dragging && !S.renaming && !(S.editor && route().view === 'scene-edit')) render();
      if (S.refreshAgain) { S.refreshAgain = false; refresh({ silent: true }); }
    }
  }

  // Lights need their spec to convert brightness into a percentage;
  // multi-outlet devices need it for their custom outlet names.
  function prefetchLightSpecs() {
    if (!S.data) return;
    for (const d of S.data.devices) {
      if ((kindOf(d) === 'light' || kindOf(d) === 'multi' || isReadingDevice(d)) && !S.specs[d.id] && d.online) loadSpec(d.id, true);
    }
  }
  async function loadSpec(id, quiet) {
    if (S.specs[id]) return S.specs[id];
    S.specs[id] = 'loading';
    try {
      S.specs[id] = await api('spec?deviceId=' + encodeURIComponent(id));
    } catch (e) {
      S.specs[id] = { codes: {}, writable: null, failed: true };
      if (!quiet) toast('Could not load controls: ' + e.message);
    }
    if (!S.dragging && !S.renaming) render();
    return S.specs[id];
  }

  // ---------- Device model ----------
  const KINDS = {
    light: ['dj', 'dd', 'fwd', 'xdd', 'dc', 'tgq', 'gyd', 'tyndj', 'fsd', 'sxd'],
    plug: ['kg', 'cz', 'pc', 'tdq', 'dlq', 'qjdcz'],
    climate: ['kt', 'wk', 'qn', 'ktkzq', 'wkf', 'rs'],
    cover: ['cl', 'clkg', 'mc'],
    fan: ['fs', 'fskg'],
    sensor: ['wsdcg', 'mcs', 'pir', 'ywbj', 'rqbj', 'sj', 'cobj', 'hps', 'ldcg', 'zd', 'co2bj', 'pm25', 'jqbj'],
    camera: ['sp']
  };
  function kindOf(d) {
    if (d.sensorOnly) return 'sensor';
    if (d.ir) return d.ir.ac ? 'irac' : 'irremote';
    if (isMulti(d) && !brightCode(d)) return 'multi';
    for (const k in KINDS) if (KINDS[k].includes(d.category)) return k;
    return 'generic';
  }
  function powerCode(d) {
    const st = d.status;
    const known = ['switch_led', 'switch', 'switch_1', 'fan_switch', 'switch_on'];
    return known.find((c) => typeof st[c] === 'boolean') ||
      Object.keys(st).find((c) => /^switch/.test(c) && typeof st[c] === 'boolean') || null;
  }
  // Multi-outlet devices (power strips, 2-gang switches): switch_1, switch_2, ... and USB ports.
  function channelCodes(d) {
    const st = d.status;
    const rank = (c) => { const m = c.match(/(usb)?(\d+)$/); return (m[1] ? 1000 : 0) + Number(m[2]); };
    return Object.keys(st)
      .filter((c) => /^switch_(usb)?\d+$/.test(c) && typeof st[c] === 'boolean')
      .sort((a, b) => rank(a) - rank(b));
  }
  function isMulti(d) { return channelCodes(d).length >= 2; }
  function channelName(d, code) {
    const s = S.specs[d.id];
    const custom = s && s !== 'loading' && s.names && s.names[code];
    if (custom) return custom;
    const m = code.match(/^switch_(usb)?(\d+)$/);
    return m ? (m[1] ? 'USB ' : 'Switch ') + m[2] : code;
  }
  function specReady(d) { const s = S.specs[d.id]; return !!s && s !== 'loading'; }
  function specOf(d, code) {
    const s = S.specs[d.id];
    return (s && s !== 'loading' && s.codes && s.codes[code]) || null;
  }
  // Converts a raw integer using the spec's scale; falls back to a sensible guess
  // (Tuya often sends 245 to mean 24.5 degrees).
  function scaled(d, code, guessDivide) {
    const v = d.status[code];
    if (typeof v !== 'number') return null;
    const sp = specOf(d, code);
    if (sp && typeof sp.scale === 'number') return v / Math.pow(10, sp.scale);
    return guessDivide && Math.abs(v) >= 60 ? v / 10 : v;
  }
  function rangeOf(d, code, fallback) {
    const sp = specOf(d, code);
    if (sp && typeof sp.min === 'number' && typeof sp.max === 'number') {
      return { min: sp.min, max: sp.max, step: sp.step || 1 };
    }
    return fallback;
  }
  function brightCode(d) { return ['bright_value_v2', 'bright_value'].find((c) => typeof d.status[c] === 'number') || null; }
  function warmCode(d) { return ['temp_value_v2', 'temp_value'].find((c) => typeof d.status[c] === 'number') || null; }
  function lightRange(d, code, isWarmth) {
    const v2 = code && code.endsWith('_v2');
    const fallback = isWarmth
      ? { min: 0, max: v2 ? 1000 : 255, step: 1 }
      : { min: v2 ? 10 : 25, max: v2 ? 1000 : 255, step: 1 };
    return rangeOf(d, code, fallback);
  }
  function toPct(v, r) { return clamp(Math.round(((v - r.min) / (r.max - r.min)) * 100), 1, 100); }
  function fromPct(p, r) {
    const raw = r.min + (clamp(p, 1, 100) / 100) * (r.max - r.min);
    return clamp(Math.round(raw / r.step) * r.step, r.min, r.max);
  }
  const MODE_LABELS = { cold: 'Cool', cool: 'Cool', hot: 'Heat', heat: 'Heat', wind: 'Fan', fan: 'Fan', auto: 'Auto', wet: 'Dry', dehumidification: 'Dry', eco: 'Eco', manual: 'Manual', smart: 'Smart', sleep: 'Sleep' };
  const modeLabel = (m) => MODE_LABELS[m] || (String(m).charAt(0).toUpperCase() + String(m).slice(1));
  const fmtTemp = (t) => (t == null ? '–' : (Math.round(t * 10) / 10) + '°');

  function isOn(d) {
    if (d.ir) return !!(d.ir.ac && d.ir.state && d.ir.state.power);
    if (isMulti(d)) return channelCodes(d).some((c) => d.status[c]);
    const p = powerCode(d); return p ? !!d.status[p] : false;
  }

  function sensorReading(d) {
    const st = d.status;
    if (typeof st.doorcontact_state === 'boolean') return st.doorcontact_state ? 'Open' : 'Closed';
    if ('pir' in st) return st.pir === 'pir' ? 'Motion detected' : 'No motion';
    if ('watersensor_state' in st) return st.watersensor_state === 'alarm' ? 'Leak detected' : 'Dry';
    if ('smoke_sensor_status' in st) return st.smoke_sensor_status === 'alarm' ? 'Smoke detected' : 'Clear';
    if ('gas_sensor_status' in st) return st.gas_sensor_status === 'alarm' ? 'Gas detected' : 'Clear';
    const t = scaled(d, 'va_temperature', true) ?? scaled(d, 'temp_current', true);
    const h = scaled(d, 'va_humidity', false) ?? scaled(d, 'humidity_value', false);
    if (t != null && h != null) return fmtTemp(t) + ' and ' + Math.round(h) + '%';
    if (t != null) return fmtTemp(t);
    if (h != null) return Math.round(h) + '% humidity';
    return 'Online';
  }

  // Devices that only report numbers (temperature, humidity, air quality) show as readings, not cards.
  const STATE_CODES = ['doorcontact_state', 'pir', 'watersensor_state', 'smoke_sensor_status', 'gas_sensor_status'];
  function readingsOf(d) {
    return {
      temp: scaled(d, 'va_temperature', true) ?? scaled(d, 'temp_current', true),
      hum: scaled(d, 'va_humidity', false) ?? scaled(d, 'humidity_value', false),
      co2: typeof d.status.co2_value === 'number' ? d.status.co2_value : null,
      pm25: typeof d.status.pm25_value === 'number' ? d.status.pm25_value : null
    };
  }
  function isReadingDevice(d) {
    const k = kindOf(d);
    if (k !== 'sensor' && !(k === 'generic' && !powerCode(d))) return false;
    if (STATE_CODES.some((c) => c in d.status)) return false;
    const r = readingsOf(d);
    return r.temp != null || r.hum != null || r.co2 != null || r.pm25 != null;
  }
  function readingTile(d, showRoom) {
    const r = readingsOf(d);
    const lowBattery = typeof d.status.battery_percentage === 'number' && d.status.battery_percentage <= 20;
    let main = '';
    if (!d.online) {
      main = '<span class="reading-off">Offline</span>';
    } else {
      if (r.temp != null) main += '<span class="reading-temp">' + fmtTemp(r.temp) + '</span>';
      if (r.hum != null) main += '<span class="reading-hum" aria-label="Humidity ' + Math.round(r.hum) + '%">' + icon('drop', 16) + Math.round(r.hum) + '%</span>';
    }
    const extra = [];
    if (d.online && r.co2 != null) extra.push('CO₂ ' + r.co2 + ' ppm');
    if (d.online && r.pm25 != null) extra.push('PM2.5 ' + r.pm25 + ' µg/m³');
    return '<div class="reading" role="listitem">' +
      '<span class="reading-name">' + esc(d.name) + (showRoom && d.room ? '<span class="reading-room">' + esc(d.room) + '</span>' : '') + '</span>' +
      '<span class="reading-main">' + main + '</span>' +
      (extra.length ? '<span class="reading-extra">' + extra.map((x) => '<span>' + x + '</span>').join('') + '</span>' : '') +
      (lowBattery ? '<span class="reading-warn">Battery low</span>' : '') +
      '</div>';
  }

  function statusText(d) {
    if (!d.online) return 'Offline';
    const k = kindOf(d), on = isOn(d), st = d.status;
    if (k === 'light') {
      if (!on) return 'Off';
      const bc = brightCode(d);
      return bc && specReady(d) ? toPct(st[bc], lightRange(d, bc)) + '%' : 'On';
    }
    if (k === 'climate') {
      if (powerCode(d) && !on) return 'Off';
      const set = scaled(d, 'temp_set', true);
      const m = st.mode ? modeLabel(st.mode) : 'Set';
      return set != null ? m + ' to ' + fmtTemp(set) : 'On';
    }
    if (k === 'cover') {
      const p = st.percent_state ?? st.percent_control;
      return typeof p === 'number' ? p + '% open' : 'Ready';
    }
    if (k === 'irac') {
      const st2 = d.ir.state || {};
      return st2.power ? (IR_MODES[st2.mode] || 'On') + ' to ' + st2.temp + '°' : 'Off';
    }
    if (k === 'irremote') return 'Remote control';
    if (k === 'multi') {
      const codes = channelCodes(d), n = codes.filter((c) => st[c]).length;
      return n === 0 ? 'Off' : n === codes.length ? 'All on' : n + ' of ' + codes.length + ' on';
    }
    if (k === 'sensor') return sensorReading(d);
    if (k === 'camera') return 'Online';
    const p = powerCode(d);
    return p ? (on ? 'On' : 'Off') : 'Online';
  }
  const hasToggle = (d) => {
    const k = kindOf(d);
    if (k === 'irac') return true;
    if (k === 'irremote') return false;
    return !!powerCode(d) && k !== 'sensor' && k !== 'camera';
  };
  // IR air conditioner settings, in the order Tuya numbers them.
  const IR_MODES = ['Cool', 'Heat', 'Auto', 'Fan', 'Dry'];
  const IR_WIND = ['Auto', 'Low', 'Medium', 'High'];

  // ---------- Commands ----------
  const pendingSend = {};
  async function send(d, commands, patch, opts) {
    opts = opts || {};
    const before = Object.assign({}, d.status);
    Object.assign(d.status, patch || {});
    if (!opts.noRender) render();
    try {
      await api('command', { method: 'POST', body: { deviceId: d.id, commands } });
      clearTimeout(refresh.t);
      refresh.t = setTimeout(() => refresh({ silent: true }), 2500);
    } catch (e) {
      d.status = opts.revertTo || before;
      render();
      toast(d.name + ': ' + e.message);
    }
  }
  // Debounced send for +/- taps, so five quick taps become one command.
  function sendSoon(d, code, value) {
    const key = d.id + code;
    if (!pendingSend[key]) pendingSend[key] = { before: Object.assign({}, d.status) };
    d.status[code] = value;
    render();
    clearTimeout(pendingSend[key].t);
    pendingSend[key].t = setTimeout(() => {
      const revertTo = pendingSend[key].before;
      delete pendingSend[key];
      send(d, [{ code, value: d.status[code] }], null, { noRender: true, revertTo });
    }, 600);
  }

  function findDevice(id) { return S.data && S.data.devices.find((x) => x.id === id); }

  // ---------- Icons (inline stroke SVG) ----------
  const P = {
    light: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    lamp: '<path d="M8 3h8l3 7H5l3-7zM12 10v11M8 21h8"/>',
    ceiling: '<path d="M12 3v4M5 15a7 7 0 0 1 14 0zM10 18a2 2 0 0 0 4 0"/>',
    ring: '<circle cx="12" cy="10" r="7"/><circle cx="12" cy="10" r="3"/><path d="M12 17v4M8 21h8"/>',
    strip: '<path d="M3 14c3-6 6-6 9 0s6 6 9 0"/><path d="M6 10.5v.01M12 14v.01M18 17.5v.01"/>',
    switch: '<rect x="6" y="3" width="12" height="18" rx="3"/><path d="M12 7v4"/>',
    heater: '<path d="M8 3c-2 3 2 5 0 8M12 3c-2 3 2 5 0 8M16 3c-2 3 2 5 0 8M4 15h16v5H4z"/>',
    motion: '<path d="M12 12h.01M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    speaker: '<rect x="6" y="3" width="12" height="18" rx="3"/><circle cx="12" cy="14" r="3"/><path d="M12 7v.01"/>',
    appliance: '<path d="M6 8h11l-1 12H7L6 8zM9 8V5h5v3M17 10h2v5h-2.4"/>',
    router: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 16.5v.01M11 16.5v.01M8.5 9.5a5 5 0 0 1 7 0M6 7a9 9 0 0 1 12 0"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    remote: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M12 6v.01M10 10h4M10 13.5h4M10 17h4"/>',
    multi: '<rect x="2" y="8" width="20" height="8" rx="3"/><path d="M7 11v2M12 11v2M17 11v2"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v5"/>',
    climate: '<rect x="2" y="4" width="20" height="9" rx="2"/><path d="M6 9h12M8 17v3M12 17v4M16 17v3"/>',
    cover: '<path d="M3 3h18M5 3v18M19 3v18M5 21c2-5 2-11 0-18M19 21c-2-5-2-11 0-18"/>',
    fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7s2 5-2 7M14 12c4 0 7 1 7 4s-5 2-7-2M12 14c0 4-1 7-4 7s-2-5 2-7M10 12c-4 0-7-1-7-4s5-2 7 2"/>',
    sensor: '<path d="M6 3h9v18H6zM15 7l4 1v9l-4 1M11 12h.01"/>',
    thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
    camera: '<path d="M3 7h12v10H3zM15 10l6-3v10l-6-3"/>',
    generic: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 12h6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    scenes: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    power: '<path d="M12 3v8M6.3 7.3a8 8 0 1 0 11.4 0"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>',
    check: '<path d="M5 12l5 5 9-10"/>'
  };
  const icon = (name, size) => '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[name] + '</svg>';
  const ICON_CHOICES = [
    ['light', 'Bulb'], ['lamp', 'Floor lamp'], ['ceiling', 'Ceiling light'], ['ring', 'Ring lamp'],
    ['strip', 'Light strip'], ['plug', 'Plug'], ['multi', 'Power strip'], ['switch', 'Wall switch'],
    ['fan', 'Fan'], ['climate', 'Air conditioner'], ['heater', 'Heater'], ['thermo', 'Thermometer'],
    ['cover', 'Curtains'], ['sensor', 'Door sensor'], ['motion', 'Motion sensor'], ['camera', 'Camera'],
    ['tv', 'TV'], ['speaker', 'Speaker'], ['appliance', 'Appliance'], ['router', 'Router'], ['remote', 'Remote'], ['generic', 'Other']
  ];
  function iconKeyOf(d) {
    const custom = S.icons[d.id];
    if (custom && P[custom]) return custom;
    const k = kindOf(d);
    if (k === 'irac') return 'climate';
    if (k === 'irremote') {
      const map = { infrared_tv: 'tv', infrared_stb: 'tv', infrared_box: 'tv', infrared_fan: 'fan', infrared_light: 'light', infrared_amplifier: 'speaker', infrared_speaker: 'speaker' };
      return map[d.category] || 'remote';
    }
    if (k === 'sensor' && !('doorcontact_state' in d.status)) {
      if ('pir' in d.status) return 'motion';
      if ('va_temperature' in d.status || 'temp_current' in d.status) return 'thermo';
    }
    return P[k] ? k : 'generic';
  }
  function deviceIcon(d, size) { return icon(iconKeyOf(d), size); }

  // ---------- Views ----------
  function tabs(active) {
    const items = [['devices', 'Devices', 'grid'], ['scenes', 'Scenes', 'scenes'], ['me', 'Me', 'me']];
    return items.map(([id, label, ic]) =>
      '<button class="tab" data-act="tab" data-tab="' + id + '" data-key="tab-' + id + '"' +
      (active === id ? ' aria-current="page"' : '') + '><span class="pill">' + icon(ic) + '</span><span>' + label + '</span></button>'
    ).join('');
  }

  function switchBtn(d, extraKey, code) {
    const on = code ? !!d.status[code] : isOn(d);
    const label = code ? channelName(d, code) : d.name + (isMulti(d) ? ', all outlets' : ' power');
    return '<button class="switch" role="switch" aria-checked="' + on + '" aria-label="' + esc(label) + '"' +
      ' data-act="toggle" data-id="' + esc(d.id) + '"' + (code ? ' data-code="' + esc(code) + '"' : '') +
      ' data-key="sw-' + esc(d.id) + (code ? '-' + esc(code) : '') + (extraKey || '') + '"' +
      (d.online ? '' : ' disabled') + '><span class="knob"></span></button>';
  }

  function deviceCard(d, selectedId) {
    const on = isOn(d), toggle = hasToggle(d);
    const cls = ['card', toggle && on && d.online ? 'active' : '', d.online ? '' : 'offline', d.id === selectedId ? 'selected' : ''].join(' ');
    return '<div class="' + cls + '">' +
      '<button class="card-open" data-act="open" data-id="' + esc(d.id) + '" data-key="open-' + esc(d.id) + '" aria-label="' + esc(d.name) + ', ' + esc(statusText(d)) + ', show controls">' +
      '<span class="card-top"><span class="icon-dot">' + deviceIcon(d) + '</span><span class="card-room">' + esc(d.room) + '</span></span>' +
      '<span><span class="card-name">' + esc(d.name) + '</span><span class="card-status">' + esc(statusText(d)) + '</span></span>' +
      '</button>' +
      (toggle ? '<div class="card-foot"><span class="state">' + (on ? 'On' : 'Off') + '</span>' + switchBtn(d) + '</div>' : '') +
      '</div>';
  }

  function devicesView(selectedId) {
    const data = S.data;
    if (!data) return loadingView();
    const home = (data.homes || []).find((h) => h.id === data.homeId);
    const onCount = data.devices.filter((d) => hasToggle(d) && isOn(d) && d.online).length;
    const roomsWithDevices = (data.rooms || []).filter((r) => data.devices.some((d) => d.room === r));
    const hasOther = roomsWithDevices.length > 0 && data.devices.some((d) => !d.room);
    const rooms = ['All'].concat(roomsWithDevices, hasOther ? ['Other'] : []);
    if (!rooms.includes(S.room)) S.room = 'All';
    const shown = data.devices.filter((d) => S.room === 'All' || (S.room === 'Other' ? !d.room : d.room === S.room));

    const homes = data.homes || [];
    const titleHtml = homes.length > 1
      ? '<h1 class="title home-pick"><label class="sr-only" for="home-head">Home</label>' +
        '<select id="home-head" class="title-select" data-act="home" data-key="home-head">' +
        homes.map((h) => '<option value="' + esc(h.id) + '"' + (h.id === data.homeId ? ' selected' : '') + '>' + esc(h.name) + '</option>').join('') +
        '</select><span class="title-chevron" aria-hidden="true">' + icon('down', 22) + '</span></h1>'
      : '<h1 class="title">' + esc(home ? home.name : 'My Home') + '</h1>';
    let html = '<div class="head"><div><p class="sub">' + onCount + (onCount === 1 ? ' device on' : ' devices on') + '</p>' +
      titleHtml + '</div></div>';
    if (S.mode === 'demo') html += '<p class="banner">You are viewing sample devices. Connect your server in Me to control your own.</p>';
    if (rooms.length > 1) {
      html += '<div class="chips" role="group" aria-label="Rooms">' + rooms.map((r) =>
        '<button class="chip" data-act="room" data-room="' + esc(r) + '" data-key="room-' + esc(r) + '" aria-pressed="' + (r === S.room) + '">' + esc(r) + '</button>').join('') + '</div>';
    }
    if (!data.devices.length) {
      return html + '<div class="empty"><strong>No devices found</strong><p>Link your Tuya app account to your cloud project (see the README), then tap Refresh in Me.</p></div>';
    }
    const readings = shown.filter(isReadingDevice);
    const cards = shown.filter((d) => !isReadingDevice(d));
    if (readings.length) {
      html += '<div class="readings" role="list" aria-label="Readings">' + readings.map((d) => readingTile(d, S.room === 'All')).join('') + '</div>';
    }
    if (cards.length) html += '<div class="grid">' + cards.map((d) => deviceCard(d, selectedId)).join('') + '</div>';
    else if (!readings.length) html += '<div class="empty"><strong>Nothing in this room</strong><p>Assign devices to rooms in the Tuya app.</p></div>';
    return html;
  }

  function loadingView() {
    return '<div class="head"><div><p class="sub">Loading</p><h1 class="title">My Home</h1></div></div>' +
      '<div class="grid" aria-hidden="true">' + '<div class="skeleton"></div>'.repeat(4) + '</div>';
  }

  function rangeControl(id, label, value, min, max, endLow, endHigh, act, dataId) {
    return '<div class="range"><label class="sr-only" for="' + esc(id) + '">' + label + '</label>' +
      '<input id="' + esc(id) + '" type="range" min="' + min + '" max="' + max + '" value="' + value + '" data-act="' + act + '" data-id="' + esc(dataId) + '" data-key="' + esc(id) + '">' +
      '<div class="ends"><span>' + endLow + '</span><span>' + endHigh + '</span></div></div>';
  }

  function powerButton(d) {
    const on = isOn(d), multi = isMulti(d);
    const text = multi ? statusText(d) : (on ? 'On' : 'Off');
    const aria = multi ? (on ? 'Turn all outlets off' : 'Turn all outlets on') : d.name + ' power';
    return '<button class="power-btn" data-act="toggle" data-id="' + esc(d.id) + '" data-key="pwr-' + esc(d.id) + '" aria-pressed="' + on + '" aria-label="' + esc(aria) + '"' + (d.online ? '' : ' disabled') + '>' +
      icon('power', 40) + '<span>' + esc(text) + '</span></button>';
  }

  function iconSection(d, sfx) {
    const open = S.iconPicking === d.id;
    const current = iconKeyOf(d);
    const label = (ICON_CHOICES.find(([k]) => k === current) || [current, 'Other'])[1];
    let html = '<div class="list">' +
      '<button class="list-row" data-act="icon-open" data-id="' + esc(d.id) + '" data-key="icon-open' + sfx + '" aria-expanded="' + open + '" aria-controls="icons' + sfx + '">' +
      '<span class="label">Icon</span><span class="value icon-value">' + esc(label) + '<span class="mini-dot">' + icon(current, 18) + '</span></span></button>';
    if (open) {
      html += '<div class="icon-pick" id="icons' + sfx + '">' +
        '<div class="icon-grid" role="radiogroup" aria-label="Icon for ' + esc(d.name) + '">' +
        ICON_CHOICES.map(([k, name]) =>
          '<button class="icon-choice" role="radio" aria-checked="' + (k === current) + '" data-act="icon-set" data-id="' + esc(d.id) + '" data-icon="' + k + '" data-key="icon-' + k + sfx + '">' +
          icon(k, 22) + '<span>' + name + '</span></button>').join('') +
        '</div>' +
        '<div class="icon-actions">' +
        (S.icons[d.id] ? '<button class="chip soft" data-act="icon-reset" data-id="' + esc(d.id) + '" data-key="icon-reset' + sfx + '">Use default</button>' : '') +
        '<button class="chip soft" data-act="icon-open" data-id="' + esc(d.id) + '" data-key="icon-done' + sfx + '">Done</button></div>' +
        '<p class="note icon-note">Icons are saved in this browser, so set them once on each phone or tablet you use.</p>' +
        '</div>';
    }
    return html + '</div>';
  }

  function irRemotePad(d, sfx) {
    const entry = S.irKeys[d.id];
    if (!entry) { loadIrKeys(d); return '<p class="note">Loading buttons…</p>'; }
    if (entry === 'loading') return '<p class="note">Loading buttons…</p>';
    if (entry.error) {
      return '<p class="note">Couldn\'t load this remote\'s buttons: ' + esc(entry.error) + '</p>' +
        '<button class="chip soft" data-act="irreload" data-id="' + esc(d.id) + '" data-key="irreload' + sfx + '">Try again</button>';
    }
    if (!entry.keys.length) return '<p class="note">This remote has no buttons that can be sent from here.</p>';
    const btn = (k, cls) => {
      const sent = S.irSent[d.id + '|' + k.key];
      return '<button class="' + cls + (sent ? ' sent' : '') + '" data-act="irkey" data-id="' + esc(d.id) + '" data-k="' + esc(k.key) + '" data-key="irk-' + esc(k.key) + sfx + '">' +
        (cls === 'power-btn' ? icon('power', 36) : '') + '<span>' + esc(sent ? 'Sent' : k.name) + '</span></button>';
    };
    const power = entry.keys.filter((k) => /power/i.test(k.key));
    const rest = entry.keys.filter((k) => !/power/i.test(k.key));
    return (power.length ? '<div class="ir-power">' + power.slice(0, 2).map((k) => btn(k, 'power-btn')).join('') + '</div>' : '') +
      (rest.length ? '<div class="ir-keys" role="group" aria-label="Remote buttons">' + rest.map((k) => btn(k, 'chip soft ir-key')).join('') + '</div>' : '') +
      '<p class="note">Each button sends its IR code once, like pressing it on the remote.</p>';
  }

  async function loadIrKeys(d) {
    S.irKeys[d.id] = 'loading';
    try {
      const r = await api('ir?hubId=' + encodeURIComponent(d.ir.hub || 'none') + '&remoteId=' + encodeURIComponent(d.id));
      S.irKeys[d.id] = { keys: r.keys || [], categoryId: r.categoryId };
    } catch (e) {
      S.irKeys[d.id] = { error: e.message };
    }
    if (!S.dragging && !S.renaming) render();
  }

  async function sendIrKey(d, keyName) {
    const entry = S.irKeys[d.id];
    const k = entry && entry.keys && entry.keys.find((x) => x.key === keyName);
    if (!k) return;
    const sentKey = d.id + '|' + k.key;
    try {
      await api('ir', { method: 'POST', body: {
        hubId: d.ir.hub || 'none', remoteId: d.id, action: 'key',
        categoryId: d.ir.categoryId != null && !Number.isNaN(d.ir.categoryId) ? d.ir.categoryId : (entry.categoryId ?? 0),
        key: k.key, keyId: k.keyId, std: !!k.std
      } });
      S.irSent[sentKey] = true; render();
      setTimeout(() => { delete S.irSent[sentKey]; render(); }, 900);
    } catch (e) {
      toast(k.name + ': ' + e.message);
    }
  }

  // AC over IR: every change sends the full set of settings, debounced for quick taps.
  const irPending = {};
  function sendIrAc(d, patch) {
    const st2 = d.ir.state || (d.ir.state = { power: false, mode: 0, temp: 24, wind: 0 });
    if (!irPending[d.id]) irPending[d.id] = { before: Object.assign({}, st2), changed: new Set() };
    for (const k of Object.keys(patch)) if (st2[k] !== patch[k]) irPending[d.id].changed.add(k);
    Object.assign(st2, patch);
    render();
    clearTimeout(irPending[d.id].t);
    irPending[d.id].t = setTimeout(async () => {
      const before = irPending[d.id].before;
      const changed = Array.from(irPending[d.id].changed);
      delete irPending[d.id];
      if (!changed.length) return;
      try {
        await api('ir', { method: 'POST', body: {
          hubId: d.ir.hub || 'none', remoteId: d.id, action: 'ac',
          power: st2.power ? 1 : 0, mode: st2.mode, temp: st2.temp, wind: st2.wind, changed
        } });
      } catch (e) {
        d.ir.state = before; render();
        toast(d.name + ': ' + e.message);
      }
    }, 500);
  }

  function channelRow(d, code, sfx) {
    const name = channelName(d, code);
    const rk = esc(d.id) + '-' + esc(code) + sfx;
    if (S.renaming && S.renaming.id === d.id && S.renaming.code === code) {
      return '<form class="list-row rename" data-act="rename-save" data-id="' + esc(d.id) + '" data-code="' + esc(code) + '" novalidate>' +
        '<label class="sr-only" for="rn-' + rk + '">New name for ' + esc(name) + '</label>' +
        '<input id="rn-' + rk + '" name="name" maxlength="40" autocomplete="off" value="' + esc(name) + '" data-key="rn-' + rk + '">' +
        '<button type="submit" class="chip soft" data-key="rn-save-' + rk + '">Save</button>' +
        '<button type="button" class="chip soft" data-act="rename-cancel" data-key="rn-cancel-' + rk + '">Cancel</button></form>';
    }
    return '<div class="list-row"><span class="channel"><span class="label">' + esc(name) + '</span>' +
      '<button class="edit-btn" data-act="rename" data-id="' + esc(d.id) + '" data-code="' + esc(code) + '" data-key="rn-edit-' + rk + '" aria-label="Rename ' + esc(name) + '"' + (d.online ? '' : ' disabled') + '>' + icon('pencil', 16) + '</button></span>' +
      switchBtn(d, sfx, code) + '</div>';
  }

  function detailView(d, inPanel) {
    if (!d) return '<div class="empty"><strong>Pick a device</strong><p>Its controls appear here.</p></div>';
    const k = kindOf(d), st = d.status;
    const sfx = inPanel ? '-p' : '-d';
    const dis = d.online ? '' : ' disabled';
    let hero = '';
    let heroHasPower = false;

    if (!d.online) {
      hero = '<div class="stack-center"><span class="big mid">Offline</span><span class="big-label">Check its power and Wi-Fi. Controls return when it reconnects.</span></div>';
    } else if (k === 'light') {
      const bc = brightCode(d), wc = warmCode(d);
      if (bc) {
        const pct = toPct(st[bc], lightRange(d, bc));
        hero += '<div class="stack-center"><span class="big" data-live="bright-' + esc(d.id) + '">' + (specReady(d) ? pct + '%' : '…') + '</span><span class="big-label">Brightness</span></div>' +
          rangeControl('bright-' + d.id + sfx, 'Brightness', pct, 1, 100, 'Low', 'High', 'bright', d.id);
      } else {
        hero += powerButton(d); heroHasPower = true;
      }
      if (wc) {
        const pct = toPct(st[wc], lightRange(d, wc, true));
        const presets = [['Warm', 1], ['Neutral', 50], ['Cool', 100]];
        hero += '<div class="seg" style="--n:3" role="group" aria-label="Color temperature">' + presets.map(([n, p]) =>
          '<button class="chip soft" data-act="warmth" data-id="' + esc(d.id) + '" data-pct="' + p + '" data-key="warm-' + n + sfx + '" aria-pressed="' + (Math.abs(pct - p) <= 12) + '">' + n + '</button>').join('') + '</div>';
      }
    } else if (k === 'climate' && 'temp_set' in st) {
      const set = scaled(d, 'temp_set', true);
      const cur = scaled(d, 'temp_current', true);
      hero += '<div class="row-between">' +
        '<button class="round-btn soft" data-act="temp" data-delta="-1" data-id="' + esc(d.id) + '" data-key="tdown' + sfx + '" aria-label="Lower temperature">' + icon('minus') + '</button>' +
        '<div class="stack-center"><span class="big">' + fmtTemp(set) + '</span><span class="big-label">' + (cur != null ? 'Room is ' + fmtTemp(cur) : 'Target temperature') + '</span></div>' +
        '<button class="round-btn soft" data-act="temp" data-delta="1" data-id="' + esc(d.id) + '" data-key="tup' + sfx + '" aria-label="Raise temperature">' + icon('plus') + '</button></div>';
      if ('mode' in st) {
        const sp = specOf(d, 'mode');
        const modes = (sp && Array.isArray(sp.range) && sp.range.length) ? sp.range : ['cold', 'hot', 'wind', 'auto'];
        hero += '<div class="seg" style="--n:' + Math.min(4, modes.length) + '" role="group" aria-label="Mode">' + modes.map((m) =>
          '<button class="chip soft" data-act="mode" data-id="' + esc(d.id) + '" data-val="' + esc(m) + '" data-key="mode-' + esc(m) + sfx + '" aria-pressed="' + (st.mode === m) + '">' + esc(modeLabel(m)) + '</button>').join('') + '</div>';
      }
    } else if (k === 'cover') {
      const p = st.percent_control ?? st.percent_state;
      hero += '<div class="stack-center"><span class="big" data-live="cover-' + esc(d.id) + '">' + (typeof p === 'number' ? p + '%' : '–') + '</span><span class="big-label">Open</span></div>';
      if ('percent_control' in st) hero += rangeControl('cover-' + d.id + sfx, 'Position', p || 0, 0, 100, 'Closed', 'Open', 'coverpos', d.id);
      if ('control' in st) {
        hero += '<div class="seg" style="--n:3" role="group" aria-label="Move">' + [['open', 'Open'], ['stop', 'Stop'], ['close', 'Close']].map(([v, n]) =>
          '<button class="chip soft" data-act="cover" data-id="' + esc(d.id) + '" data-val="' + v + '" data-key="cov-' + v + sfx + '">' + n + '</button>').join('') + '</div>';
      }
    } else if (k === 'fan' && typeof st.fan_speed_percent === 'number') {
      hero += '<div class="stack-center"><span class="big" data-live="fan-' + esc(d.id) + '">' + st.fan_speed_percent + '%</span><span class="big-label">Fan speed</span></div>' +
        rangeControl('fan-' + d.id + sfx, 'Fan speed', st.fan_speed_percent, 1, 100, 'Slow', 'Fast', 'fanspeed', d.id);
    } else if (k === 'sensor') {
      hero += '<div class="stack-center"><span class="big mid">' + esc(sensorReading(d)) + '</span><span class="big-label">Current reading</span></div>';
    } else if (k === 'camera') {
      hero += '<div class="stack-center"><span class="icon-dot" style="width:72px;height:72px;border-radius:36px">' + icon('camera', 32) + '</span>' +
        '<p class="note">Live video is not available in this app yet. Open the camera in the Tuya app to watch.</p></div>';
    } else if (k === 'irac') {
      const st2 = d.ir.state || { power: false, mode: 0, temp: 24, wind: 0 };
      hero += '<div class="row-between">' +
        '<button class="round-btn soft" data-act="irtemp" data-delta="-1" data-id="' + esc(d.id) + '" data-key="irdown' + sfx + '" aria-label="Lower temperature">' + icon('minus') + '</button>' +
        '<div class="stack-center"><span class="big">' + st2.temp + '°</span><span class="big-label">' + (st2.power ? 'Target temperature' : 'Off') + '</span></div>' +
        '<button class="round-btn soft" data-act="irtemp" data-delta="1" data-id="' + esc(d.id) + '" data-key="irup' + sfx + '" aria-label="Raise temperature">' + icon('plus') + '</button></div>' +
        '<div class="seg-label">Mode</div><div class="seg" style="--n:5" role="group" aria-label="Mode">' + IR_MODES.map((m, i) =>
          '<button class="chip soft" data-act="irmode" data-v="' + i + '" data-id="' + esc(d.id) + '" data-key="irmode-' + i + sfx + '" aria-pressed="' + (st2.power && st2.mode === i) + '">' + m + '</button>').join('') + '</div>' +
        '<div class="seg-label">Fan</div><div class="seg" style="--n:4" role="group" aria-label="Fan speed">' + IR_WIND.map((w, i) =>
          '<button class="chip soft" data-act="irwind" data-v="' + i + '" data-id="' + esc(d.id) + '" data-key="irwind-' + i + sfx + '" aria-pressed="' + (st2.power && st2.wind === i) + '">' + w + '</button>').join('') + '</div>' ;
    } else if (k === 'irremote') {
      hero += irRemotePad(d, sfx);
    } else if (k === 'multi') {
      hero += powerButton(d); heroHasPower = true;
      hero += '<p class="note">Turns every outlet on or off together. Control each one below.</p>';
    } else if (powerCode(d)) {
      hero += powerButton(d); heroHasPower = true;
    } else {
      hero += '<div class="stack-center"><span class="big mid">Online</span><span class="big-label">This app does not have controls for this device type yet.</span></div>';
    }

    const rows = [];
    if (k === 'multi' && d.online) channelCodes(d).forEach((c) => rows.push(channelRow(d, c, sfx)));
    if (hasToggle(d) && !heroHasPower) {
      rows.push('<div class="list-row"><span class="label">Power</span>' + switchBtn(d, sfx) + '</div>');
    }
    if (k === 'sensor') {
      const tt = scaled(d, 'va_temperature', true), hh = scaled(d, 'va_humidity', false);
      if (tt != null) rows.push('<div class="list-row"><span class="label">Temperature</span><span class="value">' + fmtTemp(tt) + '</span></div>');
      if (hh != null) rows.push('<div class="list-row"><span class="label">Humidity</span><span class="value">' + Math.round(hh) + '%</span></div>');
    }
    if (typeof st.battery_percentage === 'number') rows.push('<div class="list-row"><span class="label">Battery</span><span class="value">' + st.battery_percentage + '%</span></div>');
    rows.push('<div class="list-row"><span class="label">Model</span><span class="value">' + esc(d.product || d.category) + '</span></div>');

    return '<div class="detail">' +
      '<div class="detail-head">' +
      (inPanel ? '' : '<button class="round-btn" data-act="back" data-key="back" aria-label="Back to devices">' + icon('back', 20) + '</button>') +
      '<span class="icon-dot head-icon">' + deviceIcon(d) + '</span>' +
      '<div><p class="sub">' + esc(d.room || 'No room') + '</p><h2 class="detail-title">' + esc(d.name) + '</h2></div></div>' +
      '<div class="hero">' + hero + '</div>' +
      '<div class="list">' + rows.join('') + '</div>' +
      iconSection(d, sfx) +
      '</div>';
  }

  function scenesView(withAutomations) {
    const data = S.data;
    if (!data) return loadingView();
    let html = '<div class="head"><div><p class="sub">Tap a scene to run it</p><h1 class="title">Scenes</h1></div>' +
      '<button class="pill-btn" data-act="scene-new" data-key="scene-new">' + icon('plus', 18) + 'New scene</button></div>';
    if (!data.scenes.length) {
      html += '<div class="empty"><strong>No tap-to-run scenes yet</strong><p>Tap New scene to make one. Scenes you create in the Tuya app show up here too.</p></div>';
    } else {
      html += '<div class="grid">' + data.scenes.map((s) => {
        const state = S.sceneState[s.id];
        const meta = state === 'running' ? 'Running' : state === 'done' ? 'Done' : (s.actions === 1 ? '1 action' : s.actions + ' actions');
        return '<div class="scene-wrap"><button class="scene ' + (state || '') + '" data-act="scene" data-id="' + esc(s.id) + '" data-key="scene-' + esc(s.id) + '"' + (state === 'running' ? ' disabled' : '') + '>' +
          '<span class="icon-dot">' + icon(state === 'done' ? 'check' : 'play', 16) + '</span>' +
          '<span><span class="name">' + esc(s.name) + '</span><span class="meta">' + meta + '</span></span></button>' +
          '<button class="scene-edit edit-btn" data-act="scene-open" data-id="' + esc(s.id) + '" data-key="scene-edit-' + esc(s.id) + '" aria-label="Edit ' + esc(s.name) + '">' + icon('pencil', 16) + '</button></div>';
      }).join('') + '</div>';
    }
    if (withAutomations) html += '<h2 class="section-title">Automations</h2>' + automationsList();
    return html;
  }

  // ---------- Scene editor ----------
  const SCENE_KINDS = ['light', 'plug', 'multi', 'climate', 'cover', 'fan', 'generic'];
  function sceneEligible(d) {
    const k = kindOf(d);
    if (!SCENE_KINDS.includes(k)) return false;
    if (k === 'generic') return !!powerCode(d);
    if (k === 'cover') return 'control' in d.status || 'percent_control' in d.status;
    return true;
  }
  function defaultProps(d) {
    const k = kindOf(d), pc = powerCode(d), p = {};
    if (k === 'multi') { channelCodes(d).forEach((c) => { p[c] = true; }); return p; }
    if (k === 'cover') { if ('control' in d.status) p.control = 'open'; else p.percent_control = 100; return p; }
    if (pc) p[pc] = true;
    return p;
  }
  function stepsToItems(steps) {
    return (steps || []).map((a) => {
      if (a.executor === 'delay') {
        const p = a.props || {};
        return { type: 'delay', minutes: Number(p.hours || 0) * 60 + Number(p.minutes || 0), seconds: Number(p.seconds || 0) };
      }
      const d = a.executor === 'dpIssue' ? findDevice(a.entity) : null;
      if (d && sceneEligible(d)) return { type: 'device', deviceId: d.id, props: Object.assign({}, a.props) };
      return { type: 'raw', raw: { action_executor: a.executor, entity_id: a.entity || undefined, executor_property: a.props || {} } };
    });
  }
  function openEditor(id) {
    if (!S.data) return;
    const sc = id === 'new' ? null : S.data.scenes.find((x) => x.id === id);
    S.editor = {
      routeId: id, id: sc ? sc.id : null, name: sc ? sc.name : '',
      background: sc ? sc.background : ((S.data.scenes.find((x) => x.background) || {}).background || ''),
      items: sc ? stepsToItems(sc.steps) : [], picking: !sc, saving: false, confirmDelete: false, error: ''
    };
    S.editor.items.forEach((it) => { if (it.type === 'device' && !S.specs[it.deviceId]) loadSpec(it.deviceId, true); });
  }

  function seChips(i, code, options, current) {
    return '<div class="seg" style="--n:' + options.length + '">' + options.map(([label, val]) => {
      const pressed = val === 'keep' ? current === undefined : current === val;
      return '<button class="chip soft" data-act="se-prop" data-i="' + i + '" data-code="' + esc(code) + '" data-val="' + esc(JSON.stringify(val)) + '" data-key="se-' + i + '-' + esc(code) + '-' + esc(String(val)) + '" aria-pressed="' + pressed + '">' + label + '</button>';
    }).join('') + '</div>';
  }
  function seRange(i, code, pct, low, high, label) {
    const id = 'se-r-' + i + '-' + code;
    return '<div class="range"><div class="row-between"><label class="se-label" for="' + esc(id) + '">' + label + '</label>' +
      '<span class="se-value" data-live="se-' + i + '-' + esc(code) + '">' + pct + '%</span></div>' +
      '<input id="' + esc(id) + '" type="range" min="1" max="100" value="' + pct + '" data-act="se-range" data-i="' + i + '" data-code="' + esc(code) + '" data-key="' + esc(id) + '">' +
      '<div class="ends"><span>' + low + '</span><span>' + high + '</span></div></div>';
  }
  function seTempValue(d, raw) {
    const sp = specOf(d, 'temp_set');
    const scale = sp && typeof sp.scale === 'number' ? sp.scale : (Math.abs(raw) >= 60 ? 1 : 0);
    return raw / Math.pow(10, scale);
  }

  function deviceActionControls(it, i) {
    const d = findDevice(it.deviceId), p = it.props, k = kindOf(d), pc = powerCode(d);
    const OnOff = [['On', true], ['Off', false]];
    let html = '';
    if (k === 'multi') {
      html += channelCodes(d).map((c) => '<div class="se-row"><span class="se-label">' + esc(channelName(d, c)) + '</span>' +
        seChips(i, c, [['Keep', 'keep'], ['On', true], ['Off', false]], p[c]) + '</div>').join('');
      return html;
    }
    if (k === 'cover') {
      if ('control' in d.status) return seChips(i, 'control', [['Open', 'open'], ['Stop', 'stop'], ['Close', 'close']], p.control);
      return seRange(i, 'percent_control', clamp(Number(p.percent_control ?? 100), 1, 100), 'Closed', 'Open', 'Position');
    }
    if (pc) html += seChips(i, pc, OnOff, p[pc]);
    const on = !pc || p[pc] !== false;
    if (k === 'light' && on) {
      const bc = brightCode(d), wc = warmCode(d);
      if (bc) {
        const r = lightRange(d, bc);
        html += p[bc] === undefined
          ? '<button class="chip soft se-add" data-act="se-prop" data-i="' + i + '" data-code="' + esc(bc) + '" data-val="' + fromPct(100, r) + '" data-key="se-' + i + '-addbright">Set brightness</button>'
          : seRange(i, bc, toPct(p[bc], r), 'Low', 'High', 'Brightness');
      }
      if (wc) {
        const r = lightRange(d, wc, true);
        const cur = p[wc] === undefined ? 'keep' : toPct(p[wc], r);
        html += '<div class="seg" style="--n:4" role="group" aria-label="Color temperature">' + [['Keep', 'keep'], ['Warm', 1], ['Neutral', 50], ['Cool', 100]].map(([label, v]) => {
          const val = v === 'keep' ? 'keep' : fromPct(v, r);
          const pressed = v === 'keep' ? cur === 'keep' : cur !== 'keep' && Math.abs(cur - v) <= 12;
          return '<button class="chip soft" data-act="se-prop" data-i="' + i + '" data-code="' + esc(wc) + '" data-val="' + esc(JSON.stringify(val)) + '" data-key="se-' + i + '-warm-' + label + '" aria-pressed="' + pressed + '">' + label + '</button>';
        }).join('') + '</div>';
      }
    }
    if (k === 'climate' && on && 'temp_set' in d.status) {
      const raw = p.temp_set ?? d.status.temp_set;
      html += '<div class="se-row"><span class="se-label">Temperature</span><div class="stepper">' +
        '<button class="round-btn soft sm" data-act="se-temp" data-i="' + i + '" data-delta="-1" data-key="se-' + i + '-tdown" aria-label="Lower temperature">' + icon('minus', 18) + '</button>' +
        '<span class="se-value">' + (p.temp_set === undefined ? 'Keep' : fmtTemp(seTempValue(d, raw))) + '</span>' +
        '<button class="round-btn soft sm" data-act="se-temp" data-i="' + i + '" data-delta="1" data-key="se-' + i + '-tup" aria-label="Raise temperature">' + icon('plus', 18) + '</button></div></div>';
      if ('mode' in d.status) {
        const sp = specOf(d, 'mode');
        const modes = (sp && Array.isArray(sp.range) && sp.range.length) ? sp.range : ['cold', 'hot', 'wind', 'auto'];
        html += seChips(i, 'mode', [['Keep', 'keep']].concat(modes.slice(0, 4).map((m) => [esc(modeLabel(m)), m])), p.mode);
      }
    }
    if (k === 'fan' && on && typeof d.status.fan_speed_percent === 'number') {
      html += p.fan_speed_percent === undefined
        ? '<button class="chip soft se-add" data-act="se-prop" data-i="' + i + '" data-code="fan_speed_percent" data-val="50" data-key="se-' + i + '-addfan">Set fan speed</button>'
        : seRange(i, 'fan_speed_percent', clamp(Number(p.fan_speed_percent), 1, 100), 'Slow', 'Fast', 'Fan speed');
    }
    return html;
  }

  function sceneItemCard(it, i, count) {
    const moves = '<div class="se-tools">' +
      '<button class="edit-btn" data-act="se-move" data-i="' + i + '" data-dir="-1" data-key="se-up-' + i + '" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>' + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>' +
      '<button class="edit-btn" data-act="se-move" data-i="' + i + '" data-dir="1" data-key="se-down-' + i + '" aria-label="Move down"' + (i === count - 1 ? ' disabled' : '') + '>' + icon('down', 16) + '</button>' +
      '<button class="edit-btn" data-act="se-remove" data-i="' + i + '" data-key="se-rm-' + i + '" aria-label="Remove this action"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
    if (it.type === 'delay') {
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>' + '</span><span class="se-title">Wait</span>' + moves + '</div>' +
        '<div class="se-delay"><label class="field-inline"><span>Minutes</span><input type="number" inputmode="numeric" min="0" max="59" value="' + it.minutes + '" data-act="se-delay" data-i="' + i + '" data-field="minutes" data-key="se-dm-' + i + '"></label>' +
        '<label class="field-inline"><span>Seconds</span><input type="number" inputmode="numeric" min="0" max="59" value="' + it.seconds + '" data-act="se-delay" data-i="' + i + '" data-field="seconds" data-key="se-ds-' + i + '"></label></div></div>';
    }
    if (it.type === 'raw') {
      const d = it.raw.entity_id ? findDevice(it.raw.entity_id) : null;
      const what = /^ir/.test(it.raw.action_executor) ? 'IR remote action' : /^rule/.test(it.raw.action_executor) ? 'Automation action' : 'Action';
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + (d ? deviceIcon(d, 18) : icon('generic', 18)) + '</span>' +
        '<span class="se-title">' + esc(d ? d.name : what) + '</span>' + moves + '</div>' +
        '<p class="note se-note">' + what + ' set up in the Tuya app. It\'s kept as is when you save.</p></div>';
    }
    const d = findDevice(it.deviceId);
    if (!d) {
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + icon('generic', 18) + '</span><span class="se-title">Device not found</span>' + moves + '</div>' +
        '<p class="note se-note">This device isn\'t in the selected home anymore. Remove it to save the scene.</p></div>';
    }
    return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + deviceIcon(d, 18) + '</span>' +
      '<span class="se-title">' + esc(d.name) + (d.room ? '<span class="se-room">' + esc(d.room) + '</span>' : '') + '</span>' + moves + '</div>' +
      '<div class="se-controls">' + deviceActionControls(it, i) + '</div></div>';
  }

  function sceneEditorView(routeId) {
    if (!S.data) return loadingView();
    if (!S.editor || S.editor.routeId !== routeId) openEditor(routeId);
    const E = S.editor;
    if (!E || (routeId !== 'new' && !E.id)) {
      return '<div class="empty"><strong>Scene not found</strong><p>It may have been deleted in the Tuya app.</p></div>';
    }
    let html = '<div class="detail-head se-head-top"><button class="round-btn" data-act="se-cancel" data-key="se-back" aria-label="Back to scenes">' + icon('back', 20) + '</button>' +
      '<div><p class="sub">Tap-to-run scene</p><h1 class="detail-title">' + (E.id ? 'Edit scene' : 'New scene') + '</h1></div></div>';
    html += '<div class="field"><label for="se-name">Scene name</label><input id="se-name" maxlength="40" autocomplete="off" placeholder="For example, Movie night" value="' + esc(E.name) + '" data-act="se-name" data-key="se-name"></div>';
    html += '<h2 class="section-title">Actions</h2>';
    if (!E.items.length && !E.picking) html += '<div class="empty"><strong>No actions yet</strong><p>Add the devices this scene should control.</p></div>';
    html += '<div class="se-list">' + E.items.map((it, i) => sceneItemCard(it, i, E.items.length)).join('') + '</div>';
    if (E.picking) {
      const eligible = S.data.devices.filter(sceneEligible);
      html += '<div class="list se-picker"><div class="list-row"><span class="label">Choose a device</span>' +
        '<button class="chip soft" data-act="se-pick-close" data-key="se-pick-close">Close</button></div>' +
        (eligible.length ? eligible.map((d) => '<button class="list-row" data-act="se-pick" data-id="' + esc(d.id) + '" data-key="se-pick-' + esc(d.id) + '">' +
          '<span class="channel"><span class="icon-dot sm">' + deviceIcon(d, 18) + '</span><span class="label">' + esc(d.name) + '</span></span><span class="value">' + esc(d.room || '') + '</span></button>').join('')
          : '<div class="list-row"><span class="meta">No devices here can be used in scenes yet.</span></div>') +
        '<p class="note se-note">Sensors, cameras and IR remotes can\'t be added here yet. Add IR remote actions in the Tuya app; they\'re kept when you edit the scene here.</p></div>';
    } else {
      html += '<div class="se-add-row"><button class="pill-btn" data-act="se-pick-open" data-key="se-pick-open">' + icon('plus', 18) + 'Add device</button>' +
        '<button class="pill-btn soft" data-act="se-add-delay" data-key="se-add-delay">' + icon('plus', 18) + 'Add wait</button></div>';
    }
    if (E.error) html += '<p class="error" role="alert">' + esc(E.error) + '</p>';
    html += '<div class="se-actions">' +
      '<button class="btn" data-act="se-save" data-key="se-save"' + (E.saving ? ' disabled' : '') + '>' + (E.saving ? 'Saving…' : 'Save scene') + '</button>' +
      '<button class="btn ghost" data-act="se-cancel" data-key="se-cancel">Cancel</button></div>';
    if (E.id) {
      html += '<div class="list" style="margin-top:20px"><button class="list-row danger" data-act="se-delete" data-key="se-delete"' + (E.saving ? ' disabled' : '') + '>' +
        '<span class="label">' + (E.confirmDelete ? 'Tap again to delete this scene' : 'Delete scene') + '</span></button></div>';
    }
    return html;
  }

  function editorActions() {
    const E = S.editor;
    if (!E.name.trim()) return 'Give the scene a name.';
    if (!E.items.length) return 'Add at least one action.';
    if (E.items[E.items.length - 1].type === 'delay') return 'A scene can\'t end with a wait. Add an action after it, or remove the wait.';
    if (E.items.filter((it) => it.type === 'delay').length > 2) return 'A scene can have at most 2 waits.';
    const out = [];
    for (const it of E.items) {
      if (it.type === 'delay') {
        const total = (it.minutes || 0) * 60 + (it.seconds || 0);
        if (total <= 0) return 'Each wait needs at least 1 second.';
        out.push({ action_executor: 'delay', executor_property: {
          hours: String(Math.floor(total / 3600)), minutes: String(Math.floor((total % 3600) / 60)), seconds: String(total % 60) } });
      } else if (it.type === 'raw') {
        out.push(it.raw);
      } else {
        const d = findDevice(it.deviceId);
        if (!d) return 'Remove the device that\'s no longer in this home.';
        if (!Object.keys(it.props).length) return 'Choose what ' + d.name + ' should do.';
        out.push({ action_executor: 'dpIssue', entity_id: d.id, executor_property: it.props });
      }
    }
    return out;
  }

  async function saveScene() {
    const E = S.editor;
    const actions = editorActions();
    if (typeof actions === 'string') { E.error = actions; render(); return; }
    E.saving = true; E.error = ''; render();
    try {
      await api('scene-edit', { method: 'POST', body: {
        op: E.id ? 'update' : 'create', homeId: S.data.homeId, sceneId: E.id || undefined,
        name: E.name.trim(), background: E.background || undefined, actions
      } });
      toast(E.id ? 'Scene saved' : 'Scene created');
      S.editor = null;
      go('scenes');
      refresh({ silent: true });
    } catch (e) {
      E.saving = false; E.error = 'Couldn\'t save: ' + e.message; render();
    }
  }

  async function deleteScene() {
    const E = S.editor;
    if (!E.confirmDelete) { E.confirmDelete = true; render(); return; }
    E.saving = true; render();
    try {
      await api('scene-edit', { method: 'POST', body: { op: 'delete', homeId: S.data.homeId, sceneId: E.id } });
      toast('Scene deleted');
      S.editor = null;
      go('scenes');
      refresh({ silent: true });
    } catch (e) {
      E.saving = false; E.confirmDelete = false; E.error = 'Couldn\'t delete: ' + e.message; render();
    }
  }

  function automationsList() {
    const a = S.data ? S.data.automations : [];
    if (!a.length) return '<div class="empty"><strong>No automations</strong><p>Automations you create in the Tuya app appear here, where you can switch them on or off.</p></div>';
    return '<div class="list">' + a.map((x) =>
      '<div class="list-row"><span class="label">' + esc(x.name) + '</span>' +
      '<button class="switch" role="switch" aria-checked="' + x.enabled + '" aria-label="' + esc(x.name) + '" data-act="auto" data-id="' + esc(x.id) + '" data-key="auto-' + esc(x.id) + '"><span class="knob"></span></button></div>'
    ).join('') + '</div>';
  }

  function automationsPanel() {
    const a = S.data ? S.data.automations : [];
    const active = a.filter((x) => x.enabled).length;
    return '<div class="detail"><div class="detail-head"><div><p class="sub">' +
      active + ' of ' + a.length + ' on</p><h2 class="detail-title">Automations</h2></div></div>' + automationsList() + '</div>';
  }

  function meView() {
    const data = S.data;
    const live = S.mode === 'live';
    const updated = data && data.at ? new Date(data.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    let html = '<div class="head"><div><p class="sub">' + (live ? 'Connected to Tuya Cloud' : 'Sample devices') + '</p><h1 class="title">Me</h1></div></div>';
    html += '<div class="list">';
    if (data && data.homes && data.homes.length > 1) {
      html += '<div class="list-row"><label class="label" for="home-select">Home</label><select id="home-select" data-act="home" data-key="home-select">' +
        data.homes.map((h) => '<option value="' + esc(h.id) + '"' + (h.id === data.homeId ? ' selected' : '') + '>' + esc(h.name) + '</option>').join('') + '</select></div>';
    }
    html += '<button class="list-row" data-act="refresh" data-key="refresh"><span class="label">Refresh now</span><span class="value">' + (updated ? 'Updated ' + updated : '') + '</span></button>';
    if (S.installPrompt) html += '<button class="list-row" data-act="install" data-key="install"><span class="label">Install app</span>' + icon('chevron', 16) + '</button>';
    if (!live) html += '<button class="list-row" data-act="live" data-key="live"><span class="label">Connect my server</span>' + icon('chevron', 16) + '</button>';
    html += '</div>';
    if (live) {
      const hasPin = !!readVault();
      html += '<h2 class="section-title">Security</h2><div class="list">';
      if (pinSupported) {
        html += hasPin
          ? '<button class="list-row" data-act="pin-setup" data-key="pin-change"><span class="label">Change PIN</span>' + icon('chevron', 16) + '</button>' +
            '<button class="list-row" data-act="pin-off" data-key="pin-off"><span class="label">Turn off PIN</span><span class="value">Opens without unlocking</span></button>'
          : '<button class="list-row" data-act="pin-setup" data-key="pin-setup"><span class="label">Unlock with a PIN</span><span class="value">Off</span></button>';
      }
      html += '<button class="list-row danger" data-act="lock" data-key="lock"><span class="label">Lock app</span><span class="value">' +
        (hasPin ? 'Asks for your PIN' : 'Asks for the password again') + '</span></button></div>';
      if (hasPin) html += '<p class="note" style="text-align:left;margin-top:10px">Home also locks itself after 5 minutes in the background. After ' + PIN_TRIES + ' wrong PINs it asks for your password instead.</p>';
    }
    if (data && data.warnings && data.warnings.length) {
      html += '<h2 class="section-title">Needs attention</h2><div class="list">' + data.warnings.map((w) =>
        '<div class="list-row"><span class="meta">' + esc(w) + '</span></div>').join('') + '</div>' +
        '<p class="note" style="text-align:left;margin-top:10px">A permission error usually means a service is not yet authorized in your Tuya cloud project. The README explains how to add it.</p>';
    }
    html += '<h2 class="section-title">About</h2><div class="list">' +
      '<div class="list-row"><span class="label">Adding devices</span><span class="value">Pair them in the Tuya app</span></div>' +
      '<div class="list-row"><span class="label">Version</span><span class="value">1.7.0</span></div></div>';
    return html;
  }

  function keypad() {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    return '<div class="keypad" role="group" aria-label="PIN keypad">' + keys.map((k) => {
      if (!k) return '<span></span>';
      if (k === 'del') return '<button type="button" class="key key-del" data-act="pin-del" data-key="pin-del" aria-label="Delete last digit"' + (S.pinBusy ? ' disabled' : '') + '>' + icon('back', 24) + '</button>';
      return '<button type="button" class="key" data-act="pin-digit" data-d="' + k + '" data-key="pin-' + k + '"' + (S.pinBusy ? ' disabled' : '') + '>' + k + '</button>';
    }).join('') + '</div>';
  }

  function pinView() {
    const unlocking = S.gate === 'pin';
    const vault = readVault();
    const slots = unlocking && vault ? vault.len : Math.max(PIN_MIN, S.pinEntry.length);
    const dots = Array.from({ length: slots }, (_, i) => '<span class="dot' + (i < S.pinEntry.length ? ' filled' : '') + '"></span>').join('');
    const title = unlocking ? 'Enter your PIN' : S.pinStage === 'confirm' ? 'Confirm your PIN' : (vault ? 'Choose a new PIN' : 'Choose a PIN');
    const sub = unlocking ? (S.pinBusy ? 'Checking…' : 'Unlock Home')
      : S.pinStage === 'confirm' ? 'Enter the same PIN again.' : PIN_MIN + ' to ' + PIN_MAX + ' digits. You\'ll use it instead of your password on this device.';
    const canContinue = !unlocking && S.pinStage === 'enter' && S.pinEntry.length >= PIN_MIN;
    return '<div class="gate"><div class="gate-box pin-box">' +
      '<span class="gate-mark">' + icon('home', 30) + '</span>' +
      '<h1 class="title">' + title + '</h1><p>' + esc(sub) + '</p>' +
      '<div class="pin-dots" aria-hidden="true">' + dots + '</div>' +
      '<p class="sr-only" aria-live="polite">' + S.pinEntry.length + ' digits entered</p>' +
      (S.pinError ? '<p class="error" role="alert">' + esc(S.pinError) + '</p>' : '') +
      keypad() +
      (unlocking
        ? '<button class="btn ghost" type="button" data-act="pin-forgot" data-key="pin-forgot">Use password instead</button>'
        : '<div class="pin-actions">' +
          '<button class="btn ghost" type="button" data-act="pin-cancel" data-key="pin-cancel">Cancel</button>' +
          (S.pinStage === 'enter' ? '<button class="btn" type="button" data-act="pin-next" data-key="pin-next"' + (canContinue ? '' : ' disabled') + '>Continue</button>' : '') +
          '</div>') +
      '</div></div>';
  }

  function gateView() {
    if (S.gate === 'pin' || S.gate === 'pin-new') return pinView();
    const setup = S.gate === 'setup';
    return '<div class="gate"><form class="gate-box" data-act="unlock" novalidate>' +
      '<span class="gate-mark">' + icon('home', 30) + '</span>' +
      '<h1 class="title">' + (setup ? 'Finish setting up your server' : 'Unlock Home') + '</h1>' +
      (setup
        ? '<p>' + esc(S.gateError) + ' Add the environment variables listed in the README to your Vercel project, redeploy, then try again.</p>' +
          '<button class="btn" type="button" data-act="retry" data-key="retry">Try again</button>'
        : '<p>Enter the app password you set as APP_PASSWORD in Vercel.</p>' +
          '<div class="field"><label for="pw">App password</label><input id="pw" name="pw" type="password" autocomplete="current-password" required data-key="pw"></div>' +
          (S.gateError ? '<p class="error" role="alert">' + esc(S.gateError) + '</p>' : '') +
          '<button class="btn" type="submit" data-key="unlock">Unlock</button>') +
      '<button class="btn ghost" type="button" data-act="demo" data-key="demo">Preview with sample devices</button>' +
      '</form></div>';
  }

  // ---------- Render ----------
  let shell = null;
  let lastRouteKey = '';
  let lastTab = '';
  function buildShell() {
    const app = $('#app');
    app.innerHTML = '<nav class="rail" aria-label="Main"></nav><main class="main" id="main"></main><aside class="panel" aria-label="Details"></aside><nav class="tabbar" aria-label="Main"></nav>';
    shell = { app, rail: $('.rail', app), main: $('.main', app), panel: $('.panel', app), tabbar: $('.tabbar', app) };
  }

  function render() {
    const app = $('#app');
    const focusKey = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null;

    if (S.gate) {
      shell = null;
      app.className = '';
      app.innerHTML = gateView();
      const pw = $('#pw');
      if (pw && (!focusKey || focusKey === 'pw')) pw.focus();
      else if (focusKey) {
        const t = document.querySelector('[data-key="' + CSS.escape(focusKey) + '"]:not([disabled])');
        if (t) t.focus({ preventScroll: true });
      }
      return;
    }
    if (!shell) buildShell();

    const r = route();
    const isWide = wide.matches;
    const activeTab = r.view === 'device' ? 'devices' : r.view === 'scene-edit' ? 'scenes' : r.view;
    let mainHtml, panelHtml = null;

    if (r.view === 'device' && !isWide) {
      mainHtml = detailView(findDevice(r.id), false);
      if (r.id && S.data && !S.specs[r.id]) loadSpec(r.id, true);
    } else if (activeTab === 'devices') {
      const devices = S.data ? S.data.devices : [];
      const firstCard = devices.find((d) => !isReadingDevice(d)) || devices[0];
      const selId = (r.view === 'device' && r.id) || (firstCard && firstCard.id);
      mainHtml = devicesView(isWide ? selId : null);
      if (isWide) {
        panelHtml = S.data ? detailView(findDevice(selId), true) : '';
        if (selId && S.data && !S.specs[selId]) loadSpec(selId, true);
      }
    } else if (r.view === 'scene-edit') {
      mainHtml = sceneEditorView(r.id);
    } else if (activeTab === 'scenes') {
      mainHtml = scenesView(!isWide);
      if (isWide) panelHtml = automationsPanel();
    } else {
      mainHtml = meView();
    }

    const mainTop = shell.main.scrollTop, panelTop = shell.panel.scrollTop;
    shell.app.className = 'app' + (panelHtml == null ? ' no-panel' : '');
    shell.rail.innerHTML = '<span class="mark" aria-hidden="true">' + icon('home') + '</span>' + tabs(activeTab);
    shell.tabbar.innerHTML = tabs(activeTab);
    shell.main.innerHTML = mainHtml;
    shell.panel.innerHTML = panelHtml || '';
    shell.main.scrollTop = mainTop;
    shell.panel.scrollTop = panelTop;

    const routeKey = r.view + ':' + (r.id || '');
    if (routeKey !== lastRouteKey) {
      if (!isWide || activeTab !== lastTab) { window.scrollTo(0, 0); shell.main.scrollTop = 0; }
      shell.panel.scrollTop = 0;
      lastRouteKey = routeKey;
      lastTab = activeTab;
    }

    if (focusKey) {
      const target = Array.from(document.querySelectorAll('[data-key="' + CSS.escape(focusKey) + '"]:not([disabled])'))
        .find((n) => n.offsetParent !== null);
      if (target) target.focus({ preventScroll: true });
    }
  }

  // ---------- Events ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'FORM') return;
    const act = el.dataset.act, id = el.dataset.id;
    const d = id ? findDevice(id) : null;

    switch (act) {
      case 'tab': go(el.dataset.tab); break;
      case 'room': S.room = el.dataset.room; render(); break;
      case 'open': go('device/' + encodeURIComponent(id)); break;
      case 'back': go('devices'); break;
      case 'toggle': {
        if (!d) return;
        if (kindOf(d) === 'irac') { sendIrAc(d, { power: !isOn(d) }); break; }
        if (el.dataset.code) {
          const c = el.dataset.code;
          send(d, [{ code: c, value: !d.status[c] }], { [c]: !d.status[c] });
          break;
        }
        if (isMulti(d)) {
          const target = !isOn(d);
          const cmds = channelCodes(d).map((c) => ({ code: c, value: target }));
          send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
          break;
        }
        const pc = powerCode(d);
        if (pc) send(d, [{ code: pc, value: !d.status[pc] }], { [pc]: !d.status[pc] });
        break;
      }
      case 'warmth': {
        if (!d) return;
        const wc = warmCode(d); if (!wc) return;
        const value = fromPct(Number(el.dataset.pct), lightRange(d, wc, true));
        const cmds = [{ code: wc, value }];
        if ('work_mode' in d.status && d.status.work_mode !== 'white') cmds.unshift({ code: 'work_mode', value: 'white' });
        const pc = powerCode(d);
        if (pc && !d.status[pc]) cmds.unshift({ code: pc, value: true });
        send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
        break;
      }
      case 'temp': {
        if (!d) return;
        const sp = specOf(d, 'temp_set');
        const scale = sp && typeof sp.scale === 'number' ? sp.scale : (Math.abs(d.status.temp_set) >= 60 ? 1 : 0);
        const step = (sp && sp.step) || Math.pow(10, scale);
        const min = sp && typeof sp.min === 'number' ? sp.min : 16 * Math.pow(10, scale);
        const max = sp && typeof sp.max === 'number' ? sp.max : 30 * Math.pow(10, scale);
        sendSoon(d, 'temp_set', clamp(d.status.temp_set + Number(el.dataset.delta) * step, min, max));
        break;
      }
      case 'irtemp':
        if (d && d.ir) sendIrAc(d, { power: true, temp: clamp((d.ir.state ? d.ir.state.temp : 24) + Number(el.dataset.delta), 16, 30) });
        break;
      case 'irmode': if (d && d.ir) sendIrAc(d, { power: true, mode: Number(el.dataset.v) }); break;
      case 'irwind': if (d && d.ir) sendIrAc(d, { power: true, wind: Number(el.dataset.v) }); break;
      case 'irkey': if (d && d.ir) sendIrKey(d, el.dataset.k); break;
      case 'irreload': if (d && d.ir) { delete S.irKeys[d.id]; render(); } break;
      case 'mode': if (d) send(d, [{ code: 'mode', value: el.dataset.val }], { mode: el.dataset.val }); break;
      case 'cover': if (d) send(d, [{ code: 'control', value: el.dataset.val }], { control: el.dataset.val }); break;
      case 'rename':
        S.renaming = { id, code: el.dataset.code };
        render();
        focusRenameInput();
        break;
      case 'rename-cancel': S.renaming = null; render(); break;
      case 'icon-open':
        S.iconPicking = S.iconPicking === id ? null : id;
        render();
        break;
      case 'icon-set':
        S.icons[id] = el.dataset.icon; saveIcons(); render();
        break;
      case 'icon-reset':
        delete S.icons[id]; saveIcons(); render();
        break;
      case 'scene': runScene(id); break;
      case 'scene-new': S.editor = null; go('scene/new'); break;
      case 'scene-open': S.editor = null; go('scene/' + encodeURIComponent(id)); break;
      case 'se-cancel': S.editor = null; go('scenes'); break;
      case 'se-pick-open': S.editor.picking = true; render(); break;
      case 'se-pick-close': S.editor.picking = false; render(); break;
      case 'se-pick': {
        const dev = findDevice(id); if (!dev) break;
        S.editor.items.push({ type: 'device', deviceId: dev.id, props: defaultProps(dev) });
        S.editor.picking = false; S.editor.error = '';
        if (!S.specs[dev.id]) loadSpec(dev.id, true);
        render(); break;
      }
      case 'se-add-delay': S.editor.items.push({ type: 'delay', minutes: 1, seconds: 0 }); S.editor.error = ''; render(); break;
      case 'se-remove': S.editor.items.splice(Number(el.dataset.i), 1); render(); break;
      case 'se-move': {
        const i = Number(el.dataset.i), j = i + Number(el.dataset.dir), items = S.editor.items;
        if (j >= 0 && j < items.length) { const t = items[i]; items[i] = items[j]; items[j] = t; render(); }
        break;
      }
      case 'se-prop': {
        const it = S.editor.items[Number(el.dataset.i)];
        const val = JSON.parse(el.dataset.val);
        if (val === 'keep') delete it.props[el.dataset.code]; else it.props[el.dataset.code] = val;
        S.editor.error = ''; render(); break;
      }
      case 'se-temp': {
        const it = S.editor.items[Number(el.dataset.i)], dev = findDevice(it.deviceId);
        const sp = specOf(dev, 'temp_set');
        const base = it.props.temp_set ?? dev.status.temp_set;
        const scale = sp && typeof sp.scale === 'number' ? sp.scale : (Math.abs(base) >= 60 ? 1 : 0);
        const step = (sp && sp.step) || Math.pow(10, scale);
        const min = sp && typeof sp.min === 'number' ? sp.min : 16 * Math.pow(10, scale);
        const max = sp && typeof sp.max === 'number' ? sp.max : 30 * Math.pow(10, scale);
        it.props.temp_set = it.props.temp_set === undefined ? base : clamp(base + Number(el.dataset.delta) * step, min, max);
        render(); break;
      }
      case 'se-save': saveScene(); break;
      case 'se-delete': deleteScene(); break;
      case 'auto': toggleAutomation(id); break;
      case 'refresh': toast('Refreshing'); refresh(); break;
      case 'install': install(); break;
      case 'lock': lockApp(); break;
      case 'pin-setup':
        S.gate = 'pin-new'; S.pinStage = 'enter'; S.pinEntry = ''; S.pinFirst = ''; S.pinError = ''; render(); break;
      case 'pin-off':
        if (S.key) store.set('appKey', S.key);
        wipeVault(); toast('PIN turned off'); render(); break;
      case 'pin-digit': pinDigit(el.dataset.d); break;
      case 'pin-del': S.pinEntry = S.pinEntry.slice(0, -1); S.pinError = ''; render(); break;
      case 'pin-next': pinNext(); break;
      case 'pin-cancel':
        S.gate = null; S.pinEntry = ''; S.pinFirst = ''; S.pinError = ''; render(); break;
      case 'pin-forgot':
        wipeVault(); S.key = ''; store.del('appKey'); S.pinEntry = ''; S.pinError = '';
        S.gate = 'login'; S.gateError = 'Your PIN was removed from this device. Enter your password, then set up a new PIN in Me.';
        render(); break;
      case 'demo':
        S.mode = 'demo'; store.set('mode', 'demo'); S.gate = null; S.data = null; S.specs = {}; refresh(); break;
      case 'live':
        S.mode = 'live'; store.set('mode', 'live'); S.data = null; S.specs = {}; S.gateError = '';
        if (location.search.includes('demo')) history.replaceState(null, '', location.pathname + location.hash);
        if (S.key) { S.gate = null; refresh(); } else { S.gate = 'login'; render(); }
        break;
      case 'retry': S.gate = null; refresh(); break;
    }
  });

  // Sliders: update the big number live while dragging, send once on release.
  const LIVE_PREFIX = { bright: 'bright-', coverpos: 'cover-', fanspeed: 'fan-' };
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.act === 'se-name' && S.editor) { S.editor.name = el.value; return; }
    if (el.dataset && el.dataset.act === 'se-delay' && S.editor) {
      const it = S.editor.items[Number(el.dataset.i)];
      if (it) it[el.dataset.field] = clamp(Math.floor(Number(el.value) || 0), 0, 59);
      return;
    }
    if (el.dataset && el.dataset.act === 'se-range') {
      document.querySelectorAll('[data-live="se-' + el.dataset.i + '-' + CSS.escape(el.dataset.code) + '"]').forEach((n) => { n.textContent = el.value + '%'; });
      return;
    }
    if (!el.dataset || !LIVE_PREFIX[el.dataset.act]) return;
    S.dragging = true;
    document.querySelectorAll('[data-live="' + LIVE_PREFIX[el.dataset.act] + CSS.escape(el.dataset.id) + '"]')
      .forEach((n) => { n.textContent = el.value + '%'; });
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.dataset) return;
    const act = el.dataset.act;
    const d = el.dataset.id ? findDevice(el.dataset.id) : null;
    if (LIVE_PREFIX[act]) S.dragging = false;
    if (act === 'se-range' && S.editor) {
      const it = S.editor.items[Number(el.dataset.i)], dev = findDevice(it.deviceId), code = el.dataset.code, pct = Number(el.value);
      if (code === 'percent_control' || code === 'fan_speed_percent') it.props[code] = pct;
      else it.props[code] = fromPct(pct, lightRange(dev, code));
      render(); return;
    }
    if (act === 'se-delay' && S.editor) { render(); return; }
    if (act === 'bright' && d) {
      const bc = brightCode(d);
      const value = fromPct(Number(el.value), lightRange(d, bc));
      const cmds = [{ code: bc, value }];
      const pc = powerCode(d);
      if (pc && !d.status[pc]) cmds.unshift({ code: pc, value: true });
      send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
    } else if (act === 'coverpos' && d) {
      send(d, [{ code: 'percent_control', value: Number(el.value) }], { percent_control: Number(el.value) });
    } else if (act === 'fanspeed' && d) {
      send(d, [{ code: 'fan_speed_percent', value: Number(el.value) }], { fan_speed_percent: Number(el.value) });
    } else if (act === 'home') {
      S.homeId = el.value; store.set('homeId', el.value); S.room = 'All';
      S.data = null; S.iconPicking = null; S.renaming = null; S.sceneState = {};
      if (route().view === 'device') history.replaceState(null, '', location.pathname + location.search + '#devices');
      refresh();
    }
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (form.dataset.act === 'rename-save') {
      e.preventDefault();
      const d = findDevice(form.dataset.id);
      const name = (form.elements.name.value || '').trim();
      if (!d) return;
      if (!name) { toast('Enter a name.'); return; }
      renameChannel(d, form.dataset.code, name.slice(0, 40));
      return;
    }
    if (form.dataset.act !== 'unlock') return;
    e.preventDefault();
    const pw = form.elements.pw ? form.elements.pw.value : '';
    if (!pw) { S.gateError = 'Enter your app password.'; render(); return; }
    S.key = pw; store.set('appKey', pw);
    S.mode = 'live'; store.set('mode', 'live');
    S.gateError = ''; S.gate = null; S.data = null;
    await refresh();
  });

  function lockApp() {
    S.data = null; S.specs = {}; S.renaming = null; S.iconPicking = null;
    S.pinEntry = ''; S.pinError = '';
    if (readVault()) {
      S.key = ''; S.gate = 'pin';
    } else {
      S.key = ''; store.del('appKey'); S.gate = 'login'; S.gateError = '';
    }
    render();
  }

  function pinDigit(d) {
    if (S.pinBusy || S.pinEntry.length >= PIN_MAX) return;
    S.pinEntry += d; S.pinError = '';
    render();
    const vault = readVault();
    if (S.gate === 'pin' && vault && S.pinEntry.length === vault.len) unlockWithPin(vault);
    else if (S.gate === 'pin-new' && S.pinStage === 'confirm' && S.pinEntry.length === S.pinFirst.length) pinNext();
  }

  async function unlockWithPin(vault) {
    S.pinBusy = true; render();
    const key = await openVault(S.pinEntry, vault);
    S.pinBusy = false; S.pinEntry = '';
    if (key) {
      store.del('pinFails');
      S.key = key; S.gate = null; S.pinError = '';
      refresh();
      return;
    }
    const fails = Number(store.get('pinFails') || 0) + 1;
    if (fails >= PIN_TRIES) {
      wipeVault();
      S.gate = 'login';
      S.gateError = 'Too many wrong PINs, so the PIN was removed from this device. Enter your password to continue.';
    } else {
      store.set('pinFails', String(fails));
      const left = PIN_TRIES - fails;
      S.pinError = 'Wrong PIN. ' + left + (left === 1 ? ' try' : ' tries') + ' left.';
    }
    render();
  }

  async function pinNext() {
    if (S.pinStage === 'enter') {
      if (S.pinEntry.length < PIN_MIN) { S.pinError = 'Use at least ' + PIN_MIN + ' digits.'; render(); return; }
      if (/^(\d)\1+$/.test(S.pinEntry) || '0123456789'.includes(S.pinEntry) || '9876543210'.includes(S.pinEntry)) {
        S.pinError = 'That PIN is too easy to guess. Try another.'; S.pinEntry = ''; render(); return;
      }
      S.pinFirst = S.pinEntry; S.pinEntry = ''; S.pinStage = 'confirm'; S.pinError = '';
      render(); return;
    }
    if (S.pinEntry !== S.pinFirst) {
      S.pinStage = 'enter'; S.pinFirst = ''; S.pinEntry = '';
      S.pinError = 'Those PINs didn\'t match. Start again.';
      render(); return;
    }
    if (!S.key) { S.gate = 'login'; render(); return; }
    S.pinBusy = true; render();
    try {
      const vault = await sealVault(S.pinEntry, S.key);
      store.set('pinVault', JSON.stringify(vault));
      store.del('pinFails');
      store.del('appKey'); // the password now lives only in encrypted form
      S.gate = null; toast('PIN is set. Use it to unlock Home on this device.');
    } catch (e) {
      S.pinError = 'Could not save the PIN on this browser.';
    }
    S.pinBusy = false; S.pinEntry = ''; S.pinFirst = ''; S.pinStage = 'enter';
    render();
  }

  // Physical keyboard support on the PIN screens.
  document.addEventListener('keydown', (e) => {
    if (S.gate !== 'pin' && S.gate !== 'pin-new') return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); pinDigit(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); S.pinEntry = S.pinEntry.slice(0, -1); S.pinError = ''; render(); }
    else if (e.key === 'Enter' && S.gate === 'pin-new') { e.preventDefault(); pinNext(); }
  });

  function focusRenameInput() {
    const input = Array.from(document.querySelectorAll('.rename input')).find((n) => n.offsetParent !== null);
    if (input) { input.focus(); input.select(); }
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.renaming) { S.renaming = null; render(); }
  });

  async function renameChannel(d, code, name) {
    const spec = S.specs[d.id] && S.specs[d.id] !== 'loading' ? S.specs[d.id] : (S.specs[d.id] = { codes: {}, writable: null, names: {} });
    spec.names = spec.names || {};
    const before = spec.names[code];
    spec.names[code] = name;
    S.renaming = null;
    render();
    try {
      await api('rename', { method: 'POST', body: { deviceId: d.id, code, name } });
    } catch (e) {
      if (before === undefined) delete spec.names[code]; else spec.names[code] = before;
      render();
      toast('Rename failed: ' + e.message);
    }
  }

  async function runScene(id) {
    if (!S.data) return;
    S.sceneState[id] = 'running'; render();
    try {
      await api('scene', { method: 'POST', body: { homeId: S.data.homeId, sceneId: id } });
      S.sceneState[id] = 'done'; render();
      setTimeout(() => { delete S.sceneState[id]; render(); refresh({ silent: true }); }, 1600);
    } catch (e) {
      delete S.sceneState[id]; render();
      toast('Scene did not run: ' + e.message);
    }
  }

  async function toggleAutomation(id) {
    const a = S.data && S.data.automations.find((x) => x.id === id);
    if (!a) return;
    a.enabled = !a.enabled; render();
    try {
      await api('automation', { method: 'POST', body: { homeId: S.data.homeId, automationId: id, enabled: a.enabled } });
    } catch (e) {
      a.enabled = !a.enabled; render();
      toast(a.name + ': ' + e.message);
    }
  }

  // ---------- Install + lifecycle ----------
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); S.installPrompt = e;
    if (!S.gate && route().view === 'me') render();
  });
  async function install() {
    if (!S.installPrompt) return;
    S.installPrompt.prompt();
    await S.installPrompt.userChoice.catch(() => null);
    S.installPrompt = null; render();
  }
  window.addEventListener('hashchange', () => {
    S.iconPicking = null; S.renaming = null;
    if (route().view !== 'scene-edit') S.editor = null;
    render();
  });
  wide.addEventListener('change', render);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (S.mode === 'live' && !S.gate && readVault() && hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) { lockApp(); return; }
    if (!S.gate) refresh({ silent: true });
  });
  setInterval(() => {
    if (document.visibilityState === 'visible' && !S.dragging && !S.gate) refresh({ silent: true });
  }, 15000);
  window.addEventListener('online', () => { if (!S.gate) refresh({ silent: true }); });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => null); });
  }

  // ---------- Demo backend (sample data, no server needed) ----------
  const Demo = (function () {
    const db = {
      homes: [{ id: 'h1', name: 'My Home' }, { id: 'h2', name: 'Beach house' }],
      homeId: 'h1',
      rooms: ['Living room', 'Bedroom', 'Kitchen', 'Hallway'],
      devices: [
        { id: 'dev1', name: 'Ceiling light', category: 'dj', product: 'Smart bulb', online: true, room: 'Living room', status: { switch_led: true, work_mode: 'white', bright_value_v2: 800, temp_value_v2: 0 } },
        { id: 'dev2', name: 'Floor lamp', category: 'dj', product: 'Smart bulb', online: true, room: 'Living room', status: { switch_led: false, work_mode: 'white', bright_value_v2: 450, temp_value_v2: 500 } },
        { id: 'dev9', name: 'Living room climate', category: 'wsdcg', product: 'Temperature and humidity sensor', online: true, room: 'Living room', status: { va_temperature: 215, va_humidity: 48, battery_percentage: 72 } },
        { id: 'dev13', name: 'Bedroom sensor', category: 'wsdcg', product: 'Temperature and humidity sensor', online: true, room: 'Bedroom', status: { va_temperature: 198, va_humidity: 55, battery_percentage: 15 } },
        { id: 'dev3', name: 'Air conditioner', category: 'kt', product: 'AC controller', online: true, room: 'Bedroom', status: { switch: true, temp_set: 24, temp_current: 26, mode: 'cold' } },
        { id: 'dev7', name: 'Bedroom curtains', category: 'cl', product: 'Curtain motor', online: true, room: 'Bedroom', status: { control: 'stop', percent_control: 60, percent_state: 60 } },
        { id: 'dev8', name: 'Bedside lamp', category: 'dj', product: 'Smart bulb', online: true, room: 'Bedroom', status: { switch_led: false, work_mode: 'white', bright_value_v2: 300, temp_value_v2: 0 } },
        { id: 'dev11', name: 'Donut Lamp', category: 'kg', product: '2-gang switch', online: true, room: 'Living room', status: { switch_1: true, switch_2: false } },
        { id: 'dev12', name: 'Desk power strip', category: 'pc', product: 'Power strip with USB', online: true, room: 'Bedroom', status: { switch_1: true, switch_2: true, switch_3: false, switch_usb1: true } },
        { id: 'dev4', name: 'Kettle plug', category: 'cz', product: 'Smart plug', online: true, room: 'Kitchen', status: { switch_1: false } },
        { id: 'dev5', name: 'Front door', category: 'mcs', product: 'Door sensor', online: true, room: 'Hallway', status: { doorcontact_state: false, battery_percentage: 86 } },
        { id: 'dev6', name: 'Porch camera', category: 'sp', product: 'Outdoor camera', online: true, room: 'Hallway', status: {} },
        { id: 'dev10', name: 'Garage plug', category: 'cz', product: 'Smart plug', online: false, room: '', status: { switch_1: false } },
        { id: 'ir1', name: 'Study AC', category: 'infrared_ac', product: 'IR remote', online: true, room: 'Bedroom', status: {}, ir: { hub: 'hub1', categoryId: 5, ac: true, state: { power: false, mode: 0, temp: 24, wind: 0 } } },
        { id: 'ir2', name: 'Living room TV', category: 'infrared_tv', product: 'IR remote', online: true, room: 'Living room', status: {}, ir: { hub: 'hub1', categoryId: 2, ac: false } },
        { id: 'bh1', home: 'h2', name: 'Patio lights', category: 'dj', product: 'Smart bulb', online: true, room: 'Patio', status: { switch_led: true, work_mode: 'white', bright_value_v2: 600, temp_value_v2: 0 } },
        { id: 'bh2', home: 'h2', name: 'Pool pump', category: 'cz', product: 'Smart plug', online: true, room: 'Garden', status: { switch_1: false } }
      ],
      scenes: [
        { id: 'sc1', name: 'Good morning', steps: [
          { executor: 'dpIssue', entity: 'dev1', props: { switch_led: true, bright_value_v2: 1000 } },
          { executor: 'dpIssue', entity: 'dev7', props: { control: 'open' } },
          { executor: 'dpIssue', entity: 'dev4', props: { switch_1: true } }] },
        { id: 'sc2', name: 'Movie night', steps: [
          { executor: 'dpIssue', entity: 'dev1', props: { switch_led: false } },
          { executor: 'dpIssue', entity: 'dev2', props: { switch_led: true, bright_value_v2: 300, temp_value_v2: 0 } },
          { executor: 'irIssue', entity: 'ir2', props: { key: 'Power' } }] },
        { id: 'sc4', name: 'Bedtime', steps: [
          { executor: 'dpIssue', entity: 'dev8', props: { switch_led: true, bright_value_v2: 100 } },
          { executor: 'delay', entity: 'delay', props: { hours: '0', minutes: '10', seconds: '0' } },
          { executor: 'dpIssue', entity: 'dev8', props: { switch_led: false } }] }
      ],
      automations: [
        { id: 'au1', name: 'Porch light at sunset', enabled: true },
        { id: 'au2', name: 'Hall light when the door opens', enabled: true },
        { id: 'au3', name: 'AC off when everyone leaves', enabled: false }
      ],
      warnings: []
    };
    const specs = {
      dj: { bright_value_v2: { min: 10, max: 1000, scale: 0, step: 1 }, temp_value_v2: { min: 0, max: 1000, scale: 0, step: 1 } },
      kt: { temp_set: { min: 16, max: 30, scale: 0, step: 1 }, temp_current: { scale: 0 }, mode: { range: ['cold', 'hot', 'wind', 'auto'] } },
      wsdcg: { va_temperature: { scale: 1 }, va_humidity: { scale: 0 } },
      cl: { percent_control: { min: 0, max: 100, scale: 0, step: 1 } }
    };
    const names = { dev12: { switch_1: 'Monitor', switch_2: 'Laptop charger' } };
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    async function handle(path, opts) {
      await wait(200);
      if (path.startsWith('state')) {
        const m = path.match(/homeId=([^&]+)/);
        const homeId = db.homes.some((h) => m && h.id === decodeURIComponent(m[1])) ? decodeURIComponent(m[1]) : 'h1';
        const out = clone(db);
        out.homeId = homeId;
        out.devices = out.devices.filter((d) => (d.home || 'h1') === homeId);
        out.rooms = homeId === 'h1' ? db.rooms : ['Patio', 'Garden'];
        if (homeId !== 'h1') { out.scenes = [{ id: 'sc9', name: 'Arrive', steps: [{ executor: 'dpIssue', entity: 'bh1', props: { switch_led: true } }] }]; out.automations = []; }
        out.scenes.forEach((x) => { x.actions = (x.steps || []).length; });
        out.at = Date.now();
        return out;
      }
      if (path.startsWith('spec')) {
        const id = decodeURIComponent(path.split('deviceId=')[1] || '');
        const dev = db.devices.find((x) => x.id === id);
        return { deviceId: id, codes: clone(specs[dev && dev.category] || {}), writable: null, names: clone(names[id] || {}) };
      }
      const b = (opts && opts.body) || {};
      if (path === 'command') {
        const dev = db.devices.find((x) => x.id === b.deviceId);
        if (!dev || !dev.online) { const e = new Error('Device is offline.'); e.code = 'offline'; throw e; }
        for (const c of b.commands) dev.status[c.code] = c.value;
        if (dev.status.control === 'open') dev.status.percent_control = 100;
        if (dev.status.control === 'close') dev.status.percent_control = 0;
        if ('percent_control' in dev.status) dev.status.percent_state = dev.status.percent_control;
        return { ok: true };
      }
      if (path.startsWith('ir?')) {
        return { categoryId: 2, keys: [
          { key: 'Power', keyId: 1, name: 'Power' }, { key: 'Mute', keyId: 2, name: 'Mute' },
          { key: 'VolumeUp', keyId: 3, name: 'Volume +' }, { key: 'VolumeDown', keyId: 4, name: 'Volume −' },
          { key: 'ChannelUp', keyId: 5, name: 'Channel +' }, { key: 'ChannelDown', keyId: 6, name: 'Channel −' },
          { key: 'Input', keyId: 7, name: 'Input' }, { key: 'Menu', keyId: 8, name: 'Menu' }, { key: 'OK', keyId: 9, name: 'OK' }
        ] };
      }
      if (path === 'ir') {
        const dev = db.devices.find((x) => x.id === b.remoteId);
        if (b.action === 'ac' && dev) dev.ir.state = { power: b.power === 1, mode: b.mode, temp: b.temp, wind: b.wind };
        return { ok: true };
      }
      if (path === 'scene-edit') {
        const toSteps = (acts) => acts.map((a) => ({ executor: a.action_executor, entity: a.entity_id || (a.action_executor === 'delay' ? 'delay' : ''), props: a.executor_property || {} }));
        if (b.op === 'create') db.scenes.push({ id: 'sc' + Date.now(), name: b.name, steps: toSteps(b.actions) });
        if (b.op === 'update') { const sc = db.scenes.find((x) => x.id === b.sceneId); if (sc) { sc.name = b.name; sc.steps = toSteps(b.actions); } }
        if (b.op === 'delete') db.scenes = db.scenes.filter((x) => x.id !== b.sceneId);
        return { ok: true };
      }
      if (path === 'rename') {
        names[b.deviceId] = Object.assign(names[b.deviceId] || {}, { [b.code]: b.name });
        return { ok: true };
      }
      if (path === 'scene') { await wait(600); return { ok: true }; }
      if (path === 'automation') {
        const a = db.automations.find((x) => x.id === b.automationId);
        if (a) a.enabled = !!b.enabled;
        return { ok: true };
      }
      return { ok: true };
    }
    return { handle };
  })();

  // ---------- Start ----------
  if (S.mode === 'live' && readVault()) { S.key = ''; store.del('appKey'); S.gate = 'pin'; }
  else if (S.mode === 'live' && !S.key) S.gate = 'login';
  render();
  if (!S.gate) refresh();
})();
