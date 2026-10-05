// 機能ごとのシナリオテスト（開発版を使う）。仕様どおりに動くかを、1つずつ確かめる。
//   node dev/qa.mjs      … 失敗があれば、終了コード1
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
if (!process.argv.includes('--no-build')) spawnSync(process.execPath, [path.join(here, 'build-dev.mjs')], { stdio: 'ignore' });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let pass = 0; const fails = [];
const errs = [];

async function open(start = 'mid', extra = null) {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => localStorage.setItem('umikaze-fishery-dev-v1', JSON.stringify({ v: 1, seen: 1 })));
  await page.goto('file://' + path.join(here, 'dist/index.html'));
  await page.waitForFunction(() => window.Admin);
  await page.evaluate(([k, ex]) => {
    window.closeModals = () => { document.getElementById('veil').hidden = true };
    applySave(Admin.makeState(Admin.PRE[k]), 'qa');
    G.tk = { auto: 5, meal: 5 }; closeModals();
    if (ex) new Function('return (' + ex + ')')()();
    hud(); renderAll();
  }, [start, extra]);
  await page.waitForTimeout(150);
  return page;
}
async function t(name, startOrFn, fn) {
  const page = typeof startOrFn === 'string' ? await open(startOrFn) : await open('mid');
  const body = typeof startOrFn === 'string' ? fn : startOrFn;
  try {
    const r = await body(page);
    if (r === true || r === undefined) pass++; else { fails.push(`${name}: ${r}`); }
  } catch (e) { fails.push(`${name}: 例外 ${String(e.message).slice(0, 160)}`); }
  await page.close();
}
const ev = (p, f, a) => p.evaluate(f, a);
const eq = (a, b, msg) => (JSON.stringify(a) === JSON.stringify(b) ? true : `${msg || ''} 期待${JSON.stringify(b)} 実際${JSON.stringify(a)}`);

/* ---------- 保存・読み込み ---------- */
await t('往復保存で、すべての新しい項目が残る', 'all', async p => {
  const r = await ev(p, () => { const a = JSON.parse(JSON.stringify(G)), b = migrate(JSON.parse(JSON.stringify(G))); const keys = ['cr', 'fu', 'ach', 'tech', 'br', 'rep', 'pets', 'deco', 'bt', 'farm', 'proc', 'prod', 'rv', 'msn', 'hist', 'stat', 'alloc']; return keys.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])) });
  return eq(r, [], '往復で変わった項目');
});
await t('古い保存データ（最小）を読み込める', async p => {
  const r = await ev(p, () => { const o = migrate({ v: 1, day: 5, money: 100, crew: 3, level: 4 }); return { cr: o.cr.length, fu: typeof o.fu, stat: Object.keys(o.stat).length, ord: Array.isArray(o.ord), hist: Array.isArray(o.hist) } });
  return eq(r, { cr: 3, fu: 'object', stat: 8, ord: true, hist: true });
});
await t('壊れた保存データはnullになる', async p => eq(await ev(p, () => [migrate(null), migrate({}), migrate({ v: 2 })]), [null, null, null]));

/* ---------- 売却・需給・直売所 ---------- */
await t('売ると需給が下がり、翌朝に半分もどる', 'mid', async p => {
  const r = await ev(p, () => { G.fish = Array.from({ length: 6 }, () => ({ n: 'アジ', size: 25, fresh: 100 })); G.lv.mkt = 0; G.sat = {}; G.stall = 0; const q = quote(G.fish.map((_, i) => i)); const s0 = q.rows[0].p, s5 = q.rows[5].p; sell(G.fish.map((_, i) => i)); const sat = G.sat['アジ']; G.min = DAY_END; S.st = 'result'; dayEnd(); return { dec: s5 < s0, sat: +sat.toFixed(3), after: +G.sat['アジ'].toFixed(3) } });
  return r.dec && r.sat === .18 && r.after === .09 ? true : JSON.stringify(r);
});
await t('直売所の枠は、レベル0だと使えず、1日で回復する', 'mid', async p => {
  const r = await ev(p, () => { G.lv.mkt = 0; const a = stallLeft(); G.lv.mkt = 2; G.stall = 0; const b = stallLeft(); G.stall = 3; const c = stallLeft(); G.min = DAY_END; S.st = 'result'; dayEnd(); return [a, b, c, G.stall] });
  return eq(r, [0, 7, 4, 0]);
});
await t('魚箱が空でも、すべて売るでエラーにならない', 'mid', async p => { await ev(p, () => { G.fish = []; openTab('sell'); document.querySelector('#sellall').disabled || document.querySelector('#sellall').click() }); return true });

/* ---------- 注文 ---------- */
await t('注文：納品で魚が減り、報酬が入り、評判が上がる', 'mid', async p => {
  const r = await ev(p, () => { G.fu.orders = 1; refreshOrders(); const o = G.ord[0]; G.fish = []; for (let i = 0; i < o.q; i++) G.fish.push({ n: o.n, size: o.sz + 1, fresh: 100, g: o.g === undefined ? 0 : o.g }); const m0 = G.money, r0 = G.rep; deliver(o.id); return { gone: G.fish.length, paid: G.money > m0, rep: G.rep > r0, left: G.ord.some(x => x.id === o.id), done: G.orderDone } });
  return r.gone === 0 && r.paid && r.rep && !r.left && r.done >= 1 ? true : JSON.stringify(r);
});
await t('注文：条件に足りない魚（小さい・鮮度）では納品できない', 'mid', async p => {
  const r = await ev(p, () => { G.fu.orders = 1; refreshOrders(); const o = G.ord[0]; G.fish = []; for (let i = 0; i < o.q; i++) G.fish.push({ n: o.n, size: o.sz - 1, fresh: 100 }); const a = G.ord.length; deliver(o.id); const b = G.ord.length; G.fish = G.fish.map(f => ({ ...f, size: o.sz + 5, fresh: o.fr - 5 })); deliver(o.id); return [a, b, G.ord.length] });
  return r[0] === r[1] && r[1] === r[2] ? true : JSON.stringify(r);
});
await t('注文：すべて売るで、注文用の魚は残る（魚箱の半分まで）', 'mid', async p => {
  const r = await ev(p, () => { G.fu.orders = 1; refreshOrders(); const o = G.ord[0]; G.fish = []; for (let i = 0; i < o.q; i++) G.fish.push({ n: o.n, size: o.sz + 1, fresh: 100, g: o.g === 1 ? 1 : 0 }); G.fish.push({ n: 'イワシ', size: 12, fresh: 100 }); const rsv = reservedIdx(); return { rsv: rsv.size, cap: cap(), q: o.q } });
  return r.rsv === Math.min(r.q, Math.floor(r.cap / 2)) ? true : JSON.stringify(r);
});
await t('注文：期限切れは翌々日に消えて、補充される', 'mid', async p => {
  const r = await ev(p, () => { G.fu.orders = 1; G.ord = []; G.ordSeq = 0; refreshOrders(); const u = G.ord[0].until; G.day = u + 1; refreshOrders(); return { expiredGone: !G.ord.some(o => o.until === u), n: G.ord.length === ordMax() } });
  return r.expiredGone && r.n ? true : JSON.stringify(r);
});

