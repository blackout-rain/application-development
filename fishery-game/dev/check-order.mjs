// 読み込み順の検査：ファイルを分けると、「あとで読み込まれるファイルの関数」を、読み込み中（トップレベル）に使うと動かなくなる。
// （1つのファイルなら、関数は先に使えたが、ファイルが分かれていると使えない。呼ぶのが関数の中なら大丈夫）
//   node dev/check-order.mjs      問題があれば、終了コード1
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
function load(n) { try { return createRequire(import.meta.url)(n) } catch (e) { return createRequire(path.join(process.env.ACORN_DIR || here, '/'))(n) } }
const acorn = load('acorn');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="((?:js|i18n)\/[^"]+)"><\/script>/g)].map(m => m[1]);
const decl = {}, asts = {};
files.forEach((f, i) => {
  const ast = acorn.parse(readFileSync(path.join(root, f), 'utf8'), { ecmaVersion: 2022 }); asts[f] = ast;
  for (const st of ast.body) if (st.type === 'FunctionDeclaration') decl[st.id.name] = i;
});
let bad = 0;
files.forEach((f, i) => {
  const refs = [];
  (function visit(n, parent, key) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') return;   // 関数の中は、あとで呼ばれる
    if (n.type === 'Identifier') {
      if (parent && ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed) || (parent.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand))) return;
      refs.push(n.name); return;
    }
    for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => visit(c, n, k)); else if (v && typeof v.type === 'string') visit(v, n, k) }
  })(asts[f], null, null);
  for (const name of new Set(refs)) if (name in decl && decl[name] > i) { console.error(`NG: ${f} が、読み込みの途中で、あとのファイル ${files[decl[name]]} の関数 ${name} を使っています（() => ${name}() のように、呼ぶときに探す形にしてください）`); bad++ }
});
if (bad) process.exit(1);
console.log(`OK: 読み込み順（${files.length}ファイル）に問題なし`);
