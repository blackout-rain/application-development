// 製品版に、管理者機能が混ざっていないかを検査する。混ざっていたら、失敗（終了コード1）にする。
//   node dev/check-prod.mjs          … ゲーム本体と、アプリ用の www/ を検査
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const SENTINELS = ['__UMIKAZE_ADMIN__', 'adm-fab', 'Admin.force', 'Bot.run', 'umikaze-fishery-dev'];
const targets = [path.join(here, '../index.html')];
const www = path.join(here, '../app/www');
if (existsSync(www)) for (const f of readdirSync(www)) if (/\.(html|js)$/.test(f)) targets.push(path.join(www, f));
let bad = 0;
for (const t of targets) {
  const s = readFileSync(t, 'utf8');
  for (const k of SENTINELS) if (s.includes(k)) { console.error(`NG: ${path.relative(process.cwd(), t)} に管理者機能の目印 "${k}" が含まれています`); bad++; }
}
if (bad) { console.error('製品版に管理者機能が混ざっています。'); process.exit(1); }
console.log(`OK: 製品版（${targets.length}ファイル）に、管理者機能は含まれていません`);
