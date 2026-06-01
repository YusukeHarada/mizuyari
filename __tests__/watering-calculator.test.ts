import { describe, it, expect } from 'vitest';
import { calculateWateringSchedule, formatNextWatering } from '../lib/watering-calculator';
import { PlantType, WeatherData, WateringSchedule } from '../types';

const FOLIAGE: PlantType  = { id: 'foliage',   name_ja: '観葉植物',       base_interval_days: 5,  emoji: '🌿' };
const SUCCULENT: PlantType = { id: 'succulent', name_ja: 'サボテン・多肉', base_interval_days: 14, emoji: '🌵' };
const TINY: PlantType      = { id: 'tiny',      name_ja: 'テスト',         base_interval_days: 1,  emoji: '🌱' };

// テスト用の固定日時
const SPRING = new Date('2024-04-15T10:00:00'); // 春 (4月)
const SUMMER = new Date('2024-07-15T10:00:00'); // 夏 (7月)
const WINTER = new Date('2024-01-15T10:00:00'); // 冬 (1月)

const NO_RAIN: WeatherData   = { temperature: 20, precipitation_3day: 0,  weather_code: 0,  weather_description: '快晴' };
const NORMAL: WeatherData    = { temperature: 20, precipitation_3day: 0,  weather_code: 0,  weather_description: '快晴' };
const HOT: WeatherData       = { temperature: 35, precipitation_3day: 0,  weather_code: 0,  weather_description: '快晴' };
const WARM: WeatherData      = { temperature: 28, precipitation_3day: 0,  weather_code: 0,  weather_description: '晴れ' };
const COOL: WeatherData      = { temperature: 10, precipitation_3day: 0,  weather_code: 0,  weather_description: '晴れ' };
const COLD: WeatherData      = { temperature: 3,  precipitation_3day: 0,  weather_code: 0,  weather_description: '雪' };
const HEAVY_RAIN: WeatherData = { temperature: 18, precipitation_3day: 25, weather_code: 63, weather_description: '雨' };
const LIGHT_RAIN: WeatherData = { temperature: 18, precipitation_3day: 15, weather_code: 61, weather_description: '雨' };
const LITTLE_RAIN: WeatherData = { temperature: 18, precipitation_3day: 5, weather_code: 61, weather_description: '小雨' };

// 基準日から n 日前の日付を返すヘルパー
function daysAgo(n: number, base: Date): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d;
}

// ---------- サイズ補正 ----------
describe('サイズ補正', () => {
  it('medium → size_factor=1.0、interval変化なし', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', NO_RAIN, SPRING);
    expect(r.factors.size_factor).toBe(1.0);
    expect(r.adjusted_interval_days).toBe(5);
  });

  it('small → size_factor=0.8、interval短縮', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'small', NO_RAIN, SPRING);
    expect(r.factors.size_factor).toBe(0.8);
    expect(r.adjusted_interval_days).toBe(Math.max(1, Math.round(5 * 0.8)));
  });

  it('large → size_factor=1.3、interval延長', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'large', NO_RAIN, SPRING);
    expect(r.factors.size_factor).toBe(1.3);
    expect(r.adjusted_interval_days).toBe(Math.max(1, Math.round(5 * 1.3)));
  });

  it('サボテン + large → 14 * 1.3 = 18日', () => {
    const r = calculateWateringSchedule(null, SUCCULENT, 'large', NO_RAIN, SPRING);
    expect(r.adjusted_interval_days).toBe(Math.round(14 * 1.3));
  });
});

// ---------- 季節補正 ----------
describe('季節補正', () => {
  it('春 (4月) → season_factor=1.0', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', NO_RAIN, SPRING);
    expect(r.factors.season_factor).toBe(1.0);
  });

  it('夏 (7月) → season_factor=0.7、interval短縮', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', NO_RAIN, SUMMER);
    expect(r.factors.season_factor).toBe(0.7);
    expect(r.adjusted_interval_days).toBe(Math.round(5 * 0.7));
  });

  it('冬 (1月) → season_factor=1.4、interval延長', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', NO_RAIN, WINTER);
    expect(r.factors.season_factor).toBe(1.4);
    expect(r.adjusted_interval_days).toBe(Math.round(5 * 1.4));
  });

  it('12月も冬扱い', () => {
    const dec = new Date('2024-12-15T10:00:00');
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', NO_RAIN, dec);
    expect(r.factors.season_factor).toBe(1.4);
  });

  it('9月は夏扱い', () => {
    const sep = new Date('2024-09-01T10:00:00');
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', NO_RAIN, sep);
    expect(r.factors.season_factor).toBe(0.7);
  });

  it('10月は通常季節', () => {
    const oct = new Date('2024-10-01T10:00:00');
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', NO_RAIN, oct);
    expect(r.factors.season_factor).toBe(1.0);
  });
});

