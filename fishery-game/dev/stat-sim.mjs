// ステータスのバランス確認：レベルごとの「想定のステータス」で、釣りの勝率をシミュレーションする。
//   node dev/stat-sim.mjs [--dir <ゲームのフォルダ>] [--bp 4]     （先に build-dev を実行）
// 想定：レベルが1上がるごとに、自動で全ステータス平均 +0.77、BPを4つ（3＋実績やミッション）。振り分けは、自動プレイ（bot.js）と同じ比率。
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const dir = path.resolve(args.dir || path.join(here, '..'));
const bpPer = +args.bp || 4;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
await page.addInitScript(() => localStorage.setItem('umikaze-lang', 'ja'));
await page.goto('file://' + path.join(dir, 'dev/dist/index.html'));
await page.waitForFunction(() => window.Admin);
const rows = await page.evaluate(([bpPer]) => {
  const W = { str: 3, vit: 3, dex: 3, foc: 2, agi: 1, luk: 1, biz: 1, lead: 1 }, out = [];
  const areaOf = L => (L < 8 ? 0 : L < 15 ? 1 : L < 22 ? 2 : L < 28 ? 3 : L < 35 ? 4 : L < 42 ? 5 : L < 48 ? 6 : L < 55 ? 7 : L < 62 ? 8 : 9);
  for (const L of [3, 8, 15, 22, 30, 40, 50, 60, 75, 90]) {
    const v = {}; for (const k in W) v[k] = 0.77 * (L - 1) + (bpPer * (L - 1) * W[k]) / 15;
    const g = Math.min(10, Math.round(L / 6));
    G.lv.rod = G.lv.line = g; G.catches = 999; G.diff = 1;
    const res = [];
    for (const a of [areaOf(L), Math.min(9, areaOf(L) + 1)]) {
      let ok = 0, n = 0;
      const list = SP.filter(s => s.a === a && !s.boss);
      const tw = list.reduce((x, s) => x + s.w, 0);
      for (let i = 0; i < 400; i++) {
        let r = Math.random() * tw, sp = list[0];
        for (const s of list) { r -= s.w; if (r <= 0) { sp = s; break } }
        const size = Math.round(sp.min + (sp.max - sp.min) * Math.pow(Math.random(), 1.5));
        const E = fightEnv({ str: v.str, vit: v.vit, dex: v.dex, foc: v.foc });
        if (botFight(newFight(sp, size), sp, E) === 1) ok++; n++;
      }
      res.push(Math.round((100 * ok) / n));
    }
    // その海域の主（ボス）との勝率
    const bs = bossOf(areaOf(L)), Eb = fightEnv({ str: v.str, vit: v.vit, dex: v.dex, foc: v.foc });
    let okb = 0;
    for (let i = 0; i < 300; i++) { const size = Math.round(bs.min + (bs.max - bs.min) * Math.pow(Math.random(), 1.5)); if (botFight(newFight(bs, size), bs, Eb) === 1) okb++ }
    res.push(Math.round((100 * okb) / 300));
    out.push({ L, area: areaOf(L), v: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Math.round(x)])), win: res });
  }
  return out;
}, [bpPer]);
console.log('Lv  海域  勝率(その海域/次の海域/その海域の主)  ステータス(力/体/器/集/素/運/商/統)');
for (const r of rows) console.log(String(r.L).padStart(2), String(r.area).padStart(3), `${String(r.win[0]).padStart(4)}% /${String(r.win[1]).padStart(4)}% /${String(r.win[2]).padStart(4)}%`, ' ', ['str', 'vit', 'dex', 'foc', 'agi', 'luk', 'biz', 'lead'].map(k => r.v[k]).join('/'));
await browser.close();
