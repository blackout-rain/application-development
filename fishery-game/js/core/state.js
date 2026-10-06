/* ---------- state ---------- */
const KEY = 'umikaze-fishery-v1';
const $ = s => document.querySelector(s);
const yen = n =>
  LANG === 'en'
    ? Math.abs(n) >= 1e9
      ? '¥' + (n / 1e9).toFixed(2) + 'B'
      : Math.abs(n) >= 1e8
        ? '¥' + (n / 1e6).toFixed(1) + 'M'
        : '¥' + Math.round(n).toLocaleString('en-US')
    : Math.abs(n) >= 1e8
      ? '¥' + (n / 1e8).toFixed(Math.abs(n) >= 1e9 ? 1 : 2) + '億'
      : '¥' + Math.round(n).toLocaleString('ja-JP');
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function fresh() {
  const mult = {};
  SP.forEach(s => (mult[s.n] = 1));
  return {
    v: 1,
    syncAt: 0,
    playSec: 0,
    syncSig: '',
    fs: 0,
    nudged: 0,
    tk: {auto: 0, meal: 0},
    meal: null,
    dailyNo: -1,
    streak: 0,
    autoSell: 0,
    lastSeen: 0,
    comp: {},
    bossGot: {},
    lastUp: '',
    seen: 0,
    tut: 0,
    hero: {name: '', sex: 0, set: 0},
    nr: {n: 0, pt: 0, tot: 0, lv: {sell: 0, exp: 0, cap: 0, start: 0, luck: 0}},
    leg: {},
    legLap: {},
    mute: 0,
    noFx: 0,
    noVib: 0,
    big: 0,
    diff: 1,
    home: 0,
    level: 1,
    exp: 0,
    bp: 0,
    stat: {str: 1, vit: 1, agi: 1, dex: 1, luk: 1, foc: 1, biz: 1, lead: 1},
    alloc: {str: 0, vit: 0, agi: 0, dex: 0, luk: 0, foc: 0, biz: 0, lead: 0},
    fac: {house: 0, tank: 0, trophy: 0, plant: 0, farm: 0},
    rankGot: 0,
    crewToday: 0,
    dc: {},
    msn: {day: 0, items: []},
    msnDone: 0,
    pets: {},
    pet: '',
    deco: {},
    treasure: 0,
    fu: {},
    fuInit: 0,
    farm: [],
    bt: {krill: 0, worm: 0, lure: 0, live: 0},
    baitSel: '',
    rv: {sc: [0, 0, 0, 0, 0], last: null, wins: 0},
    ins: 0,
    fix: 0,
    br: {},
    tech: {},
    rep: 0,
    tour: null,
    tourN: 0,
    tourWin: 0,
    tourLast: null,
    wx: 0,
    proc: [],
    prod: [],
    ach: {},
    borrowed: 0,
    ord: [],
    ordSeq: 0,
    orderDone: 0,
    debt: 0,
    ev: null,
    cr: [],
    led: {},
    hist: [],
    rev: {},
    sat: {},
    stall: 0,
    catches: 0,
    day: 1,
    min: 360,
    money: 500,
    earned: 0,
    lv: {rod: 0, line: 0, bait: 0, cool: 0, mkt: 0},
    boat: 0,
    crew: 0,
    area: 0,
    fish: [],
    dex: {},
    mult,
    prev: {...mult}
  };
}
function migrate(s) {
  if (!s || s.v !== 1) return null;
  const fs0 = s.fs === undefined ? (s.big ? 1 : 0) : s.fs;
  const rg = s.rankGot === undefined ? RANKS.filter(r => (s.earned || 0) >= r[0]).length - 1 : s.rankGot;
  if (s.tut === undefined) s.tut = 1;
  s.hero = Object.assign({name: '', sex: 0, set: s.hero ? 0 : 1}, s.hero); // 古いセーブは、名前なし・男・決めたあと（設定タブで変えられる）
  if (s.nr)
    s.nr = Object.assign({n: 0, pt: 0, tot: 0}, s.nr, {
      lv: Object.assign({sell: 0, exp: 0, cap: 0, start: 0, luck: 0}, s.nr.lv)
    });
  const f = fresh();
  for (const k in f) if (s[k] === undefined) s[k] = f[k];
  for (const k of ['stat', 'alloc', 'fac', 'lv', 'comp', 'bossGot', 'tk'])
    s[k] = Object.assign({}, f[k], s[k]);
  SP.forEach(x => {
    if (!(x.n in s.mult)) s.mult[x.n] = 1;
    if (!(x.n in s.prev)) s.prev[x.n] = s.mult[x.n];
  });
  Object.values(s.dex).forEach(d => {
    if (d.min === undefined) d.min = d.best;
  });
  normCrew(s);
  (s.fish || []).forEach(f => {
    if (f.g !== 0 && f.g !== 1) f.g = rndG();
  });
  (s.farm || []).forEach(f => {
    if (f.g !== 0 && f.g !== 1) f.g = rndG();
  });
  s.rankGot = rg;
  s.fs = fs0;
  return s;
}
function load() {
  try {
    return migrate(JSON.parse(localStorage.getItem(KEY)));
  } catch (e) {
    return null;
  }
}
function save() {
  try {
    G.lastSeen = Date.now();
    localStorage.setItem(KEY, JSON.stringify(G));
  } catch (e) {}
  cloudDirty();
}
let G = load() || fresh();
const cap = () => 8 + 5 * G.lv.cool + perks().cap;
const S = {leg: 0, tier: 0, st: 'idle', t: 0, sp: null, size: 0, f: null, holding: false, ok: false};