// ---------- 気温補正 ----------
describe('気温補正', () => {
  it('≥35°C → temperature_factor=0.6', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', HOT, SPRING);
    expect(r.factors.temperature_factor).toBe(0.6);
  });

  it('25-34°C → temperature_factor=0.8', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', WARM, SPRING);
    expect(r.factors.temperature_factor).toBe(0.8);
  });

  it('15-24°C → temperature_factor=1.0', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', NORMAL, SPRING);
    expect(r.factors.temperature_factor).toBe(1.0);
  });

  it('5-14°C → temperature_factor=1.2', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', COOL, SPRING);
    expect(r.factors.temperature_factor).toBe(1.2);
  });

  it('<5°C → temperature_factor=1.5', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', COLD, SPRING);
    expect(r.factors.temperature_factor).toBe(1.5);
  });

  it('天気なし → temperature_factor=1.0 (補正しない)', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', null, SPRING);
    expect(r.factors.temperature_factor).toBe(1.0);
  });

  it('境界値: 35°C ちょうど → 0.6', () => {
    const w: WeatherData = { ...NO_RAIN, temperature: 35 };
    expect(calculateWateringSchedule(null, FOLIAGE, 'medium', w, SPRING).factors.temperature_factor).toBe(0.6);
  });

  it('境界値: 25°C ちょうど → 0.8', () => {
    const w: WeatherData = { ...NO_RAIN, temperature: 25 };
    expect(calculateWateringSchedule(null, FOLIAGE, 'medium', w, SPRING).factors.temperature_factor).toBe(0.8);
  });

  it('境界値: 15°C ちょうど → 1.0', () => {
    const w: WeatherData = { ...NO_RAIN, temperature: 15 };
    expect(calculateWateringSchedule(null, FOLIAGE, 'medium', w, SPRING).factors.temperature_factor).toBe(1.0);
  });

  it('境界値: 5°C ちょうど → 1.2', () => {
    const w: WeatherData = { ...NO_RAIN, temperature: 5 };
    expect(calculateWateringSchedule(null, FOLIAGE, 'medium', w, SPRING).factors.temperature_factor).toBe(1.2);
  });
});

// ---------- 降水補正 ----------
describe('降水補正', () => {
  it('>20mm → rain_bonus=2日', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', HEAVY_RAIN, SPRING);
    expect(r.factors.rain_bonus_days).toBe(2);
  });

  it('10-20mm → rain_bonus=1日', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', LIGHT_RAIN, SPRING);
    expect(r.factors.rain_bonus_days).toBe(1);
  });

  it('<10mm → rain_bonus=0日', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', LITTLE_RAIN, SPRING);
    expect(r.factors.rain_bonus_days).toBe(0);
  });

  it('天気なし → rain_bonus=0日', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', null, SPRING);
    expect(r.factors.rain_bonus_days).toBe(0);
  });

  it('境界値: 20mm ちょうど → 1日 (>20 は false)', () => {
    const w: WeatherData = { ...NO_RAIN, precipitation_3day: 20 };
    expect(calculateWateringSchedule(null, FOLIAGE, 'medium', w, SPRING).factors.rain_bonus_days).toBe(1);
  });

  it('境界値: 10mm ちょうど → 1日', () => {
    const w: WeatherData = { ...NO_RAIN, precipitation_3day: 10 };
    expect(calculateWateringSchedule(null, FOLIAGE, 'medium', w, SPRING).factors.rain_bonus_days).toBe(1);
  });
});

// ---------- 複合計算 ----------
describe('複合計算', () => {
  it('夏 + 高温 + 大雨: 5 × 0.7 × 0.6 = 2.1 +2 = 4.1 → 4日', () => {
    const w: WeatherData = { temperature: 35, precipitation_3day: 25, weather_code: 80, weather_description: 'にわか雨' };
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', w, SUMMER);
    expect(r.adjusted_interval_days).toBe(4);
  });

  it('冬 + 低温 + 雨なし: 5 × 1.4 × 1.2 = 8.4 → 8日', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', COOL, WINTER);
    expect(r.adjusted_interval_days).toBe(Math.round(5 * 1.4 * 1.2));
  });
});

