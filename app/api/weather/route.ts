import { NextRequest, NextResponse } from 'next/server';
import { WeatherData } from '@/types';

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: '快晴', 1: '晴れ', 2: '一部曇り', 3: '曇り',
  45: '霧', 48: '霧',
  51: '霧雨', 53: '霧雨', 55: '霧雨',
  61: '小雨', 63: '雨', 65: '大雨',
  71: '小雪', 73: '雪', 75: '大雪',
  80: 'にわか雨', 81: 'にわか雨', 82: '激しいにわか雨',
  95: '雷雨', 96: '雷雨', 99: '激しい雷雨',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: '緯度・経度が必要です' }, { status: 400 });
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return NextResponse.json({ error: '無効な緯度・経度です' }, { status: 400 });
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(latNum));
    url.searchParams.set('longitude', String(lonNum));
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('daily', 'precipitation_sum');
    url.searchParams.set('past_days', '3');
    url.searchParams.set('forecast_days', '1');
    url.searchParams.set('timezone', 'Asia/Tokyo');

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error('Open-Meteo APIエラー');

    const data = await res.json();
    const temp: number = data.current.temperature_2m;
    const weatherCode: number = data.current.weather_code;

    // 過去3日の降水量合計
    const precipitation3day: number = (data.daily.precipitation_sum as number[])
      .slice(0, 3)
      .reduce((sum: number, v: number) => sum + (v ?? 0), 0);

    const weather: WeatherData = {
      temperature: temp,
      precipitation_3day: precipitation3day,
      weather_code: weatherCode,
      weather_description: WMO_DESCRIPTIONS[weatherCode] ?? '不明',
    };

    return NextResponse.json(weather);
  } catch (e) {
    console.error('天気取得エラー:', e);
    return NextResponse.json({ error: '天気情報の取得に失敗しました' }, { status: 500 });
  }
}
