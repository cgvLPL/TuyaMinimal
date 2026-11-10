// GET /api/weather?homeId=..&unit=c|f → current weather and outdoor air quality at the home's location
// The location comes from the home's address in the Tuya app. Weather and air quality come from
// Open-Meteo (free, no API key). Weather is cached for 5 minutes, air quality for 30.
const { TuyaError } = require('../_lib/tuya');
const { getJson, homeLocation } = require('../_lib/location');
const { handler, requireId } = require('../_lib/http');
const { cached } = require('../_lib/cache');
const access = require('../_lib/access');

const FIVE_MIN = 5 * 60 * 1000;  // Open-Meteo's current conditions update about every 15 minutes

function todayExtras(w, unit) {
  const d = w.daily || {}, c = w.current || {}, off = (w.utc_offset_seconds || 0) * 1000;
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const ts = (v) => { const t = typeof v === 'string' ? Date.parse(v + 'Z') : NaN; return Number.isFinite(t) ? t - off : null; };
  const hi = num(d.temperature_2m_max && d.temperature_2m_max[0]), lo = num(d.temperature_2m_min && d.temperature_2m_min[0]);
  return {
    hi: hi == null ? null : Math.round(hi),
    lo: lo == null ? null : Math.round(lo),
    humidity: num(c.relative_humidity_2m) == null ? null : Math.round(c.relative_humidity_2m),
    wind: num(c.wind_speed_10m) == null ? null : Math.round(c.wind_speed_10m),
    windUnit: unit === 'f' ? 'mph' : 'km/h',
    sun: (d.sunrise || []).map((r, i) => ({ rise: ts(r), set: ts(d.sunset && d.sunset[i]) })).filter((x) => x.rise && x.set)
  };
}
const HALF_HOUR = 30 * 60 * 1000;

// Outdoor air quality (US AQI, the same scale the app uses for indoor monitors). Used when the
// home has no air quality sensor of its own. Never fails the weather: no data just means null.
async function outdoorAir(lat, lon) {
  try {
    const key = 'aq1:' + lat.toFixed(2) + ',' + lon.toFixed(2);
    const a = await cached(key, HALF_HOUR, () => getJson(
      'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) +
      '&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide&timezone=auto'));
    const c = a && a.current;
    if (!c || typeof c.us_aqi !== 'number') return null;
    const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
    return { aqi: Math.round(c.us_aqi), pm25: n(c.pm2_5), pm10: n(c.pm10), o3: n(c.ozone), no2: n(c.nitrogen_dioxide), time: c.time || null };
  } catch (e) {
    return null;
  }
}

// The forecast model's weather code says "drizzle" or "rain" whenever a trace of rain is
// possible in the hour, which in the tropics is most of the time, so it can sit on Drizzle all day.
// Only keep a rain code when rain is actually falling now (at least 0.1 mm this interval);
// otherwise describe the sky from the cloud cover.
const WET = (code) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
function realCode(c) {
  const code = Number(c.weather_code) || 0;
  if (!WET(code)) return code;
  const mm = Math.max(Number(c.precipitation) || 0, (Number(c.rain) || 0) + (Number(c.showers) || 0));
  if (mm >= 0.1) return code;
  const cloud = Number(c.cloud_cover);
  if (!Number.isFinite(cloud)) return 3;
  return cloud < 20 ? 0 : cloud < 50 ? 1 : cloud < 85 ? 2 : 3;
}

module.exports = handler(['GET'], async (req) => {
  const homeId = requireId(String((req.query && req.query.homeId) || ''), 'home');
  access.requireHome(req.user, homeId);
  const unit = req.query && req.query.unit === 'f' ? 'f' : 'c';
  const loc = await homeLocation(homeId);
  if (!loc) return { available: false, reason: 'no_location' };
  const { lat, lon, place } = loc;

  const key = 'wx3:' + lat.toFixed(2) + ',' + lon.toFixed(2) + ':' + unit;
  const airP = outdoorAir(lat, lon);
  const w = await cached(key, FIVE_MIN, () => getJson(
    'https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) +
    '&current=temperature_2m,weather_code,is_day,precipitation,rain,showers,cloud_cover,relative_humidity_2m,wind_speed_10m' +
    '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&forecast_days=2&timezone=auto' +
    (unit === 'f' ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '&wind_speed_unit=kmh')));
  const c = w && w.current;
  if (!c || typeof c.temperature_2m !== 'number') throw new TuyaError('Weather data unavailable.', 'weather', 502);
  return {
    available: true,
    temp: Math.round(c.temperature_2m),
    code: realCode(c),
    isDay: c.is_day === 1 || c.is_day === true,
    unit: unit === 'f' ? '°F' : '°C',
    place,
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
    air: await airP,
    // For the wall tablet's Weather face: today's high/low, outdoor humidity, wind, and sunrise/sunset
    // (as timestamps; Open-Meteo gives local times plus the location's UTC offset).
    ...todayExtras(w, unit)
  };
});
