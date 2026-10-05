// ステータスのバランス確認：レベルごとの「想定のステータス」で、釣りの勝率をシミュレーションする。
//   node dev/stat-sim.mjs [--dir <ゲームのフォルダ>] [--bp 4]     （先に build-dev を実行）
// 状態：自動プレイ（旧い式）で海域が解放された日の、レベル・ステータス・装備（dev/balance/stat-states.json）。
// 各状態で、その海域の「ふつうの魚」「次の海域の魚」「その海域の主」「1つ前の主」との勝率を出す。
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const dir = path.resolve(args.dir || path.join(here, '..'));
import { readFileSync } from 'node:fs';
const states = JSON.parse(readFileSync(path.join(here, 'balance/stat-states.json'), 'utf8')).states;
const N = +args.n || 300;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
await page.addInitScript(() => localStorage.setItem('umikaze-lang', 'ja'));
await page.goto('file://' + path.join(dir, 'dev/dist/index.html'));
await page.waitForFunction(() => window.Admin);
const rows = await page.evaluate(([states, N]) => {
  const out = [];
  const win = (sp, E) => { let ok = 0; for (let i = 0; i < N; i++) { const size = Math.round(sp.min + (sp.max - sp.min) * Math.pow(Math.random(), 1.5)); if (botFight(newFight(sp, size), sp, E) === 1) ok++ } return Math.round((100 * ok) / N) };
  const normal = (a, E) => { const list = SP.filter(s => s.a === a && !s.boss), tw = list.reduce((x, s) => x + s.w, 0); let ok = 0; for (let i = 0; i < N; i++) { let r = Math.random() * tw, sp = list[0]; for (const s of list) { r -= s.w; if (r <= 0) { sp = s; break } } const size = Math.round(sp.min + (sp.max - sp.min) * Math.pow(Math.random(), 1.5)); if (botFight(newFight(sp, size), sp, E) === 1) ok++ } return Math.round((100 * ok) / N) };
  for (const s of states) {
    G.lv.rod = s.rod; G.lv.line = s.line; G.catches = 999; G.diff = 1;
    const E = fightEnv({ str: s.st.str, vit: s.st.vit, dex: s.st.dex, foc: s.st.foc });
    const a = s.boat, r = { boat: a, lv: s.lv, normal: normal(a, E), next: normal(Math.min(9, a + 1), E), boss: win(bossOf(a), E), prev: a > 0 ? win(bossOf(a - 1), E) : null };
    out.push(r);
  }
  return out;
}, [states, N]);
console.log('海域 Lv  ふつう/次の海域/その主/1つ前の主（勝率%）');
for (const r of rows) console.log(String(r.boat).padStart(2), String(r.lv).padStart(3), `${String(r.normal).padStart(4)} /${String(r.next).padStart(4)} /${String(r.boss).padStart(4)} /${r.prev === null ? '   -' : String(r.prev).padStart(4)}`);
await browser.close();
