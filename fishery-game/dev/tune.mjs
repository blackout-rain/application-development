// バランス調整用：数値を差し替えて、自動プレイを複数回まわし、到達日などの中央値を出す。
//   node dev/tune.mjs --cfg '{"priceMul":[1,1,0.6,0.5,0.4,0.3]}' --seeds 6 --days 150 --skill avg
// cfg: priceMul[6]（海域ごとの売値の倍率）, crewBase[6], crewWage[6], boats[5], up{rod:[..],..}, fac{house:[..],..},
//      ranks[11]（必要売上）, rewardMul[6]（コンプ・主の祝い金の倍率）, expSlope
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
import { readFileSync } from 'node:fs';
const cfg = args.file ? JSON.parse(readFileSync(args.file, 'utf8')) : args.cfg ? JSON.parse(args.cfg) : {}, days = +args.days || 150, seeds = +args.seeds || 6, skills = String(args.skill || 'avg').split(','), label = args.label || '';
if (!args['no-build']) spawnSync(process.execPath, [path.join(here, 'build-dev.mjs')], { stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const med = a => { const s = a.filter(x => x !== undefined).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : undefined };
const out = [];
for (const skill of skills) {
  const reps = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('umikaze-fishery-dev-v1', JSON.stringify({ v: 1, seen: 1 })));
    await page.goto('file://' + path.join(here, 'dist/index.html'));
    await page.waitForFunction(() => window.Bot && window.Admin, null, { timeout: 15000 });
    const r = await page.evaluate(([c, o]) => {
      if (c.priceMul) SP.forEach(s => { s.p *= c.priceMul[s.a] });
      if (c.bossPriceMul) SP.forEach(s => { if (s.boss) s.p *= c.bossPriceMul });
      if (c.crewBase) AREAS.forEach((a, i) => a.base = c.crewBase[i]);
      if (c.crewWage) AREAS.forEach((a, i) => a.wage = c.crewWage[i]);
      if (c.boats) BOATS.forEach((b, i) => b.c = c.boats[i]);
      if (c.up) Object.entries(c.up).forEach(([k, v]) => { UP.find(u => u.k === k).c = v });
      if (c.fac) Object.entries(c.fac).forEach(([k, v]) => { FAC.find(u => u.k === k).c = v });
      if (c.ranks) RANKS.forEach((r, i) => r[0] = c.ranks[i]);
      if (c.rewardMul) { COMP.forEach((x, i) => x.g = Math.round(x.g * c.rewardMul[i])); BOSSB.forEach((x, i) => x.g = Math.round(x.g * c.rewardMul[i])) }
      if (c.expSlope !== undefined) BAL.expSlope = c.expSlope;
      if (c.bossLvCap !== undefined) BAL.bossLvCap = c.bossLvCap;
      if (c.expMul !== undefined) BAL.expMul = c.expMul;
      if (c.expEarly !== undefined) BAL.expEarly = c.expEarly;
      if (c.tkMul !== undefined) window.__tkMul = c.tkMul;
      AREAS.forEach((_, a) => { const l = SP.filter(s => s.a === a && !s.boss); AVG[a] = l.reduce((x, s) => x + s.w * avgP(s), 0) / l.reduce((x, s) => x + s.w, 0) });
      return window.Bot.run(o);
    }, [cfg, { days, seed, skill, start: 'blank' }]);
    reps.push(r); await page.close();
  }
  const m = k => med(reps.map(r => r.milestones[k]));
  const wr = med(reps.map(r => r.stats.wins / Math.max(1, r.stats.casts)));
  const last = reps.map(r => r.timeline[r.timeline.length - 1]);
  const inc = med(reps.map(r => { const t = r.timeline; if (t.length < 12) return 0; return (t[t.length - 1].earned - t[t.length - 11].earned) / 10 }));
  out.push({ skill, bad: reps.filter(r => !r.ok).length, wr: Math.round(wr * 100), area: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => m('area' + i)), rank: [3, 5, 7, 9, 10].map(i => m('rank' + i)), lv: [10, 20, 30, 50, 99].map(i => m('lv' + i)), comp: [m('comp0'), m('comp1'), m('comp2')], boss: [m('boss0'), m('boss1'), m('boss2')], crewMax: m('crewMax'), endLv: med(last.map(t => t.lv)), endMoney: med(last.map(t => t.money)), income: Math.round(inc), hoard: inc ? +(med(last.map(t => t.money)) / inc).toFixed(1) : null, earnedD1: med(reps.map(r => r.timeline[0].earned)), earnedD7: med(reps.map(r => r.timeline[6] && r.timeline[6].earned)), curve: [1, 2, 3, 5, 8, 12, 18, 25, 35, 50, 70, 90, 120, 150, 200].map(d => [d, med(reps.map(r => r.timeline[d - 1] && r.timeline[d - 1].earned))]).filter(x => x[1] !== undefined) });
}
await browser.close();
const f = v => v === undefined ? '—' : v;
console.log(`# ${label}  cfg=${JSON.stringify(cfg).slice(0, 160)}  days=${days} seeds=${seeds}`);
out.forEach(o => console.log(`[${o.skill}] 異常${o.bad}/${seeds} 勝率${o.wr}%\n  海域解放日(沖/深/南/氷/幻/火/船/極/竜): ${o.area.map(f).join('/')}\n  ランク到達日(Rank3/5/7/9/漁業王): ${o.rank.map(f).join('/')}\n  Lv到達日(10/20/30/50/99): ${o.lv.map(f).join('/')}\n  コンプ日(港/沖/深): ${o.comp.map(f).join('/')}  主討伐日(0/1/2): ${o.boss.map(f).join('/')}  漁師上限: ${f(o.crewMax)}日\n  初日売上¥${o.earnedD1} 7日目累計¥${o.earnedD7}  最終 Lv${o.endLv} ¥${(o.endMoney || 0).toLocaleString()} 日収約¥${o.income.toLocaleString()} 所持金/日収=${o.hoard}日分\n  累計売上の推移: ${o.curve.map(([d, e]) => d + '日:' + (e >= 1e6 ? (e / 1e6).toFixed(1) + 'M' : Math.round(e / 1e3) + 'k')).join('  ')}`));
