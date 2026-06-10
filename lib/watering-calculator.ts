import { PlantType, PlantLocation, PlantSize, WateringSchedule } from '@/types';

function getSizeFactor(size: PlantSize): number {
  return { small: 0.8, medium: 1.0, large: 1.3 }[size];
}

function getSeasonFactor(month: number): number {
  if (month >= 6 && month <= 9) return 0.85; // 夏: 蒸発増（屋外基準）
  if (month === 12 || month <= 2) return 1.4; // 冬: 休眠期
  return 1.0;
}

// 屋内植物は季節の影響を半減
function applyIndoorModifier(rawSeasonFactor: number, location: PlantLocation): number {
  if (location === 'outdoor') return rawSeasonFactor;
  return (rawSeasonFactor + 1.0) / 2;
}

function toMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function calculateWateringSchedule(
  lastWatered: Date | null,
  plantType: PlantType,
  size: PlantSize,
  _now: Date = new Date(),
  location: PlantLocation = 'indoor',
): WateringSchedule {
  const nowDay = toMidnight(_now);
  const base = plantType.base_interval_days;
  const month = _now.getMonth() + 1;

  const sizeFactor = getSizeFactor(size);
  const rawSeasonFactor = getSeasonFactor(month);
  const seasonFactor = applyIndoorModifier(rawSeasonFactor, location);

  const rawInterval = base * sizeFactor * seasonFactor;
  const adjustedInterval = Math.max(1, Math.round(rawInterval));

  const startDay = lastWatered ? toMidnight(lastWatered) : nowDay;
  const nextDate = new Date(startDay);
  nextDate.setDate(nextDate.getDate() + adjustedInterval);

  const diffDays = Math.floor((nextDate.getTime() - nowDay.getTime()) / 86400000);
  const urgency =
    diffDays < 0 ? 'overdue' :
    diffDays === 0 ? 'today' :
    diffDays <= 1 ? 'soon' : 'ok';

  const multiplyParts: string[] = [`基本${base}日`];
  if (sizeFactor !== 1.0) multiplyParts.push(`サイズ×${sizeFactor}`);
  if (seasonFactor !== 1.0) multiplyParts.push(`季節×${seasonFactor.toFixed(2)}`);
  let explanation = multiplyParts.join(' × ');
  explanation += ` → ${adjustedInterval}日`;
  if (location === 'indoor') explanation += '（屋内）';

  return {
    next_watering_date: nextDate,
    adjusted_interval_days: adjustedInterval,
    base_interval_days: base,
    factors: { size_factor: sizeFactor, season_factor: seasonFactor },
    explanation,
    urgency,
  };
}

export function formatNextWatering(schedule: WateringSchedule, _now: Date = new Date()): string {
  const nowDay = toMidnight(_now);
  const diffDays = Math.floor(
    (schedule.next_watering_date.getTime() - nowDay.getTime()) / 86400000
  );
  if (diffDays < 0) return `${Math.abs(diffDays)}日遅れ`;
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '明日';
  return `${diffDays}日後`;
}
