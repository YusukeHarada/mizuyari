import { PlantType } from '@/types';

export const PLANT_TYPES: PlantType[] = [
  { id: 'succulent', name_ja: 'サボテン・多肉植物', base_interval_days: 14, emoji: '🌵' },
  { id: 'foliage',   name_ja: '観葉植物',           base_interval_days: 5,  emoji: '🌿' },
  { id: 'flowering', name_ja: '花植物',             base_interval_days: 3,  emoji: '🌸' },
  { id: 'herb',      name_ja: 'ハーブ',             base_interval_days: 2,  emoji: '🌱' },
  { id: 'vegetable', name_ja: '野菜',               base_interval_days: 2,  emoji: '🥬' },
  { id: 'tree',      name_ja: '庭木・低木',         base_interval_days: 10, emoji: '🌳' },
];

export const PLANT_TYPE_MAP: Record<string, PlantType> = Object.fromEntries(
  PLANT_TYPES.map(t => [t.id, t])
);

export function getPlantType(id: string): PlantType {
  return PLANT_TYPE_MAP[id] ?? PLANT_TYPES[1];
}
