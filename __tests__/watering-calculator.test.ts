import { describe, it, expect } from 'vitest';
import { calculateWateringSchedule, formatNextWatering } from '../lib/watering-calculator';
import { PlantType, WateringSchedule } from '../types';

const FOLIAGE: PlantType  = { id: 'foliage',   name_ja: '観葉植物',       base_interval_days: 5,  emoji: '🌿' };
const SUCCULENT: PlantType = { id: 'succulent', name_ja: 'サボテン・多肉', base_interval_days: 14, emoji: '🌵' };
const TINY: PlantType      = { id: 'tiny',      name_ja: 'テスト',         base_interval_days: 1,  emoji: '🌱' };

// テスト用の固定日時
const SPRING = new Date('2024-04-15T10:00:00'); // 春 (4月)
const SUMMER = new Date('2024-07-15T10:00:00'); // 夏 (7月)
const WINTER = new Date('2024-01-15T10:00:00'); // 冬 (1月)

// 屋内の季節係数（半減適用後）
const INDOOR_SUMMER_SEASON = (0.85 + 1.0) / 2; // 0.925
const INDOOR_WINTER_SEASON = (1.4 + 1.0) / 2;  // 1.2

// 基準日から n 日前の日付を返すヘルパー
function daysAgo(n: number, base: Date): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d;
}

// ---------- サイズ補正 ----------
describe('サイズ補正', () => {
  it('medium → size_factor=1.0、interval変化なし', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', SPRING);
    expect(r.factors.size_factor).toBe(1.0);
    expect(r.adjusted_interval_days).toBe(5);
  });

  it('small → size_factor=0.8、interval短縮', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'small', SPRING);
    expect(r.factors.size_factor).toBe(0.8);
    expect(r.adjusted_interval_days).toBe(Math.max(1, Math.round(5 * 0.8)));
  });

  it('large → size_factor=1.3、interval延長', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'large', SPRING);
    expect(r.factors.size_factor).toBe(1.3);
    expect(r.adjusted_interval_days).toBe(Math.max(1, Math.round(5 * 1.3)));
  });

  it('サボテン + large → 14 * 1.3 = 18日', () => {
    const r = calculateWateringSchedule(null, SUCCULENT, 'large', SPRING);
    expect(r.adjusted_interval_days).toBe(Math.round(14 * 1.3));
  });
});

// ---------- 季節補正（屋内・デフォルト） ----------
describe('季節補正', () => {
  it('春 (4月) → season_factor=1.0', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', SPRING);
    expect(r.factors.season_factor).toBe(1.0);
  });

  it('夏 (7月) → season_factor が屋内補正後 0.925', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', SUMMER);
    expect(r.factors.season_factor).toBeCloseTo(INDOOR_SUMMER_SEASON);
    expect(r.adjusted_interval_days).toBe(Math.max(1, Math.round(5 * INDOOR_SUMMER_SEASON)));
  });

  it('冬 (1月) → season_factor が屋内補正後 1.2', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', WINTER);
    expect(r.factors.season_factor).toBeCloseTo(INDOOR_WINTER_SEASON);
    expect(r.adjusted_interval_days).toBe(Math.max(1, Math.round(5 * INDOOR_WINTER_SEASON)));
  });

  it('12月も冬扱い', () => {
    const dec = new Date('2024-12-15T10:00:00');
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', dec);
    expect(r.factors.season_factor).toBeCloseTo(INDOOR_WINTER_SEASON);
  });

  it('9月は夏扱い', () => {
    const sep = new Date('2024-09-01T10:00:00');
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', sep);
    expect(r.factors.season_factor).toBeCloseTo(INDOOR_SUMMER_SEASON);
  });

  it('10月は通常季節', () => {
    const oct = new Date('2024-10-01T10:00:00');
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', oct);
    expect(r.factors.season_factor).toBe(1.0);
  });

  it('屋外は rawSeasonFactor をそのまま使用', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', SUMMER, 'outdoor');
    expect(r.factors.season_factor).toBe(0.85);
  });
});

// ---------- 複合計算 ----------
describe('複合計算', () => {
  it('夏 + large (屋内): 5 × 1.3 × 0.925 ≈ 6日', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'large', SUMMER);
    expect(r.adjusted_interval_days).toBe(Math.max(1, Math.round(5 * 1.3 * INDOOR_SUMMER_SEASON)));
  });

  it('冬 + small (屋内): 5 × 0.8 × 1.2 = 4.8 → 5日', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'small', WINTER);
    expect(r.adjusted_interval_days).toBe(Math.max(1, Math.round(5 * 0.8 * INDOOR_WINTER_SEASON)));
  });
});

// ---------- 最低間隔保証 ----------
describe('最低間隔保証', () => {
  it('計算結果が<1でも最低1日を保証', () => {
    // 1 * 0.8 (small) * 0.925 (summer indoor) = 0.74 → round→1 → clamp→1
    const r = calculateWateringSchedule(null, TINY, 'small', SUMMER);
    expect(r.adjusted_interval_days).toBeGreaterThanOrEqual(1);
  });
});

// ---------- 緊急度 (urgency) ----------
describe('urgency', () => {
  it('lastWatered=null → 今日から interval 日後 → ok', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', SPRING);
    expect(r.urgency).toBe('ok');
  });

  it('interval 日前に水やり → 今日がちょうど水やり日 → today', () => {
    const last = daysAgo(5, SPRING); // 5日前
    const r = calculateWateringSchedule(last, FOLIAGE, 'medium', SPRING);
    expect(r.urgency).toBe('today');
  });

  it('interval+1日前に水やり → 1日遅れ → overdue', () => {
    const last = daysAgo(6, SPRING);
    const r = calculateWateringSchedule(last, FOLIAGE, 'medium', SPRING);
    expect(r.urgency).toBe('overdue');
  });

  it('interval-1日前に水やり → 明日が水やり日 → soon', () => {
    const last = daysAgo(4, SPRING); // 4日前
    const r = calculateWateringSchedule(last, FOLIAGE, 'medium', SPRING);
    expect(r.urgency).toBe('soon');
  });

  it('2日前に水やり → 余裕あり → ok', () => {
    const last = daysAgo(2, SPRING);
    const r = calculateWateringSchedule(last, FOLIAGE, 'medium', SPRING);
    expect(r.urgency).toBe('ok');
  });
});

// ---------- 説明文 ----------
describe('説明文 (explanation)', () => {
  it('補正なしのとき: 基本X日 → X日（屋内）', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', SPRING);
    expect(r.explanation).toMatch(/^基本5日 → 5日（屋内）$/);
  });

  it('サイズ補正が含まれる', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'small', SPRING);
    expect(r.explanation).toContain('サイズ×0.8');
  });

  it('季節補正が含まれる', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', SUMMER);
    expect(r.explanation).toContain('季節×');
  });

  it('最後は → X日 で終わる', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'small', SUMMER);
    expect(r.explanation).toMatch(/→ \d+日/);
  });

  it('屋外は（屋内）サフィックスなし', () => {
    const r = calculateWateringSchedule(null, FOLIAGE, 'medium', SPRING, 'outdoor');
    expect(r.explanation).not.toContain('（屋内）');
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
      factors: { size_factor: 1.0, season_factor: 1.0 },
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