/* ---------- 経営：銀行・保険・維持費 ---------- */
await t('銀行：借入上限を超えて借りられない／返済は所持金まで', 'mid', async p => {
  const r = await ev(p, () => { G.fu.bank = 1; openTab('town'); const lim = loanLimit(); G.debt = lim; const left = loanAvail(); G.money = 100; renderAll(); document.querySelector('[data-repay="all"]').click(); return { left, lim, debt: G.debt, money: G.money } });
  return r.left === 0 && r.money === 0 && r.debt === r.lim - 100 ? true : JSON.stringify(r);
});
await t('利息：払えない分は借入に上乗せされ、お金はマイナスにならない', 'mid', async p => {
  const r = await ev(p, () => { G.debt = 1e6; G.money = 10; G.min = DAY_END; S.st = 'result'; dayEnd(); return { money: G.money, debt: G.debt } });
  return r.money >= 0 && r.debt > 1e6 ? true : JSON.stringify(r);
});
await t('保険：加入中は修理費がかからない／未加入は払う', 'mid', async p => {
  const r = await ev(p, () => { G.fu.bank = 1; G.boat = 2; G.ins = 0; G.money = 1e6; G.fix = repairCost(); const rc = repairCost(), m0 = G.money; G.min = DAY_END; S.st = 'result'; dayEnd(); const paid = m0 - G.money; G.fix = repairCost(); G.ins = 1; S.st = 'result'; G.home = 0; const m1 = G.money; dayEnd(); const paid2 = m1 - G.money; return { paid, paid2, rc, ins: premium() } });
  return r.paid >= r.rc && r.paid2 < r.rc ? true : JSON.stringify(r);
});

/* ---------- 加工・養殖 ---------- */
await t('加工：加工賃を払い、夜を越すと加工品になり、売れる', 'mid', async p => {
  const r = await ev(p, () => { G.fu.plant = 1; G.fac.plant = 2; G.fish = [{ n: 'タイ', size: 50, fresh: 100 }]; G.money = 1e6; startProc(0, 1); const inProc = G.proc.length; G.min = DAY_END; S.st = 'result'; dayEnd(); sleep(); G.min = DAY_END; S.st = 'result'; dayEnd(); sleep(); const prod = G.prod.length; const m0 = G.money; sellProd(); return { inProc, prod, gain: G.money > m0, left: G.prod.length } });
  return r.inProc === 1 && r.prod === 1 && r.gain && r.left === 0 ? true : JSON.stringify(r);
});
await t('加工：枠がいっぱいなら加工できない／レベルが足りない缶詰は不可', 'mid', async p => {
  const r = await ev(p, () => { G.fu.plant = 1; G.fac.plant = 1; G.money = 1e6; G.fish = Array.from({ length: 6 }, () => ({ n: 'アジ', size: 25, fresh: 100 })); startProc(0, 1); const a = G.proc.length; for (let i = 0; i < 5; i++) startProc(0, 0); return { canned: a, total: G.proc.length, cap: plantCap(1) } });
  return r.canned === 0 && r.total === r.cap ? true : JSON.stringify(r);
});
await t('養殖：大きくなり、魚箱がいっぱいなら引き上げられない', 'mid', async p => {
  const r = await ev(p, () => { G.fu.farm = 1; G.fac.farm = 1; G.fish = [{ n: 'アジ', size: 16, fresh: 100 }]; startFarm(0); growFarm(); growFarm(); const grew = G.farm[0].sz > 16; G.fish = Array.from({ length: cap() }, () => ({ n: 'イワシ', size: 12, fresh: 100 })); harvestFarm(0); return { grew, stay: G.farm.length === 1, len: G.fish.length <= cap() } });
  return r.grew && r.stay && r.len ? true : JSON.stringify(r);
});

/* ---------- 従業員 ---------- */
await t('従業員：雇用・上限・経験者・辞める', 'mid', async p => {
  const r = await ev(p, () => { G.fu.hireX = 1; G.fu.roles = 1; G.money = 1e9; openTab('home'); const n0 = G.crew; const max = crewMax(); while (G.crew < max) { const b = document.querySelector('[data-crew]'); if (!b || b.disabled) break; b.click() } const full = G.crew === max; const before = G.crew; document.querySelectorAll('[data-hire]').forEach(b => { if (!b.disabled) b.click() }); const cantOver = G.crew === before; const names = new Set(G.cr.map(m => m.n)).size; const lenOk = G.cr.length === G.crew; return { full, cantOver, lenOk, uniq: names >= Math.min(G.crew, 20) - 3 } });
  return r.full && r.cantOver && r.lenOk ? true : JSON.stringify(r);
});
await t('従業員：営業の売値ボーナスは上限15%', 'mid', async p => eq(await ev(p, () => { G.fu.roles = 1; G.crew = 20; normCrew(); G.cr.forEach(m => { m.r = 1; m.x = 999; m.t = 5 }); return +salesBonus().toFixed(3) }), .15));
await t('従業員：昇進で給料が増え、Lv8が上限', 'mid', async p => {
  const r = await ev(p, () => { const m = { n: 'x', r: 0, x: 0, t: 5 }; const w1 = wageOf(m); m.x = 99999; return { lv: clv(m), max: CLVX.length, up: wageOf(m) > w1 } });
  return r.lv === r.max && r.up ? true : JSON.stringify(r);
});

