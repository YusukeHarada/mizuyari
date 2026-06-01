import { PlantType, PlantSize, WeatherData, WateringSchedule } from '@/types';

function getSizeFactor(size: PlantSize): number {
  return { small: 0.8, medium: 1.0, large: 1.3 }[size];
}

function getSeasonFactor(month: number): number {
  if (month >= 6 && month <= 9) return 0.7;  // 夏: 蒸発増
  if (month === 12 || month <= 2) return 1.4; // 冬: 休眠期
  return 1.0;
}

function getTemperatureFactor(temp: number): number {
  if (temp >= 35) return 0.6;
  if (temp >= 25) return 0.8;
  if (temp >= 15) return 1.0;
  if (temp >= 5)  return 1.2;
  return 1.5;
}

function getRainBonus(precipitation3day: number): number {
  if (precipitation3day > 20) return 2;
  if (precipitation3day >= 10) return 1;
  return 0;
}

export function calculateWateringSchedule(
  lastWatered: Date | null,
  plantType: PlantType,
  size: PlantSize,
  weather?: WeatherData | null,
  _now: Date = new Date()  // テスト時に日時を固定するための injectable パラメータ
): WateringSchedule {
  const now = _now;
  const base = plantType.base_interval_days;
  const month = now.getMonth() + 1;

  const sizeFactor = getSizeFactor(size);
  const seasonFactor = getSeasonFactor(month);
  const temperatureFactor = weather ? getTemperatureFactor(weather.temperature) : 1.0;
  const rainBonusDays = weather ? getRainBonus(weather.precipitation_3day) : 0;

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

  // 説明文: 掛け算因子をまず列挙し、加算分は末尾に追加
  const multiplyParts: string[] = [`基本${base}日`];
  if (sizeFactor !== 1.0) multiplyParts.push(`サイズ×${sizeFactor}`);
  if (seasonFactor !== 1.0) multiplyParts.push(`季節×${seasonFactor}`);
  if (weather && temperatureFactor !== 1.0) {
    multiplyParts.push(`気温${Math.round(weather.temperature)}°C×${temperatureFactor}`);
  }
  let explanation = multiplyParts.join(' × ');
  if (rainBonusDays > 0) explanation += ` +降雨${rainBonusDays}日`;
  explanation += ` → ${adjustedInterval}日`;

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
