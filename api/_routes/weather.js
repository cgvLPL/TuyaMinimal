// GET /api/weather?homeId=..&unit=c|f → current weather at the home's location
// The location comes from the home's address in the Tuya app. Weather data comes from
// Open-Meteo (free, no API key). Results are cached for 10 minutes.
const { call, config, TuyaError } = require('../_lib/tuya');
const { handler, requireId } = require('../_lib/http');
const { cached, SLOW } = require('../_lib/cache');
const access = require('../_lib/access');

const TEN_MIN = 10 * 60 * 1000;

async function getJson(url) {
  let res;
  try { res = await fetch(url, { signal: AbortSignal.timeout(6000) }); }
  catch (e) { throw new TuyaError('Weather service unreachable.', 'weather', 502); }
  if (!res.ok) throw new TuyaError('Weather service error (' + res.status + ').', 'weather', 502);
  return res.json();
}

// Homes without coordinates may still have an address: look it up, trying broader parts if needed.
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

module.exports = handler(['GET'], async (req) => {
  const homeId = requireId(String((req.query && req.query.homeId) || ''), 'home');
  access.requireHome(req.user, homeId);
  const unit = req.query && req.query.unit === 'f' ? 'f' : 'c';
  const { uid } = config();
  const homes = await cached('homes', SLOW, () => call('GET', `/v1.0/users/${uid}/homes`));
  const home = (homes || []).find((h) => String(h.home_id) === homeId);
  if (!home) throw new TuyaError('Home not found.', 'not_found', 404);

  let lat = Number(home.lat), lon = Number(home.lon), place = home.geo_name || '';
  if (!lat && !lon) {
    if (!place) return { available: false, reason: 'no_location' };
    const g = await cached('geo:' + place, 24 * 3600 * 1000, () => geocode(place));
    if (!g) return { available: false, reason: 'no_location' };
    lat = g.lat; lon = g.lon;
  }

  const key = 'wx:' + lat.toFixed(2) + ',' + lon.toFixed(2) + ':' + unit;
  const w = await cached(key, TEN_MIN, () => getJson(
    'https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) +
    '&current=temperature_2m,weather_code,is_day' + (unit === 'f' ? '&temperature_unit=fahrenheit' : '')));
  const c = w && w.current;
  if (!c || typeof c.temperature_2m !== 'number') throw new TuyaError('Weather data unavailable.', 'weather', 502);
  return {
    available: true,
    temp: Math.round(c.temperature_2m),
    code: Number(c.weather_code) || 0,
    isDay: c.is_day === 1 || c.is_day === true,
    unit: unit === 'f' ? '°F' : '°C',
    place,
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000
  };
});