// ---------- 最低間隔保証 ----------
describe('最低間隔保証', () => {
  it('計算結果が<1でも最低1日を保証', () => {
    // 1 * 0.8 (small) * 0.7 (summer) * 0.6 (≥35°C) = 0.336 → round→0 → clamp→1
    const r = calculateWateringSchedule(null, TINY, 'small', HOT, SUMMER);
    expect(r.adjusted_interval_days).toBeGreaterThanOrEqual(1);
  });
});

// ---------- 緊急度 (urgency) ----------
describe('urgency', () => {
  it('lastWatered=null → 今日から interval 日後 → ok', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', null, SPRING);
    expect(r.urgency).toBe('ok');
  });

  it('interval 日前に水やり → 今日がちょうど水やり日 → today', () => {
    const last = daysAgo(5, SPRING); // 5日前
    const r = calculateWateringSchedule(last, FOLIAGE, 'medium', null, SPRING);
    expect(r.urgency).toBe('today');
  });

  it('interval+1日前に水やり → 1日遅れ → overdue', () => {
    const last = daysAgo(6, SPRING);
    const r = calculateWateringSchedule(last, FOLIAGE, 'medium', null, SPRING);
    expect(r.urgency).toBe('overdue');
  });

  it('interval-1日前に水やり → 明日が水やり日 → soon', () => {
    const last = daysAgo(4, SPRING); // 4日前
    const r = calculateWateringSchedule(last, FOLIAGE, 'medium', null, SPRING);
    expect(r.urgency).toBe('soon');
  });

  it('2日前に水やり → 余裕あり → ok', () => {
    const last = daysAgo(2, SPRING);
    const r = calculateWateringSchedule(last, FOLIAGE, 'medium', null, SPRING);
    expect(r.urgency).toBe('ok');
  });
});

// ---------- 説明文 ----------
describe('説明文 (explanation)', () => {
  it('補正なしのとき: 基本X日 → X日', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', null, SPRING);
    expect(r.explanation).toMatch(/^基本5日 → 5日$/);
  });

  it('サイズ補正が含まれる', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'small', null, SPRING);
    expect(r.explanation).toContain('サイズ×0.8');
  });

  it('季節補正が含まれる', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', null, SUMMER);
    expect(r.explanation).toContain('季節×0.7');
  });

  it('降雨補正は + 表記 (× ではない)', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', HEAVY_RAIN, SPRING);
    expect(r.explanation).toContain('+降雨');
    // 旧バグ: 降雨が × で join されていないこと
    expect(r.explanation).not.toMatch(/× \+/);
  });

  it('全補正あり: 形式が正しい', () => {
    const w: WeatherData = { temperature: 35, precipitation_3day: 25, weather_code: 0, weather_description: '快晴' };
    const r = calculateWateringSchedule(null, FOLIAGE, 'small', w, SUMMER);
    // 最後は → X日 で終わる
    expect(r.explanation).toMatch(/→ \d+日$/);
  });
});

// ---------- formatNextWatering ----------
describe('formatNextWatering', () => {
  function makeSchedule(nextDate: Date): WateringSchedule {
    return {
      next_watering_date: nextDate,
      urgency: 'ok',
      adjusted_interval_days: 5,
      base_interval_days: 5,
      factors: { size_factor: 1.0, season_factor: 1.0, temperature_factor: 1.0, rain_bonus_days: 0 },
      explanation: '',
    };
  }

  it('過去の日付 → X日遅れ', () => {
    const past = new Date(SPRING);
    past.setDate(past.getDate() - 3);
    const result = formatNextWatering(makeSchedule(past), SPRING);
    expect(result).toBe('3日遅れ');
  });

  it('同日 → 今日', () => {
    const result = formatNextWatering(makeSchedule(SPRING), SPRING);
    expect(result).toBe('今日');
  });

  it('翌日 → 明日', () => {
    const tomorrow = new Date(SPRING);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = formatNextWatering(makeSchedule(tomorrow), SPRING);
    expect(result).toBe('明日');
  });

  it('5日後 → 5日後', () => {
    const future = new Date(SPRING);
    future.setDate(future.getDate() + 5);
    const result = formatNextWatering(makeSchedule(future), SPRING);
    expect(result).toBe('5日後');
  });

  it('1日遅れ → 1日遅れ', () => {
    const yesterday = new Date(SPRING);
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatNextWatering(makeSchedule(yesterday), SPRING);
    expect(result).toBe('1日遅れ');
  });
});
