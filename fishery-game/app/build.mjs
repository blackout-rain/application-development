// ../index.html（ゲーム本体）から、アプリ用の www/ を作る
//  - 単体のHTMLを、普通のHTML文書の形に包む
//  - ネットのフォント（Google Fonts）への依存をやめる（フォールバックの日本語フォントが使われる）
//  - Firebase連携（cloud.js）を、ゲームより先に読み込ませる
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { build } from 'esbuild';

mkdirSync('www', { recursive: true });

await build({
  entryPoints: ['src/cloud-firebase.js'],
  bundle: true, minify: true, format: 'iife', target: ['chrome100'],
  outfile: 'www/cloud.js', logLevel: 'info'
});

let game = readFileSync('../index.html', 'utf8');
game = game.replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, '');
if (game.includes('<script>') === false) throw new Error('ゲームの<script>が見つかりません');
game = game.replace('<script>', '<script src="cloud.js"></script>\n<script>');

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0}
img{max-width:100%}
[hidden]{display:none!important}
</style>
</head>
<body>
${game}
</body>
</html>
`;
writeFileSync('www/index.html', html);
console.log('www/index.html を作りました');

// 製品版に、管理者（開発）用の機能が混ざっていないか検査する。混ざっていたら、ここで失敗させる
import { spawnSync } from 'node:child_process';
const chk = spawnSync(process.execPath, ['../dev/check-prod.mjs'], { stdio: 'inherit' });
if (chk.status !== 0) process.exit(chk.status || 1);
