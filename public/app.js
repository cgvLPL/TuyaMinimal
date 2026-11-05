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
    editor: null,        // scene being created or edited
    me: null,            // signed-in user { id, name, role, owner }
    sync: false,         // shared storage set up on the server
    users: null,         // admin's user list (null = not loaded)
    userForm: { name: '', password: '', role: 'member', error: '', busy: false, open: false },
    pwForm: { current: '', password: '', error: '', busy: false, open: false },
    allOffArmed: 0,      // time the "All off" button was armed
    pollMs: Number(store.get('pollMs')) || 4000,  // live status interval
    touched: {},
    weather: null,
    energy: {},          // deviceId -> { at, available, today, week, days, total } | 'loading'       // { homeId, at, available, temp, code, isDay, unit } for the greeting
    tempUnit: store.get('tempUnit') || 'c',  // Celsius unless changed in Me         // deviceId -> time of the last local command (avoid flicker)          // remoteId + key -> true briefly after a button is sent   // deviceId whose icon picker is open
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
    if (h.startsWith('auto/')) return { view: 'auto-edit', id: decodeURIComponent(h.slice(5)) };
    if (h === 'icons') return { view: 'icons' };
    if (h === 'scenes' || h === 'me') return { view: h };
    return { view: 'devices' };
  }
  function inEditor() { const v = route().view; return v === 'scene-edit' || v === 'auto-edit'; }
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
      // All endpoints go through one serverless function: /api/router?r=<name>&<params>
      const q = path.indexOf('?');
      const url = '/api/router?r=' + (q < 0 ? path : path.slice(0, q) + '&' + path.slice(q + 1));
      res = await fetch(url, {
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
      const params = [];
      if (S.homeId) params.push('homeId=' + encodeURIComponent(S.homeId));
      if (opts.fresh) params.push('fresh=1');
      const data = await api('state' + (params.length ? '?' + params.join('&') : ''));
      lastFull = Date.now();
      S.data = data;
      S.gate = null;
      if (data.me) S.me = data.me;
      S.sync = !!data.sync;
      if (data.settings && data.settings.icons) { S.icons = Object.assign({}, data.settings.icons); saveIcons(); }
      if (data.homeId) { S.homeId = data.homeId; store.set('homeId', data.homeId); }
      loadWeather();
      prefetchLightSpecs();
    } catch (e) {
      if (e.code === 'unauthorized') {
        const hadPin = !!readVault();
        wipeVault();
        S.gate = 'login';
        S.gateError = hadPin
          ? 'Your app password was changed on the server. Enter the new one, then set up your PIN again.'
          : 'Please sign in again.';
        S.key = ''; store.del('appKey');
      } else if (e.code === 'not_configured') {
        S.gate = 'setup'; S.gateError = e.message;
      } else if (!opts.silent) {
        toast(e.message);
      }
    } finally {
      S.loading = false;
      const typing = document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range';
      if (!S.dragging && !S.renaming && !typing && !(S.editor && inEditor())) render();
      if (S.refreshAgain) { S.refreshAgain = false; refresh({ silent: true }); }
    }
  }

  // Lights need their spec to convert brightness into a percentage;
  // multi-outlet devices need it for their custom outlet names.
  function prefetchLightSpecs() {
    if (!S.data) return;
    for (const d of S.data.devices) {
      if ((kindOf(d) === 'light' || kindOf(d) === 'multi' || isReadingDevice(d) || hasEnergy(d)) && !S.specs[d.id] && d.online) loadSpec(d.id, true);
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
  // RGB colour: Tuya stores it as {h: 0-360, s, v} (0-1000 for *_v2, 0-255 for the older code).
  function colourCode(d) { return ['colour_data_v2', 'colour_data'].find((c) => c in d.status) || null; }
  function parseColour(v) {
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { return null; } }
    return v && typeof v.h === 'number' ? { h: v.h, s: Number(v.s) || 0, v: Number(v.v) || 0 } : null;
  }
  function colourMax(code) { return code === 'colour_data_v2' ? { s: 1000, v: 1000, vmin: 10 } : { s: 255, v: 255, vmin: 25 }; }
  function inColour(d) { return d.status.work_mode === 'colour' && !!colourCode(d); }
  function currentColour(d) {
    const code = colourCode(d), m = colourMax(code);
    return parseColour(d.status[code]) || { h: 30, s: m.s, v: m.v };
  }
  function hsvCss(h, sPct) { return 'hsl(' + Math.round(h) + ', ' + Math.round(sPct) + '%, ' + Math.round(50 + (100 - sPct) * 0.4) + '%)'; }
  function colourCss(d) {
    const code = colourCode(d), m = colourMax(code), c = currentColour(d);
    return hsvCss(c.h, (c.s / m.s) * 100);
  }
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
    return '<div class="reading' + (lowBattery ? ' low' : '') + '" role="listitem"' + (lowBattery ? ' title="Battery low"' : '') + '>' +
      '<span class="reading-name">' + esc(d.name) + (showRoom && d.room ? '<span class="reading-room">' + esc(d.room) + '</span>' : '') + '</span>' +
      '<span class="reading-main">' + main + '</span>' +
      (extra.length ? '<span class="reading-extra">' + extra.map((x) => '<span>' + x + '</span>').join('') + '</span>' : '') +
      (lowBattery ? '<span class="reading-warn">Battery low</span>' : '') +
      '</div>';
  }

  // ---------- Energy (plugs that measure power) ----------
  function hasEnergy(d) { return typeof d.status.cur_power === 'number' || 'add_ele' in d.status; }
  function liveWatts(d) {
    if (typeof d.status.cur_power !== 'number' || !specReady(d)) return null;
    const sp = specOf(d, 'cur_power');
    return d.status.cur_power / Math.pow(10, sp && typeof sp.scale === 'number' ? sp.scale : 1);
  }
  function fmtWatts(w) { return w >= 1000 ? (Math.round(w / 100) / 10) + ' kW' : (w >= 10 ? Math.round(w) : Math.round(w * 10) / 10) + ' W'; }
  function fmtKwh(k) { return k == null ? '–' : (k >= 10 ? Math.round(k * 10) / 10 : Math.round(k * 100) / 100) + ' kWh'; }
  function localYmd() { const t = new Date(); return t.getFullYear() + String(t.getMonth() + 1).padStart(2, '0') + String(t.getDate()).padStart(2, '0'); }
  async function loadEnergy(d, force) {
    const e = S.energy[d.id];
    if (e === 'loading' || (!force && e && Date.now() - e.at < 5 * 60 * 1000)) return;
    S.energy[d.id] = 'loading';
    try {
      const r = await api('energy?deviceId=' + encodeURIComponent(d.id) + '&today=' + localYmd());
      S.energy[d.id] = Object.assign({ at: Date.now() }, r);
    } catch (err) {
      S.energy[d.id] = { at: Date.now(), available: false, error: err.message };
    }
    const typing = document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range';
    if (!S.dragging && !typing) render();
  }
  function energySection(d) {
    if (!hasEnergy(d)) return '';
    if (!S.energy[d.id]) loadEnergy(d);
    const e = S.energy[d.id];
    const w = liveWatts(d);
    const st = d.status;
    const volts = typeof st.cur_voltage === 'number' && specReady(d) ? st.cur_voltage / Math.pow(10, (specOf(d, 'cur_voltage') || {}).scale ?? 1) : null;
    const amps = typeof st.cur_current === 'number' && specReady(d) ? st.cur_current / Math.pow(10, (specOf(d, 'cur_current') || {}).scale ?? 0) / 1000 : null;
    let html = '<h2 class="section-title">Energy</h2><div class="list energy">';
    html += '<div class="energy-now"><span class="se-label">Using now</span><span class="energy-watts">' + (w == null ? '…' : fmtWatts(d.online && isOn(d) ? w : 0)) + '</span>' +
      ((volts != null || amps != null) ? '<span class="energy-meta">' + [volts != null ? Math.round(volts) + ' V' : '', amps != null ? (Math.round(amps * 100) / 100) + ' A' : ''].filter(Boolean).join(', ') + '</span>' : '') + '</div>';
    if (e === 'loading' || !e) {
      html += '<div class="list-row"><span class="meta">Loading usage…</span></div>';
    } else if (e.available && e.days) {
      const max = Math.max(0.0001, ...e.days.map((x) => x.kwh));
      const dayName = (ymd) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)).getDay()];
      html += '<div class="energy-chart" role="img" aria-label="Daily use over the last 7 days: ' + esc(e.days.map((x) => fmtKwh(x.kwh)).join(', ')) + '">' +
        e.days.map((x, i) => '<span class="bar-wrap"><span class="bar' + (i === e.days.length - 1 ? ' today' : '') + '" style="height:' + Math.max(4, Math.round((x.kwh / max) * 100)) + '%"></span><span class="bar-day">' + dayName(x.day) + '</span></span>').join('') + '</div>';
      html += '<div class="list-row"><span class="label">Today</span><span class="value">' + fmtKwh(e.today) + '</span></div>' +
        '<div class="list-row"><span class="label">Last 7 days</span><span class="value">' + fmtKwh(e.week) + '</span></div>' +
        (e.total != null ? '<div class="list-row"><span class="label">All time</span><span class="value">' + fmtKwh(e.total) + '</span></div>' : '');
    } else if (e.available) {
      html += '<div class="list-row"><span class="label">All time</span><span class="value">' + fmtKwh(e.total) + '</span></div>';
    } else {
      html += '<div class="list-row"><span class="meta">Usage history isn\'t available for this plug.</span></div>';
    }
    return html + '</div>';
  }

  function statusText(d) {
    if (!d.online) return 'Offline';
    const k = kindOf(d), on = isOn(d), st = d.status;
    if (k === 'light') {
      if (!on) return 'Off';
      if (inColour(d)) {
        const m = colourMax(colourCode(d)), c = currentColour(d);
        return 'Color, ' + toPct(c.v, { min: m.vmin, max: m.v }) + '%';
      }
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
      const w = n ? liveWatts(d) : null;
      return (n === 0 ? 'Off' : n === codes.length ? 'All on' : n + ' of ' + codes.length + ' on') + (w != null && w > 0 ? ', ' + fmtWatts(w) : '');
    }
    if (hasEnergy(d) && powerCode(d) && on) {
      const w = liveWatts(d);
      if (w != null) return 'On, ' + fmtWatts(w);
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
    S.touched[d.id] = Date.now();
    if (!opts.noRender) render();
    try {
      await api('command', { method: 'POST', body: { deviceId: d.id, commands } });
      S.touched[d.id] = Date.now();
      statusSoon();
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
    sofa: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M3 12a1.5 1.5 0 0 1 3 0v2h12v-2a1.5 1.5 0 0 1 3 0v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM6 17v2M18 17v2"/>',
    bed: '<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 15h18M3 18v2M21 18v2M6 10V7h5v3"/>',
    pot: '<path d="M4 10h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM2 10h2M20 10h2M9 6.5c0-1 1-1 1-2.5M14 6.5c0-1 1-1 1-2.5"/>',
    bath: '<path d="M3 12h18v2.5a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V6a2 2 0 0 1 4 0M7 19.5l-1 2M17 19.5l1 2"/>',
    door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14 12v.01"/>',
    tree: '<path d="M12 21v-5M6 16h12L12 3z"/>',
    desk: '<path d="M3 8h18M5 8v12M19 8v12M13 8v6h6"/>',
    car: '<path d="M5 17h14v-4l-2-5H7l-2 5zM5 17v2M19 17v2M8 13.5v.01M16 13.5v.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    cloudsun: '<path d="M8 2.5V4M2.5 8H4M4.1 4.1l1.1 1.1M12.6 6.4A4 4 0 0 0 5.1 9"/><path d="M8.5 20h8.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.8A3.2 3.2 0 0 0 8.5 20z"/>',
    cloud: '<path d="M7 19h10a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.8A3.6 3.6 0 0 0 7 19z"/>',
    fog: '<path d="M4 8h16M3 12h18M5 16h14M8 20h8"/>',
    rain: '<path d="M7 15h10a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.8A3.6 3.6 0 0 0 7 15z"/><path d="M8 21l1-3M12 21l1-3M16 21l1-3"/>',
    snow: '<path d="M7 15h10a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.8A3.6 3.6 0 0 0 7 15z"/><path d="M8 19v.01M12 21v.01M16 19v.01"/>',
    storm: '<path d="M7 15h10a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.8A3.6 3.6 0 0 0 7 15z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>',
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
      '<button class="tab" data-act="tab" data-tab="' + id + '" data-key="tab-' + id + '" aria-label="' + label + '" title="' + label + '"' +
      (active === id ? ' aria-current="page"' : '') + '><span class="pill">' + icon(ic) + '</span><span class="tab-label">' + label + '</span></button>'
    ).join('');
  }

  function switchBtn(d, extraKey, code, vertical) {
    const on = code ? !!d.status[code] : isOn(d);
    const label = code ? channelName(d, code) : d.name + (isMulti(d) ? ', all outlets' : ' power');
    return '<button class="switch' + (vertical ? ' v' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(label) + '"' +
      ' data-act="toggle" data-id="' + esc(d.id) + '"' + (code ? ' data-code="' + esc(code) + '"' : '') +
      ' data-key="sw-' + esc(d.id) + (code ? '-' + esc(code) : '') + (extraKey || '') + '"' +
      (d.online ? '' : ' disabled') + '><span class="knob"></span></button>';
  }

  function deviceCard(d, selectedId) {
    const on = isOn(d), toggle = hasToggle(d);
    const cls = ['card', toggle && on && d.online ? 'active' : '', d.online ? '' : 'offline', d.id === selectedId ? 'selected' : ''].join(' ');
    return '<div class="' + cls + '">' +
      '<button class="card-open" data-act="open" data-id="' + esc(d.id) + '" data-key="open-' + esc(d.id) + '" aria-label="' + esc(d.name) + ', ' + esc(statusText(d)) + ', show controls">' +
      '<span class="card-top"><span class="icon-dot"' + (on && d.online && kindOf(d) === 'light' && inColour(d) ? ' style="background:' + colourCss(d) + ';color:#141414"' : '') + '>' + deviceIcon(d) + '</span><span class="card-room">' + esc(d.room) + '</span></span>' +
      '<span class="card-text"><span class="card-name">' + esc(d.name) + '</span><span class="card-status">' + esc(statusText(d)) + '</span></span>' +
      '</button>' +
      (toggle ? '<div class="card-switch">' + switchBtn(d, '', null, true) + '</div>' : '') +
      '</div>';
  }

  function roomIcon(name) {
    const n = String(name).toLowerCase();
    if (n === 'all') return 'grid';
    if (/living|lounge|family|sala/.test(n)) return 'sofa';
    if (/bed|master|guest|kid|nursery/.test(n)) return 'bed';
    if (/kitchen|dining|pantry/.test(n)) return 'pot';
    if (/bath|toilet|wc|shower|laundry/.test(n)) return 'bath';
    if (/hall|entr|foyer|corridor|stair/.test(n)) return 'door';
    if (/garden|patio|yard|balcon|terrace|outdoor|pool/.test(n)) return 'tree';
    if (/office|study|work/.test(n)) return 'desk';
    if (/garage|car|parking/.test(n)) return 'car';
    return 'home';
  }
  function greeting() {
    const name = S.me && S.me.name && !(S.me.owner && S.me.name === 'Owner') ? S.me.name : '';
    return name ? 'Hi ' + name + '!' : 'Hi there!';
  }

  // Weather for the greeting (WMO weather codes from Open-Meteo).
  function weatherInfo(code, isDay) {
    if (code === 0) return isDay ? ['sun', 'Clear'] : ['moon', 'Clear'];
    if (code === 1) return isDay ? ['sun', 'Mainly clear'] : ['moon', 'Mainly clear'];
    if (code === 2) return ['cloudsun', 'Partly cloudy'];
    if (code === 3) return ['cloud', 'Overcast'];
    if (code === 45 || code === 48) return ['fog', 'Fog'];
    if (code >= 51 && code <= 57) return ['rain', 'Drizzle'];
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return ['rain', code >= 80 ? 'Rain showers' : 'Rain'];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['snow', 'Snow'];
    if (code >= 95) return ['storm', 'Thunderstorm'];
    return ['cloud', 'Cloudy'];
  }
  function weatherLine(homeId) {
    const w = S.weather;
    if (!w || w.homeId !== homeId || w.unit !== S.tempUnit) return '<div class="weather" aria-hidden="true"><span class="wx-placeholder"></span></div>';
    if (w.error) return '';
    if (!w.available) return '<div class="weather wx-missing" title="Add your home\'s address in the Tuya app to see the weather.">No location for weather</div>';
    const [ic, desc] = weatherInfo(w.code, w.isDay);
    return '<div class="weather" aria-label="' + esc(desc + ', ' + w.temp + w.unitLabel) + '"><span class="wx-icon">' + icon(ic, 26) + '</span>' +
      '<span class="wx-text"><span class="wx-temp">' + w.temp + w.unitLabel + '</span><span class="wx-desc">' + desc + '</span></span></div>';
  }
  async function loadWeather(force) {
    if (!S.data || !S.data.homeId) return;
    const homeId = S.data.homeId, w = S.weather;
    if (!force && w && w.homeId === homeId && w.unit === S.tempUnit && Date.now() - w.at < 10 * 60 * 1000) return;
    if (loadWeather.busy) return;
    loadWeather.busy = true;
    try {
      const r = await api('weather?homeId=' + encodeURIComponent(homeId) + '&unit=' + S.tempUnit);
      S.weather = { homeId, unit: S.tempUnit, at: Date.now(), available: !!r.available, temp: r.temp, code: r.code, isDay: r.isDay, unitLabel: r.unit === '°F' ? '°F' : '°C' };
    } catch (e) {
      S.weather = { homeId, unit: S.tempUnit, at: Date.now(), error: true };
    } finally {
      loadWeather.busy = false;
    }
    const typing = document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range';
    if (!S.dragging && !typing && !S.gate) render();
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
    const homeName = home ? home.name : 'My Home';
    const homeLine = homes.length > 1
      ? '<span class="home-pick"><label class="sr-only" for="home-head">Home</label>' +
        '<select id="home-head" class="home-select" data-act="home" data-key="home-head">' +
        homes.map((h) => '<option value="' + esc(h.id) + '"' + (h.id === data.homeId ? ' selected' : '') + '>' + esc(h.name) + '</option>').join('') +
        '</select><span class="title-chevron" aria-hidden="true">' + icon('down', 16) + '</span></span>'
      : '<span>' + esc(homeName) + '</span>';
    const initial = (S.me && S.me.name ? S.me.name : 'H').trim().charAt(0).toUpperCase();
    // The top (greeting, rooms, readings, heading) stays put; only the device cards scroll.
    let html = '<div class="dv-top"><div class="hello">' +
      '<div class="hello-text"><h1 class="title">' + esc(greeting()) + '</h1>' +
      '<p class="hello-sub">' + homeLine + '<span class="hello-dot" aria-hidden="true"></span><span>' + onCount + (onCount === 1 ? ' on' : ' on') + '</span></p></div>' +
      '<div class="hello-side">' + weatherLine(data.homeId) +
      '<button class="avatar" data-act="tab" data-tab="me" data-key="avatar" aria-label="Me">' + (S.me && !S.me.owner ? esc(initial) : icon('me', 22)) + '</button></div></div>';
    if (S.mode === 'demo') html += '<p class="banner">You are viewing sample devices. Connect your server in Me to control your own.</p>';
    if (rooms.length > 1) {
      html += '<div class="room-tiles" role="group" aria-label="Rooms">' + rooms.map((r) =>
        '<button class="room-tile" data-act="room" data-room="' + esc(r) + '" data-key="room-' + esc(r) + '" aria-pressed="' + (r === S.room) + '">' +
        '<span class="room-box">' + icon(roomIcon(r), 22) + '</span><span class="room-name">' + esc(r) + '</span></button>').join('') + '</div>';
    }
    if (!data.devices.length) {
      return html + '</div><div class="dv-scroll"><div class="empty"><strong>No devices found</strong><p>Link your Tuya app account to your cloud project (see the README), then tap Refresh in Me.</p></div></div>';
    }
    const readings = shown.filter(isReadingDevice);
    const cards = shown.filter((d) => !isReadingDevice(d));
    if (readings.length) {
      html += '<div class="readings" role="list" aria-label="Readings">' + readings.map((d) => readingTile(d, S.room === 'All')).join('') + '</div>';
    }
    if (cards.length) {
      html += '<div class="section-head"><h2>Devices</h2><span class="section-count">' + cards.length + '</span>' + allOffButton() + '</div>';
      html += '</div><div class="dv-scroll" data-scroll="devices"><div class="grid">' + cards.map((d) => deviceCard(d, selectedId)).join('') + '</div></div>';
      return html;
    }
    html += '</div><div class="dv-scroll">' + (readings.length ? '' : '<div class="empty"><strong>Nothing in this room</strong><p>Assign devices to rooms in the Tuya app.</p></div>') + '</div>';
    return html;
  }

  function confirmDialog(opts) {
    return new Promise((resolve) => {
      let dlg = document.getElementById('confirm-dialog');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'confirm-dialog';
        dlg.className = 'confirm';
        dlg.setAttribute('aria-labelledby', 'confirm-title');
        dlg.setAttribute('aria-describedby', 'confirm-body');
        document.body.appendChild(dlg);
      }
      dlg.innerHTML = '<span class="confirm-icon" aria-hidden="true">' + icon('power', 26) + '</span>' +
        '<h2 id="confirm-title">' + esc(opts.title) + '</h2>' +
        '<p id="confirm-body">' + esc(opts.body) + '</p>' +
        '<div class="confirm-actions">' +
        '<button class="btn soft-btn" value="cancel">Cancel</button>' +
        '<button class="btn danger-btn" value="ok">' + esc(opts.confirm || 'Confirm') + '</button></div>';
      let done = false;
      const finish = (ok) => {
        if (done) return; done = true;
        if (dlg.open) dlg.close();
        resolve(ok);
      };
      dlg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => finish(b.value === 'ok')));
      dlg.addEventListener('cancel', () => finish(false), { once: true });   // Escape key
      dlg.addEventListener('click', (e) => { if (e.target === dlg) finish(false); }); // tap outside
      if (typeof dlg.showModal === 'function') {
        dlg.showModal();
        dlg.querySelector('[value="cancel"]').focus();  // safe default for a big action
      } else {
        finish(window.confirm(opts.title + '\n\n' + opts.body));
      }
    });
  }

  function allOffTargets() {
    if (!S.data) return [];
    return S.data.devices.filter((d) => (S.room === 'All' || (S.room === 'Other' ? !d.room : d.room === S.room)) &&
      d.online && hasToggle(d) && isOn(d) && !isReadingDevice(d));
  }
  function allOffButton() {
    const n = allOffTargets().length;
    if (!n) return '';
    const armed = S.allOffArmed && Date.now() - S.allOffArmed < 4000;
    const where = S.room === 'All' ? '' : ' in ' + S.room;
    const label = armed ? 'Tap again to turn off ' + n + ' devices' + where : 'Turn off everything' + where;
    return '<button class="icon-btn power-off' + (armed ? ' armed' : '') + '" data-act="alloff" data-key="alloff" aria-label="' + esc(label) + '" title="' + esc(label) + '">' +
      icon('power', 20) + '</button>';
  }
  function allOff() {
    const targets = allOffTargets();
    if (!targets.length) return;
    if (!(S.allOffArmed && Date.now() - S.allOffArmed < 4000)) {
      S.allOffArmed = Date.now(); render();
      setTimeout(() => { if (S.allOffArmed && Date.now() - S.allOffArmed >= 4000) { S.allOffArmed = 0; render(); } }, 4100);
      return;
    }
    S.allOffArmed = 0;
    render();
    const where = S.room === 'All' || S.room === 'Other' ? '' : ' in ' + S.room;
    const names = targets.slice(0, 3).map((d) => d.name);
    const rest = targets.length - names.length;
    const list = names.length === 1 ? names[0]
      : names.slice(0, -1).join(', ') + (rest ? ', ' + names[names.length - 1] + ' and ' + rest + ' more' : ' and ' + names[names.length - 1]);
    confirmDialog({
      title: S.room === 'All' ? 'Turn off all devices?' : 'Turn off everything' + where + '?',
      body: 'Are you sure? This turns off ' + targets.length + (targets.length === 1 ? ' device: ' : ' devices: ') + list + '.',
      confirm: 'Turn off ' + targets.length
    }).then((ok) => { if (ok) turnOffAll(); });
  }

  function turnOffAll() {
    const targets = allOffTargets();
    if (!targets.length) return;
    targets.forEach((d) => {
      const k = kindOf(d);
      if (k === 'irac') sendIrAc(d, { power: false });
      else if (k === 'multi') {
        const cmds = channelCodes(d).filter((c) => d.status[c]).map((c) => ({ code: c, value: false }));
        send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, false])));
      } else {
        const pc = powerCode(d);
        if (pc) send(d, [{ code: pc, value: false }], { [pc]: false });
      }
    });
    toast('Turned off ' + targets.length + (targets.length === 1 ? ' device' : ' devices'));
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

  // Brightness dial: an arc from Low (bottom) to High (top), dragged with a finger or the mouse.
  const ARC = { cx: 0, cy: 120, r: 104 };
  function arcPoint(pct) {
    const a = (90 - clamp(pct, 0, 100) * 1.8) * Math.PI / 180;
    return { x: ARC.cx + ARC.r * Math.cos(a), y: ARC.cy + ARC.r * Math.sin(a) };
  }
  function arcPaths(pct) {
    const k = arcPoint(pct);
    return { k, active: 'M ' + ARC.cx + ' ' + (ARC.cy + ARC.r) + ' A ' + ARC.r + ' ' + ARC.r + ' 0 0 0 ' + k.x.toFixed(1) + ' ' + k.y.toFixed(1) };
  }
  function arcDial(d, pct, ready) {
    const p = arcPaths(pct);
    return '<div class="arc-dial" data-id="' + esc(d.id) + '">' +
      '<span class="arc-label hi" aria-hidden="true">High</span><span class="arc-label lo" aria-hidden="true">Low</span>' +
      '<svg viewBox="-6 6 124 228" aria-hidden="true" focusable="false">' +
      '<path class="arc-track" d="M ' + ARC.cx + ' ' + (ARC.cy - ARC.r) + ' A ' + ARC.r + ' ' + ARC.r + ' 0 0 1 ' + ARC.cx + ' ' + (ARC.cy + ARC.r) + '"/>' +
      '<path class="arc-fill" d="' + p.active + '"/>' +
      '<circle class="arc-knob" cx="' + p.k.x.toFixed(1) + '" cy="' + p.k.y.toFixed(1) + '" r="9"/></svg>' +
      '<div class="arc-value"><span class="big" data-live="bright-' + esc(d.id) + '">' + (ready ? pct + '%' : '…') + '</span><span class="big-label">Brightness</span></div>' +
      '</div>';
  }
  function setArcLive(dial, pct) {
    const p = arcPaths(pct);
    dial.querySelector('.arc-fill').setAttribute('d', p.active);
    const knob = dial.querySelector('.arc-knob');
    knob.setAttribute('cx', p.k.x.toFixed(1)); knob.setAttribute('cy', p.k.y.toFixed(1));
    document.querySelectorAll('[data-live="bright-' + CSS.escape(dial.dataset.id) + '"]').forEach((n) => { n.textContent = pct + '%'; });
    document.querySelectorAll('input[data-act="bright"][data-id="' + CSS.escape(dial.dataset.id) + '"]').forEach((n) => { n.value = pct; });
  }
  let arcDrag = null;
  function arcPctFromEvent(dial, e) {
    const svg = dial.querySelector('svg'), box = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const x = vb.x + ((e.clientX - box.left) / box.width) * vb.width;
    const y = vb.y + ((e.clientY - box.top) / box.height) * vb.height;
    const deg = Math.atan2(y - ARC.cy, Math.max(x - ARC.cx, 0.001)) * 180 / Math.PI;
    return clamp(Math.round((90 - deg) / 1.8), 1, 100);
  }
  document.addEventListener('pointerdown', (e) => {
    const dial = e.target.closest && e.target.closest('.arc-dial svg') && e.target.closest('.arc-dial');
    if (!dial) return;
    e.preventDefault();
    arcDrag = { dial, pct: arcPctFromEvent(dial, e) };
    S.dragging = true;
    dial.setPointerCapture && e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    setArcLive(dial, arcDrag.pct);
  });
  document.addEventListener('pointermove', (e) => {
    if (!arcDrag) return;
    arcDrag.pct = arcPctFromEvent(arcDrag.dial, e);
    setArcLive(arcDrag.dial, arcDrag.pct);
  });
  function endArc() {
    if (!arcDrag) return;
    const { dial, pct } = arcDrag;
    arcDrag = null; S.dragging = false;
    const d = findDevice(dial.dataset.id), bc = d && brightCode(d);
    if (!bc) return;
    const cmds = [{ code: bc, value: fromPct(pct, lightRange(d, bc)) }];
    const pc = powerCode(d);
    if (pc && !d.status[pc]) cmds.unshift({ code: pc, value: true });
    send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
  }
  document.addEventListener('pointerup', endArc);
  document.addEventListener('pointercancel', endArc);

  function lightModeSeg(d, sfx) {
    const colour = inColour(d);
    return '<div class="seg" style="--n:2" role="group" aria-label="Light mode">' +
      '<button class="chip soft" data-act="lmode" data-val="white" data-id="' + esc(d.id) + '" data-key="lmode-w' + sfx + '" aria-pressed="' + !colour + '">White</button>' +
      '<button class="chip soft" data-act="lmode" data-val="colour" data-id="' + esc(d.id) + '" data-key="lmode-c' + sfx + '" aria-pressed="' + colour + '">Color</button></div>';
  }
  const SWATCHES = [['Red', 0], ['Orange', 28], ['Yellow', 52], ['Green', 120], ['Cyan', 185], ['Blue', 225], ['Purple', 275], ['Pink', 320]];
  function colourControls(d, sfx) {
    const code = colourCode(d), m = colourMax(code), c = currentColour(d);
    const sPct = Math.round((c.s / m.s) * 100), vPct = toPct(c.v, { min: m.vmin, max: m.v });
    const id = esc(d.id) + sfx;
    return '<div class="colour-ctl" data-id="' + esc(d.id) + '">' +
      '<div class="colour-preview" style="background:' + hsvCss(c.h, sPct) + '" aria-hidden="true"></div>' +
      '<div class="swatches" role="group" aria-label="Colors">' + SWATCHES.map(([n, h]) =>
        '<button class="swatch" style="background:' + hsvCss(h, 100) + '" data-act="swatch" data-h="' + h + '" data-id="' + esc(d.id) + '" data-key="sw-' + n + sfx + '" aria-label="' + n + '"></button>').join('') + '</div>' +
      '<div class="range"><div class="row-between"><label class="se-label" for="hue-' + id + '">Color</label></div>' +
      '<input id="hue-' + id + '" class="hue-range" type="range" min="0" max="360" value="' + Math.round(c.h) + '" data-act="hue" data-id="' + esc(d.id) + '" data-key="hue-' + id + '"></div>' +
      '<div class="range"><div class="row-between"><label class="se-label" for="sat-' + id + '">Saturation</label><span class="se-value" data-colour-label="sat">' + sPct + '%</span></div>' +
      '<input id="sat-' + id + '" type="range" min="0" max="100" value="' + sPct + '" data-act="sat" data-id="' + esc(d.id) + '" data-key="sat-' + id + '"></div>' +
      '<div class="range"><div class="row-between"><label class="se-label" for="cv-' + id + '">Brightness</label><span class="se-value" data-colour-label="v">' + vPct + '%</span></div>' +
      '<input id="cv-' + id + '" type="range" min="1" max="100" value="' + vPct + '" data-act="cbright" data-id="' + esc(d.id) + '" data-key="cv-' + id + '"></div>' +
      '</div>';
  }
  function readColourCtl(ctl, d) {
    const code = colourCode(d), m = colourMax(code);
    const h = Number(ctl.querySelector('[data-act="hue"]').value);
    const sPct = Number(ctl.querySelector('[data-act="sat"]').value);
    const vPct = Number(ctl.querySelector('[data-act="cbright"]').value);
    return { h, sPct, vPct, value: { h, s: Math.round((sPct / 100) * m.s), v: Math.round(m.vmin + (clamp(vPct, 1, 100) / 100) * (m.v - m.vmin)) } };
  }
  function sendColour(d, value) {
    const code = colourCode(d), cmds = [];
    const pc = powerCode(d);
    if (pc && !d.status[pc]) cmds.push({ code: pc, value: true });
    if (d.status.work_mode !== 'colour') cmds.push({ code: 'work_mode', value: 'colour' });
    cmds.push({ code, value });
    send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
  }

  function iconsView() {
    const devices = S.data ? S.data.devices : [];
    let html = '<div class="detail-head se-head-top"><button class="round-btn" data-act="tab" data-tab="me" data-key="icons-back" aria-label="Back to Me">' + icon('back', 20) + '</button>' +
      '<div><p class="sub">Settings</p><h1 class="detail-title">Device icons</h1></div></div>';
    if (!devices.length) return html + '<div class="empty"><strong>No devices yet</strong><p>Devices appear here once they load.</p></div>';
    html += '<div class="list">' + devices.map((d) => {
      const open = S.iconPicking === d.id;
      const current = iconKeyOf(d);
      const label = (ICON_CHOICES.find(([k]) => k === current) || [current, 'Other'])[1];
      return '<button class="list-row" data-act="icon-open" data-id="' + esc(d.id) + '" data-key="icon-open-' + esc(d.id) + '" aria-expanded="' + open + '" aria-controls="icons-' + esc(d.id) + '">' +
        '<span class="channel"><span class="icon-dot sm">' + icon(current, 18) + '</span><span class="se-title">' + esc(d.name) +
        '<span class="se-room">' + esc((d.room ? d.room + ', ' : '') + label) + '</span></span></span>' + icon(open ? 'down' : 'chevron', 16) + '</button>' +
        (open ? iconSection(d, '-' + d.id) : '');
    }).join('') + '</div>';
    html += '<p class="note" style="text-align:left;margin-top:10px">' + (S.sync ? 'Icons sync to everyone who uses this app.' : 'Icons are saved in this browser. Set up sync to share them across devices.') + '</p>';
    return html;
  }

  function iconSection(d, sfx) {
    const current = iconKeyOf(d);
    let html = '<div>';
    {
      html += '<div class="icon-pick" id="icons' + sfx + '">' +
        '<div class="icon-grid" role="radiogroup" aria-label="Icon for ' + esc(d.name) + '">' +
        ICON_CHOICES.map(([k, name]) =>
          '<button class="icon-choice" role="radio" aria-checked="' + (k === current) + '" data-act="icon-set" data-id="' + esc(d.id) + '" data-icon="' + k + '" data-key="icon-' + k + sfx + '">' +
          icon(k, 22) + '<span>' + name + '</span></button>').join('') +
        '</div>' +
        '<div class="icon-actions">' +
        (S.icons[d.id] ? '<button class="chip soft" data-act="icon-reset" data-id="' + esc(d.id) + '" data-key="icon-reset' + sfx + '">Use default</button>' : '') +
        '<button class="chip soft" data-act="icon-open" data-id="' + esc(d.id) + '" data-key="icon-done' + sfx + '">Done</button></div>' +
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
    } else if (k === 'light' && inColour(d)) {
      hero += lightModeSeg(d, sfx) + colourControls(d, sfx);
    } else if (k === 'light') {
      const bc = brightCode(d), wc = warmCode(d);
      if (colourCode(d)) hero += lightModeSeg(d, sfx);
      if (bc) {
        const pct = toPct(st[bc], lightRange(d, bc));
        hero += arcDial(d, pct, specReady(d)) +
          '<div class="range ticks"><div class="row-between"><label class="se-label" for="bright-' + esc(d.id) + sfx + '">Intensity</label>' +
          '<span class="se-value" data-live="bright-' + esc(d.id) + '">' + pct + '%</span></div>' +
          '<input id="bright-' + esc(d.id) + sfx + '" type="range" min="1" max="100" value="' + pct + '" data-act="bright" data-id="' + esc(d.id) + '" data-key="bright-' + esc(d.id) + sfx + '">' +
          '<div class="tick-row" aria-hidden="true">' + '<span></span>'.repeat(7) + '</div>' +
          '<div class="ends"><span>Off</span><span>100%</span></div></div>';
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
      (d.online ? energySection(d) : '') +
      '</div>';
  }

  function scenesView(withAutomations) {
    const data = S.data;
    if (!data) return loadingView();
    let html = '<div class="head"><div><p class="sub">Tap a scene to run it</p><h1 class="title">Scenes</h1></div>' +
      (canEdit() ? '<button class="pill-btn" data-act="scene-new" data-key="scene-new">' + icon('plus', 18) + 'New scene</button>' : '') + '</div>';
    if (!data.scenes.length) {
      html += '<div class="empty"><strong>No tap-to-run scenes yet</strong><p>Tap New scene to make one. Scenes you create in the Tuya app show up here too.</p></div>';
    } else {
      html += '<div class="grid">' + data.scenes.map((s) => {
        const state = S.sceneState[s.id];
        const meta = state === 'running' ? 'Running' : state === 'done' ? 'Done' : (s.actions === 1 ? '1 action' : s.actions + ' actions');
        return '<div class="scene-wrap"><button class="scene ' + (state || '') + '" data-act="scene" data-id="' + esc(s.id) + '" data-key="scene-' + esc(s.id) + '"' + (state === 'running' ? ' disabled' : '') + '>' +
          '<span class="icon-dot">' + icon(state === 'done' ? 'check' : 'play', 16) + '</span>' +
          '<span><span class="name">' + esc(s.name) + '</span><span class="meta">' + meta + '</span></span></button>' +
          (!canEdit() ? '' : '<button class="scene-edit edit-btn" data-act="scene-open" data-id="' + esc(s.id) + '" data-key="scene-edit-' + esc(s.id) + '" aria-label="Edit ' + esc(s.name) + '">' + icon('pencil', 16) + '</button>') + '</div>';
      }).join('') + '</div>';
    }
    if (withAutomations) html += '<div class="section-head" style="margin-top:28px"><h2>Automations</h2>' + newAutoButton() + '</div>' + automationsList();
    return html;
  }

  const canEdit = () => S.mode === 'demo' || !S.me || S.me.role === 'admin';

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
      if (a.executor === 'ruleTrigger' && S.data && S.data.scenes.some((x) => x.id === a.entity)) return { type: 'scene', sceneId: a.entity };
      const d = (a.executor === 'dpIssue' || a.executor === 'device_issue') ? findDevice(a.entity) : null;
      if (d && sceneEligible(d)) return { type: 'device', deviceId: d.id, props: Object.assign({}, a.props) };
      return { type: 'raw', raw: { action_executor: a.executor, entity_id: a.entity || undefined, executor_property: a.props || {} } };
    });
  }
  function openEditor(id) {
    if (!S.data) return;
    const sc = id === 'new' ? null : S.data.scenes.find((x) => x.id === id);
    S.editor = {
      kind: 'scene', routeId: id, id: sc ? sc.id : null, name: sc ? sc.name : '',
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
    if (it.type === 'scene') {
      const sc = S.data.scenes.find((x) => x.id === it.sceneId);
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + icon('play', 16) + '</span>' +
        '<span class="se-title">Run scene<span class="se-room">' + esc(sc ? sc.name : 'Scene not found') + '</span></span>' + moves + '</div></div>';
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

  function sceneEditorView(routeId, kind) {
    kind = kind || 'scene';
    if (!S.data) return loadingView();
    if (!S.editor || S.editor.routeId !== routeId || S.editor.kind !== kind) {
      if (kind === 'auto') openAutoEditor(routeId); else openEditor(routeId);
    }
    const E = S.editor;
    const auto = kind === 'auto', noun = auto ? 'automation' : 'scene';
    if (E && E.loading) return '<div class="detail-head se-head-top"><div><p class="sub">Automation</p><h1 class="detail-title">Loading…</h1></div></div>';
    if (!E || (routeId !== 'new' && !E.id)) {
      return '<div class="empty"><strong>' + (auto ? 'Automation' : 'Scene') + ' not found</strong><p>' + esc((E && E.error) || 'It may have been deleted in the Tuya app.') + '</p></div>';
    }
    let html = '<div class="detail-head se-head-top"><button class="round-btn" data-act="se-cancel" data-key="se-back" aria-label="Back to scenes">' + icon('back', 20) + '</button>' +
      '<div><p class="sub">' + (auto ? 'Automation' : 'Tap-to-run scene') + '</p><h1 class="detail-title">' + (E.id ? 'Edit ' + noun : 'New ' + noun) + '</h1></div></div>';
    html += '<div class="field"><label for="se-name">' + (auto ? 'Automation name' : 'Scene name') + '</label><input id="se-name" maxlength="40" autocomplete="off" placeholder="' +
      (auto ? 'For example, Hall light when the door opens' : 'For example, Movie night') + '" value="' + esc(E.name) + '" data-act="se-name" data-key="se-name"></div>';
    if (auto) html += conditionsSection(E);
    html += '<h2 class="section-title">' + (auto ? 'Then' : 'Actions') + '</h2>';
    if (!E.items.length && !E.picking) html += '<div class="empty"><strong>No actions yet</strong><p>Add the devices this ' + noun + ' should control.</p></div>';
    html += '<div class="se-list">' + E.items.map((it, i) => sceneItemCard(it, i, E.items.length)).join('') + '</div>';
    if (E.picking) {
      const eligible = S.data.devices.filter(sceneEligible);
      html += '<div class="list se-picker"><div class="list-row"><span class="label">Choose a device</span>' +
        '<button class="chip soft" data-act="se-pick-close" data-key="se-pick-close">Close</button></div>' +
        (eligible.length ? eligible.map((d) => '<button class="list-row" data-act="se-pick" data-id="' + esc(d.id) + '" data-key="se-pick-' + esc(d.id) + '">' +
          '<span class="channel"><span class="icon-dot sm">' + deviceIcon(d, 18) + '</span><span class="label">' + esc(d.name) + '</span></span><span class="value">' + esc(d.room || '') + '</span></button>').join('')
          : '<div class="list-row"><span class="meta">No devices here can be used in scenes yet.</span></div>') +
        (auto && S.data.scenes.length ? '<div class="list-row"><span class="label">Or run a scene</span></div>' + S.data.scenes.map((sc) =>
          '<button class="list-row" data-act="se-pick-scene" data-id="' + esc(sc.id) + '" data-key="se-pscene-' + esc(sc.id) + '"><span class="channel"><span class="icon-dot sm">' + icon('play', 14) + '</span><span class="label">' + esc(sc.name) + '</span></span></button>').join('') : '') +
        '<p class="note se-note">Sensors, cameras and IR remotes can\'t be added here yet. Add IR remote actions in the Tuya app; they\'re kept when you edit here.</p></div>';
    } else {
      html += '<div class="se-add-row"><button class="pill-btn" data-act="se-pick-open" data-key="se-pick-open">' + icon('plus', 18) + 'Add device</button>' +
        '<button class="pill-btn soft" data-act="se-add-delay" data-key="se-add-delay">' + icon('plus', 18) + 'Add wait</button></div>';
    }
    if (E.error) html += '<p class="error" role="alert">' + esc(E.error) + '</p>';
    html += '<div class="se-actions">' +
      '<button class="btn" data-act="se-save" data-key="se-save"' + (E.saving ? ' disabled' : '') + '>' + (E.saving ? 'Saving…' : 'Save ' + noun) + '</button>' +
      '<button class="btn ghost" data-act="se-cancel" data-key="se-cancel">Cancel</button></div>';
    if (E.id) {
      html += '<div class="list" style="margin-top:20px"><button class="list-row danger" data-act="se-delete" data-key="se-delete"' + (E.saving ? ' disabled' : '') + '>' +
        '<span class="label">' + (E.confirmDelete ? 'Tap again to delete this ' + noun : 'Delete ' + noun) + '</span></button></div>';
    }
    return html;
  }

  // ---------- Automation editor: conditions ("When") ----------
  const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };

  // What a device can trigger on, based on what it reports.
  function triggerOptions(d) {
    const st = d.status, out = [];
    const k = kindOf(d);
    if (k === 'multi') {
      channelCodes(d).forEach((c) => {
        out.push({ label: channelName(d, c) + ' turns on', code: c, op: '==', value: true });
        out.push({ label: channelName(d, c) + ' turns off', code: c, op: '==', value: false });
      });
    } else if (powerCode(d) && k !== 'sensor' && k !== 'camera' && !d.ir) {
      out.push({ label: 'Turns on', code: powerCode(d), op: '==', value: true });
      out.push({ label: 'Turns off', code: powerCode(d), op: '==', value: false });
    }
    if (typeof st.doorcontact_state === 'boolean') {
      out.push({ label: 'Opens', code: 'doorcontact_state', op: '==', value: true });
      out.push({ label: 'Closes', code: 'doorcontact_state', op: '==', value: false });
    }
    if ('pir' in st) out.push({ label: 'Detects motion', code: 'pir', op: '==', value: 'pir' });
    if ('watersensor_state' in st) out.push({ label: 'Detects a leak', code: 'watersensor_state', op: '==', value: 'alarm' });
    if ('smoke_sensor_status' in st) out.push({ label: 'Detects smoke', code: 'smoke_sensor_status', op: '==', value: 'alarm' });
    const tc = ['va_temperature', 'temp_current'].find((c) => typeof st[c] === 'number');
    if (tc && k !== 'climate') {
      out.push({ label: 'Temperature above', code: tc, op: '>', thresh: 'temp' });
      out.push({ label: 'Temperature below', code: tc, op: '<', thresh: 'temp' });
    }
    const hc = ['va_humidity', 'humidity_value'].find((c) => typeof st[c] === 'number');
    if (hc) {
      out.push({ label: 'Humidity above', code: hc, op: '>', thresh: 'hum' });
      out.push({ label: 'Humidity below', code: hc, op: '<', thresh: 'hum' });
    }
    return out;
  }
  function codeScale(d, code, guess) {
    const sp = specOf(d, code);
    if (sp && typeof sp.scale === 'number') return sp.scale;
    return guess && Math.abs(d.status[code]) >= 60 ? 1 : 0;
  }
  function condFromOption(d, opt, keepValue) {
    const c = { type: 'device', deviceId: d.id, code: opt.code, op: opt.op, thresh: opt.thresh || null };
    if (opt.thresh) {
      const scale = codeScale(d, opt.code, opt.thresh === 'temp');
      const shown = keepValue != null ? keepValue : opt.thresh === 'temp' ? 25 : 60;
      c.scale = scale; c.value = Math.round(shown * Math.pow(10, scale));
    } else c.value = opt.value;
    return c;
  }
  function conditionsToItems(conds) {
    return (conds || []).map((c) => {
      const disp = c.display || {};
      if (Number(c.entity_type) === 6 && !disp.date && /^\d{2}:\d{2}$/.test(String(disp.time || ''))) {
        const loops = /^[01]{7}$/.test(String(disp.loops || '')) ? String(disp.loops) : '1111111';
        return { type: 'timer', time: disp.time, days: loops.split('').map((x) => x === '1'), tz: disp.timezone_id || timeZone() };
      }
      if (Number(c.entity_type) === 1) {
        const d = findDevice(c.entity_id);
        if (d) {
          const opt = triggerOptions(d).find((o) => o.code === disp.code && o.op === disp.operator && (o.thresh || o.value === disp.value));
          if (opt) {
            const scale = opt.thresh ? codeScale(d, opt.code, opt.thresh === 'temp') : 0;
            return { type: 'device', deviceId: d.id, code: opt.code, op: opt.op, value: disp.value, thresh: opt.thresh || null, scale };
          }
        }
      }
      return { type: 'raw', raw: c };
    });
  }
  function rawConditionLabel(c) {
    const t = Number(c.entity_type);
    if (t === 3) return 'Weather condition from the Tuya app';
    if (t === 6) return 'One-off schedule from the Tuya app';
    if (t === 15) return 'External trigger from the Tuya app';
    const d = findDevice(c.entity_id);
    return (d ? d.name + ': ' : '') + 'condition from the Tuya app';
  }

  function conditionCard(c, i) {
    const tools = '<div class="se-tools"><button class="edit-btn" data-act="ae-cremove" data-i="' + i + '" data-key="ae-rm-' + i + '" aria-label="Remove this condition">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
    if (c.type === 'timer') {
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' +
        '</span><span class="se-title">At a time<span class="se-room">' + esc(c.tz) + '</span></span>' + tools + '</div>' +
        '<div class="field-inline"><label for="ae-time-' + i + '">Time</label><input id="ae-time-' + i + '" type="time" value="' + esc(c.time) + '" data-act="ae-time" data-i="' + i + '" data-key="ae-time-' + i + '"></div>' +
        '<div class="days" role="group" aria-label="Days">' + DAY_LETTERS.map((l, d) =>
          '<button class="day" data-act="ae-day" data-i="' + i + '" data-d="' + d + '" data-key="ae-day-' + i + '-' + d + '" aria-pressed="' + !!c.days[d] + '" aria-label="' + DAY_NAMES[d] + '">' + l + '</button>').join('') + '</div></div>';
    }
    if (c.type === 'raw') {
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + icon('generic', 18) + '</span><span class="se-title">' + esc(rawConditionLabel(c.raw)) + '</span>' + tools + '</div>' +
        '<p class="note se-note">Kept as is when you save.</p></div>';
    }
    const d = findDevice(c.deviceId);
    if (!d) return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + icon('generic', 18) + '</span><span class="se-title">Device not found</span>' + tools + '</div></div>';
    const opts = triggerOptions(d);
    let html = '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + deviceIcon(d, 18) + '</span><span class="se-title">' + esc(d.name) +
      (d.room ? '<span class="se-room">' + esc(d.room) + '</span>' : '') + '</span>' + tools + '</div>' +
      '<div class="trigger-chips" role="group" aria-label="When ' + esc(d.name) + '">' + opts.map((o, j) => {
        const on = o.code === c.code && o.op === c.op && (o.thresh ? true : o.value === c.value);
        return '<button class="chip soft" data-act="ae-trigger" data-i="' + i + '" data-j="' + j + '" data-key="ae-tr-' + i + '-' + j + '" aria-pressed="' + on + '">' + esc(o.label) + '</button>';
      }).join('') + '</div>';
    if (c.thresh) {
      const shown = c.value / Math.pow(10, c.scale || 0);
      html += '<div class="se-row"><span class="se-label">' + (c.thresh === 'temp' ? 'Temperature' : 'Humidity') + '</span><div class="stepper">' +
        '<button class="round-btn soft sm" data-act="ae-thresh" data-i="' + i + '" data-delta="-1" data-key="ae-th-d-' + i + '" aria-label="Lower">' + icon('minus', 18) + '</button>' +
        '<span class="se-value">' + (Math.round(shown * 10) / 10) + (c.thresh === 'temp' ? '°' : '%') + '</span>' +
        '<button class="round-btn soft sm" data-act="ae-thresh" data-i="' + i + '" data-delta="1" data-key="ae-th-u-' + i + '" aria-label="Raise">' + icon('plus', 18) + '</button></div></div>';
    }
    return html + '</div>';
  }

  function conditionsSection(E) {
    let html = '<h2 class="section-title">When</h2>';
    if (E.conditions.length > 1) {
      html += '<div class="seg match-seg" style="--n:2" role="group" aria-label="Match">' +
        '<button class="chip soft" data-act="ae-match" data-v="1" data-key="ae-m1" aria-pressed="' + (E.match === 1) + '">Any of these</button>' +
        '<button class="chip soft" data-act="ae-match" data-v="2" data-key="ae-m2" aria-pressed="' + (E.match === 2) + '">All of these</button></div>';
    }
    if (!E.conditions.length && !E.condPicking) html += '<div class="empty"><strong>No conditions yet</strong><p>Choose what starts this automation: a time, or something a device does.</p></div>';
    html += '<div class="se-list">' + E.conditions.map(conditionCard).join('') + '</div>';
    if (E.condPicking) {
      const devs = S.data.devices.filter((d) => triggerOptions(d).length);
      html += '<div class="list se-picker"><div class="list-row"><span class="label">Choose a device</span>' +
        '<button class="chip soft" data-act="ae-pick-close" data-key="ae-pick-close">Close</button></div>' +
        (devs.length ? devs.map((d) => '<button class="list-row" data-act="ae-pick-dev" data-id="' + esc(d.id) + '" data-key="ae-pick-' + esc(d.id) + '">' +
          '<span class="channel"><span class="icon-dot sm">' + deviceIcon(d, 18) + '</span><span class="label">' + esc(d.name) + '</span></span><span class="value">' + esc(d.room || '') + '</span></button>').join('')
          : '<div class="list-row"><span class="meta">No devices here can start automations.</span></div>') + '</div>';
    } else if (E.conditions.length < 10) {
      html += '<div class="se-add-row"><button class="pill-btn" data-act="ae-add-timer" data-key="ae-add-timer">' + icon('plus', 18) + 'Add time</button>' +
        '<button class="pill-btn soft" data-act="ae-pick-open" data-key="ae-pick-open">' + icon('plus', 18) + 'Add device</button></div>';
    }
    return html;
  }

  function conditionsPayload() {
    const E = S.editor;
    if (!E.conditions.length) return 'Add at least one condition under When.';
    const out = [];
    for (const c of E.conditions) {
      if (c.type === 'timer') {
        if (!c.days.some(Boolean)) return 'Pick at least one day for each time.';
        if (!/^\d{2}:\d{2}$/.test(c.time)) return 'Set a time for each schedule.';
        out.push({ entity_type: 6, entity_id: 'timer', display: { time: c.time, loops: c.days.map((x) => (x ? '1' : '0')).join(''), timezone_id: c.tz || timeZone() } });
      } else if (c.type === 'raw') {
        out.push(c.raw);
      } else {
        if (!findDevice(c.deviceId)) return 'Remove the condition for the device that\'s no longer in this home.';
        out.push({ entity_type: 1, entity_id: c.deviceId, display: { code: c.code, operator: c.op, value: c.value } });
      }
    }
    return out;
  }

  async function openAutoEditor(id) {
    if (!S.data) return;
    const base = { kind: 'auto', routeId: id, id: null, name: '', match: 1, background: '', preconditions: [], conditionRule: '',
      conditions: [], items: [], picking: false, condPicking: false, saving: false, confirmDelete: false, error: '' };
    if (id === 'new') { S.editor = Object.assign(base, { condPicking: false }); return; }
    S.editor = Object.assign(base, { loading: true });
    try {
      const a = await api('automation-edit?homeId=' + encodeURIComponent(S.data.homeId) + '&id=' + encodeURIComponent(id));
      if (!S.editor || S.editor.routeId !== id) return;
      Object.assign(S.editor, {
        loading: false, id: a.id, name: a.name, match: a.match_type === 2 ? 2 : a.match_type === 3 ? 3 : 1,
        conditionRule: a.condition_rule || '', background: a.background || '', preconditions: a.preconditions || [],
        conditions: conditionsToItems(a.conditions),
        items: stepsToItems((a.actions || []).map((x) => ({ executor: x.action_executor, entity: x.entity_id || '', props: x.executor_property || {} })))
      });
      S.editor.items.forEach((it) => { if (it.type === 'device' && !S.specs[it.deviceId]) loadSpec(it.deviceId, true); });
      S.editor.conditions.forEach((c) => { if (c.type === 'device' && !S.specs[c.deviceId]) loadSpec(c.deviceId, true); });
    } catch (e) {
      if (S.editor && S.editor.routeId === id) Object.assign(S.editor, { loading: false, error: e.message });
    }
    render();
  }

  async function saveAutomation() {
    const E = S.editor;
    const conditions = conditionsPayload();
    if (typeof conditions === 'string') { E.error = conditions; render(); return; }
    const actions = editorActions();
    if (typeof actions === 'string') { E.error = actions; render(); return; }
    E.saving = true; E.error = ''; render();
    try {
      await api('automation-edit', { method: 'POST', body: {
        op: E.id ? 'update' : 'create', homeId: S.data.homeId, automationId: E.id || undefined,
        name: E.name.trim(), match_type: E.match, condition_rule: E.match === 3 ? E.conditionRule : undefined,
        background: E.background || undefined, preconditions: E.preconditions && E.preconditions.length ? E.preconditions : undefined,
        conditions, actions
      } });
      toast(E.id ? 'Automation saved' : 'Automation created');
      S.editor = null; go('scenes'); refresh({ silent: true, fresh: true });
    } catch (e) {
      E.saving = false; E.error = 'Couldn\'t save: ' + e.message; render();
    }
  }

  async function deleteAutomation() {
    const E = S.editor;
    if (!E.confirmDelete) { E.confirmDelete = true; render(); return; }
    E.saving = true; render();
    try {
      await api('automation-edit', { method: 'POST', body: { op: 'delete', homeId: S.data.homeId, automationId: E.id } });
      toast('Automation deleted');
      S.editor = null; go('scenes'); refresh({ silent: true, fresh: true });
    } catch (e) {
      E.saving = false; E.confirmDelete = false; E.error = 'Couldn\'t delete: ' + e.message; render();
    }
  }

  function editorActions() {
    const E = S.editor;
    const noun = E.kind === 'auto' ? 'automation' : 'scene';
    if (!E.name.trim()) return 'Give the ' + noun + ' a name.';
    if (!E.items.length) return 'Add at least one action.';
    if (E.items[E.items.length - 1].type === 'delay') return 'A ' + noun + ' can\'t end with a wait. Add an action after it, or remove the wait.';
    if (E.items.filter((it) => it.type === 'delay').length > 2) return 'A ' + noun + ' can have at most 2 waits.';
    const out = [];
    for (const it of E.items) {
      if (it.type === 'delay') {
        const total = (it.minutes || 0) * 60 + (it.seconds || 0);
        if (total <= 0) return 'Each wait needs at least 1 second.';
        out.push({ action_executor: 'delay', executor_property: {
          hours: String(Math.floor(total / 3600)), minutes: String(Math.floor((total % 3600) / 60)), seconds: String(total % 60) } });
      } else if (it.type === 'raw') {
        out.push(it.raw);
      } else if (it.type === 'scene') {
        out.push({ action_executor: 'ruleTrigger', entity_id: it.sceneId, executor_property: {} });
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
    if (E.kind === 'auto') return saveAutomation();
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
    if (E.kind === 'auto') return deleteAutomation();
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
    if (!a.length) return '<div class="empty"><strong>No automations yet</strong><p>' + (canEdit() ? 'Tap New automation to make one, like turning on a light when a door opens. ' : '') + 'Automations from the Tuya app show up here too.</p></div>';
    return '<div class="list">' + a.map((x) =>
      '<div class="list-row"><span class="label">' + esc(x.name) + '</span><span class="user-actions">' +
      (canEdit() ? '<button class="edit-btn" data-act="auto-open" data-id="' + esc(x.id) + '" data-key="auto-edit-' + esc(x.id) + '" aria-label="Edit ' + esc(x.name) + '">' + icon('pencil', 16) + '</button>' : '') +
      '<button class="switch" role="switch" aria-checked="' + x.enabled + '" aria-label="' + esc(x.name) + '" data-act="auto" data-id="' + esc(x.id) + '" data-key="auto-' + esc(x.id) + '"><span class="knob"></span></button></span></div>'
    ).join('') + '</div>';
  }

  function newAutoButton() {
    return canEdit() ? '<button class="pill-btn" style="margin-left:auto" data-act="auto-new" data-key="auto-new">' + icon('plus', 18) + 'New automation</button>' : '';
  }

  function automationsPanel() {
    const a = S.data ? S.data.automations : [];
    const active = a.filter((x) => x.enabled).length;
    return '<div class="detail"><div class="detail-head"><div><p class="sub">' +
      active + ' of ' + a.length + ' on</p><h2 class="detail-title">Automations</h2></div>' + newAutoButton() + '</div>' + automationsList() + '</div>';
  }

  function meView() {
    const data = S.data;
    const live = S.mode === 'live';
    const updated = data && data.at ? new Date(data.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    const who = S.me ? 'Signed in as ' + S.me.name + (S.me.role === 'admin' ? ' (admin)' : '') : (live ? 'Connected to Tuya Cloud' : 'Sample devices');
    let html = '<div class="head"><div><p class="sub">' + esc(who) + '</p><h1 class="title">Me</h1></div></div>';
    html += '<div class="list">';
    if (data && data.homes && data.homes.length > 1) {
      html += '<div class="list-row"><label class="label" for="home-select">Home</label><select id="home-select" data-act="home" data-key="home-select">' +
        data.homes.map((h) => '<option value="' + esc(h.id) + '"' + (h.id === data.homeId ? ' selected' : '') + '>' + esc(h.name) + '</option>').join('') + '</select></div>';
    }
    html += '<div class="list-row"><label class="label" for="poll-select">Live updates</label><select id="poll-select" data-act="poll" data-key="poll-select">' +
      [[2000, 'Fastest (2 s)'], [4000, 'Fast (4 s)'], [10000, 'Normal (10 s)'], [30000, 'Saver (30 s)']].map(([ms, label]) =>
        '<option value="' + ms + '"' + (S.pollMs === ms ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></div>';
    html += '<button class="list-row" data-act="tab" data-tab="icons" data-key="icons-open"><span class="label">Device icons</span><span class="value icon-value">Change' + icon('chevron', 16) + '</span></button>';
    html += '<div class="list-row"><label class="label" for="unit-select">Weather units</label><select id="unit-select" data-act="tempunit" data-key="unit-select">' +
      '<option value="c"' + (S.tempUnit === 'c' ? ' selected' : '') + '>Celsius (°C)</option>' +
      '<option value="f"' + (S.tempUnit === 'f' ? ' selected' : '') + '>Fahrenheit (°F)</option></select></div>';
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
      if (S.me && !S.me.owner && S.sync) html += pwFormView();
      html += '<button class="list-row" data-act="lock" data-key="lock"><span class="label">Lock app</span><span class="value">' +
        (hasPin ? 'Asks for your PIN' : 'Asks for the password again') + '</span></button>' +
        '<button class="list-row danger" data-act="signout" data-key="signout"><span class="label">Sign out</span><span class="value">On this device</span></button></div>';
      if (hasPin) html += '<p class="note" style="text-align:left;margin-top:10px">Home also locks itself after 5 minutes in the background. After ' + PIN_TRIES + ' wrong PINs it asks for your password instead.</p>';
    }
    const showAdmin = S.mode === 'demo' || (live && (!S.me || S.me.role === 'admin'));
    if (showAdmin) html += usersSection();
    if (live || S.mode === 'demo') {
      html += '<h2 class="section-title">Sync</h2><div class="list"><div class="list-row"><span class="label">Icons across devices</span><span class="value">' +
        (S.sync ? 'On' : 'Off') + '</span></div></div>' +
        (S.sync ? '' : '<p class="note" style="text-align:left;margin-top:10px">Connect a free Neon database in Vercel to sync icons and add users. See "Sync and users" in the README.</p>');
    }
    if (data && data.warnings && data.warnings.length) {
      html += '<h2 class="section-title">Needs attention</h2><div class="list">' + data.warnings.map((w) =>
        '<div class="list-row"><span class="meta">' + esc(w) + '</span></div>').join('') + '</div>' +
        '<p class="note" style="text-align:left;margin-top:10px">A permission error usually means a service is not yet authorized in your Tuya cloud project. The README explains how to add it.</p>';
    }
    html += '<h2 class="section-title">About</h2><div class="list">' +
      '<div class="list-row"><span class="label">Adding devices</span><span class="value">Pair them in the Tuya app</span></div>' +
      '<div class="list-row"><span class="label">Version</span><span class="value">2.13.0</span></div></div>';
    return html;
  }

  function usersSection() {
    let html = '<h2 class="section-title">People</h2>';
    if (!S.sync) {
      return html + '<div class="list"><div class="list-row"><span class="label">Owner</span><span class="value">Uses APP_PASSWORD</span></div></div>' +
        '<p class="note" style="text-align:left;margin-top:10px">To give others their own password, set up storage first (README, "Sync and users").</p>';
    }
    if (S.users === null) { loadUsers(); return html + '<p class="note" style="text-align:left">Loading…</p>'; }
    if (S.users === 'loading') return html + '<p class="note" style="text-align:left">Loading…</p>';
    if (S.users && S.users.error) return html + '<p class="note" style="text-align:left">' + esc(S.users.error) + '</p>';
    html += '<div class="list"><div class="list-row"><span class="channel"><span class="label">Owner</span></span><span class="value">Admin, uses APP_PASSWORD</span></div>';
    html += S.users.map((u) => {
      const armed = S.userDelete === u.id;
      const homes = (S.data && S.data.homes) || [];
      const isAdmin = u.role === 'admin';
      const sel = Array.isArray(u.homes) ? u.homes : null;
      const homeOptions = isAdmin
        ? '<option selected>All homes (admin)</option>'
        : '<option value=""' + (!sel ? ' selected' : '') + '>All homes</option>' +
          (sel && sel.length > 1 ? '<option selected disabled>' + sel.length + ' homes</option>' : '') +
          (sel && sel.length === 0 ? '<option value="none" selected>No homes</option>' : '') +
          homes.map((h) => '<option value="' + esc(h.id) + '"' + (sel && sel.length === 1 && sel[0] === h.id ? ' selected' : '') + '>Only ' + esc(h.name) + '</option>').join('');
      return '<div class="list-row user-row"><span class="label">' + esc(u.name) + '</span><span class="user-actions">' +
        '<label class="sr-only" for="role-' + esc(u.id) + '">Role for ' + esc(u.name) + '</label>' +
        '<select id="role-' + esc(u.id) + '" data-act="user-role" data-id="' + esc(u.id) + '" data-key="role-' + esc(u.id) + '">' +
        ['member', 'admin'].map((r) => '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + (r === 'admin' ? 'Admin' : 'Member') + '</option>').join('') + '</select>' +
        '<label class="sr-only" for="uhome-' + esc(u.id) + '">Homes for ' + esc(u.name) + '</label>' +
        '<select id="uhome-' + esc(u.id) + '" data-act="user-homes" data-id="' + esc(u.id) + '" data-key="uhome-' + esc(u.id) + '"' + (isAdmin ? ' disabled' : '') + '>' + homeOptions + '</select>' +
        '<button class="chip soft' + (armed ? ' danger-chip' : '') + '" data-act="user-del" data-id="' + esc(u.id) + '" data-key="udel-' + esc(u.id) + '">' + (armed ? 'Confirm' : 'Remove') + '</button></span></div>';
    }).join('');
    const F = S.userForm;
    if (F.open) {
      html += '<form class="user-form" data-act="user-add" novalidate>' +
        '<div class="field"><label for="uf-name">Name</label><input id="uf-name" maxlength="30" autocomplete="off" value="' + esc(F.name) + '" data-act="uf" data-field="name" data-key="uf-name"></div>' +
        '<div class="field"><label for="uf-pw">Password (at least 8 characters)</label><input id="uf-pw" type="password" autocomplete="new-password" value="' + esc(F.password) + '" data-act="uf" data-field="password" data-key="uf-pw"></div>' +
        '<div class="field"><label for="uf-role">Role</label><select id="uf-role" data-act="uf" data-field="role" data-key="uf-role">' +
        '<option value="member"' + (F.role === 'member' ? ' selected' : '') + '>Member: control devices and run scenes</option>' +
        '<option value="admin"' + (F.role === 'admin' ? ' selected' : '') + '>Admin: also edit scenes and manage people</option></select></div>' +
        (F.role === 'member' && S.data && S.data.homes && S.data.homes.length > 1
          ? '<div class="field"><label for="uf-home">Homes</label><select id="uf-home" data-act="uf" data-field="home" data-key="uf-home">' +
            '<option value=""' + (!F.home ? ' selected' : '') + '>All homes</option>' +
            S.data.homes.map((h) => '<option value="' + esc(h.id) + '"' + (F.home === h.id ? ' selected' : '') + '>Only ' + esc(h.name) + '</option>').join('') + '</select></div>'
          : '') +
        (F.error ? '<p class="error" role="alert">' + esc(F.error) + '</p>' : '') +
        '<div class="pin-actions"><button type="button" class="btn ghost" data-act="user-form-close" data-key="uf-cancel">Cancel</button>' +
        '<button type="submit" class="btn" data-key="uf-save"' + (F.busy ? ' disabled' : '') + '>' + (F.busy ? 'Adding…' : 'Add person') + '</button></div></form>';
    } else {
      html += '<button class="list-row" data-act="user-form-open" data-key="uf-open"><span class="label">Add a person</span>' + icon('plus', 16) + '</button>';
    }
    html += '</div><p class="note" style="text-align:left;margin-top:10px">Each person signs in with their own password. Choose "Only" a home to limit a member to it: they won\'t see or control anything elsewhere. Admins always have every home. Removing someone signs them out everywhere.</p>';
    return html;
  }

  function pwFormView() {
    const F = S.pwForm;
    if (!F.open) return '<button class="list-row" data-act="pw-open" data-key="pw-open"><span class="label">Change my password</span>' + icon('chevron', 16) + '</button>';
    return '<form class="user-form" data-act="pw-save" novalidate>' +
      '<div class="field"><label for="pf-cur">Current password</label><input id="pf-cur" type="password" autocomplete="current-password" value="' + esc(F.current) + '" data-act="pf" data-field="current" data-key="pf-cur"></div>' +
      '<div class="field"><label for="pf-new">New password (at least 8 characters)</label><input id="pf-new" type="password" autocomplete="new-password" value="' + esc(F.password) + '" data-act="pf" data-field="password" data-key="pf-new"></div>' +
      (F.error ? '<p class="error" role="alert">' + esc(F.error) + '</p>' : '') +
      '<div class="pin-actions"><button type="button" class="btn ghost" data-act="pw-close" data-key="pf-cancel">Cancel</button>' +
      '<button type="submit" class="btn" data-key="pf-save"' + (F.busy ? ' disabled' : '') + '>' + (F.busy ? 'Saving…' : 'Save') + '</button></div></form>';
  }

  async function loadUsers() {
    S.users = 'loading';
    try { S.users = (await api('users')).users || []; }
    catch (e) { S.users = { error: e.message }; }
    render();
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
      '<h1 class="title">' + (setup ? 'Finish setting up your server' : 'Sign in to Home') + '</h1>' +
      (setup
        ? '<p>' + esc(S.gateError) + ' Add the environment variables listed in the README to your Vercel project, redeploy, then try again.</p>' +
          '<button class="btn" type="button" data-act="retry" data-key="retry">Try again</button>'
        : '<p>Enter your password. The owner uses APP_PASSWORD from Vercel; others use the password an admin gave them.</p>' +
          '<div class="field"><label for="pw">Password</label><input id="pw" name="pw" type="password" autocomplete="current-password" required data-key="pw"></div>' +
          (S.gateError ? '<p class="' + (S.gateError === 'Signing in…' ? 'note' : 'error') + '" role="alert">' + esc(S.gateError) + '</p>' : '') +
          '<button class="btn" type="submit" data-key="unlock">Sign in</button>') +
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
    const activeTab = r.view === 'device' ? 'devices' : (r.view === 'scene-edit' || r.view === 'auto-edit') ? 'scenes' : r.view === 'icons' ? 'me' : r.view;
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
      mainHtml = sceneEditorView(r.id, 'scene');
    } else if (r.view === 'auto-edit') {
      mainHtml = sceneEditorView(r.id, 'auto');
    } else if (r.view === 'icons') {
      mainHtml = iconsView();
    } else if (activeTab === 'scenes') {
      mainHtml = scenesView(!isWide);
      if (isWide) panelHtml = automationsPanel();
    } else {
      mainHtml = meView();
    }

    const mainTop = shell.main.scrollTop, panelTop = shell.panel.scrollTop;
    const oldList = shell.main.querySelector('.dv-scroll'), listTop = oldList ? oldList.scrollTop : 0;
    const devicesPage = activeTab === 'devices' && !(r.view === 'device' && !isWide) && !!S.data;
    shell.main.classList.toggle('devices-view', devicesPage);
    document.documentElement.classList.toggle('lock-scroll', devicesPage);
    shell.app.className = 'app' + (panelHtml == null ? ' no-panel' : '');
    shell.rail.innerHTML = '<span class="mark" aria-hidden="true">' + icon('home') + '</span>' + tabs(activeTab);
    shell.tabbar.innerHTML = tabs(activeTab);
    shell.main.innerHTML = mainHtml;
    shell.panel.innerHTML = panelHtml || '';
    shell.main.scrollTop = mainTop;
    shell.panel.scrollTop = panelTop;
    const newList = shell.main.querySelector('.dv-scroll');
    if (newList && oldList) newList.scrollTop = listTop;

    const routeKey = r.view + ':' + (r.id || '');
    if (routeKey !== lastRouteKey) {
      if (!isWide || activeTab !== lastTab) {
        window.scrollTo(0, 0); shell.main.scrollTop = 0;
        const l = shell.main.querySelector('.dv-scroll'); if (l && r.view === 'devices' && lastRouteKey.indexOf('device:') !== 0) l.scrollTop = 0;
      }
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
      case 'room': S.room = el.dataset.room; S.allOffArmed = 0; render(); break;
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
      case 'lmode': {
        if (!d) break;
        if (el.dataset.val === 'colour') sendColour(d, currentColour(d));
        else {
          const cmds = [{ code: 'work_mode', value: 'white' }], pc = powerCode(d);
          if (pc && !d.status[pc]) cmds.unshift({ code: pc, value: true });
          send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
        }
        break;
      }
      case 'swatch': {
        if (!d) break;
        const m = colourMax(colourCode(d)), c = currentColour(d);
        sendColour(d, { h: Number(el.dataset.h), s: m.s, v: c.v || m.v });
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
        S.icons[id] = el.dataset.icon; saveIcons(); render(); syncIcon(id, el.dataset.icon);
        break;
      case 'icon-reset':
        delete S.icons[id]; saveIcons(); render(); syncIcon(id, null);
        break;
      case 'scene': runScene(id); break;
      case 'scene-new': S.editor = null; go('scene/new'); break;
      case 'scene-open': S.editor = null; go('scene/' + encodeURIComponent(id)); break;
      case 'se-cancel': S.editor = null; go('scenes'); break;
      case 'auto-new': S.editor = null; go('auto/new'); break;
      case 'auto-open': S.editor = null; go('auto/' + encodeURIComponent(id)); break;
      case 'se-pick-scene': S.editor.items.push({ type: 'scene', sceneId: id }); S.editor.picking = false; S.editor.error = ''; render(); break;
      case 'ae-add-timer': S.editor.conditions.push({ type: 'timer', time: '07:00', days: [true, true, true, true, true, true, true], tz: timeZone() }); S.editor.error = ''; render(); break;
      case 'ae-pick-open': S.editor.condPicking = true; render(); break;
      case 'ae-pick-close': S.editor.condPicking = false; render(); break;
      case 'ae-pick-dev': {
        const dev = findDevice(id); if (!dev) break;
        const opts = triggerOptions(dev); if (!opts.length) break;
        S.editor.conditions.push(condFromOption(dev, opts[0]));
        S.editor.condPicking = false; S.editor.error = '';
        if (!S.specs[dev.id]) loadSpec(dev.id, true);
        render(); break;
      }
      case 'ae-cremove': S.editor.conditions.splice(Number(el.dataset.i), 1); render(); break;
      case 'ae-day': { const c = S.editor.conditions[Number(el.dataset.i)]; c.days[Number(el.dataset.d)] = !c.days[Number(el.dataset.d)]; render(); break; }
      case 'ae-match': S.editor.match = Number(el.dataset.v); render(); break;
      case 'ae-trigger': {
        const c = S.editor.conditions[Number(el.dataset.i)], dev = findDevice(c.deviceId);
        const opt = triggerOptions(dev)[Number(el.dataset.j)];
        const keep = c.thresh && opt.thresh === c.thresh ? c.value / Math.pow(10, c.scale || 0) : null;
        S.editor.conditions[Number(el.dataset.i)] = condFromOption(dev, opt, keep);
        render(); break;
      }
      case 'ae-thresh': {
        const c = S.editor.conditions[Number(el.dataset.i)];
        const step = c.thresh === 'temp' ? 1 : 5;
        const shown = c.value / Math.pow(10, c.scale || 0) + Number(el.dataset.delta) * step;
        const limited = c.thresh === 'temp' ? clamp(shown, -20, 60) : clamp(shown, 0, 100);
        c.value = Math.round(limited * Math.pow(10, c.scale || 0));
        render(); break;
      }
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
      case 'refresh': toast('Refreshing'); refresh({ fresh: true }); break;
      case 'install': install(); break;
      case 'lock': lockApp(); break;
      case 'signout': signOut(); break;
      case 'user-form-open': S.userForm = { name: '', password: '', role: 'member', error: '', busy: false, open: true }; render(); focusFirst('uf-name'); break;
      case 'user-form-close': S.userForm.open = false; render(); break;
      case 'user-del':
        if (S.userDelete !== id) { S.userDelete = id; render(); setTimeout(() => { if (S.userDelete === id) { S.userDelete = null; render(); } }, 4000); break; }
        S.userDelete = null; userOp({ op: 'delete', id }, 'Removed'); break;
      case 'pw-open': S.pwForm = { current: '', password: '', error: '', busy: false, open: true }; render(); focusFirst('pf-cur'); break;
      case 'pw-close': S.pwForm.open = false; render(); break;
      case 'alloff': allOff(); break;
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
    if (el.dataset && el.dataset.act === 'uf') { S.userForm[el.dataset.field] = el.value; return; }
    if (el.dataset && el.dataset.act === 'pf') { S.pwForm[el.dataset.field] = el.value; return; }
    if (el.dataset && el.dataset.act === 'se-delay' && S.editor) {
      const it = S.editor.items[Number(el.dataset.i)];
      if (it) it[el.dataset.field] = clamp(Math.floor(Number(el.value) || 0), 0, 59);
      return;
    }
    if (el.dataset && ['hue', 'sat', 'cbright'].includes(el.dataset.act)) {
      const ctl = el.closest('.colour-ctl'), d = findDevice(el.dataset.id);
      if (!ctl || !d) return;
      S.dragging = true;
      const r = readColourCtl(ctl, d);
      ctl.querySelector('.colour-preview').style.background = hsvCss(r.h, r.sPct);
      ctl.querySelector('[data-colour-label="sat"]').textContent = r.sPct + '%';
      ctl.querySelector('[data-colour-label="v"]').textContent = r.vPct + '%';
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
    if (el.dataset.act === 'bright') {
      document.querySelectorAll('.arc-dial[data-id="' + CSS.escape(el.dataset.id) + '"]').forEach((dial) => {
        const p = arcPaths(Number(el.value));
        dial.querySelector('.arc-fill').setAttribute('d', p.active);
        const knob = dial.querySelector('.arc-knob');
        knob.setAttribute('cx', p.k.x.toFixed(1)); knob.setAttribute('cy', p.k.y.toFixed(1));
      });
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.dataset) return;
    const act = el.dataset.act;
    const d = el.dataset.id ? findDevice(el.dataset.id) : null;
    if (LIVE_PREFIX[act]) S.dragging = false;
    if (['hue', 'sat', 'cbright'].includes(act)) {
      S.dragging = false;
      const ctl = el.closest('.colour-ctl'), d = findDevice(el.dataset.id);
      if (ctl && d) sendColour(d, readColourCtl(ctl, d).value);
      return;
    }
    if (act === 'se-range' && S.editor) {
      const it = S.editor.items[Number(el.dataset.i)], dev = findDevice(it.deviceId), code = el.dataset.code, pct = Number(el.value);
      if (code === 'percent_control' || code === 'fan_speed_percent') it.props[code] = pct;
      else it.props[code] = fromPct(pct, lightRange(dev, code));
      render(); return;
    }
    if (act === 'se-delay' && S.editor) { render(); return; }
    if (act === 'ae-time' && S.editor) { const c = S.editor.conditions[Number(el.dataset.i)]; if (c && /^\d{2}:\d{2}$/.test(el.value)) c.time = el.value; return; }
    if (act === 'uf') { S.userForm[el.dataset.field] = el.value; if (el.dataset.field === 'role') render(); return; }
    if (act === 'tempunit') { S.tempUnit = el.value === 'f' ? 'f' : 'c'; store.set('tempUnit', S.tempUnit); loadWeather(true); return; }
    if (act === 'poll') { S.pollMs = Number(el.value) || 4000; store.set('pollMs', String(S.pollMs)); schedulePoll(); toast('Live updates every ' + S.pollMs / 1000 + ' s'); return; }
    if (act === 'user-role') { userOp({ op: 'role', id: el.dataset.id, role: el.value }, 'Role updated'); return; }
    if (act === 'user-homes') {
      const homes = el.value === '' ? null : el.value === 'none' ? [] : [el.value];
      userOp({ op: 'homes', id: el.dataset.id, homes }, homes ? 'Limited to that home' : 'Access to all homes');
      return;
    }
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
    if (form.dataset.act === 'user-add') { e.preventDefault(); addUser(); return; }
    if (form.dataset.act === 'pw-save') { e.preventDefault(); changePassword(); return; }
    if (form.dataset.act !== 'unlock') return;
    e.preventDefault();
    const pw = form.elements.pw ? form.elements.pw.value : '';
    if (!pw) { S.gateError = 'Enter your password.'; render(); return; }
    S.gateError = 'Signing in…'; render();
    let token = pw;
    try {
      const res = await fetch('/api/router?r=login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.token) { token = j.token; S.me = j.user || null; S.sync = !!j.sync; }
      else if (res.status === 401 || res.status === 429) { S.gateError = j.error || 'That password isn\'t right.'; render(); return; }
      else if (res.status === 503 && j.code === 'not_configured') { S.gate = 'setup'; S.gateError = j.error; render(); return; }
      // Any other answer (e.g. an older server without /api/login): fall back to the password itself.
    } catch (err) {
      S.gateError = navigator.onLine ? 'Could not reach your server.' : 'You are offline.'; render(); return;
    }
    S.key = token; store.set('appKey', token);
    S.mode = 'live'; store.set('mode', 'live');
    S.gateError = ''; S.gate = null; S.data = null;
    await refresh();
  });

  function focusFirst(key) {
    const el = document.querySelector('[data-key="' + key + '"]');
    if (el) el.focus();
  }

  async function userOp(body, okMsg) {
    try {
      const r = await api('users', { method: 'POST', body });
      if (r.users) S.users = r.users;
      toast(okMsg);
    } catch (e) { toast(e.message); }
    render();
  }

  async function addUser() {
    const F = S.userForm;
    if (!F.name.trim()) { F.error = 'Enter a name.'; render(); return; }
    if (F.password.length < 8) { F.error = 'Passwords need at least 8 characters.'; render(); return; }
    F.busy = true; F.error = ''; render();
    try {
      let r = await api('users', { method: 'POST', body: { op: 'create', name: F.name.trim(), password: F.password, role: F.role } });
      if (F.role === 'member' && F.home) {
        const created = (r.users || []).find((u) => u.name.toLowerCase() === F.name.trim().toLowerCase());
        if (created) r = await api('users', { method: 'POST', body: { op: 'homes', id: created.id, homes: [F.home] } });
      }
      S.users = r.users || S.users;
      S.userForm = { name: '', password: '', role: 'member', error: '', busy: false, open: false };
      toast('Added. Give them their password to sign in.');
    } catch (e) { F.busy = false; F.error = e.message; }
    render();
  }

  async function changePassword() {
    const F = S.pwForm;
    if (F.password.length < 8) { F.error = 'Passwords need at least 8 characters.'; render(); return; }
    F.busy = true; F.error = ''; render();
    try {
      await api('users', { method: 'POST', body: { op: 'password', current: F.current, password: F.password } });
      S.pwForm = { current: '', password: '', error: '', busy: false, open: false };
      toast('Password changed');
    } catch (e) { F.busy = false; F.error = e.message; }
    render();
  }

  async function signOut() {
    if (S.mode === 'live') { try { await api('logout', { method: 'POST' }); } catch (e) { /* signing out locally anyway */ } }
    wipeVault(); store.del('appKey');
    S.key = ''; S.me = null; S.users = null; S.data = null; S.specs = {};
    S.gate = 'login'; S.gateError = '';
    render();
  }

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

  // ---------- Pull down to refresh ----------
  const PTR_TRIGGER = 64;
  let ptr = null;
  function ptrEl() {
    let el = document.getElementById('ptr');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ptr'; el.className = 'ptr'; el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>';
      document.body.appendChild(el);
    }
    return el;
  }
  function activeScroller() {
    const list = document.querySelector('.main.devices-view .dv-scroll');
    if (list) return list;
    if (wide.matches && shell) return shell.main;
    return document.scrollingElement || document.documentElement;
  }
  function ptrShow(pull) {
    const el = ptrEl(), y = Math.min(pull, 96);
    el.style.transform = 'translate(-50%, ' + (y - 48) + 'px) rotate(' + Math.round(pull * 3) + 'deg)';
    el.style.opacity = String(Math.min(1, pull / PTR_TRIGGER));
    el.classList.toggle('armed', pull >= PTR_TRIGGER);
  }
  function ptrHide() {
    const el = document.getElementById('ptr');
    if (!el) return;
    el.classList.remove('armed', 'spinning');
    el.style.transform = 'translate(-50%, -48px)'; el.style.opacity = '0';
  }
  document.addEventListener('touchstart', (e) => {
    if (S.gate || e.touches.length !== 1 || !S.data || ptr && ptr.busy) return;
    if (e.target.closest('input, select, textarea, dialog, .arc-dial, .hue-range, .switch')) return;
    const scroller = activeScroller();
    if (!scroller || scroller.scrollTop > 0) return;
    ptr = { y0: e.touches[0].clientY, x0: e.touches[0].clientX, pull: 0, scroller };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!ptr || ptr.busy) return;
    const dy = e.touches[0].clientY - ptr.y0, dx = e.touches[0].clientX - ptr.x0;
    if (ptr.scroller.scrollTop > 0 || dy <= 0 || Math.abs(dx) > Math.abs(dy)) { if (!ptr.pull) ptr = null; else { ptr.pull = 0; ptrHide(); } return; }
    ptr.pull = dy * 0.5;  // resistance
    ptrShow(ptr.pull);
  }, { passive: true });
  document.addEventListener('touchend', async () => {
    if (!ptr || ptr.busy) return;
    const go = ptr.pull >= PTR_TRIGGER;
    if (!go) { ptr = null; ptrHide(); return; }
    ptr.busy = true;
    const el = ptrEl();
    el.classList.add('spinning'); el.style.opacity = '1'; el.style.transform = 'translate(-50%, 18px)';
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) { /* ignore */ } }
    S.energy = {};
    await refresh({ fresh: true, silent: true });
    loadWeather(true);
    ptrHide(); ptr = null;
  });

  // Physical keyboard support on the PIN screens.
  document.addEventListener('keydown', (e) => {
    if (S.gate !== 'pin' && S.gate !== 'pin-new') return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); pinDigit(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); S.pinEntry = S.pinEntry.slice(0, -1); S.pinError = ''; render(); }
    else if (e.key === 'Enter' && S.gate === 'pin-new') { e.preventDefault(); pinNext(); }
  });

  async function syncIcon(id, key) {
    if (!S.sync) return;
    try { await api('settings', { method: 'POST', body: { icons: { [id]: key } } }); }
    catch (e) { toast('Icon saved on this device only: ' + e.message); }
  }

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
    if (!inEditor()) S.editor = null;
    render();
  });
  wide.addEventListener('change', render);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (S.mode === 'live' && !S.gate && readVault() && hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) { lockApp(); return; }
    if (!S.gate) refresh({ silent: true });
  });
  // Two speeds of updates: a light status poll every few seconds (just device states, one request),
  // and a full refresh (rooms, scenes, automations...) once a minute.
  const FULL_MS = 60000;
  let lastFull = 0, statusBusy = false, pollTimer = null;
  async function pollStatus() {
    if (statusBusy || S.loading || !S.data || S.gate || document.visibilityState !== 'visible') return;
    const ids = S.data.devices.filter((d) => !d.ir || d.ir.hub === null || d.sensorOnly).map((d) => d.id);
    if (!ids.length) return;
    statusBusy = true;
    try {
      const r = await api('status?ids=' + encodeURIComponent(ids.join(',')));
      let changed = false;
      const now = Date.now();
      for (const d of S.data.devices) {
        const fresh = r.devices && r.devices[d.id];
        if (!fresh) continue;
        if (now - (S.touched[d.id] || 0) < 1500) continue; // let a just-sent command land first
        if (d.ir && d.ir.ac) { if (d.online !== fresh.online) { d.online = fresh.online; changed = true; } continue; }
        if (d.online !== fresh.online || JSON.stringify(d.status) !== JSON.stringify(fresh.status)) {
          d.online = fresh.online; d.status = fresh.status; changed = true;
        }
      }
      if (changed) S.data.at = r.at;
      const typing = document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range';
      if (changed && !S.dragging && !S.renaming && !typing && !(S.editor && inEditor())) render();
    } catch (e) {
      if (e.code === 'unauthorized') refresh({ silent: true });
    } finally {
      statusBusy = false;
    }
  }
  function statusSoon() {
    clearTimeout(statusSoon.a); clearTimeout(statusSoon.b);
    statusSoon.a = setTimeout(pollStatus, 1600);
    statusSoon.b = setTimeout(pollStatus, 4000);
  }
  function schedulePoll() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (document.visibilityState !== 'visible' || S.gate || S.dragging) return;
      if (Date.now() - lastFull > FULL_MS) refresh({ silent: true });
      else pollStatus();
    }, S.pollMs);
  }
  schedulePoll();
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
        { id: 'dev14', name: 'Light strip', category: 'dd', product: 'RGB light strip', online: true, room: 'Living room', status: { switch_led: true, work_mode: 'colour', bright_value_v2: 800, temp_value_v2: 0, colour_data_v2: { h: 275, s: 900, v: 800 } } },
        { id: 'dev2', name: 'Floor lamp', category: 'dj', product: 'Smart bulb', online: true, room: 'Living room', status: { switch_led: false, work_mode: 'white', bright_value_v2: 450, temp_value_v2: 500 } },
        { id: 'dev9', name: 'Living room climate', category: 'wsdcg', product: 'Temperature and humidity sensor', online: true, room: 'Living room', status: { va_temperature: 215, va_humidity: 48, battery_percentage: 72 } },
        { id: 'dev13', name: 'Bedroom sensor', category: 'wsdcg', product: 'Temperature and humidity sensor', online: true, room: 'Bedroom', status: { va_temperature: 198, va_humidity: 55, battery_percentage: 15 } },
        { id: 'dev3', name: 'Air conditioner', category: 'kt', product: 'AC controller', online: true, room: 'Bedroom', status: { switch: true, temp_set: 24, temp_current: 26, mode: 'cold' } },
        { id: 'dev7', name: 'Bedroom curtains', category: 'cl', product: 'Curtain motor', online: true, room: 'Bedroom', status: { control: 'stop', percent_control: 60, percent_state: 60 } },
        { id: 'dev8', name: 'Bedside lamp', category: 'dj', product: 'Smart bulb', online: true, room: 'Bedroom', status: { switch_led: false, work_mode: 'white', bright_value_v2: 300, temp_value_v2: 0 } },
        { id: 'dev11', name: 'Donut Lamp', category: 'kg', product: '2-gang switch', online: true, room: 'Living room', status: { switch_1: true, switch_2: false } },
        { id: 'dev12', name: 'Desk power strip', category: 'pc', product: 'Power strip with USB', online: true, room: 'Bedroom', status: { switch_1: true, switch_2: true, switch_3: false, switch_usb1: true, cur_power: 865, cur_voltage: 2298, cur_current: 380, add_ele: 0 } },
        { id: 'dev4', name: 'Kettle plug', category: 'cz', product: 'Smart plug with energy monitoring', online: true, room: 'Kitchen', status: { switch_1: false, cur_power: 0, cur_voltage: 2301, cur_current: 0, add_ele: 0 } },
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
        { id: 'au1', name: 'Porch light at 7 pm', enabled: true, match_type: 1,
          conditions: [{ entity_type: 6, entity_id: 'timer', display: { time: '19:00', loops: '1111111', timezone_id: 'Europe/London' } }],
          actions: [{ action_executor: 'dpIssue', entity_id: 'dev2', executor_property: { switch_led: true } }] },
        { id: 'au2', name: 'Hall light when the door opens', enabled: true, match_type: 1,
          conditions: [{ entity_type: 1, entity_id: 'dev5', display: { code: 'doorcontact_state', operator: '==', value: true } }],
          actions: [{ action_executor: 'dpIssue', entity_id: 'dev1', executor_property: { switch_led: true } }] },
        { id: 'au3', name: 'Bedroom too warm', enabled: false, match_type: 1,
          conditions: [{ entity_type: 1, entity_id: 'dev13', display: { code: 'va_temperature', operator: '>', value: 260 } }],
          actions: [{ action_executor: 'dpIssue', entity_id: 'dev3', executor_property: { switch: true, temp_set: 22 } }] }
      ],
      warnings: []
    };
    const specs = {
      dj: { bright_value_v2: { min: 10, max: 1000, scale: 0, step: 1 }, temp_value_v2: { min: 0, max: 1000, scale: 0, step: 1 } },
      kt: { temp_set: { min: 16, max: 30, scale: 0, step: 1 }, temp_current: { scale: 0 }, mode: { range: ['cold', 'hot', 'wind', 'auto'] } },
      wsdcg: { va_temperature: { scale: 1 }, va_humidity: { scale: 0 } },
      cl: { percent_control: { min: 0, max: 100, scale: 0, step: 1 } },
      cz: { cur_power: { scale: 1 }, cur_voltage: { scale: 1 }, cur_current: { scale: 0 } },
      pc: { cur_power: { scale: 1 }, cur_voltage: { scale: 1 }, cur_current: { scale: 0 } }
    };
    const names = { dev12: { switch_1: 'Monitor', switch_2: 'Laptop charger' } };
    const demoIcons = {};
    let demoUsers = [{ id: 'u1', name: 'Sam', role: 'member', owner: false, homes: null }];
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
        out.me = { id: 'owner', name: 'Owner', role: 'admin', owner: true };
        out.sync = true;
        out.settings = { icons: Object.assign({}, demoIcons) };
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
        if ('cur_power' in dev.status) dev.status.cur_power = dev.id === 'dev4' ? (dev.status.switch_1 ? 21540 : 0) : dev.status.cur_power;
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
      if (path.startsWith('energy')) {
        const days = [0.32, 0.41, 0.28, 0.55, 0.47, 0.6, 0.21].map((k, i) => {
          const t = new Date(); t.setDate(t.getDate() - 6 + i);
          return { day: t.getFullYear() + String(t.getMonth() + 1).padStart(2, '0') + String(t.getDate()).padStart(2, '0'), kwh: k };
        });
        return { available: true, days, today: 0.21, week: 2.84, total: 142.6 };
      }
      if (path.startsWith('weather')) {
        const f = /unit=f/.test(path);
        return { available: true, temp: f ? 75 : 24, code: 2, isDay: true, unit: f ? '°F' : '°C', place: 'Demo' };
      }
      if (path.startsWith('status')) {
        const out = {};
        db.devices.forEach((x) => { out[x.id] = { online: x.online, status: clone(x.status) }; });
        return { at: Date.now(), devices: out };
      }
      if (path === 'settings') { Object.entries((b.icons) || {}).forEach(([k, v]) => { if (v === null) delete demoIcons[k]; else demoIcons[k] = v; }); return { icons: demoIcons }; }
      if (path === 'logout') return { ok: true };
      if (path === 'users') {
        if (!opts || !opts.method || opts.method === 'GET') return { users: clone(demoUsers) };
        if (b.op === 'create') {
          if (demoUsers.some((u) => u.name.toLowerCase() === String(b.name).toLowerCase())) { const e = new Error('That name is taken.'); throw e; }
          demoUsers.push({ id: 'u' + Date.now(), name: b.name, role: b.role, owner: false });
        }
        if (b.op === 'role') demoUsers.forEach((u) => { if (u.id === b.id) u.role = b.role; });
        if (b.op === 'homes') demoUsers.forEach((u) => { if (u.id === b.id) u.homes = b.homes; });
        if (b.op === 'delete') demoUsers = demoUsers.filter((u) => u.id !== b.id);
        return { users: clone(demoUsers) };
      }
      if (path.startsWith('automation-edit?')) {
        const id = decodeURIComponent((path.match(/[?&]id=([^&]+)/) || [])[1] || '');
        const a = db.automations.find((x) => x.id === id);
        if (!a) { const e = new Error('Automation not found.'); throw e; }
        return clone(a);
      }
      if (path === 'automation-edit') {
        if (b.op === 'create') db.automations.push({ id: 'au' + Date.now(), name: b.name, enabled: true, match_type: b.match_type, conditions: b.conditions, actions: b.actions });
        if (b.op === 'update') { const a = db.automations.find((x) => x.id === b.automationId); if (a) Object.assign(a, { name: b.name, match_type: b.match_type, conditions: b.conditions, actions: b.actions }); }
        if (b.op === 'delete') db.automations = db.automations.filter((x) => x.id !== b.automationId);
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
