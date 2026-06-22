# 自分のご機嫌を、5分でとるアプリ

1日5分の片付け習慣で、「できた私」を増やしていくスマホ向けWebアプリです。
LP「おうち整え」のコンセプトをそのまま形にしました。

---

## 🌸 受講生の方へ：はじめかた（Claude Code で進めます）

このフォルダを **Claude Code で開く**と、`CLAUDE.md` を読んだ Claude が中身を理解した状態で手伝ってくれます。
各ステップは「自分でやる」ことも、「**Claude Code にお願いする**」こともできます（例：そのままコピペで指示）。

### 用意するもの（すべて無料）
- **Claude Code**（このフォルダを開く）
- **GitHub アカウント**（コードの置き場所）… https://github.com
- **Vercel アカウント**（インターネット公開）… https://vercel.com （GitHubでログイン可）
- **Supabase アカウント**（管理者機能を使う場合のみ）… https://supabase.com

### 手順
1. **まず動かして見る**
   - Claude Code に👉「このアプリをローカルサーバで起動して、ブラウザで開いて」
2. **自分の GitHub に置く**
   - GitHub で空のリポジトリを作る（README等のチェックは外す）
   - Claude Code に👉「このフォルダを git で初期化して、私の GitHub リポジトリ `（URL）` に push して」
3. **Vercel で公開する**
   - Vercel で「Add New → Project」→ 2 で作った GitHub リポジトリを **Import** → そのまま **Deploy**
   - `https://◯◯◯.vercel.app` の公開 URL ができます
4. **（任意）管理者機能をオンにする**
   - 下の「管理者機能のセットアップ」に沿って **自分の Supabase** を作成
   - `js/config.js` に自分の URL と anon キーを貼る → GitHub に push（Vercel が自動で再公開）
   - Claude Code に👉「Supabase のセットアップを手伝って。README の手順どおりに進めて」
5. **自分らしくカスタマイズ**
   - 文章・タスク・お部屋の段階などは `js/data.js`、配色は `css/styles.css`
   - Claude Code に👉「タスクの文章を私の受講生向けに書き換えて」「テーマカラーを◯◯に変えて」など

> 迷ったら、まず Claude Code に「`CLAUDE.md` を読んで、次に何をすればいいか教えて」と聞いてください。

### 🛠️ ここから自分で育てる（練習課題）
このアプリは「動く土台」です。`EXERCISES.md` に、やさしい順の**練習課題**（Claude Codeへの頼み方つき）をまとめています。
文章の書き換え → 配色 → 新機能の追加…と、ステップアップしながら自分だけのアプリにしていきましょう。

---

## できること（v1）
- 🏠 **ホーム** … 今日の5分片付けタスクを1つ表示。「できた!」ボタンで記録＆応援メッセージ。
- 📅 **きろく** … 連続日数・できた合計・カレンダーのスタンプ・ごほうびバッジで見える化。
- 🔍 **しんだん** … かんたんな質問で「まず片付ける場所」を提案 → その場所のチェックリスト。
- ⚙️ **せってい** … 記録のリセット、ホーム画面への追加案内。

記録は **この端末（このブラウザ）の中だけ** に保存されます。サーバーやアカウントは不要です。

---

## 動かしてみる（パソコンで確認）

ファイルを直接ダブルクリックで開くと一部機能（オフライン保存＝Service Worker）が動かないため、
かんたんな「ローカルサーバ」で開きます。

### Python が入っている場合
このフォルダで、コマンドプロンプト／PowerShell を開いて:

```
python -m http.server 8000
```

ブラウザで `http://localhost:8000` を開く。

### Node.js が入っている場合

```
npx serve
```

表示されたURLを開く。

> スマホ表示で確認するには、ブラウザの開発者ツール（F12）→ デバイスツールバー（スマホのアイコン）をオンにします。

---

## スマホで使う（おすすめ）

1. 下の「インターネットに公開する」で公開URLを作る。
2. スマホのブラウザでそのURLを開く。
3. ブラウザのメニューから **「ホーム画面に追加」** を選ぶ。
4. アプリのアイコンから起動できます（オフラインでも開けます）。

---

## インターネットに公開する（無料）

いちばん簡単なのは **Netlify Drop**:

1. https://app.netlify.com/drop を開く。
2. この「片付けアプリ」フォルダごと、ブラウザにドラッグ&ドロップ。
3. 数秒で公開URLが発行されます。そのURLをスマホで開けばOK。

