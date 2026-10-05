// 開発版（管理者パネル付き）を作る。出力: dev/dist/index.html
//  - ../index.html（製品版と同じゲーム本体）に、dev/admin.js を取り込む
//  - 保存先のキーを別にする（製品版・本番データと混ざらない）
//  - タイトルに DEV を付ける
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
let game = readFileSync(path.join(here, '../index.html'), 'utf8');
const admin = readFileSync(path.join(here, 'admin.js'), 'utf8');
const bot = readFileSync(path.join(here, 'bot.js'), 'utf8');

const must = (s, re, to) => { if (!game.includes(re)) throw new Error('見つかりません: ' + re); game = game.split(re).join(to); };
must(game, 'umikaze-fishery-v1', 'umikaze-fishery-dev-v1');
must(game, 'umikaze-fishery-backup', 'umikaze-fishery-dev-backup');
must(game, "'umikaze-dev'", "'umikaze-dev-device'");
must(game, '<title>今日も大漁ですか？</title>', '<title>今日も大漁ですか？ DEV</title>');

// 起動直後のエラーも拾うため、ゲームより先に、小さな記録用スクリプトを置く
const early = `<script>/*__UMIKAZE_ADMIN__*/window.__admEarly=[];addEventListener('error',function(e){window.__admEarly.push({t:Date.now(),day:0,min:0,kind:'error',msg:e.message})});</script>\n`;
if (!game.includes('<script>')) throw new Error('<script> がありません');
game = game.replace('<script>', early + '<script>');
game = game.trimEnd() + '\n<script>\n' + admin + '\n</script>\n<script>\n' + bot + '\n</script>\n';

mkdirSync(path.join(here, 'dist'), { recursive: true });
writeFileSync(path.join(here, 'dist/index.html'), game);
console.log('開発版を作りました: dev/dist/index.html');