/* ---------- ステータス（8つ） ---------- */
await t('ステータス：BPの振り分けと、振り直しが一致する', 'mid', async p => {
  const r = await ev(p, () => { const total = () => G.bp + Object.values(G.alloc).reduce((a, v) => a + v, 0); const t0 = total(); G.bp = Math.max(G.bp, 30); const t1 = total(); openTab('stat'); ['foc', 'biz', 'lead', 'str'].forEach(k => document.querySelector(`[data-st="${k}"]`).click()); const t2 = total(); document.getElementById('stReset').click(); return { same: t1 === t2, back: G.bp === t1 && Object.values(G.alloc).every(v => v === 0) } });
  return r.same && r.back ? true : JSON.stringify(r);
});
await t('ステータス：商才・統率力・集中力が効果に反映される', 'mid', async p => {
  const r = await ev(p, () => { const base = { sell: price({ n: 'アジ', size: 25, fresh: 100 }), foc: fightEnv().foc }; G.stat.biz = 50; G.stat.foc = 30; G.stat.lead = 50; return { sellUp: price({ n: 'アジ', size: 25, fresh: 100 }) > base.sell, foc: fightEnv().foc === 29, lead: fishMul({ r: 0, x: 0, t: 5 }) > 1.15 } });
  return r.sellUp && r.foc && r.lead ? true : JSON.stringify(r);
});
await t('ステータス：レベルアップで8つとも増え、合計は3以上', 'blank', async p => {
  const r = await ev(p, () => { const s0 = Object.values(G.stat).reduce((a, v) => a + v, 0); G.exp = expNeed(G.level) - 1; addExp(5); const s1 = Object.values(G.stat).reduce((a, v) => a + v, 0); return { d: s1 - s0, lv: G.level } });
  return r.d >= 3 && r.lv === 2 ? true : JSON.stringify(r);
});

/* ---------- 段階解放 ---------- */
await t('段階解放：未解放の機能は、画面に出ず、効果もない', 'blank', async p => {
  const r = await ev(p, () => { G.fu = {}; G.fuInit = 1; G.level = 1; G.boat = 0; openTab('sell'); const s = document.getElementById('p-sell').innerText; openTab('town'); const tn = document.getElementById('p-town').innerText; return { orders: s.includes('注文'), report: s.includes('経営'), bank: tn.includes('借入残高'), tour: tn.includes('釣り大会'), season: inSeason(SP[0]), tide: tideNow(), tourDay: isTourDay() } });
  return Object.values(r).every(v => v === false) ? true : JSON.stringify(r);
});
await t('段階解放：条件を満たすと解放され、バナーが出る', 'blank', async p => {
  const r = await ev(p, () => { G.fu = {}; G.fuInit = 1; G.level = 5; hud(); return { orders: feat('orders'), ach: feat('ach'), bank: feat('bank'), banner: document.getElementById('banner').className } });
  return r.orders && r.ach && !r.bank && r.banner.includes('show') ? true : JSON.stringify(r);
});
await t('段階解放：解放済みの機能は、条件を下回っても残る', 'mid', async p => eq(await ev(p, () => { G.fu.orders = 1; G.level = 1; hud(); return feat('orders') }), true));

/* ---------- 釣り大会・ライバル ---------- */
await t('釣り大会：参加費・得点・順位・賞金・二重精算なし', 'mid', async p => {
  const r = await ev(p, () => { G.fu.tour = 1; G.day = 14; G.home = 0; G.money = 1e7; G.area = 1; tourEnter(); const fee = G.led.fee; const sp = SP.find(s => s.n === 'タイ'); const fi = { n: 'タイ', size: 70, fresh: 100 }; tourScore(fi, sp); const boss = bossOf(1); tourScore({ n: boss.n, size: 150, fresh: 100 }, boss); const best = G.tour.best, exp = price(fi, 0); const m0 = G.money; G.min = DAY_END; S.st = 'result'; dayEnd(); const n1 = G.tourN; const last = G.tourLast; const again = tourSettle(); return { fee: fee > 0, best: best === exp, settled: !!last, again, n: n1 } });
  return r.fee && r.best && r.settled && r.again === null ? true : JSON.stringify(r);
});
await t('釣り大会：開催日以外・夜は参加できない／二重参加できない', 'mid', async p => {
  const r = await ev(p, () => { G.fu.tour = 1; G.day = 13; const a = (tourEnter(), tourIn()); G.day = 14; G.home = 1; tourEnter(); const b = tourIn(); G.home = 0; tourEnter(); const fee1 = G.led.fee; tourEnter(); return { a, b, once: G.led.fee === fee1 && G.tourN === 1 } });
  return !r.a && !r.b && r.once ? true : JSON.stringify(r);
});
await t('ライバル：週の最終日にだけ精算され、スコアがリセットされる', 'mid', async p => {
  const r = await ev(p, () => { G.fu.tour = 1; G.day = 10; G.min = DAY_END; S.st = 'result'; dayEnd(); const mid = G.rv.sc.some(v => v > 0); G.day = 14; G.home = 0; S.st = 'result'; G.min = DAY_END; dayEnd(); return { mid, reset: G.rv.sc.every(v => v === 0), last: !!G.rv.last } });
  return r.mid && r.reset && r.last ? true : JSON.stringify(r);
});

