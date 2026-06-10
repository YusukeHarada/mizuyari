@AGENTS.md

# みずやり — プロジェクト概要

植物の水やりスケジュール管理アプリ。家族グループで植物を共有管理できる。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router), React 19, TypeScript 5
- **スタイル**: Tailwind CSS 4
- **バックエンド**: Firebase (Auth, Firestore, Storage)
- **天気API**: Open-Meteo（無認証、緯度経度で取得）
- **画像処理**: Sharp（WebP変換、400×400px center-crop）
- **テスト**: Vitest（ユニット）, Playwright（E2E）

## ディレクトリ構造

```
app/          # Next.js App Router（ページ・APIルート）
  (app)/      # 認証済みユーザー向けページ
  api/        # APIルート（session, weather, upload-image, households）
components/   # 共通コンポーネント
lib/          # ロジック・ユーティリティ
  firebase/   # Firebase client/admin 初期化
  plant-types.ts         # 植物種別定義（基本水やり間隔）
  watering-calculator.ts # 水やり間隔計算ロジック
  use-show-plant-images.ts # 画像表示設定（localStorage）
types/        # TypeScript型定義
__tests__/    # ユニットテスト
```

## Firestore データモデル

- `plants/{id}` — name, type_id, size, location, image_url, userId, householdId, createdAt, lastWateredAt
- `watering_logs/{id}` — plantId, householdId, userId, wateredAt
- `households/{id}` — ownerUid, memberUids, inviteCode, createdAt

## 水やり計算の設計方針

- **基本方針**: 根腐れ防止のため間隔は長めに設定
- **屋内植物（デフォルト）**: 雨の影響なし、気温・季節係数を半減
- **屋外植物**: 雨・気温・季節係数をフルに適用
- 計算式: `基本間隔 × サイズ係数 × 季節係数 × 気温係数 + 雨ボーナス日数`
- 新しい植物種別を追加する場合は `lib/plant-types.ts` を編集する

## 植物種別と基本間隔

| type_id | 種別 | 間隔 |
|---------|------|------|
| foliage | 観葉植物 | 10日 |
| succulent | 多肉植物 | 14日 |
| cactus | サボテン | 21日 |
| flowering | 花植物 | 7日 |
| herb | ハーブ | 4日 |
| vegetable | 野菜 | 3日 |
| tree | 庭木・低木 | 14日 |

## 認証・セッション

- Firebase Auth（メール/パスワード）
- セッションはサーバーサイドのCookieで管理（`/api/session`）
- `app/(app)/layout.tsx` でセッション検証、未認証は `/login` にリダイレクト

## 開発時の注意事項

- 環境変数は `.env.local` に `NEXT_PUBLIC_FIREBASE_*` と `FIREBASE_SERVICE_ACCOUNT_KEY` が必要
- 画像アップロードAPIはFirebase Admin SDKを使用するためサーバーサイドのみ
- 既存の `type_id: 'succulent'` データは多肉植物として扱われる（後方互換性あり）
- `plant.location` 未設定の既存データは `'indoor'` として扱う
