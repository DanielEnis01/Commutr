import 'dotenv/config';

const UTD_LAT = 32.9886;
const UTD_LON = -96.7479;

const SEVERE_CONDITIONS = [
    'Thunderstorm',
    'Tornado',
    'Squall',
    'Snow',
    'Rain',
    'Drizzle',
    'Ash',
    'Dust',
    'Sand',
    'Fog'
];

async function getWeatherData(apiKey) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${UTD_LAT}&lon=${UTD_LON}&appid=${apiKey}&units=imperial`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.cod !== 200) {
        throw new Error(data.message || 'Failed to fetch weather data');
    }

    const conditions = data.weather.map(w => ({
        id: w.id,
        main: w.main,
        description: w.description,
        icon: w.icon
    }));

    const severeActive = conditions.filter(c => SEVERE_CONDITIONS.includes(c.main));

    const precipAmount = (data.rain?.['1h'] || 0) + (data.snow?.['1h'] || 0);

    return {
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        windGust: data.wind.gust || null,
        visibility: data.visibility,
        precipitation: precipAmount,
        conditions,
        severe: severeActive.length > 0,
        severeConditions: severeActive,
        rain: data.rain || null,
        snow: data.snow || null,
        timestamp: new Date(data.dt * 1000).toLocaleString()
    };
}

export { getWeatherData };
