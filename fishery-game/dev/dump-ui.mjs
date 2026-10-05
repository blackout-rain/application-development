// 画面の文字をまとめて書き出す。言語まわりの変更で、日本語表示が変わっていないかの確認用。
//   node dev/dump-ui.mjs out.json [--lang en]   （開発版を使う。先に build-dev を実行）
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
const lang = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'ja';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const res = {};
for (const start of ['blank', 'early', 'mid', 'late', 'all']) {
  const page = await browser.newPage({ viewport: { width: 380, height: 900 } });
  await page.addInitScript(([l]) => {
    let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
    localStorage.setItem('umikaze-fishery-dev-v1', JSON.stringify({ v: 1, seen: 1 })); localStorage.setItem('umikaze-lang', l);
    Date.now = () => 1.7e12;
  }, [lang]);
  await page.goto('file://' + path.join(here, 'dist/index.html'));
  await page.waitForFunction(() => window.Admin && window.Bot, null, { timeout: 15000 });
  const r = await page.evaluate(([start]) => {
    let a = 777; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
    const flush = () => { if (typeof i18nFlush === 'function') i18nFlush() };
    const o = {}; const closeAll = () => { document.getElementById('veil').hidden = true };
    applySave(Admin.makeState(Admin.PRE[start]), 'dump'); closeAll(); G.seen = 1; G.tut = start === 'blank' ? 0 : 1; G.home = 0; S.st = 'idle';
    if (start === 'all') { G.fu.noren = 1; G.earned = Math.max(G.earned, 3e8); G.nr.pt = 20; G.comp[1] = G.bossGot[1] = 1 }
    const tabs = ['fish', 'sell', 'town', 'home', 'stat', 'dex', 'set'];
    for (const t of tabs) { openTab(t); renderAll(); flush(); o['tab:' + t] = document.getElementById('p-' + t).innerHTML; closeAll() }
    openTab('fish'); flush(); o.header = document.querySelector('header').innerHTML; o.nav = document.querySelector('nav').innerHTML; o.tut = document.getElementById('tut').innerHTML; o.msg = document.getElementById('msg').innerHTML;
    for (let i = 0; i < 40; i++) { try { showHelp(i); flush(); o['help' + i] = document.getElementById('box').innerHTML } catch (e) { break } }
    closeAll();
    const tryDo = (k, f) => { try { f(); flush(); o[k] = document.getElementById('box').innerHTML } catch (e) { o[k] = 'ERR ' + e.message } closeAll() };
    tryDo('ranks', () => showRanks()); tryDo('boss0', () => showBossAdvice(0, 0)); tryDo('boss1', () => showBossAdvice(1, 0));
    tryDo('noren', () => { if (typeof norenConfirm === 'function') norenConfirm() });
    // 釣りの一連のメッセージ
    S.st = 'idle'; rollFish(); o.fishmsg = [S.sp.n, S.size]; hook(); flush(); o.hook = document.getElementById('msg').textContent;
    S.f.prog = 100; S.holding = true; fightStep(.01); flush(); o.landed = document.getElementById('msg').textContent + '|' + document.getElementById('banner').innerHTML;
    flush(); o.hint = document.getElementById('hint').innerHTML;
    return o;
  }, [start]);
  res[start] = r; await page.close();
}
await browser.close();
writeFileSync(out, JSON.stringify(res, null, 1));
console.log('書き出し:', out, Object.keys(res.mid).length, '項目');
