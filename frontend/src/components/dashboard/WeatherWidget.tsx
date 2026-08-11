import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Droplets, MapPin, Loader2 } from 'lucide-react';

interface WeatherData {
  temperature: number;
  humidity: number;
  uvIndex: number;
  weatherCode: number;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName] = useState<string>('Local Weather');

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Fetch weather data from Open-Meteo (No API Key required)
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,uv_index`
          );
          
          if (!res.ok) throw new Error('Failed to fetch weather');
          
          const data = await res.json();
          const weatherPayload = {
            temperature: data.current.temperature_2m,
            humidity: data.current.relative_humidity_2m,
            uvIndex: data.current.uv_index,
            weatherCode: data.current.weather_code,
          };
          setWeather(weatherPayload);
          localStorage.setItem('skinai_weather', JSON.stringify(weatherPayload));
          setError(null);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location access denied');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  }, []);

  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes
    if (code <= 3) return <Sun className="w-8 h-8 text-amber-500" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-8 h-8 text-blue-400" />;
    return <Cloud className="w-8 h-8 text-gray-400" />;
  };

  const getUvInfo = (uv: number) => {
    if (uv < 3) return { label: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-500', advice: 'Safe to be outside. Basic SPF 30 is fine.' };
    if (uv < 6) return { label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-500', advice: 'Seek shade during midday. Apply SPF 50.' };
    if (uv < 8) return { label: 'High', color: 'text-orange-600', bg: 'bg-orange-500', advice: 'High UV! SPF 50 required. Reapply every 2 hours.' };
    return { label: 'Extreme', color: 'text-purple-600', bg: 'bg-purple-500', advice: 'Extreme UV! Avoid sun. Strict SPF and protective clothing.' };
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-center justify-center min-h-[100px]">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-center justify-between min-h-[100px] opacity-75">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Weather & UV</p>
            <p className="text-xs text-gray-500">Enable location for live skin protection advice</p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          Enable
        </button>
      </div>
    );
  }

  const uvInfo = getUvInfo(weather.uvIndex);

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-2xl shadow-sm p-5 relative overflow-hidden">
      {/* Decorative background circle */}
      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 blur-2xl ${uvInfo.bg}`}></div>
      
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        {/* Current Weather Box */}
        <div className="flex items-center gap-4 pr-6 sm:border-r border-gray-200">
          {getWeatherIcon(weather.weatherCode)}
          <div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
              <MapPin className="w-3 h-3" />
              <span className="text-xs font-medium uppercase tracking-wider">{locationName}</span>
            </div>
            <div className="text-3xl font-display font-bold text-gray-900 tracking-tight">
              {Math.round(weather.temperature)}°<span className="text-xl text-gray-400">C</span>
            </div>
          </div>
        </div>

        {/* UV Index & Details */}
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <Sun className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-700">UV Index</span>
            </div>
            <span className={`text-sm font-bold ${uvInfo.color}`}>
              {weather.uvIndex.toFixed(1)} - {uvInfo.label}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${uvInfo.bg}`}
              style={{ width: `${Math.min(100, (weather.uvIndex / 11) * 100)}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-xs text-gray-600 font-medium">
              💡 {uvInfo.advice}
            </p>
            
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">
              <Droplets className="w-3 h-3 text-blue-400" />
              {weather.humidity}% Humidity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
