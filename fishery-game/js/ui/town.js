/* ---------- town: 外食・切符・おまかせ釣り ---------- */
const MEAL_TURNS = 12;
// 料理は、図鑑に載った魚の種類（need）が増えるほど、メニューが増える
const MENU = [
  {
    n: T('海鮮定食'),
    need: 0,
    d: T('港の小魚を使った、ごはんとお味噌汁の定食'),
    fx: {exp: 0.15},
    cost: 1,
    tk: 1
  },
  {
    n: T('刺身盛り合わせ'),
    need: 5,
    d: T('その日に釣れた魚を、新鮮なうちに'),
    fx: {sell: 0.08},
    cost: 1.2,
    tk: 1
  },
  {
    n: T('あら汁'),
    need: 9,
    d: T('魚のあらでだしをとった、あったかい汁'),
    fx: {tens: 8, reel: 5},
    cost: 1.2,
    tk: 1
  },
  {
    n: T('スタミナ海鮮丼'),
    need: 13,
    d: T('カツオやブリがたっぷり。力がつく'),
    fx: {tens: 12, reel: 12},
    cost: 1.2,
    tk: 1
  },
  {n: T('幸運のお寿司'), need: 17, d: T('タイやヒラメ。縁起のいいひと皿'), fx: {rare: 2}, cost: 1.5, tk: 1},
  {n: T('海鮮鍋'), need: 21, d: T('深海の魚がたっぷりの寄せ鍋'), fx: {exp: 0.2, tens: 8}, cost: 2, tk: 2},
  {
    n: T('エビとカニの天ぷら'),
    need: 25,
    d: T('サクサクの衣で、高く売れそうな気がする'),
    fx: {sell: 0.12},
    cost: 2.5,
    tk: 2
  },
  {
    n: T('豪華フルコース'),
    need: 29,
    d: T('港のシェフが腕をふるうフルコース'),
    fx: {exp: 0.22, sell: 0.12, tens: 18, reel: 18, rare: 3},
    cost: 4,
    tk: 3
  },
  {
    n: T('氷海の石狩鍋'),
    need: 34,
    d: T('サケとタラの、体の芯から温まる鍋'),
    fx: {tens: 20, reel: 10, exp: 0.1},
    cost: 3,
    tk: 2
  },
  {
    n: T('サンゴ礁のシーフードカレー'),
    need: 40,
    d: T('南の島のスパイスで、巻き上げに力が入る'),
    fx: {reel: 25, rare: 1, sell: 0.05},
    cost: 3.5,
    tk: 2
  },
  {
    n: T('マグロの解体ショー定食'),
    need: 46,
    d: T('目の前で切り分ける、とびきりの一皿'),
    fx: {exp: 0.25, sell: 0.1},
    cost: 4,
    tk: 3
  },
  {
    n: T('幻の海鮮会席'),
    need: 51,
    d: T('幻の海域の魚だけで仕立てた会席'),
    fx: {exp: 0.3, sell: 0.15, rare: 4, tens: 15, reel: 15},
    cost: 6,
    tk: 3
  },
  {
    n: T('竜宮の宴'),
    need: 56,
    d: T('すべての魚に感謝する、伝説のごちそう'),
    fx: {exp: 0.35, sell: 0.2, rare: 5, tens: 25, reel: 25},
    cost: 8,
    tk: 4
  }
];
const menuOpen = () => MENU.filter(m => dexN() >= m.need);
const mealBase = () => [300, 700, 1600, 3500, 8000, 18000, 28000, 40000, 55000, 75000][G.boat];
const mealCost = m => Math.round((mealBase() * m.cost) / 10) * 10;
const autoCost = () => Math.max(100, Math.round(AVG[G.boat] / 10) * 10);
const mealTkCost = () => Math.round(mealBase() / 10) * 10;
const mealFx = k => (G.meal ? G.meal.fx[k] || 0 : 0);
function perkWithMeal() {
  const p = perks();
  p.tens += mealFx('tens') + 4 * techLv('gear');
  p.reel += mealFx('reel') + 5 * techLv('gear');
  return p;
}
function fxText(fx) {
  return [
    fx.exp && T('経験値+{1}%', [Math.round(fx.exp * 100)]),
    fx.sell && T('売値+{1}%', [Math.round(fx.sell * 100)]),
    fx.tens && T('テンション上昇-{1}%', [fx.tens]),
    fx.reel && T('巻き上げ+{1}%', [fx.reel]),
    fx.rare && T('珍しい魚が寄りやすい')
  ]
    .filter(Boolean)
    .join('・');
}
function eat(i, useTk) {
  const m = MENU[i];
  if (!m || dexN() < m.need) return;
  if (useTk) {
    if (G.tk.meal < m.tk) {
      toast(T('食事券が足りません'));
      return;
    }
    G.tk.meal -= m.tk;
  } else {
    const c = mealCost(m);
    if (G.money < c) {
      toast(T('お金が足りません'));
      return;
    }
    G.money -= c;
    led('meal', c);
  }
  G.meal = {n: m.n, fx: m.fx, left: MEAL_TURNS};
  save();
  hud();
  renderAll();
  toast(T('{1}を食べた！ {2}（{3}回）', [m.n, fxText(m.fx), MEAL_TURNS]));
  sfx(1);
}
function useMeal() {
  if (!G.meal) return;
  G.meal.left--;
  if (G.meal.left <= 0) {
    G.meal = null;
    toast(T('食事の効果が切れた。街の食堂でまた食べよう'));
  }
}
const dayNo = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
const dailyReady = () => G.dailyNo !== dayNo();
function dailyReward() {
  const st = G.dailyNo === dayNo() - 1 ? G.streak + 1 : 1;
  return {streak: st, auto: 2 + Math.min(3, Math.floor((st - 1) / 2)), meal: 1 + (st % 7 === 0 ? 1 : 0)};
}
function claimDaily() {
  if (!dailyReady()) return;
  const r = dailyReward();
  G.dailyNo = dayNo();
  G.streak = r.streak;
  G.tk.auto += r.auto;
  G.tk.meal += r.meal;
  save();
  hud();
  renderAll();
  toast(T('デイリーボーナス！ おまかせ釣り券×{1}・食事券×{2}', [r.auto, r.meal]));
  sfx(2);
}
function buyTk(kind, n) {
  const c = (kind === 'auto' ? autoCost() : mealTkCost()) * n;
  if (G.money < c) {
    toast(T('お金が足りません'));
    return;
  }
  G.money -= c;
  led('tk', c);
  G.tk[kind] += n;
  save();
  hud();
  renderAll();
}
// おまかせ釣り：券1枚で5回ぶん、釣りを自動で進める。釣れるかどうかは自分のステータスで決まる（主は出ない）
function autoFish(maxTickets) {
  if (veilOpen()) return;
  if (G.home) {
    toast(T('夜です。自宅で休もう'));
    return;
  }
  if (S.st !== 'idle') {
    toast(T('釣りの合間に使ってね'));
    return;
  }
  const left = Math.floor((DAY_END - G.min) / ATTEMPT_MIN);
  if (left <= 0) {
    toast(T('今日はもう釣りに出られません'));
    return;
  }
  if (G.tk.auto < 1) {
    toast(T('おまかせ釣り券がありません。街で買うか、デイリーボーナスで受け取ろう'));
    openTab('town');
    return;
  }
  if (G.fish.length >= cap() && !G.autoSell) {
    toast(T('魚箱がいっぱい。市場で売るか、設定で自動売却をONにしよう'));
    return;
  }
  const n = Math.min(left, Math.min(maxTickets, G.tk.auto, Math.ceil(left / 5)) * 5);
  const got = [],
    cr0 = G.crewToday,
    m0 = G.min,
    lv0 = G.level;
  let lost = 0,
    exp = 0,
    casts = 0,
    sold = 0,
    stop = '';
  for (let i = 0; i < n; i++) {
    if (G.fish.length >= cap()) {
      if (G.autoSell && G.fish.length) sold += sellCore(G.fish.map((_, i) => i));
      else {
        stop = T('魚箱がいっぱいになったので中断しました。');
        break;
      }
    }
    const sp = pickSpecies(),
      size = Math.round(
        sp.min + (sp.max - sp.min) * Math.pow(Math.random(), Math.max(0.95, 1.8 - SE.size(sx('luk'))))
      );
    const res = botFight(newFight(sp, size), sp, fightEnv()); // 食事効果が切れたら、その回から反映する
    casts++;
    G.min += ATTEMPT_MIN;
    if (res === 1) {
      const isNew = !G.dex[sp.n],
        isV = !sp.boss && Math.random() < variantChance();
      exp += expGain(sp, size, isNew, isV);
      const d = G.dex[sp.n] || (G.dex[sp.n] = {c: 0, best: 0, min: 9999});
      d.c++;
      d.best = Math.max(d.best, size);
      d.min = Math.min(d.min, size);
      const gg = rndG();
      d.g = d.g || [0, 0];
      d.g[gg]++;
      if (d.g[0] && d.g[1] && !d.pair) {
        d.pair = 1;
        const bonus = Math.round((AVG[sp.a] * 8) / 10) * 10;
        G.money += bonus;
        led('gold', bonus);
      }
      G.fish.push(Object.assign({n: sp.n, size, fresh: 100, g: gg}, isV ? {v: 1} : {}));
      G.catches++;
      dcAdd('catch', 1);
      if (tier(sp) >= 1) dcAdd('rare', 1);
      if (isV) d.vc = (d.vc || 0) + 1;
      got.push({sp, size, isNew, v: isV});
    } else lost++;
    useMeal();
  }
  const used = Math.ceil(casts / 5);
  G.tk.auto -= used;
  if (casts) crewSim(casts);
  const crewGain = G.crewToday - cr0;
  if (exp) addExp(exp);
  new Set(got.map(g => g.sp.a)).forEach(a => checkComplete(a));
  save();
  hud();
  renderAll();
  const agg = {};
  got.forEach(g => {
    const o = agg[g.sp.n] || (agg[g.sp.n] = {sp: g.sp, c: 0, best: 0, isNew: false});
    o.c++;
    o.best = Math.max(o.best, g.size);
    if (g.isNew) o.isNew = true;
  });
  const total = got.reduce((s, g) => s + price({n: g.sp.n, size: g.size, fresh: 100, v: g.v}), 0);
  const vrows = got
    .filter(g => g.v)
    .map(g =>
      T(
        '<div class="ln"><span>{1}<b>{2}{3}</b> <span class="tag" style="background:var(--accent)">色違い！</span></span><b class="num">{4}cm</b></div>',
        [ico(vSp(g.sp)), vSp(g.sp).vt.l, g.sp.n, g.size]
      )
    )
    .join('');
  const rows = Object.values(agg)
    .sort((a, b) => tier(b.sp) - tier(a.sp) || b.c - a.c)
    .map(
      o =>
        `<div class="ln"><span>${ico(o.sp)}${o.sp.n}${tag(o.sp)}${o.isNew ? T(' <span class="tag" style="background:var(--good)">新種</span>') : ''}</span><b class="num">×${o.c}　<span class="stars">${stars(o.sp, o.best)}</span></b></div>`
    )
    .join('');
  const night = G.min >= DAY_END;
  $('#box').innerHTML = T(
    '<h3>おまかせ釣り 結果</h3>\n    <div class="card" style="margin:0 0 10px"><div class="kv"><span>釣りに出た回数</span><b class="num">{1}回（{2}時間）</b><span>釣れた／逃げられた</span><b class="num">{3}匹／{4}回</b><span>魚の価値の合計</span><b class="num">{5}</b>{6}{7}<span>経験値</span><b class="num">+{8}{9}</b><span>使った切符</span><b class="num">{10}枚（残り{11}枚）</b></div></div>\n    {12}{13}{14}\n    <button class="big" id="autoOk" style="margin-top:12px">{15}</button>',
    [
      casts,
      Math.round(((casts * ATTEMPT_MIN) / 60) * 10) / 10,
      got.length,
      lost,
      yen(total),
      sold ? T('<span>自動売却</span><b class="num up">+{1}</b>', [yen(sold)]) : '',
      crewGain ? T('<span>従業員の水揚げ</span><b class="num up">+{1}</b>', [yen(crewGain)]) : '',
      exp,
      G.level > lv0 ? `（Lv.${lv0}→${G.level}）` : '',
      used,
      G.tk.auto,
      stop ? `<p style="color:var(--bad);margin:0 0 8px">${stop}</p>` : '',
      vrows,
      rows || T('<p style="color:var(--sub)">今回は1匹も釣れませんでした。</p>'),
      night ? T('夕方になった。一日を終える') : T('閉じる')
    ]
  );
  $('#veil').hidden = false;
  $('#autoOk').onclick = () => {
    $('#veil').hidden = true;
    if (night) dayEnd();
  };
}
// アプリを閉じている間も、漁師が働いて稼ぐ（最大8時間ぶん）
function offlineGain() {
  const el = Date.now() - (G.lastSeen || Date.now());
  if (!G.crew || el < 15 * 60000) return;
  const hrs = Math.min(8, el / 3600000),
    A = AREAS[G.boat];
  const gain = Math.round((CR().reduce((a, m) => a + A.base * fishMul(m), 0) * hrs) / 8),
    wage = Math.round((CR().reduce((a, m) => a + wageOf(m), 0) * hrs) / 8),
    pay = Math.min(wage, G.money + gain);
  G.money += gain - pay;
  led('crew', gain);
  led('wage', pay);
  earn(gain);
  save();
  hud();
  renderAll();
  if (veilOpen()) {
    toast(T('留守の間に、従業員が{1}を水揚げしました', [yen(gain)]));
    return;
  }
  $('#box').innerHTML = T(
    '<h3>おかえりなさい</h3><p style="margin:0 0 8px;color:var(--sub)">留守の間も、漁師たちが働いてくれました。</p>\n    <div class="card" style="margin:0 0 10px"><div class="kv"><span>留守にしていた時間</span><b class="num">{1}時間{2}分{3}</b><span>水揚げ（{4}人）</span><b class="num up">+{5}</b><span>給料</span><b class="num down">-{6}</b></div></div>\n    <button class="big" id="offOk">受け取る</button>',
    [
      Math.floor(Math.round(hrs * 60) / 60),
      Math.round(hrs * 60) % 60,
      el > 8 * 3600000 ? T('（上限8時間）') : '',
      G.crew,
      yen(gain),
      yen(pay)
    ]
  );
  $('#veil').hidden = false;
  $('#offOk').onclick = () => ($('#veil').hidden = true);
}
function renderTown() {
  const r = dailyReward(),
    ready = dailyReady();
  const meals = mealMenuHtml();
  $('#p-town').innerHTML = T(
    '{1}<h2>デイリーボーナス</h2><div class="card"><div class="kv"><span>連続ログイン</span><b class="num">{2}</b></div>\n    <button class="big" id="daily" {3}>{4}</button>\n    <div style="color:var(--sub);font-size:.78rem;margin-top:6px">毎日アプリを開くだけで、券がもらえます。連続で受け取るほど、券が増えます。</div></div>\n    {5}<h2>外食（海辺の食堂）</h2><p style="color:var(--sub);font-size:.82rem;margin:0 0 8px">外で食事を済ませると、効果が次の{6}回の釣りの間続きます。{7}</p><div class="list">{8}</div>\n    <h2>切符売り場</h2><div class="list">\n      <div class="item"><div class="t">おまかせ釣り券 <span class="num" style="color:var(--accent)">所持{9}枚</span></div><button class="buy" data-buytk="auto:1" {10}>{11}</button><div class="s">1枚で5回ぶんの釣りを自動で進めます。<br><button class="chip" data-buytk="auto:5" {12} style="margin-top:6px">5枚まとめて {13}</button></div></div>\n      <div class="item"><div class="t">食事券 <span class="num" style="color:var(--accent)">所持{14}枚</span></div><button class="buy" data-buytk="meal:1" {15}>{16}</button><div class="s">食堂でお金の代わりに使えます。</div></div></div>\n{17}\n{18}\n{19}\n{20}\n{21}\n{22}\n{23}\n{24}\n    <h2>おまかせ釣り</h2><p style="color:var(--sub);font-size:.82rem;margin:0 0 8px">券を使うと、釣りを自動で進めます。釣れるかどうかは、自分のステータスと装備で決まります。主は出ません。時間は普通に進みます。</p>\n    <div class="row" style="margin-top:0"><button class="big" id="townAuto1" style="flex:1;width:auto" {25}>5回おまかせ（券1枚）</button><button class="ghost" id="townAutoAll" {26}>残りぜんぶ</button></div>',
    [
      norenHtml(),
      ready ? T('今日受け取ると{1}日目', [r.streak]) : T('{1}日目（受け取り済み）', [G.streak]),
      ready ? '' : 'disabled',
      ready
        ? T('受け取る：おまかせ釣り券×{1}・食事券×{2}', [r.auto, r.meal])
        : T('今日は受け取り済み。また明日！'),
      feat('missions') ? msnHtml() : '',
      MEAL_TURNS,
      mealEffectHtml(),
      meals,
      G.tk.auto,
      G.money < autoCost() ? 'disabled' : '',
      yen(autoCost()),
      G.money < autoCost() * 5 ? 'disabled' : '',
      yen(autoCost() * 5),
      G.tk.meal,
      G.money < mealTkCost() ? 'disabled' : '',
      yen(mealTkCost()),
      rivalsHtml(),
      tournamentHtml(),
      branchesHtml(),
      companionsHtml(),
      labHtml(),
      baitShopHtml(),
      insuranceHtml(),
      bankHtml(),
      G.tk.auto < 1 ? 'disabled' : '',
      G.tk.auto < 1 ? 'disabled' : ''
    ]
  );
  $('#p-town').insertAdjacentHTML('beforeend', lockedHtml());
  bindTown($('#p-town'));
}
