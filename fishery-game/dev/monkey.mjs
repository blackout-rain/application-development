// モンキーテスト：画面のボタンをランダムに押し続けて、エラー・「NaN」表示・不変条件の違反を探す（開発版を使う）。
//   node dev/monkey.mjs --steps 500 --seeds 4 --start blank,mid,late,all [--width 360]
//   終了コード: 問題が見つかったら1
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const steps = +args.steps || 400, seeds = +args.seeds || 3, starts = String(args.start || 'blank,mid,late,all').split(','), width = +args.width || 360;
if (!args['no-build']) spawnSync(process.execPath, [path.join(here, 'build-dev.mjs')], { stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const problems = new Map();
const note = (k, d) => { if (!problems.has(k)) problems.set(k, { n: 0, ex: d }); problems.get(k).n++; };
const BAD_TEXT = /NaN|undefined|\[object|Infinity|null(?![a-zA-Z])/;

for (const start of starts) for (let seed = 1; seed <= seeds; seed++) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  const ctx = `${start}/seed${seed}`;
  page.on('pageerror', e => note('JSエラー: ' + e.message.slice(0, 120), ctx));
  await page.addInitScript(s => {
    let a = s; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
    localStorage.setItem('umikaze-fishery-dev-v1', JSON.stringify({ v: 1, seen: 1 }));
  }, seed * 7919);
  await page.goto('file://' + path.join(here, 'dist/index.html'));
  await page.waitForFunction(() => window.Admin && window.Bot, null, { timeout: 15000 });
  if (start !== 'blank') await page.evaluate(k => { applySave(Admin.makeState(Admin.PRE[k]), 'monkey'); }, start);
  await page.waitForTimeout(300);

  for (let i = 0; i < steps; i++) {
    const r = Math.random();
    try {
      const kind = await page.evaluate(() => {
        const r = Math.random();
        const vis = e => !!(e.offsetParent || e.getClientRects().length);
        // 開いているモーダルは、ときどき閉じる
        const veil = document.getElementById('veil');
        if (veil && !veil.hidden) {
          const btns = [...veil.querySelectorAll('button:not([disabled])')];
          if (btns.length && r < .7) { btns[Math.floor(Math.random() * btns.length)].click(); return 'modal-click'; }
          veil.hidden = true; return 'modal-close';
        }
        if (r < .08) { const t = ['fish', 'sell', 'town', 'home', 'stat', 'dex', 'set'][Math.floor(Math.random() * 7)]; openTab(t); return 'tab:' + t; }
        if (r < .16) { // 釣りを1回ぶん進める（実際の処理を通す）
          if (G.home || S.st !== 'idle' && S.st !== 'result' || G.fish.length >= cap()) return 'skip';
          if (S.st === 'result') { next && next(); return 'next'; }
          rollFish(); S.st = 'fight'; S.f = newFight(S.sp, S.size); S.f.prog = 100; S.holding = true; fightStep(.01); return 'cast';
        }
        if (r < .20) { if (G.home) { sleep(); return 'sleep'; } G.min = DAY_END; S.st = 'result'; dayEnd(); return 'dayEnd'; }
        if (r < .23) { try { autoFish(1) } catch (e) { throw e } return 'auto'; }
        if (r < .25) { G.money += Math.round(Math.random() * 1e6); G.earned += 1e5; hud(); return 'money'; }
        // それ以外は、見えているボタンをランダムに押す（管理者パネル・削除系は除く）
        const panels = ['p-fish', 'p-sell', 'p-town', 'p-home', 'p-stat', 'p-dex', 'p-set'].map(id => document.getElementById(id)).filter(p => p && !p.hidden);
        const pool = [...panels.flatMap(p => [...p.querySelectorAll('button:not([disabled])')]), ...document.querySelectorAll('nav button, header button')]
          .filter(b => vis(b) && !b.closest('[id^=adm]') && b.id !== 'adm-fab' && !/削除|やり直す|リセット/.test(b.textContent) && b.id !== 'reset' && b.id !== 'cdDel' && !b.dataset.cdel);
        if (!pool.length) return 'nobtn';
        const b = pool[Math.floor(Math.random() * pool.length)];
        b.click(); return 'click:' + (b.id || b.dataset.a || b.className.split(' ')[0] || b.textContent.slice(0, 8));
      });
    } catch (e) { note('操作中の例外: ' + String(e.message).slice(0, 140), `${ctx} step${i}`); }
    await page.waitForTimeout(8);
    if (i % 5 === 0) {
      const t = await page.evaluate(() => { const o = []; ['p-fish', 'p-sell', 'p-town', 'p-home', 'p-stat', 'p-dex', 'p-set'].forEach(id => { const p = document.getElementById(id); if (p && !p.hidden) o.push(p.innerText) }); const b = document.getElementById('box'); if (b && !document.getElementById('veil').hidden) o.push(b.innerText); o.push(document.querySelector('header').innerText); return o.join('\n') });
      const m = t.match(BAD_TEXT); if (m) { const at = t.indexOf(m[0]); note('画面に不正な文字: ' + m[0], `${ctx} step${i}「${t.slice(Math.max(0, at - 30), at + 30).replace(/\n/g, ' ')}」`); }
    }
    if (i % 10 === 0) {
      const bad = await page.evaluate(() => Admin.check()).catch(e => ['check例外 ' + e.message]);
      bad.forEach(b => note('不変条件: ' + b, `${ctx} step${i}`));
      const ov = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (ov) note('横スクロールが出る', `${ctx} step${i}`);
    }
  }
  await page.close();
}
await browser.close();
if (!problems.size) { console.log(`OK: ${starts.join('/')} × ${seeds}シード × ${steps}手、問題なし`); process.exit(0); }
console.log(`問題 ${problems.size} 種類:`);
for (const [k, v] of problems) console.log(`  ${v.n}回  ${k}  （例: ${v.ex}）`);
process.exit(1);
