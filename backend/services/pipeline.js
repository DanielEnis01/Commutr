import { getParkingPressureData } from "./nebula.js";
import { getTimeOverride } from "./devOverride.js";
import { getWeatherData } from "./weather.js";

export async function buildPredictionContext(targetTime = null) {
  const nebulaApiKey = process.env.NEBULA_API_KEY;
  const weatherApiKey = process.env.OPENWEATHER_API_KEY;
  const effectiveTargetTime = targetTime || getTimeOverride();

  let classData = { data: { starting: [], current: [], ended: [] }, queryTime: null };
  if (nebulaApiKey) {
    try {
      classData = await getParkingPressureData(nebulaApiKey, effectiveTargetTime);
    } catch (error) {
      console.error("[Backend][pipeline] Nebula lookup failed:", error.message);
    }
  }

  let weatherMultiplier = 1.0;
  let weatherData = null;

  if (weatherApiKey) {
    try {
      weatherData = await getWeatherData(weatherApiKey);
      if (weatherData.severe) {
        weatherMultiplier = 1.6;
      } else if (weatherData.rain || weatherData.snow) {
        weatherMultiplier = 1.3;
      }
    } catch (error) {
      console.error("[Backend][pipeline] Weather lookup failed:", error.message);
    }
  }

  return {
    classData,
    effectiveTargetTime,
    weatherMultiplier,
    weatherData,
    payload: {
      classes: {
        starting_soon: classData.data.starting,
        currently_active: classData.data.current,
        recently_ended: classData.data.ended,
      },
      weather_multiplier: weatherMultiplier,
      weather: weatherData,
    },
  };
}
