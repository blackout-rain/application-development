// ゲームを、1つのHTMLファイルにまとめる（アーティファクトの公開・開発版・アプリ用に使う）。
//   node dev/bundle.mjs [出力先]     既定の出力先: dist/game.html
// index.html が読み込む css/ と、スクリプト（js/・i18n/）を、そのままの順番で埋め込む。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const GAME_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// 埋め込む前の、ゲームの全ファイル（index.html を除く）の一覧を返す
export function gameFiles(root = GAME_ROOT) {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = [...html.matchAll(/<link rel="stylesheet" href="((?:css)\/[^"]+)">/g)].map(m => m[1]);
  const js = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(p => !/^https?:/.test(p));
  return { css, js };
}

export function bundleGame(root = GAME_ROOT) {
  let html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const read = p => {
    const t = readFileSync(path.join(root, p), 'utf8');
    if (/<\/(script|style)/i.test(t)) throw new Error(`${p} に </script> や </style> が含まれています（埋め込めません）`);
    return t.endsWith('\n') ? t : t + '\n';
  };
  html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (m, p) => `<style>\n${read(p)}</style>`);
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, p) => /^https?:/.test(p) ? m : `<script>\n${read(p)}</script>`);
  if (/<script src="(?!https?:)/.test(html) || /<link rel="stylesheet" href="(?!https?:)/.test(html)) throw new Error('埋め込めていない読み込みが残っています');
  return html;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = path.resolve(process.argv[2] || path.join(GAME_ROOT, 'dist/game.html'));
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, bundleGame());
  console.log('1つのHTMLにまとめました:', path.relative(process.cwd(), out));
}
