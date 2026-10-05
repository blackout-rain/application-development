# 今日も大漁ですか？ 〜すきま時間の釣り経営〜

釣り経営ゲーム（スマホ向けのWebゲーム。Androidアプリは `app/`）。

## ファイルの構成
```
index.html            画面の骨組み（HTML）と、読み込むファイルの一覧だけ
css/game.css          デザイン
i18n/
  en.js               英語の訳（日本語の原文 → 英訳）
  names.js            魚などの名前の英語（表示だけ。保存データは日本語のまま）
js/                   ゲームのコード（index.html に書いた順に読み込まれる）
  core/               土台：言語・セーブデータ・ランク・売値・釣りの本体・演出・日の進行・起動
  data/               世界のデータ：海域・魚・船・設備・料理など
  systems/            経営・育成の仕組み：従業員・注文・加工場・研究・大会・季節・実績・のれん分け など
  ui/                 画面：各タブ・クラウド保存・最初の案内・描画
                      （大きな画面は、-sections.js＝画面の各部分のHTML、-events.js＝ボタンの動作、に分けてある）
dev/                  開発用（管理者パネル・自動プレイ・テスト・翻訳の検査）。製品版には入らない
app/                  Androidアプリ化（Capacitor・Firebase・ストア用素材）
IDEAS.md              アイデアと実装メモ
```
- ブラウザで `index.html` を開けば、そのまま遊べる（ファイルを分けたままで動く）。
- 1つのHTMLにまとめる（アーティファクトの公開・アプリ用）：`node dev/bundle.mjs`。
- 開発・テストの方法は `dev/README.md`、英語対応は `dev/README.md` の「多言語」。

## コードの書式
`prettier` で自動整形している（設定は `.prettierrc.json`）。直したあとは `cd dev && npm run format`。CI では `format:check` で書式がそろっているか検査する。
