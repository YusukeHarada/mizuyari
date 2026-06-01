-- 植物種別マスタ
CREATE TABLE IF NOT EXISTS plant_types (
  id TEXT PRIMARY KEY,
  name_ja TEXT NOT NULL,
  base_interval_days INT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🌿'
);

INSERT INTO plant_types (id, name_ja, base_interval_days, emoji) VALUES
  ('succulent', 'サボテン・多肉植物', 14, '🌵'),
  ('foliage',   '観葉植物',           5,  '🌿'),
  ('flowering', '花植物',             3,  '🌸'),
  ('herb',      'ハーブ',             2,  '🌱'),
  ('vegetable', '野菜',               2,  '🥬'),
  ('tree',      '庭木・低木',         10, '🌳')
ON CONFLICT (id) DO NOTHING;

-- ユーザーの植物
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type_id TEXT REFERENCES plant_types(id) NOT NULL,
  size TEXT CHECK (size IN ('small', 'medium', 'large')) NOT NULL DEFAULT 'medium',
  image_url TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 水やり記録
CREATE TABLE IF NOT EXISTS watering_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE NOT NULL,
  watered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  weather_temp NUMERIC(5,1),
  weather_condition TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_watering_logs_plant_id ON watering_logs(plant_id);
CREATE INDEX IF NOT EXISTS idx_watering_logs_watered_at ON watering_logs(watered_at DESC);

-- RLS 設定
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE watering_logs ENABLE ROW LEVEL SECURITY;

-- plants RLS ポリシー
CREATE POLICY "ユーザーは自分の植物のみアクセス可"
  ON plants FOR ALL
  USING (auth.uid() = user_id);

-- watering_logs RLS ポリシー
CREATE POLICY "ユーザーは自分の植物の記録のみアクセス可"
  ON watering_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM plants
      WHERE plants.id = watering_logs.plant_id
        AND plants.user_id = auth.uid()
    )
  );

-- Supabase Storage バケット (手動で作成が必要な場合あり)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('plant-images', 'plant-images', true)
-- ON CONFLICT DO NOTHING;
