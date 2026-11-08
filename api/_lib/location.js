// The home's location (from its address in the Tuya app), shared by the weather greeting and
// sunrise/sunset automations. Homes without coordinates are looked up by address (Open-Meteo).
const { call, config, TuyaError } = require('./tuya');
const { cached, SLOW } = require('./cache');

async function getJson(url) {
  let res;
  try { res = await fetch(url, { signal: AbortSignal.timeout(6000) }); }
  catch (e) { throw new TuyaError('Weather service unreachable.', 'weather', 502); }
  if (!res.ok) throw new TuyaError('Weather service error (' + res.status + ').', 'weather', 502);
  return res.json();
}

// Try the whole address, then broader parts of it.
async function geocode(address) {
  const parts = String(address || '').split(',').map((x) => x.trim()).filter(Boolean);
  const tries = [address].concat(parts.slice().reverse()).filter(Boolean).slice(0, 4);
  for (const name of tries) {
    const j = await getJson('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(name));
    const hit = j && j.results && j.results[0];
    if (hit) return { lat: hit.latitude, lon: hit.longitude, place: hit.name };
  }
  return null;
}

// → { lat, lon, place } or null when the home has no location at all.
async function homeLocation(homeId) {
  const { uid } = config();
  const homes = await cached('homes', SLOW, () => call('GET', `/v1.0/users/${uid}/homes`));
  const home = (homes || []).find((h) => String(h.home_id) === String(homeId));
  if (!home) throw new TuyaError('Home not found.', 'not_found', 404);
  let lat = Number(home.lat), lon = Number(home.lon), place = home.geo_name || '';
  if (!lat && !lon) {
    if (!place) return null;
    const g = await cached('geo:' + place, 24 * 3600 * 1000, () => geocode(place));
    if (!g) return null;
    lat = g.lat; lon = g.lon;
  }
  return { lat, lon, place };
}

module.exports = { getJson, geocode, homeLocation };