/* ---------- 実績・ミッション・できごと ---------- */
await t('実績：報酬は1回だけ', 'mid', async p => {
  const r = await ev(p, () => { G.fu.ach = 1; hud(); const bp1 = G.bp, tk1 = G.tk.auto; hud(); hud(); return G.bp === bp1 && G.tk.auto === tk1 });
  return r;
});
await t('ミッション：日付が変わるとリセット／達成は1回だけ', 'mid', async p => {
  const r = await ev(p, () => { G.fu.missions = 1; G.day = 20; G.msn = { day: 0, items: [] }; ensureMissions(); const items = G.msn.items.length; G.msn.items.forEach(m => dcAdd(m.k, m.t)); hud(); const bp1 = G.bp, a1 = G.tk.auto, d1 = G.msnDone; hud(); const same = G.bp === bp1 && G.tk.auto === a1 && G.msnDone === d1; G.day = 21; ensureMissions(); return { items, same, reset: G.msn.items.every(m => !m.done) && Object.keys(G.dc).length === 0 } });
  return r.items === 3 && r.same && r.reset ? true : JSON.stringify(r);
});
await t('できごと：未解放では起きず、解放後は5種類のどれか', 'mid', async p => {
  const r = await ev(p, () => { G.fu.events = 0; delete G.fu.events; let n = 0; for (let i = 0; i < 300; i++) { G.day = 10; rollEvent(); if (G.ev) n++ } G.fu.events = 1; const seen = new Set(); for (let i = 0; i < 600; i++) { G.day = 10; rollEvent(); if (G.ev) seen.add(G.ev) } return { locked: n, seen: seen.size } });
  return r.locked === 0 && r.seen === 5 ? true : JSON.stringify(r);
});

/* ---------- 季節・天気・潮・エサ ---------- */
await t('季節：12日ごとに変わり、旬は売値+15%', 'mid', async p => {
  const r = await ev(p, () => { G.fu.season = 1; const seasons = [1, 12, 13, 24, 25, 36, 37, 48, 49].map(d => { G.day = d; return seasonOf() }); G.day = 1; const sp = SP.find(s => seasonOfSp(s) === seasonOf() && !s.boss); const f = { n: sp.n, size: sp.min, fresh: 100 }; const a = price(f); G.fu.season = 0; const b = price(f); return { seasons, ratio: +(a / b).toFixed(2) } });
  return eq(r.seasons, [0, 0, 1, 1, 2, 2, 3, 3, 0]) === true && r.ratio >= 1.1 && r.ratio <= 1.2 ? true : JSON.stringify(r);
});
await t('潮：満潮の時間帯のみ有効（境界）', 'mid', async p => {
  const r = await ev(p, () => { G.fu.tide = 1; G.home = 0; const h = tideStartH(); return [h * 60 - 1, h * 60, h * 60 + 119, h * 60 + 120].map(m => { G.min = m; return tideNow() }) });
  return eq(r, [false, true, true, false]);
});
await t('エサ：在庫が減り、なくなると外れる／好物が出やすい', 'mid', async p => {
  const r = await ev(p, () => { G.fu.bait = 1; G.bt.worm = 1; G.baitSel = 'worm'; G.home = 0; S.st = 'idle'; G.fish = []; press(); const used = G.bt.worm === 0 && S.bk === 'worm'; S.st = 'idle'; press(); const none = S.bk === null; let a = 0, b = 0; for (let i = 0; i < 3000; i++) { if (baitOf(pickSpecies(0, 'worm')).k === 'worm') a++; if (baitOf(pickSpecies(0, null)).k === 'worm') b++ } return { used, none, more: a > b * 1.4 } });
  return r.used && r.none && r.more ? true : JSON.stringify(r);
});

/* ---------- 料理 ---------- */
await t('料理：図鑑の種類が足りない料理は食べられない', 'mid', async p => {
  const r = await ev(p, () => { G.dex = {}; G.tk.meal = 9; G.money = 1e6; G.meal = null; eat(12, true); const locked = G.meal === null; eat(0, true); const ok = G.meal && G.meal.n === '海鮮定食'; return { locked, ok } });
  return r.locked && r.ok ? true : JSON.stringify(r);
});
await t('料理：図鑑が増えるとメニューが増える', 'mid', async p => {
  const r = await ev(p, () => { G.dex = {}; const a = menuOpen().length; NORM.slice(0, 20).forEach(s => G.dex[s.n] = { c: 1, best: s.max, min: s.min }); const b = menuOpen().length; NORM.forEach(s => G.dex[s.n] = { c: 1, best: s.max, min: s.min }); return [a, b, menuOpen().length === MENU.length] });
  return r[0] === 1 && r[1] > r[0] && r[2] ? true : JSON.stringify(r);
});

/* ---------- ペット・模様替え・宝箱 ---------- */
await t('ペット：お金が足りないと買えない／連れ替えができる', 'mid', async p => {
  const r = await ev(p, () => { G.fu.pet = 1; G.money = 10; openTab('town'); const b = document.querySelector('[data-pet="cat"]'); const dis = b.disabled; G.money = 1e7; hud(); renderAll(); document.querySelector('[data-pet="cat"]').click(); document.querySelector('[data-pet="gull"]').click(); document.querySelector('[data-pet="cat"]').click(); return { dis, pet: G.pet, own: Object.keys(G.pets).length } });
  return r.dis && r.pet === 'cat' && r.own === 2 ? true : JSON.stringify(r);
});
await t('宝箱：未解放では出ない', 'mid', async p => eq(await ev(p, () => { delete G.fu.treasure; const t0 = G.treasure; for (let i = 0; i < 2000; i++) treasureRoll(); return G.treasure === t0 }), true));