ほかに **Vercel** や **GitHub Pages** でも公開できます。

---

## 文章を変えたいとき

アプリに出てくる言葉（タスク・応援メッセージ・チェックリストなど）は、すべて
**`js/data.js`** にまとまっています。メモ帳などで開いて、`" "` の中の文章を
書きかえれば変更できます（カンマ `,` やカッコは消さないよう注意）。

ファイルを更新したら、`sw.js` の `katazuke-app-v1` の数字を
`v2`, `v3` … と1つ上げると、スマホ側に新しい内容が反映されやすくなります。

---

---

## 管理者機能のセットアップ（受講生の進捗を見る）

受講生の進捗を管理者（先生）が一覧で見るには、無料データベース **Supabase** を使います。
設定が空のままでも、アプリは「各端末だけに保存」で普通に動きます。設定すると、進捗が
オンラインに保存され、`admin.html` の管理者ページで全員の進捗を見られます。

### 手順

**1. Supabaseのプロジェクトを作る**
1. https://supabase.com にアクセスし、無料アカウントを作成（GitHubでログイン可）。
2. 「New project」でプロジェクトを作成（名前・パスワードは任意、リージョンは Tokyo 推奨）。
3. 作成完了まで1〜2分待ちます。

**2. 進捗をためる表（テーブル）を作る**
左メニューの「SQL Editor」を開き、下を貼り付けて「Run」:

```sql
create table if not exists public.progress (
  user_id text primary key,
  nickname text,
  why text,
  streak int default 0,
  total_done int default 0,
  first_seen date,
  last_active date,
  diagnosis_place text,
  checklist_done int default 0,
  data jsonb,
  updated_at timestamptz default now()
);
-- すでに表を作成済みの場合は、次の1行だけ実行して「なりたい自分」列を追加:
-- alter table public.progress add column if not exists why text;

alter table public.progress enable row level security;

-- 受講生（匿名）は登録・更新のみ（他人の閲覧は不可）
grant insert, update on public.progress to anon;
create policy "anon_insert" on public.progress for insert to anon with check (true);
create policy "anon_update" on public.progress for update to anon using (true) with check (true);

-- 管理者（ログイン済み）は全件閲覧可
grant select on public.progress to authenticated;
create policy "auth_select" on public.progress for select to authenticated using (true);
```

**3. 管理者（先生）のログインアカウントを作る**
1. 左メニュー「Authentication」→「Users」→「Add user」。
2. 先生のメールアドレスとパスワードを入力し、「Auto Confirm User」をオンにして作成。
   （このメール・パスワードが、管理者ページのログインに使われます）

**4. URLとキーをアプリに設定する**
1. 左メニュー「Project Settings」→「API」を開く。
2. **Project URL** と **anon public** キーをコピー。
3. `js/config.js` を開いて貼り付け:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGci...（anon public キー）"
};
```

4. 変更を保存し、（公開している場合は）GitHubにpush → Vercelが自動で再公開。

### 使い方
- **受講生**: アプリを開くと最初にニックネームを入力。以降「できた!」やチェックが自動でオンライン保存されます。
- **管理者**: `あなたのURL/admin.html` を開き、手順3のメール・パスワードでログイン → 全受講生の
  「連続日数・できた合計・チェック数・診断結果・最終ログイン日」を一覧で確認できます。
  （アプリの「せってい」内の小さなリンクからも入れます）

> anonキーは公開して問題ないキーです。受講生のデータは、ログインした管理者だけが閲覧できます。

---

## ファイル構成

```
片付けアプリ/
  index.html              アプリ本体
  admin.html              管理者ページ（受講生の進捗一覧）
  css/styles.css          見た目（LPの配色）
  js/data.js              ★中身の文章（ここを編集）
  js/config.js            ★Supabaseの設定（URL・anonキー）
  js/storage.js           記録の保存（端末内）
  js/sync.js              オンライン保存（Supabase連携）
  js/app.js               画面の動き
  js/admin.js             管理者ページの動き
  manifest.webmanifest    アプリ情報（PWA）
  sw.js                   オフライン対応
  icons/                  アプリアイコン
```

## これから（v1には入れていない・将来の候補）
- 複数端末でのデータ同期・アカウント
- LINE連携・リマインド通知
- iPhone/Android のネイティブアプリ化
- 特典PDFの配布
