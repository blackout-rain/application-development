// 翻訳まわりの道具。
//   node dev/i18n.mjs keys            … ゲーム内の T("...") の原文を、使われ方（前後のコード）つきで JSON に書き出す
//   node dev/i18n.mjs check           … 翻訳のぬけ・余り・差し込み{1}の食い違い・HTMLタグの食い違いを調べる（問題があれば終了コード1）
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const JP = /[ぁ-んァ-ヶ一-龠]/;
// ゲームのスクリプトを、ファイルごとに読む（index.html の <script src> の順）。英訳の本体（i18n/）は、対象から外す
const jsFiles = [...html.matchAll(/<script src="((?:js)\/[^"]+)"><\/script>/g)].map(m => m[1]);
const EN_FILE = path.join(root, 'i18n/en.js'), NAMES_FILE = path.join(root, 'i18n/names.js');

// 原文を集める（acorn を使う。無ければ npm i acorn）
function load(name) { try { return createRequire(import.meta.url)(name) } catch (e) { return createRequire(path.join(process.env.ACORN_DIR || here, '/'))(name) } }
const acorn = load('acorn'), walk = load('acorn-walk');
const found = new Map();      // 原文 → 使われ方
for (const f of jsFiles) {
  const src = readFileSync(path.join(root, f), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 2022 });
  walk.ancestor(ast, {
    CallExpression(n, _, anc) {
      if (n.callee.type !== 'Identifier' || n.callee.name !== 'T') return;
      const a = n.arguments[0]; if (!a) return;
      let key = null;
      if (a.type === 'Literal' && typeof a.value === 'string') key = a.value;
      else if (a.type === 'TemplateLiteral') key = a.quasis.map(q => q.value.cooked).join('{}');
      if (key === null || !JP.test(key)) return;
      if (!found.has(key)) {
        const line = src.slice(0, n.start).split('\n').length;
        const before = src.slice(Math.max(0, n.start - 90), n.start).replace(/\s+/g, ' ');
        found.set(key, { file: f, line, before, args: n.arguments[1] ? src.slice(n.arguments[1].start, n.arguments[1].end).slice(0, 160) : '' });
      }
    }
  });
}
// 静的なHTMLの文字（index.html の data-i18n）
const stat = new Map();
for (const m of html.matchAll(/<([a-z0-9]+)[^>]*\bdata-i18n(?:-aria)?(?:="([^"]*)")?[^>]*>([^<]*)</g)) {
  const k = m[2] || m[3]; if (k && JP.test(k) && !found.has(k)) stat.set(k, { file: 'index.html', line: 0, before: 'static html <' + m[1] + '>', args: '' });
}
for (const m of html.matchAll(/data-i18n-aria="([^"]*)"/g)) if (!found.has(m[1])) stat.set(m[1], { file: 'index.html', line: 0, before: 'aria-label', args: '' });
for (const [k, v] of stat) found.set(k, v);

// i18n/en.js（EN）・i18n/names.js（NAMES）の、/*EN_BEGIN*/ … /*EN_END*/ の中身
const blockFile = name => name === 'EN' ? EN_FILE : NAMES_FILE;
function block(name) {
  const re = new RegExp(`/\\*${name}_BEGIN\\*/([\\s\\S]*?)/\\*${name}_END\\*/`);
  const m = readFileSync(blockFile(name), 'utf8').match(re); if (!m) return {};
  return Function('"use strict";return ({' + m[1] + '})')();
}
const EN = block('EN');

const cmd = process.argv[2];
// i18n/en.js・i18n/names.js の EN / NAMES ブロックを書きかえる
function writeBlock(name, obj) {
  const lines = Object.entries(obj).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v) + ',').join('\n');
  const re = new RegExp(`(/\\*${name}_BEGIN\\*/)[\\s\\S]*?(/\\*${name}_END\\*/)`);
  const f = blockFile(name), cur = readFileSync(f, 'utf8');
  if (!re.test(cur)) throw new Error(name + ' のマーカーがありません');
  writeFileSync(f, cur.replace(re, (m, a, b) => a + '\n' + lines + '\n' + b));
}
if (cmd === 'apply' || cmd === 'apply-names') {
  const name = cmd === 'apply' ? 'EN' : 'NAMES', cur = cmd === 'apply' ? block('EN') : block('NAMES');
  for (const f of process.argv.slice(3)) Object.assign(cur, JSON.parse(readFileSync(f, 'utf8')));
  writeBlock(name, cur); console.log(name + ' を ' + Object.keys(cur).length + ' 件に更新');
} else if (cmd === 'prune') {   // 使われていない翻訳を消す
  const cur = block('EN'); let n = 0;
  for (const k of Object.keys(cur)) if (!found.has(k)) { delete cur[k]; n++ }
  writeBlock('EN', cur); console.log(n + ' 件を消しました');
} else if (cmd === 'dump') {
  const name = process.argv[3] || 'EN';
  writeFileSync(process.argv[4] || path.join(here, 'i18n-' + name + '.json'), JSON.stringify(block(name), null, 1)); console.log('書き出しました');
} else if (cmd === 'keys') {
  const out = [...found].map(([key, v]) => ({ key, ...v }));
  const o = process.argv[3] || path.join(here, 'i18n-keys.json');
  writeFileSync(o, JSON.stringify(out, null, 1)); console.log(out.length + ' 件 →', o);
} else if (cmd === 'check') {
  const probs = [];
  const ph = s => [...s.matchAll(/\{(\d+)\}/g)].map(m => m[1]).sort().join(',');
  const tags = s => [...s.matchAll(/<\/?([a-zA-Z0-9]+)/g)].map(m => m[0].toLowerCase()).sort().join(' ');
  const attrs = s => [...s.matchAll(/\s(class|id|style|data-[a-z-]+)="[^"]*"/g)].map(m => m[0].trim()).sort().join(' ');
  let n = 0;
  for (const [k] of found) {
    if (!(k in EN)) { probs.push('未翻訳: ' + k.slice(0, 60)); continue }
    n++;
    const e = EN[k];
    if (JP.test(e)) probs.push('英訳に日本語が残っている: ' + k.slice(0, 40) + ' → ' + e.slice(0, 40));
    if (k.includes('{') && ph(k) !== ph(e)) probs.push('{n}の食い違い: ' + k.slice(0, 50) + ' → ' + e.slice(0, 50));
    else if (!k.includes('{') && /\{\d+\}/.test(e)) probs.push('原文に無い{n}がある: ' + e.slice(0, 50));
    if (tags(k) !== tags(e)) probs.push('HTMLタグの食い違い: ' + k.slice(0, 40) + ' → ' + e.slice(0, 60));
    if (attrs(k) !== attrs(e)) probs.push('class/id/styleの食い違い: ' + k.slice(0, 40));
  }
  for (const k in EN) if (!found.has(k)) probs.push('使われていない翻訳: ' + k.slice(0, 60));
  console.log(`原文 ${found.size} 件 / 翻訳あり ${n} 件 / 問題 ${probs.length} 件`);
  probs.slice(0, +process.argv[3] || 60).forEach(p => console.log('  ' + p));
  process.exit(probs.length ? 1 : 0);
} else console.log('使い方: node dev/i18n.mjs keys | check');