/* ---------- 海域・船・主 ---------- */
await t('新しい海域：全10海域で、魚が釣れ、主が出て、画面が描ける', 'all', async p => {
  const r = await ev(p, () => { const bad = []; for (let a = 0; a < AREAS.length; a++) { G.area = a; if (!bossOf(a)) bad.push('主なし' + a); if (areaSp(a).length < 7) bad.push('魚少' + a); for (let i = 0; i < 40; i++) { const s = pickSpecies(a); if (s.a !== a) bad.push('別海域' + a) } try { draw(0); drawHome(0) } catch (e) { bad.push('描画' + a + e.message) } } return bad });
  return eq(r, [], '問題');
});
await t('船・コンプ・主の祝い金の配列が、海域の数と一致', 'mid', async p => eq(await ev(p, () => [BOATS.length, COMP.length, BOSSB.length, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every(i => { G.boat = i; return Number.isFinite(mealBase()) && Number.isFinite(upkeepCost()) }), AREAS.length]), [9, 10, 10, true, 10]));
await t('全魚種に、絵（体色または絵文字）と、正しいサイズ・値段がある', 'mid', async p => {
  const r = await ev(p, () => SP.filter(s => !(s.d || s.e) || !(s.min > 0 && s.max > s.min) || !(s.p > 0) || !(s.s > 0) || (!s.boss && !(s.w > 0))).map(s => s.n));
  return eq(r, []);
});
await t('魚の名前が重複しない', 'mid', async p => eq(await ev(p, () => { const n = SP.map(s => s.n); return n.filter((x, i) => n.indexOf(x) !== i) }), []));
await t('主に挑戦して、診断（目安）がエラーなく出る', 'all', async p => { await ev(p, () => { for (let a = 0; a < 10; a++) { showBossAdvice(a, 0); closeModals() } }); return true });

/* ---------- 戦闘の物理 ---------- */
await t('戦闘：どの魚・サイズでも、必ず決着する（上限時間内）', 'all', async p => {
  const r = await ev(p, () => { const E = fightEnv(); const bad = []; for (const sp of SP) { for (const size of [sp.min, Math.round((sp.min + sp.max) / 2), sp.max]) { const f = newFight(sp, size); let t = 0, res = 0, hist = []; while (!res && t < 600) { hist.push(f.struggle); const seen = hist.length > 27 ? hist[hist.length - 28] : false; res = stepFight(f, !seen && f.tens < 58, 1 / 60, sp, E); t += 1 / 60 } if (!res) bad.push(sp.n + size) } } return bad });
  return eq(r, [], '決着しない');
});

/* ---------- 日付・時刻・留守 ---------- */
await t('夜の流れ：dayEnd→sleepで日付が進み、時刻が6:00に戻る', 'mid', async p => {
  const r = await ev(p, () => { const d = G.day; G.min = DAY_END; S.st = 'result'; dayEnd(); const home = G.home; document.getElementById('nextday').click(); sleep(); return { home, day: G.day === d + 1, min: G.min, h: G.home } });
  return r.home === 1 && r.day && r.min === 360 && r.h === 0 ? true : JSON.stringify(r);
});
await t('留守の水揚げ：8時間が上限・お金がマイナスにならない', 'mid', async p => {
  const r = await ev(p, () => { G.money = 0; G.lastSeen = Date.now() - 100 * 3600e3; offlineGain(); const a = G.money; closeModals(); return { a: a >= 0, modal: true } });
  return r.a ? true : JSON.stringify(r);
});
await t('おまかせ釣り：5回ぶん進み、券が減り、時刻が進む', 'mid', async p => {
  const r = await ev(p, () => { G.home = 0; G.min = 360; S.st = 'idle'; G.fish = []; G.ach = Object.fromEntries(ACH.map(a => [a.id, 1])); G.msn = { day: G.day, items: [], bonus: 1 }; G.tk.auto = 3; autoFish(1); const used = 3 - G.tk.auto; const adv = G.min - 360; closeModals(); return { used, adv, want: 5 * ATTEMPT_MIN } });
  return r.used === 1 && r.adv === r.want ? true : JSON.stringify(r);
});
await t('通常の釣り：夜（home）は投げられない', 'mid', async p => eq(await ev(p, () => { G.home = 1; S.st = 'idle'; press(); return S.st }), 'idle'));

/* ---------- 二重処理・状態遷移 ---------- */
await t('夜：dayEndを続けて2回呼んでも、給料・維持費が二重に引かれない', 'mid', async p => {
  const r = await ev(p, () => { G.money = 5e6; G.min = DAY_END; S.st = 'result'; dayEnd(); const m1 = G.money, led1 = JSON.stringify(G.led); dayEnd(); return { same: G.money === m1, led: JSON.stringify(G.led) === led1 } });
  return r.same && r.led ? true : JSON.stringify(r);
});
await t('夜：sleepを続けて2回呼んでも、日付が2日進まない', 'mid', async p => {
  const r = await ev(p, () => { const d = G.day; G.min = DAY_END; S.st = 'result'; dayEnd(); sleep(); const d1 = G.day; sleep(); return { d1: d1 - d, d2: G.day - d } });
  return r.d1 === 1 && r.d2 === 1 ? true : JSON.stringify(r);
});
await t('売る・納品・加工・養殖を、同じ魚で連続操作しても、魚が増えない', 'mid', async p => {
  const r = await ev(p, () => { G.fu.orders = 1; G.fu.plant = 1; G.fu.farm = 1; G.fac.plant = 3; G.fac.farm = 2; G.money = 1e7; G.fish = Array.from({ length: 6 }, () => ({ n: 'アジ', size: 25, fresh: 100 })); const n0 = G.fish.length; startFarm(0); startProc(0, 0); sell([0]); const total = G.fish.length + G.farm.length + G.proc.length; return { n0, total, fish: G.fish.length } });
  return r.total === r.n0 - 1 ? true : JSON.stringify(r);
});

