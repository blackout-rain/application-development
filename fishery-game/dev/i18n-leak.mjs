// 英語表示のまま自動プレイ（ボット）を走らせ、画面に出た文字に、日本語や全角の記号が残っていないかを探す。
//   node dev/i18n-leak.mjs [--days 40] [--start blank,mid,late,all]   終了コード: 見つかったら1
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const days = +args.days || 40, starts = String(args.start || 'blank,mid,late,all').split(',');
if (!args['no-build']) spawnSync(process.execPath, [path.join(here, 'build-dev.mjs')], { stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const leaks = new Map();
for (const start of starts) for (const seed of [1, 2]) {
  const page = await browser.newPage({ viewport: { width: 380, height: 900 } });
  await page.addInitScript(() => { localStorage.setItem('umikaze-fishery-dev-v1', JSON.stringify({ v: 1, seen: 1 })); localStorage.setItem('umikaze-lang', 'en') });
  await page.goto('file://' + path.join(here, 'dist/index.html'));
  await page.waitForFunction(() => window.Bot && window.Admin, null, { timeout: 15000 });
  const r = await page.evaluate(async ([start, seed, days]) => {
    const found = new Set(); const BAD = /[ぁ-んァ-ヶ一-龠、。（）・：！？　～]/;
    const dev = n => { const p = n.parentElement; return !p || p.tagName === 'SCRIPT' || p.closest('[id^=adm]') || p.closest('#bot') };
    const scan = n => { if (n.nodeType === 3) { const v = n.nodeValue; if (!dev(n) && BAD.test(v) && !/言語 \/ Language|日本語|ボット/.test(v)) found.add(v.trim().slice(0, 90)) } else if (n.nodeType === 1) { if (n.id && n.id.startsWith('adm')) return; ['alt', 'title', 'aria-label'].forEach(a => { const v = n.getAttribute && n.getAttribute(a); if (v && BAD.test(v)) found.add(a + ':' + v.slice(0, 60)) }); n.childNodes.forEach(scan) } };
    // 英語への置き換え（i18nFlush）のあとに、残った文字を調べる
    new MutationObserver(ms => ms.forEach(m => { if (m.type === 'childList') m.addedNodes.forEach(n => { if (!(n.id || '').startsWith('adm')) scan(n) }); else scan(m.target) })).observe(document.body, { childList: true, subtree: true, characterData: true });
    const tick = setInterval(() => { try { i18nFlush() } catch (e) { } }, 50);
    await window.Bot.run({ days, seed, skill: 'avg', start, onProgress: () => { try { i18nFlush(); for (const t of ['fish', 'sell', 'town', 'home', 'stat', 'dex', 'set']) { openTab(t); renderAll(); i18nFlush(); scan(document.getElementById('p-' + t)) } openTab('fish') } catch (e) { } } });
    clearInterval(tick); i18nFlush(); scan(document.body);
    return [...found];
  }, [start, seed, days]);
  r.forEach(t => { if (!leaks.has(t)) leaks.set(t, `${start}/${seed}`) });
  await page.close();
}
await browser.close();
if (!leaks.size) { console.log(`OK: 英語表示で、日本語の残りなし（${starts.join('/')} × 2シード × ${days}日）`); process.exit(0); }
console.log(`日本語が残っている画面の文字 ${leaks.size} 件:`);
for (const [t, w] of leaks) console.log(`  [${w}] ${t}`);
process.exit(1);
