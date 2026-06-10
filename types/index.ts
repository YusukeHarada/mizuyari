export type PlantSize = 'small' | 'medium' | 'large';
export type PlantLocation = 'indoor' | 'outdoor';
export type Urgency = 'overdue' | 'today' | 'soon' | 'ok';

export interface PlantType {
  id: string;
  name_ja: string;
  base_interval_days: number;
  emoji: string;
}

// Firestoreドキュメントに合わせて camelCase
export interface Household {
  id: string;
  ownerUid: string;
  memberUids: string[];
  inviteCode: string;
  createdAt: string;
}

export interface Plant {
  id: string;
  userId: string;
  householdId?: string;
  name: string;
  type_id: string;       // plant_types の ID（既存データとの互換性維持）
  size: PlantSize;
  location?: PlantLocation; // 未設定の場合は indoor として扱う
  image_url?: string | null;
  createdAt: string;
  lastWateredAt?: string | null; // 水やり記録時に更新するデノーマライズフィールド
}

export interface WateringLog {
  id: string;
  plantId: string;
  wateredAt: string;
  note?: string | null;
}

export interface WateringFactors {
  size_factor: number;
  season_factor: number;
}

export interface WateringSchedule {
  next_watering_date: Date;
  adjusted_interval_days: number;
  base_interval_days: number;
  factors: WateringFactors;
  explanation: string;
  urgency: Urgency;
}