/* ---------- レビューで見つかった不具合の再発防止 ---------- */
await t('18時を過ぎたまま保存→読み込みで、夜の精算がされる', 'mid', async p => {
  const r = await ev(p, () => { const o = JSON.parse(JSON.stringify(G)); o.min = DAY_END; o.home = 0; o.fish = [{ n: 'アジ', size: 25, fresh: 100 }]; o.money = 5e6; o.led = {}; const m0 = o.money; applySave(migrate(o), 'qa'); closeModals(); return { home: G.home, wage: (G.led.wage || 0) > 0, paid: G.money < m0 + 1e6 } });
  return r.home === 1 && r.wage ? true : JSON.stringify(r);
});
await t('大会・エサ・ライバルの基準は、海域を切り替えても変わらない', 'late', async p => {
  const r = await ev(p, () => { G.area = 0; const a = [tourBase(), tourFee(), baitPack(BAITS[0])]; G.area = G.boat; const b = [tourBase(), tourFee(), baitPack(BAITS[0])]; return [JSON.stringify(a) === JSON.stringify(b), a] });
  return r[0] ? true : JSON.stringify(r);
});
await t('帰港：釣った直後（結果画面）でも、残り時間ぶんの水揚げが入る', 'mid', async p => {
  const r = await ev(p, () => { let idle = 0, res = 0; for (let k = 0; k < 40; k++) { G.home = 0; G.min = 400; G.led = {}; G.crewToday = 0; S.st = 'idle'; document.getElementById('home').click(); idle += G.led.crew || 0; closeModals(); sleep(); } for (let k = 0; k < 40; k++) { G.home = 0; G.min = 400; G.led = {}; G.crewToday = 0; S.st = 'result'; document.getElementById('home').click(); res += G.led.crew || 0; closeModals(); sleep(); } return { idle, res } });
  return r.res > r.idle * .5 && r.res > 0 ? true : JSON.stringify(r);
});
await t('おまかせ釣りの捕獲が、ミッション（釣る・レア）に数えられる', 'mid', async p => {
  const r = await ev(p, () => { G.home = 0; G.min = 360; S.st = 'idle'; G.fish = []; G.dc = {}; G.tk.auto = 3; autoFish(3); closeModals(); return { catch: G.dc.catch || 0, fish: G.fish.length } });
  return r.catch === r.fish && r.catch > 0 ? true : JSON.stringify(r);
});
await t('釣っている間に魚箱が満杯になっても、上限を超えない', 'mid', async p => {
  const r = await ev(p, () => { G.fu.farm = 1; G.fac.farm = 1; G.home = 0; S.st = 'idle'; G.fish = Array.from({ length: cap() - 1 }, () => ({ n: 'イワシ', size: 12, fresh: 100 })); G.farm = [{ n: 'アジ', sz: 20 }]; press(); harvestFarm(0); const refused = G.farm.length === 1; S.sp = SP.find(s => s.n === 'アジ'); S.size = 22; S.st = 'fight'; landed(); closeModals(); return { refused, len: G.fish.length, cap: cap() } });
  return r.refused && r.len <= r.cap ? true : JSON.stringify(r);
});
await t('実績：★5と表示されるサイズ（比0.8以上）で、大物ハンターが解除される', 'mid', async p => {
  const r = await ev(p, () => { G.fu.ach = 1; G.ach = {}; G.dex = {}; const sp = SP.find(s => s.n === 'イワシ'); const sz = Math.ceil(sp.min + .8 * (sp.max - sp.min)); G.dex[sp.n] = { c: 1, best: sz, min: sz }; hud(); return { stars: stars(sp, sz), got: !!G.ach.big } });
  return r.stars === '★★★★★' && r.got ? true : JSON.stringify(r);
});
await t('鮮度は小数の誤差が出ない／留守の時間表示が「60分」にならない', 'mid', async p => {
  const r = await ev(p, () => { G.fish = [{ n: 'アジ', size: 25, fresh: 100 }]; G.tech.cold = 1; G.lv.cool = 5; for (let i = 0; i < 3; i++) { G.home = 0; G.min = DAY_END; S.st = 'result'; dayEnd(); closeModals(); sleep() } const f = G.fish[0] ? G.fish[0].fresh : 0; G.lastSeen = Date.now() - (3600e3 + 59 * 60e3 + 50e3); G.money = 1e6; offlineGain(); const txt = document.getElementById('box').innerText; closeModals(); return { f, dec: String(f).length <= 5, min60: /60分/.test(txt) } });
  return r.dec && !r.min60 ? true : JSON.stringify(r);
});
await t('画面に戻ったとき、15分以上たっていれば留守の水揚げが入る', 'mid', async p => {
  const r = await ev(p, () => { G.crew = 5; normCrew(); closeModals(); S.st = 'idle'; G.lastSeen = Date.now() - 5 * 3600e3; const m0 = G.money; Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); const shown = !document.getElementById('veil').hidden; return { shown, gain: G.money !== m0 } });
  return r.shown ? true : JSON.stringify(r);
});

await t('養殖：入れて出しても、鮮度は戻らない', 'mid', async p => {
  const r = await ev(p, () => { G.fu.farm = 1; G.fac.farm = 2; G.fish = [{ n: 'タイ', size: 50, fresh: 3 }]; startFarm(0); harvestFarm(0); return G.fish[0] ? G.fish[0].fresh : null });
  return r === 3 ? true : JSON.stringify(r);
});
await t('保険：故障が起きたあとに加入しても、その故障は補償されない', 'mid', async p => {
  const r = await ev(p, () => { G.fu.bank = 1; G.boat = 2; G.money = 1e6; G.ins = 1; G.fix = repairCost(); G.fixIns = 0; const m0 = G.money; G.min = DAY_END; S.st = 'result'; dayEnd(); return { paid: m0 - G.money, rc: repairCost(), fix: G.fix } });
  return r.paid >= r.rc && r.fix === 0 ? true : JSON.stringify(r);
});
await t('払えない給料は、借入に回る（帳消しにならない）', 'mid', async p => {
  const r = await ev(p, () => { G.money = 0; G.debt = 0; G.min = DAY_END; S.st = 'result'; dayEnd(); return { debt: G.debt, money: G.money, wage: G.led.wage } });
  return r.money === 0 && r.debt >= r.wage && r.wage > 0 ? true : JSON.stringify(r);
});
await t('役割の変更は、あしたの朝から有効', 'mid', async p => {
  const r = await ev(p, () => { G.fu.roles = 1; G.crew = 3; normCrew(); G.cr.forEach(m => { m.r = 0; delete m.nr }); openTab('home'); document.querySelector('[data-role="0"]').click(); const now = G.cr[0].r, pend = G.cr[0].nr; G.min = DAY_END; S.st = 'result'; dayEnd(); closeModals(); sleep(); return { now, pend, after: G.cr[0].r, cleared: G.cr[0].nr === undefined } });
  return r.now === 0 && r.pend === 1 && r.after === 1 && r.cleared ? true : JSON.stringify(r);
});
await t('相棒の付け替えは、1日1回まで', 'mid', async p => {
  const r = await ev(p, () => { G.fu.pet = 1; G.money = 1e9; G.pets = {}; G.pet = ''; G.petDay = 0; openTab('town'); document.querySelector('[data-pet="cat"]').click(); document.querySelector('[data-pet="gull"]').click(); const a = G.pet; G.day++; renderAll(); document.querySelector('[data-pet="gull"]').click(); return { a, b: G.pet } });
  return r.a === 'cat' && r.b === 'gull' ? true : JSON.stringify(r);
});

