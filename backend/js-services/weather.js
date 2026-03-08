import 'dotenv/config';
import fs from 'fs';

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

async function testWeatherCall() {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        console.error('OPENWEATHER_API_KEY is not set in .env');
        process.exit(1);
    }

    try {
        console.log('Fetching weather data for UTD...\n');
        const weather = await getWeatherData(apiKey);

        console.log(`Timestamp: ${weather.timestamp}\n`);
        console.table({
            "Temperature": `${weather.temperature}F (Feels like ${weather.feelsLike}F)`,
            "Humidity": `${weather.humidity}%`,
            "Wind": `${weather.windSpeed} mph${weather.windGust ? ` (gusts ${weather.windGust} mph)` : ''}`,
            "Precipitation": `${weather.precipitation}mm`,
            "Visibility": `${weather.visibility}m`
        });

        console.log('Conditions:');
        console.table(weather.conditions);

        if (weather.severe) {
            console.log('\nSEVERE WEATHER ACTIVE:');
            console.table(weather.severeConditions);
        } else {
            console.log('\nNo severe weather conditions.');
        }

        if (weather.rain) {
            console.log(`\nRain (1h): ${weather.rain['1h'] || 0}mm`);
        }
        if (weather.snow) {
            console.log(`\nSnow (1h): ${weather.snow['1h'] || 0}mm`);
        }

        fs.writeFileSync('weather_data.json', JSON.stringify(weather, null, 2));
        console.log('\nData written to weather_data.json');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testWeatherCall();

export { getWeatherData };
