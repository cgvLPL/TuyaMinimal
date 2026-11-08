// GET /api/weather?homeId=..&unit=c|f → current weather at the home's location
// The location comes from the home's address in the Tuya app. Weather data comes from
// Open-Meteo (free, no API key). Results are cached for 10 minutes.
const { TuyaError } = require('../_lib/tuya');
const { getJson, homeLocation } = require('../_lib/location');
const { handler, requireId } = require('../_lib/http');
const { cached } = require('../_lib/cache');
const access = require('../_lib/access');

const TEN_MIN = 10 * 60 * 1000;

module.exports = handler(['GET'], async (req) => {
  const homeId = requireId(String((req.query && req.query.homeId) || ''), 'home');
  access.requireHome(req.user, homeId);
  const unit = req.query && req.query.unit === 'f' ? 'f' : 'c';
  const loc = await homeLocation(homeId);
  if (!loc) return { available: false, reason: 'no_location' };
  const { lat, lon, place } = loc;

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