/* ---------- 次の目標 ---------- */
await t('次の目標：最大3つ、すぐできることが先、どの状態でもエラーなし', async p => {
  const r = await ev(p, () => { const out = []; for (const k of ['blank', 'early', 'mid', 'late', 'all']) { applySave(Admin.makeState(Admin.PRE[k]), 'qa'); closeModals(); const gl = goalList(); out.push([k, gl.length <= 3, gl.every((x, i) => i === 0 || gl[i - 1].p <= x.p), gl.every(x => x.t && !/NaN|undefined/.test(x.t))]) } return out });
  const bad = r.filter(x => !(x[1] && x[2] && x[3]));
  return bad.length ? JSON.stringify(bad) : true;
});
await t('次の目標：船を買えるときに知らせ、ボタンで該当タブへ移動する', 'mid', async p => {
  const r = await ev(p, () => { G.money = BOATS[G.boat].c + 1; G.home = 0; openTab('fish'); const txt = document.getElementById('nextgoals').innerText; const btn = [...document.querySelectorAll('#nextgoals [data-gtab]')].find(b => /買えます/.test(b.textContent)); btn && btn.click(); return { has: /買えます/.test(txt), tab: curTab } });
  return r.has && r.tab === 'home' ? true : JSON.stringify(r);
});
await t('次の目標：夜は「休もう」が最優先', 'mid', async p => eq(await ev(p, () => { G.home = 1; return goalList()[0].t.includes('夜') }), true));

/* ---------- 色違い ---------- */
await t('色違い：全魚種で、元と違う色の絵になり、同じ種はいつも同じ色', 'mid', async p => {
  const r = await ev(p, () => { const bad = []; for (const s of NORM) { const v = vSp(s), v2 = vSp(s); if (v !== v2) bad.push('不安定' + s.n); if (s.d && JSON.stringify(v.d) === JSON.stringify(s.d)) bad.push('同色' + s.n); if (!s.d && !v.vf) bad.push('絵文字フィルタなし' + s.n); if (!icon(v) || icon(v) === icon(s)) bad.push('アイコン' + s.n) } return bad });
  return eq(r, [], '問題');
});
await t('色違い：売値4倍・経験値2倍、確率は1.2%〜4%', 'mid', async p => {
  const r = await ev(p, () => { const a = price({ n: 'アジ', size: 25, fresh: 100 }), b = price({ n: 'アジ', size: 25, fresh: 100, v: 1 }); const sp = SP.find(s => s.n === 'アジ'); const e1 = expGain(sp, 25, false, false), e2 = expGain(sp, 25, false, true); G.stat.luk = 1; const c0 = variantChance(); G.stat.luk = 999; const c1 = variantChance(); return { ratio: +(b / a).toFixed(1), eratio: +(e2 / e1).toFixed(1), c0, c1 } });
  return r.ratio === 4 && r.eratio >= 1.7 && r.eratio <= 2.6 && r.c0 === .012 && r.c1 === .04 ? true : JSON.stringify(r);
});
await t('色違い：釣り上げると、魚箱・図鑑に記録され、保存しても残る', 'mid', async p => {
  const r = await ev(p, () => { G.fish = []; const sp = SP.find(s => s.n === 'タイ'); S.sp = sp; S.size = 50; S.v = 1; S.dsp = vSp(sp); S.st = 'fight'; landed(); closeModals(); const f = G.fish[G.fish.length - 1]; const o = migrate(JSON.parse(JSON.stringify(G))); return { v: f.v, name: fname(f), vc: G.dex['タイ'].vc, keep: o.fish[o.fish.length - 1].v, dexKeep: o.dex['タイ'].vc } });
  return r.v === 1 && r.name.endsWith('タイ') && r.name.length > 2 && r.vc >= 1 && r.keep === 1 && r.dexKeep >= 1 ? true : JSON.stringify(r);
});
await t('色違い：養殖・加工を通しても、色違いのまま／値段が保たれる', 'mid', async p => {
  const r = await ev(p, () => { G.fu.farm = 1; G.fac.farm = 2; G.fu.plant = 1; G.fac.plant = 2; G.money = 1e7; G.fish = [{ n: 'タイ', size: 50, fresh: 100, v: 1 }]; const base = price(G.fish[0]); startFarm(0); const inFarm = G.farm[0].v; harvestFarm(0); const back = G.fish[0].v; startProc(0, 0); return { inFarm, back, prod: G.proc[0].v > base * 1.2 } });
  return r.inFarm === 1 && r.back === 1 && r.prod ? true : JSON.stringify(r);
});
await t('色違い：おまかせ釣りでも出て、結果に表示される', 'mid', async p => {
  const r = await ev(p, () => { delete G.fu.missions; G.stat.luk = 99999; let v = 0, shown = false; for (let k = 0; k < 80 && !shown; k++) { G.home = 0; G.min = 360; S.st = 'idle'; G.fish = []; G.tk.auto = 3; autoFish(1); const txt = document.getElementById('box').innerText; if (G.fish.some(f => f.v)) { v++; shown = txt.includes('色違い') } closeModals() } return { v, shown } });
  return r.v > 0 && r.shown ? true : JSON.stringify(r);
});
await t('色違い：主には出ない', 'mid', async p => eq(await ev(p, () => { let n = 0; for (let i = 0; i < 3000; i++) { G.comp[G.area] = 1; const bs = bossOf(G.area); S.sp = bs; rollFish(); if (S.sp.boss && S.v) n++ } return n }), 0));

