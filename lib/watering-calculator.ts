import { PlantType, PlantLocation, PlantSize, WeatherData, WateringSchedule } from '@/types';

function getSizeFactor(size: PlantSize): number {
  return { small: 0.8, medium: 1.0, large: 1.3 }[size];
}

function getSeasonFactor(month: number): number {
  if (month >= 6 && month <= 9) return 0.85; // 夏: 蒸発増（屋外基準）
  if (month === 12 || month <= 2) return 1.4; // 冬: 休眠期
  return 1.0;
}

function getTemperatureFactor(temp: number): number {
  if (temp >= 35) return 0.7;
  if (temp >= 28) return 0.85;
  if (temp >= 18) return 1.0;
  if (temp >= 8)  return 1.2;
  return 1.5;
}

function getRainBonus(precipitation3day: number): number {
  if (precipitation3day >= 20) return 3;
  if (precipitation3day >= 10) return 1;
  return 0;
}

// 屋内植物は気温・季節の影響を半減、雨の影響なし
function applyLocationModifiers(
  seasonFactor: number,
  temperatureFactor: number,
  rainBonus: number,
  location: PlantLocation,
): { seasonFactor: number; temperatureFactor: number; rainBonus: number } {
  if (location === 'outdoor') {
    return { seasonFactor, temperatureFactor, rainBonus };
  }
  return {
    seasonFactor: (seasonFactor + 1.0) / 2,
    temperatureFactor: (temperatureFactor + 1.0) / 2,
    rainBonus: 0,
  };
}

export function calculateWateringSchedule(
  lastWatered: Date | null,
  plantType: PlantType,
  size: PlantSize,
  weather?: WeatherData | null,
  _now: Date = new Date(),
  location: PlantLocation = 'indoor',
): WateringSchedule {
  const now = _now;
  const base = plantType.base_interval_days;
  const month = now.getMonth() + 1;

  const sizeFactor = getSizeFactor(size);
  const rawSeasonFactor = getSeasonFactor(month);
  const rawTemperatureFactor = weather ? getTemperatureFactor(weather.temperature) : 1.0;
  const rawRainBonus = weather ? getRainBonus(weather.precipitation_3day) : 0;

  const { seasonFactor, temperatureFactor, rainBonus: rainBonusDays } = applyLocationModifiers(
    rawSeasonFactor, rawTemperatureFactor, rawRainBonus, location,
  );

  const rawInterval = base * sizeFactor * seasonFactor * temperatureFactor + rainBonusDays;
  const adjustedInterval = Math.max(1, Math.round(rawInterval));

  const startDate = lastWatered ?? now;
  const nextDate = new Date(startDate);
  nextDate.setDate(nextDate.getDate() + adjustedInterval);

  const diffDays = Math.floor((nextDate.getTime() - now.getTime()) / 86400000);
  const urgency =
    diffDays < 0 ? 'overdue' :
    diffDays === 0 ? 'today' :
    diffDays <= 1 ? 'soon' : 'ok';

  const multiplyParts: string[] = [`基本${base}日`];
  if (sizeFactor !== 1.0) multiplyParts.push(`サイズ×${sizeFactor}`);
  if (seasonFactor !== 1.0) multiplyParts.push(`季節×${seasonFactor.toFixed(2)}`);
  if (weather && temperatureFactor !== 1.0) {
    multiplyParts.push(`気温${Math.round(weather.temperature)}°C×${temperatureFactor.toFixed(2)}`);
  }
  let explanation = multiplyParts.join(' × ');
  if (rainBonusDays > 0) explanation += ` +降雨${rainBonusDays}日`;
  explanation += ` → ${adjustedInterval}日`;
  if (location === 'indoor') explanation += '（屋内）';

  return {
    next_watering_date: nextDate,
    adjusted_interval_days: adjustedInterval,
    base_interval_days: base,
    factors: { size_factor: sizeFactor, season_factor: seasonFactor, temperature_factor: temperatureFactor, rain_bonus_days: rainBonusDays },
    explanation,
    urgency,
  };
}

export function formatNextWatering(schedule: WateringSchedule, _now: Date = new Date()): string {
  const diffDays = Math.floor(
    (schedule.next_watering_date.getTime() - _now.getTime()) / 86400000
  );
  if (diffDays < 0) return `${Math.abs(diffDays)}日遅れ`;
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '明日';
  return `${diffDays}日後`;
}
