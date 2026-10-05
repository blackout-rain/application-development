// ストア用の画像（アイコン・フィーチャーグラフィック・スクリーンショット）と、
// Androidアプリのアイコン素材（assets/）を、ゲームの実際の画面・魚の絵から作ります。
//   使い方:  npm i -D playwright && npx playwright install chromium && npm run assets:store
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(import.meta.dirname, '..');
const GAME = 'file://' + path.resolve(ROOT, '../index.html');
const OUT = path.join(ROOT, 'store'), SHOTS = path.join(OUT, 'screenshots'), ASSETS = path.join(ROOT, 'assets');
[OUT, SHOTS, ASSETS].forEach(d => mkdirSync(d, { recursive: true }));
const save = (file, dataUrl) => writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

/* ---------- 1. アイコン・スプラッシュ・フィーチャーグラフィック（ゲームの魚の絵を使う） ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.goto(GAME);
  const art = await page.evaluate(() => {
    const fishDesign = n => SP.find(s => s.n === n);
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
    const sea = (x, W, H, horizon) => {
      const sky = x.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#0c2a45'); sky.addColorStop(.6, '#2a6f9a'); sky.addColorStop(1, '#ffb454');
      x.fillStyle = sky; x.fillRect(0, 0, W, horizon);
      x.fillStyle = '#ffd98a'; x.beginPath(); x.arc(W / 2, horizon, H * .24, Math.PI, 0); x.fill();
      const water = x.createLinearGradient(0, horizon, 0, H);
      water.addColorStop(0, '#1d7aa3'); water.addColorStop(1, '#08202f');
      x.fillStyle = water; x.fillRect(0, horizon, W, H - horizon);
      x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = H * .006;
      for (let r = 0; r < 6; r++) {
        x.beginPath();
        for (let i = 0; i <= W; i += 8) { const y = horizon + H * .05 + r * H * .07 + Math.sin(i / (W * .05) + r * 1.7) * H * .012; i ? x.lineTo(i, y) : x.moveTo(i, y); }
        x.stroke();
      }
    };
    const fish = (x, name, cx, cy, L, rot) => { x.save(); x.translate(cx, cy); x.rotate(rot || 0); drawFish(x, 0, 0, L, fishDesign(name).d); x.restore(); };
    const icon = mode => {
      const [c, x] = mk(1024, 1024);
      if (mode !== 'fg') sea(x, 1024, 1024, 560);
      if (mode !== 'bg') {
        // 跳ねる魚としぶき（中央の66%に収める）
        x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 7; x.beginPath(); x.moveTo(250, -10); x.quadraticCurveTo(230, 330, 300, 548); x.stroke();
        x.strokeStyle = '#e8eef0'; x.lineWidth = 9; x.beginPath(); x.arc(305, 566, 20, -1.2, 2.2); x.stroke();
        fish(x, 'タイ', 540, 470, 470, -.32);
        x.fillStyle = 'rgba(255,255,255,.9)';
        [[300, 700, 14], [350, 740, 9], [700, 720, 12], [760, 690, 8], [640, 760, 10]].forEach(([px, py, r]) => { x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); });
      }
      return c.toDataURL('image/png');
    };
    const splash = dark => {
      const [c, x] = mk(2732, 2732);
      const g = x.createLinearGradient(0, 0, 0, 2732); g.addColorStop(0, '#0c2a45'); g.addColorStop(1, dark ? '#050f18' : '#123c5c');
      x.fillStyle = g; x.fillRect(0, 0, 2732, 2732);
      x.save(); x.translate(1366 - 512 * .9, 1100 - 512 * .9); x.scale(.9, .9);
      const i = new Image(); // 後で合成するので、魚だけ直接描く
      x.restore();
      fish(x, 'タイ', 1366, 1080, 700, -.28);
      x.fillStyle = '#eaf3f1'; x.textAlign = 'center'; x.font = '900 190px "Hiragino Maru Gothic ProN","Zen Maru Gothic","Noto Sans CJK JP",sans-serif';
      x.fillText('今日も大漁ですか？', 1366, 1700);
      x.fillStyle = '#ffb454'; x.font = '700 80px "Noto Sans CJK JP",sans-serif'; x.fillText('〜すきま時間の釣り経営〜', 1366, 1860);
      return c.toDataURL('image/png');
    };
    const feature = () => {
      const [c, x] = mk(1024, 500);
      sea(x, 1024, 500, 290);
      fish(x, 'マグロ', 840, 330, 250, .12); fish(x, 'ナポレオンフィッシュ', 930, 430, 120, -.1);
      fish(x, 'タイ', 740, 440, 140, -.2); fish(x, 'クマノミ', 700, 360, 56, .1);
      // 文字の読みやすさのため、左側を少し暗くする
      const sh = x.createLinearGradient(0, 0, 640, 0); sh.addColorStop(0, 'rgba(6,20,32,.78)'); sh.addColorStop(1, 'rgba(6,20,32,0)');
      x.fillStyle = sh; x.fillRect(0, 0, 700, 500);
      x.textAlign = 'left'; x.fillStyle = '#ffb454'; x.font = '700 30px "Noto Sans CJK JP",sans-serif'; x.fillText('〜すきま時間の釣り経営〜', 56, 150);
      x.fillStyle = '#eaf3f1'; x.font = '900 78px "Hiragino Maru Gothic ProN","Zen Maru Gothic","Noto Sans CJK JP",sans-serif'; x.fillText('今日も', 56, 245); x.fillText('大漁ですか？', 56, 330);
      x.fillStyle = '#cfe6f0'; x.font = '500 28px "Noto Sans CJK JP",sans-serif'; x.fillText('釣って、売って、育てる。', 56, 410);
      return c.toDataURL('image/png');
    };
    return { iconFull: icon('full'), iconFg: icon('fg'), iconBg: icon('bg'), splash: splash(false), splashDark: splash(true), feature: feature() };
  });
  save(path.join(ASSETS, 'icon-only.png'), art.iconFull);
  save(path.join(ASSETS, 'icon-foreground.png'), art.iconFg);
  save(path.join(ASSETS, 'icon-background.png'), art.iconBg);
  save(path.join(ASSETS, 'splash.png'), art.splash);
  save(path.join(ASSETS, 'splash-dark.png'), art.splashDark);
  save(path.join(OUT, 'feature-graphic-1024x500.png'), art.feature);
  // Play Store用 512x512
  const p2 = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await p2.setContent(`<body style="margin:0"><img src="${art.iconFull}" width="512" height="512" style="display:block"></body>`);
  await p2.screenshot({ path: path.join(OUT, 'icon-512.png') });
  await p2.close(); await page.close();
}

/* ---------- 2. スクリーンショット（実際のゲーム画面。1080x1920） ---------- */
const SCENES = [
  ['01-fishing-struggle', '釣り：暴れる魚', p => p.evaluate(() => {
    G.area = 4; openTab('fish');
    const s = SP.find(x => x.n === 'サケ'); S.sp = s; S.size = 82; S.tier = 0; hook();
    S.f.prog = 62; S.f.tens = 55; S.f.struggle = true; S.f.timer = 99; S.holding = false;
  }), 350],
  ['02-boss-fight', '主との戦い', p => p.evaluate(() => {
    G.area = 4; G.comp[4] = 1; openTab('fish');
    const s = bossOf(4); S.sp = s; S.size = 520; S.tier = 4; hook();
    S.f.prog = 48; S.f.tens = 68; S.f.struggle = true; S.f.timer = 99; S.holding = false;
  }), 400],
  ['03-rare-catch', 'レア魚を釣り上げた', p => p.evaluate(() => {
    G.area = 3; openTab('fish');
    const s = SP.find(x => x.n === 'マンタ'); S.sp = s; S.size = 460; S.tier = tier(s); hook();
    S.f.prog = 99.95; S.f.tens = 20; S.f.timer = 99; S.holding = true;
  }), 650],
  ['04-home', '自宅と施設', p => p.evaluate(() => { openTab('home'); window.scrollTo(0, 0); }), 400],
  ['05-town', '街：外食・切符・デイリー', p => p.evaluate(() => { openTab('town'); window.scrollTo(0, 0); }), 300],
  ['06-status', 'レベルとステータス', p => p.evaluate(() => { openTab('stat'); window.scrollTo(0, 0); }), 300],
  ['07-dex', '図鑑とエリアコンプ', p => p.evaluate(() => { openTab('dex'); window.scrollTo(0, 0); }), 300],
  ['08-market', '魚を売る', p => p.evaluate(() => { openTab('sell'); window.scrollTo(0, 0); }), 300],
];
for (const [file, , setup, wait] of SCENES) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('umikaze-fishery-v1', JSON.stringify({ v: 1, seen: 1 })));
  await page.goto(GAME);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.querySelector('#veil').hidden = true;
    const d = {}; SP.forEach(s => { if (s.a <= 3 || (s.a === 4 && s.w >= 10)) d[s.n] = { c: 3 + (s.w % 7), best: s.max, min: s.min }; });
    Object.assign(G, {
      seen: 1, day: 23, min: 480, money: 128450, earned: 420000, rankGot: 8, boat: 4, crew: 6, area: 4, level: 27, exp: 1200, bp: 4, catches: 640, home: 0, dailyNo: -1,
      lv: { rod: 4, line: 4, bait: 3, cool: 4, mkt: 3 }, stat: { str: 30, vit: 30, agi: 24, dex: 28, luk: 26, foc: 14, biz: 12, lead: 10 }, alloc: { str: 8, vit: 8, agi: 0, dex: 6, luk: 2, foc: 0, biz: 0, lead: 0 },
      fac: { house: 3, tank: 3, trophy: 2, plant: 2, farm: 1 }, comp: { 0: 1, 1: 1, 2: 1, 3: 1 }, bossGot: { 0: 1, 1: 1, 2: 1 }, dex: d,
      tk: { auto: 6, meal: 2 }, meal: { n: '海鮮定食', fx: { exp: .15 }, left: 8 }, fish: [], streak: 3
    });
    ['サバ', 'タイ', 'ブリ', 'カツオ', 'カンパチ', 'イカ', 'ヒラメ'].forEach((n, i) => { const sp = SP.find(s => s.n === n); G.fish.push({ n, size: Math.round(sp.min + (sp.max - sp.min) * (.35 + .09 * i)), fresh: 100 - i * 4 }); });
    CREW.length = 0; syncCrew(true); applyUi(); renderAll(); hud();
    document.querySelector('#toast').hidden = true;
  });
  await setup(page);
  await page.waitForTimeout(wait);
  await page.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.hidden = true; });
  await page.screenshot({ path: path.join(SHOTS, `phone-${file}.png`) });
  await ctx.close();
}
await browser.close();
console.log('できました:', OUT, ASSETS);
