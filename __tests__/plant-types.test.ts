import { describe, it, expect } from 'vitest';
import { PLANT_TYPES, PLANT_TYPE_MAP, getPlantType } from '../lib/plant-types';

describe('PLANT_TYPES 定義', () => {
  it('7種類定義されている', () => {
    expect(PLANT_TYPES).toHaveLength(7);
  });

  it('各タイプに必須フィールドが揃っている', () => {
    for (const t of PLANT_TYPES) {
      expect(t.id,              `${t.id}: id が空`).toBeTruthy();
      expect(t.name_ja,         `${t.id}: name_ja が空`).toBeTruthy();
      expect(t.emoji,           `${t.id}: emoji が空`).toBeTruthy();
      expect(t.base_interval_days, `${t.id}: base_interval_days が 0 以下`).toBeGreaterThan(0);
    }
  });

  it('IDが重複していない', () => {
    const ids = PLANT_TYPES.map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('多肉植物は14日', () => {
    const t = PLANT_TYPES.find(t => t.id === 'succulent')!;
    expect(t.base_interval_days).toBe(14);
  });

  it('庭木は14日', () => {
    const t = PLANT_TYPES.find(t => t.id === 'tree')!;
    expect(t.base_interval_days).toBe(14);
  });

  it('観葉植物は10日', () => {
    const t = PLANT_TYPES.find(t => t.id === 'foliage')!;
    expect(t.base_interval_days).toBe(10);
  });

  it('ハーブは4日', () => {
    const t = PLANT_TYPES.find(t => t.id === 'herb')!;
    expect(t.base_interval_days).toBe(4);
  });

  it('野菜は3日', () => {
    const t = PLANT_TYPES.find(t => t.id === 'vegetable')!;
    expect(t.base_interval_days).toBe(3);
  });
});

describe('PLANT_TYPE_MAP', () => {
  it('全IDがマップに存在する', () => {
    for (const t of PLANT_TYPES) {
      expect(PLANT_TYPE_MAP[t.id]).toBe(t);
    }
  });

  it('存在しないIDはundefined', () => {
    expect(PLANT_TYPE_MAP['unknown_id']).toBeUndefined();
  });
});

describe('getPlantType', () => {
  it('有効なIDで正しいタイプを返す', () => {
    const t = getPlantType('foliage');
    expect(t.id).toBe('foliage');
    expect(t.name_ja).toBe('観葉植物');
  });

  it('全IDで呼び出せる', () => {
    for (const t of PLANT_TYPES) {
      const result = getPlantType(t.id);
      expect(result.id).toBe(t.id);
    }
  });

  it('無効なIDでもフォールバック値を返す (undefinedにならない)', () => {
    const result = getPlantType('completely_invalid');
    expect(result).toBeDefined();
    expect(result.base_interval_days).toBeGreaterThan(0);
  });
});
