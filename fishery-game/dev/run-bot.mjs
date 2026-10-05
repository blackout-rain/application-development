// 自動プレイを、複数の乱数・腕前でまとめて実行して、レポートを書き出す。異常があれば、終了コード1。
//   node dev/run-bot.mjs                         … 100日 × 乱数3つ × 腕前 avg
//   node dev/run-bot.mjs --days 60 --seeds 5 --skill poor --start mid
//   必要なもの: npm i -D playwright && npx playwright install chromium （CHROMIUM_PATH でブラウザを指定することもできる）
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const days = +args.days || 100, seeds = +args.seeds || 3, skills = String(args.skill || 'avg').split(','), start = args.start || 'blank';

const b = spawnSync(process.execPath, [path.join(here, 'build-dev.mjs')], { stdio: 'inherit' });
if (b.status !== 0) process.exit(b.status || 1);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const outDir = path.join(here, 'reports'); mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const results = [];
for (const skill of skills) for (let seed = 1; seed <= seeds; seed++) {
  const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
  const pageErrors = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('umikaze-fishery-dev-v1', JSON.stringify({ v: 1, seen: 1 })); localStorage.setItem('umikaze-lang', 'ja') });
  await page.goto('file://' + path.join(here, 'dist/index.html'));
  await page.waitForFunction(() => window.Bot && window.Admin, null, { timeout: 15000 });
  const rep = await page.evaluate(o => window.Bot.run(o).then(r => ({ r, md: window.Bot.markdown(r) })), { days, seed, skill, start });
  pageErrors.forEach(m => { rep.r.issues.push({ day: 0, kind: 'error', msg: 'ページのエラー: ' + m }); rep.r.ok = false });
  const file = path.join(outDir, `bot-${stamp}-${skill}-${seed}.md`);
  writeFileSync(file, rep.md);
  results.push({ skill, seed, ...rep.r, file });
  const t = rep.r.timeline[rep.r.timeline.length - 1] || {};
  console.log(`${rep.r.ok ? 'OK' : 'NG'}  skill=${skill} seed=${seed}  ${rep.r.daysRun}日  Lv.${t.lv} ¥${(t.money || 0).toLocaleString()}  釣り${rep.r.stats.casts}回(勝率${Math.round(100 * rep.r.stats.wins / Math.max(1, rep.r.stats.casts))}%)  異常${rep.r.issues.length}件  ${(rep.r.ms / 1000).toFixed(1)}秒`);
  rep.r.issues.slice(0, 5).forEach(i => console.log(`     ${i.day}日目 [${i.kind}] ${i.msg}`));
  await page.close();
}
await browser.close();
// 同じ種類の異常・指摘を、まとめて数える
const agg = (key, pick) => { const m = new Map(); results.forEach(r => pick(r).forEach(x => { const k = String(x.msg || x).replace(/[0-9,.]+/g, '#').slice(0, 90); m.set(k, (m.get(k) || 0) + 1) })); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8) };
const ai = agg('issues', r => r.issues), aw = agg('warnings', r => r.warnings);
if (ai.length) { console.log('\n【異常（種類別）】'); ai.forEach(([k, n]) => console.log(`  ${n}件  ${k}`)) }
if (aw.length) { console.log('\n【気づき（種類別・件数は実行数）】'); aw.forEach(([k, n]) => console.log(`  ${n}/${results.length}  ${k}`)) }
writeFileSync(path.join(outDir, `summary-${stamp}.json`), JSON.stringify(results.map(({ timeline, ...r }) => r), null, 2));
console.log(`レポート: ${outDir}`);
process.exit(results.every(r => r.ok) ? 0 : 1);
