# 今日も大漁ですか？ 〜すきま時間の釣り経営〜 — Androidアプリ化（Capacitor + Firebase + Googleログイン）

ゲーム本体は、1つのHTMLファイル（`../index.html`）です。このフォルダは、それを **Androidアプリ**として包み、
**Googleログインでデータを引き継げる**ようにするための部品です。

```
../index.html         ゲーム本体（ここを直すと、ゲームが変わる）
src/cloud-firebase.js  Googleログイン + クラウド保存（Firebase）
src/firebase-config.js ← あなたのFirebase設定を貼る
firestore.rules       データの守りのルール（本人だけが自分のデータを読み書き）
public/               プライバシーポリシー・アカウント削除ページ（Firebase Hostingで公開）
build.mjs             ../index.html から、アプリ用の www/ を作る
assets/               アイコン・スプラッシュ画像の元（`npm run assets:icons` でAndroid用に展開）
store/                ストア用の画像（アイコン512・フィーチャーグラフィック・スクリーンショット8枚）と、掲載文の下書き
tools/                上の画像を作り直すスクリプト
STORE_CHECKLIST.md    ストア申請のチェックリスト
```

仕組みは次のとおりです。

- **ログインなしでも遊べます。** データは端末の中に保存されます。
- **Googleでログインすると**、進み具合が自動でクラウド（Firestore）に保存されます。
- **機種変更・再インストール**のあと、同じGoogleアカウントでログインすると、最新のデータが自動で読み込まれます（両方の端末で進めてしまったときだけ、どちらを使うか聞かれます）。

---

## 0. 用意するもの
- パソコン（Windows / Mac / Linux）
- [Node.js](https://nodejs.org/)（22以上）
- [Android Studio](https://developer.android.com/studio)
- Googleアカウント（Firebase用）
- Androidの実機（USBデバッグを有効に）。エミュレータでも可

## 1. Firebaseプロジェクトを作る
1. [Firebaseコンソール](https://console.firebase.google.com/) →「プロジェクトを追加」。名前は何でもよく、Googleアナリティクスは「オフ」で構いません。
2. 左メニュー **Authentication** →「始める」→ ログイン方法で **Google** を有効にします（サポートメールを選ぶ）。
3. 左メニュー **Firestore Database** →「データベースを作成」→ 場所は `asia-northeast1`（東京）→ **本番環境モード**。
4. Firestoreの「ルール」タブに、`firestore.rules` の中身を貼り付けて「公開」します。

## 2. 設定値をゲームに入れる
1. Firebaseの「プロジェクトの設定」→「マイアプリ」→ **ウェブアプリ（`</>`）を追加**。
2. 表示される設定値（apiKey など）を、`src/firebase-config.js` に貼り付けます。

## 3. Androidアプリを登録する
1. `capacitor.config.json` の `appId` を、**自分だけのパッケージ名**に変えます（例 `jp.あなた.umikazefishery`）。公開後は変更できません。
2. Firebaseの「マイアプリ」→ **Androidアプリを追加**。パッケージ名は、上の `appId` と同じものを入れます。
3. **SHA-1証明書フィンガープリント**を登録します（Googleログインに必須）。
   - 開発用: Android Studioの Gradle →「signingReport」で表示される SHA-1。
   - 公開用: Play Console の「アプリの署名」に表示される SHA-1 も、あとで追加します。
4. `google-services.json` をダウンロードし、`android/app/` に置きます（手順4のあと）。

## 4. ビルドして実機で動かす
```bash
cd app
npm install
npx cap add android      # 最初の1回だけ。android/ フォルダができる
# → google-services.json を android/app/ に置く
npm run assets:icons     # アイコンとスプラッシュ画像を、android/ に組み込む（assets/ の画像から）
npm run android          # www/ を作り、Android Studio を開く
```
Android Studio で、実機を選んで ▶（実行）を押します。

> `android/app/google-services.json` を置くと、Capacitorが作るAndroidの雛形が、自動でFirebaseを有効にします
> （置いてから `npm run android` をやり直してください）。
> うまくいかないときは、`@capacitor-firebase/authentication` の
> [公式の手順](https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/setup-google.md)
> も確認してください。

## 5. 動作確認（実機で）
1. ログインせずに、少し遊ぶ。
2. 設定 →「Googleでログイン」。ログインできたら「● Googleでログイン中」と出る。
3. Firebaseコンソールの Firestore に、`saves/（ユーザーID）` というデータができている。
4. アプリを消して、入れ直す → 起動時の画面で「Googleでログインして引き継ぐ」→ 最新のデータが、自動で読み込まれる。
5. 設定 →「アカウントとクラウドのデータを削除」で、Firestoreのデータが消える。

## 6. 公開の準備
1. `public/privacy.html` と `public/delete-account.html` の【　】を埋める。
2. [Firebase CLI](https://firebase.google.com/docs/cli) で公開: `npx firebase-tools login` → `npx firebase-tools deploy --only hosting,firestore:rules`
   → `https://プロジェクトID.web.app/privacy` がプライバシーポリシーのURLになります。
3. `STORE_CHECKLIST.md` に沿って、Play Consoleで申請します。

## ストア用の画像と文章
- `store/STORE_LISTING.md`：アプリ名・短い説明・詳しい説明・リリースノート・審査メモの下書き（【　】は自分で埋める）
- `store/icon-512.png`：Play Store用アイコン
- `store/feature-graphic-1024x500.png`：フィーチャーグラフィック
- `store/screenshots/`：スマホ用スクリーンショット8枚（1080×1920。実際のゲーム画面）

ゲームの見た目を変えたら、画像を作り直せます（アイコンの魚や、スクリーンショットは、ゲームから自動で作られます）。
```bash
npm i -D playwright && npx playwright install chromium   # 最初の1回だけ
npm run assets:store
```

## ゲームを直したとき
`../index.html` を直したら、`npm run sync` を実行して、Android Studio で再ビルドします。


## 通知（ローカル通知）について
- `src/notify.js`（`@capacitor/local-notifications`）が、ゲームに通知機能を渡します。アプリを閉じたとき、
  「留守の水揚げが満タン（8時間後）」と「デイリーボーナスの受け取り忘れ（19:00）」を知らせます。
- 設定タブの「通知」で、ユーザーがOFFにできます。Android 13以上は、初回に通知の許可を聞きます。
- 外部のサーバーには何も送りません（端末内だけの通知です）。ストアの「データセーフティ」に影響しません。
- `npm install` のあと `npm run sync` で、Androidプロジェクトに反映されます。
