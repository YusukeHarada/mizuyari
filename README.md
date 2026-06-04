# みずやり

家族で共有できる植物の水やりスケジュール管理アプリです。天気・気温・季節・植物のサイズを考慮して、水やりのタイミングをスマートに提案します。

## 主な機能

- **Google アカウントでログイン** — Firebase Authentication による安全な認証
- **植物の登録** — 写真・名前・種別・サイズを登録して管理
- **水やりスケジュール自動計算** — 現在地の天気データを取得し、気温・降雨・季節・植物サイズで間隔を補正
- **緊急度による色分け表示** — 遅れ(赤) / 今日(黄) / 明日(橙) / 余裕あり(緑) で一目で状態を把握
- **家族グループ共有** — 招待コードで複数ユーザーが同じ植物を共同管理
- **PWA 対応** — スマートフォンにインストール可能、オフラインでも閲覧可能

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16 / React 19 / TypeScript 5 |
| スタイリング | Tailwind CSS 4 |
| 認証 | Firebase Authentication (Google OAuth) |
| データベース | Cloud Firestore |
| ストレージ | Firebase Storage |
| 画像処理 | Sharp |
| 天気 API | Open-Meteo（無料・認証不要） |
| テスト | Vitest / Playwright |

## 前提条件

- Node.js 20 以上
- Firebase プロジェクト（Authentication・Firestore・Storage を有効化済み）

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/yusukeharada/mizuyari.git
cd mizuyari
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 環境変数を設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の変数を設定してください。

```env
# Firebase クライアント用（ブラウザから参照されます）
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK 用（サーバーサイドのみ）
# Firebase コンソール > プロジェクト設定 > サービスアカウント から JSON をダウンロードし、
# その内容を1行に圧縮した文字列をそのままここに貼り付けてください。
FIREBASE_SERVICE_ACCOUNT_KEY=
```

`NEXT_PUBLIC_FIREBASE_*` の値は Firebase コンソール > プロジェクトの設定 > 全般 > マイアプリ から確認できます。

### 4. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## コマンド一覧

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm start` | 本番サーバー起動 |
| `npm test` | ユニットテスト実行（Vitest） |
| `npm run test:watch` | テスト監視モード |
| `npm run lint` | ESLint 実行 |

## ディレクトリ構造

```
mizuyari/
├── app/                  # Next.js App Router
│   ├── (auth)/           # ログイン・サインアップ画面
│   ├── (app)/            # メインアプリ画面（植物一覧・詳細・設定）
│   └── api/              # API ルート（セッション・天気・画像アップロードなど）
├── components/           # 共通 React コンポーネント
├── lib/
│   ├── firebase/         # Firebase クライアント・Admin SDK 初期化
│   ├── watering-calculator.ts  # 水やり間隔計算エンジン
│   └── plant-types.ts    # 植物タイプ定義
├── types/                # TypeScript 型定義
└── __tests__/            # ユニットテスト
```

## 水やり間隔の計算ロジック

水やりの間隔は以下の要素を掛け合わせて決定されます。

```
調整間隔（日）= 基本間隔
               × サイズ係数（小: 0.8 / 中: 1.0 / 大: 1.3）
               × 季節係数（冬: 1.4 / 夏: 0.7 / 春秋: 1.0）
               × 気温係数（猛暑: 0.6 〜 寒冷: 1.5）
               ＋ 降雨ボーナス（20mm 以上: +2日 / 10mm 以上: +1日）
```

**植物タイプ別の基本間隔:**

| 種別 | 基本間隔 |
|---|---|
| サボテン・多肉植物 | 14日 |
| 庭木・低木 | 10日 |
| 観葉植物 | 5日 |
| 花植物 | 3日 |
| ハーブ | 2日 |
| 野菜 | 2日 |