/* ---------- オス・メス ---------- */
await t('オスメス：釣れた魚に性別があり、図鑑に数が記録され、ペアで祝い金', 'mid', async p => {
  const r = await ev(p, () => { G.dex = {}; G.fish = []; const sp = SP.find(s => s.n === 'アジ'); const seen = new Set(); let bonus = 0; for (let i = 0; i < 40 && seen.size < 2; i++) { S.sp = sp; S.size = 22; S.v = 0; S.dsp = sp; S.g = i % 2; S.st = 'fight'; const m0 = G.money; landed(); closeModals(); seen.add(S.g); if (G.dex['アジ'].pair) { bonus = G.money - m0; break } } const d = G.dex['アジ']; return { g: d.g, pair: d.pair, bonus: bonus > 0, fishG: G.fish.every(f => f.g === 0 || f.g === 1) } });
  return r.pair === 1 && r.g[0] >= 1 && r.g[1] >= 1 && r.bonus && r.fishG ? true : JSON.stringify(r);
});
await t('オスメス：メスは売値+5%', 'mid', async p => {
  const r = await ev(p, () => { const a = price({ n: 'タイ', size: 50, fresh: 100, g: 0 }), b = price({ n: 'タイ', size: 50, fresh: 100, g: 1 }); return +(b / a).toFixed(2) });
  return r >= 1.04 && r <= 1.06 ? true : JSON.stringify(r);
});
await t('オスメス：養殖でペアから稚魚が生まれる／空きがなければ生まれない／オス同士では生まれない', 'mid', async p => {
  const r = await ev(p, () => { G.fu.farm = 1; G.fac.farm = 3; G.farm = [{ n: 'アジ', sz: 20, fr: 100, g: 0 }, { n: 'アジ', sz: 20, fr: 100, g: 1 }]; let born = 0; for (let i = 0; i < 60; i++) { G.farm = G.farm.slice(0, 2); const n0 = G.farm.length; growFarm(); if (G.farm.length > n0) born++ } const kid = G.farm[2]; G.farm = [{ n: 'アジ', sz: 20, fr: 100, g: 0 }, { n: 'アジ', sz: 20, fr: 100, g: 0 }]; let bornMM = 0; for (let i = 0; i < 60; i++) { G.farm = G.farm.slice(0, 2); const n0 = G.farm.length; growFarm(); if (G.farm.length > n0) bornMM++ } G.farm = Array.from({ length: farmCap(G.fac.farm) }, (_, i) => ({ n: 'アジ', sz: 20, fr: 100, g: i % 2 })); const full0 = G.farm.length; for (let i = 0; i < 60; i++) growFarm(); return { born, bornMM, full: G.farm.length === full0, kidOk: !kid || (kid.sz === SP.find(s => s.n === 'アジ').min && (kid.g === 0 || kid.g === 1)) } });
  return r.born > 3 && r.born < 30 && r.bornMM === 0 && r.full && r.kidOk ? true : JSON.stringify(r);
});
await t('オスメス：注文のオス/メス指定が、条件に使われる', 'mid', async p => {
  const r = await ev(p, () => { G.fu.orders = 1; G.ord = [{ id: 99, n: 'アジ', q: 1, sz: 10, fr: 50, until: G.day + 2, g: 1 }]; G.fish = [{ n: 'アジ', size: 25, fresh: 100, g: 0 }]; const a = ordMatch(G.ord[0], G.fish[0]); G.fish[0].g = 1; const b = ordMatch(G.ord[0], G.fish[0]); G.ord[0].g = undefined; G.fish[0].g = 0; const c = ordMatch(G.ord[0], G.fish[0]); let n = 0, tot = 0; for (let i = 0; i < 1500; i++) { const o = newOrder(); tot++; if (o.g !== undefined) n++ } return { a, b, c, share: +(n / tot).toFixed(2) } });
  return !r.a && r.b && r.c && r.share > .12 && r.share < .28 ? true : JSON.stringify(r);
});
await t('オスメス：古い魚（性別なし）を読み込むと、性別が付く', 'mid', async p => {
  const r = await ev(p, () => { const o = migrate({ v: 1, fish: [{ n: 'アジ', size: 20, fresh: 100 }], farm: [{ n: 'アジ', sz: 20 }] }); return [o.fish[0].g, o.farm[0].g].every(g => g === 0 || g === 1) });
  return r;
});

/* ---------- 表示 ---------- */
await t('金額表示：負数・巨大な値・小数でも崩れない', 'mid', async p => eq(await ev(p, () => [yen(0), yen(-1500), yen(1234567), yen(2.4e8), yen(1.5e9), yen(0.4)]), ['¥0', '-¥1,500'.replace('-¥', '¥-'), '¥1,234,567', '¥2.40億', '¥1.5億'.replace('1.5億', '15.0億'), '¥0']));
await t('全タブを、文字サイズ3種類・幅320pxで開いても、横スクロールしない', 'all', async p => {
  await p.setViewportSize({ width: 320, height: 700 });
  const r = await ev(p, async () => { const bad = []; for (let fs = 0; fs < 3; fs++) { G.fs = fs; applyUi(); for (const t of ['fish', 'sell', 'town', 'home', 'stat', 'dex', 'set']) { openTab(t); await new Promise(r => setTimeout(r, 40)); if (document.documentElement.scrollWidth > innerWidth + 1) bad.push(fs + ':' + t + ':' + document.documentElement.scrollWidth) } } return bad });
  return eq(r, []);
});

await browser.close();
const uniq = [...new Set(errs)];
console.log(`合格 ${pass}件 / 失敗 ${fails.length}件 / JSエラー ${uniq.length}件`);
fails.forEach(f => console.log('  ✗ ' + f));
uniq.forEach(e => console.log('  JSエラー: ' + e.slice(0, 150)));
process.exit(fails.length || uniq.length ? 1 : 0);
