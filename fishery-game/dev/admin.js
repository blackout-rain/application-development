/*__UMIKAZE_ADMIN__*/
// 管理者（開発）用パネル。ゲーム本体（index.html）には含まれない。開発版のビルド（dev/build-dev.mjs）だけが取り込む。
// 進行を加速して、テストやバグ探しを楽にするための道具。製品版には入れてはいけない（dev/check-prod.mjs が検査する）。
(function () {
  'use strict';
  window.__UMIKAZE_ADMIN__ = true;
  const $ = s => document.querySelector(s);
  const A = window.Admin = {
    force: null, bossAlways: false, instantBite: false, autoWin: false, noBreak: false,
    mulExp: 1, mulSell: 1, log: (window.__admEarly || []).slice(), errs: (window.__admEarly || []).length,
    ui: { tab: 'prog', lv: 30, rank: 5, sp: 0, size: 50, open: false }, seen: {}
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Math.round(n).toLocaleString('ja-JP');

  /* ---------- ログ ---------- */
  function log(kind, msg) {
    A.log.push({ t: Date.now(), day: G.day, min: G.min, kind, msg: String(msg).slice(0, 300) });
    if (A.log.length > 300) A.log.shift();
    if (kind === 'error') A.errs++;
    badge();
  }
  addEventListener('error', e => log('error', `${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
  addEventListener('unhandledrejection', e => log('error', 'Promise: ' + (e.reason && (e.reason.message || e.reason))));

  /* ---------- ゲームの関数に、ログ・テスト用の差し込みをする（本体は変更しない） ---------- */
  const wrap = (name, fn) => { const f = window[name]; if (typeof f === 'function') window[name] = function () { const r = f.apply(this, arguments); try { fn(arguments, r) } catch (e) { } return r }; };
  wrap('toast', a => log('toast', a[0]));
  wrap('banner', a => log('banner', `${a[0]} ${a[1]}`));
  wrap('landed', () => log('catch', `${S.sp.n} ${S.size}cm`));
  wrap('dayEnd', () => log('day', `${G.day}日目 終了`));
  wrap('sleep', () => log('day', `${G.day}日目 開始`));
  wrap('checkComplete', a => { if (G.comp[a[0]]) log('comp', `エリアコンプ ${AREAS[a[0]].name}`) });
  wrap('autoFish', () => log('auto', 'おまかせ釣り'));

  const _rollFish = window.rollFish;
  window.rollFish = function () {
    if (A.force) { const f = A.force; A.force = null; S.sp = f.sp; S.size = f.size; S.tier = tier(f.sp); log('admin', `指定の魚 ${f.sp.n} ${f.size}cm`); render(); return; }
    if (A.bossAlways) { const bs = bossOf(G.area); if (bs) { G.comp[G.area] = 1; S.sp = bs; S.size = Math.round(bs.min + (bs.max - bs.min) * Math.random()); S.tier = tier(bs); return; } }
    return _rollFish.apply(this, arguments);
  };
  const _fightStep = window.fightStep;
  window.fightStep = function () { if (S.f) { if (A.noBreak) S.f.tens = 0; if (A.autoWin) { S.f.prog = 100; S.holding = true; } } return _fightStep.apply(this, arguments); };
  const _press = window.press;
  window.press = function () { const r = _press.apply(this, arguments); if (A.instantBite && S.st === 'wait') S.t = .05; return r; };
  const _expGain = window.expGain; window.expGain = function () { return Math.round(_expGain.apply(this, arguments) * A.mulExp); };
  const _price = window.price; window.price = function () { return Math.round(_price.apply(this, arguments) * A.mulSell); };

  /* ---------- 不変条件の検査 ---------- */
  function check() {
    const bad = [], fin = (n, v) => { if (!Number.isFinite(v)) bad.push(`${n} が数値でない（${v}）`) };
    ['money', 'earned', 'level', 'exp', 'bp', 'day', 'min', 'catches'].forEach(k => fin(k, G[k]));
    if (G.money < 0) bad.push('money がマイナス');
    if (G.level < 1) bad.push('level が1未満');
    if (G.exp < 0 || G.exp >= expNeed(G.level) + 1) bad.push(`exp が範囲外（${G.exp}/${expNeed(G.level)}）`);
    if (G.bp < 0) bad.push('bp がマイナス');
    fin('debt', G.debt); if (G.debt < 0) bad.push('debt がマイナス');
    if (G.ev && !EVS[G.ev]) bad.push('ev（できごと）が不正');
    if (!(G.wx >= 0 && G.wx <= 2)) bad.push('wx（天気）が範囲外');
    Object.keys(G.ach || {}).forEach(k => { if (!ACH.find(z => z.id === k)) bad.push('実績 不明なID ' + k) });
    (G.ord || []).forEach(o => { if (!SP.find(s => s.n === o.n)) bad.push('注文 不明な魚 ' + o.n); if (!(o.q >= 1)) bad.push('注文 数量が不正') });
    if (G.cr && G.cr.length > G.crew) bad.push('従業員の名簿が人数より多い');
    ST.forEach(s => { fin('stat.' + s.k, G.stat[s.k]); if (G.stat[s.k] < 1) bad.push(`stat.${s.k} が1未満`); if (G.stat[s.k] - 1 < G.alloc[s.k]) bad.push(`alloc.${s.k} が合計より大きい`) });
    if (G.fish.length > cap()) bad.push(`魚箱が上限超え（${G.fish.length}/${cap()}）`);
    G.fish.forEach((f, i) => { if (!SP.find(s => s.n === f.n)) bad.push(`魚箱[${i}] 不明な魚 ${f.n}`); if (!(f.size > 0)) bad.push(`魚箱[${i}] サイズ異常`); if (!(f.fresh > 0 && f.fresh <= 100)) bad.push(`魚箱[${i}] 鮮度異常 ${f.fresh}`) });
    Object.entries(G.dex).forEach(([n, d]) => { if (!SP.find(s => s.n === n)) bad.push(`図鑑 不明な魚 ${n}`); else if (d.best < d.min) bad.push(`図鑑 ${n} 最大<最小`) });
    SP.forEach(s => { const m = G.mult[s.n]; if (!(m >= .6 && m <= 1.6)) bad.push(`相場 ${s.n} が範囲外（${m}）`) });
    if (G.boat > BOATS.length) bad.push('boat が範囲外');
    if (G.area > G.boat) bad.push('未開放の海域にいる');
    if (G.crew > crewMax()) bad.push(`crew が上限超え（${G.crew}/${crewMax()}）`);
    if (G.min < 360 || G.min > DAY_END + ATTEMPT_MIN) bad.push(`時刻が範囲外（${G.min}）`);
    if (G.rankGot > rankIdx()) bad.push('rankGot がランクより大きい');
    if (G.tk.auto < 0 || G.tk.meal < 0) bad.push('券がマイナス');
    if (G.meal && !(G.meal.left > 0)) bad.push('食事効果の残りが不正');
    bad.forEach(m => { if (!A.seen[m]) { A.seen[m] = 1; log('error', '不変条件: ' + m) } });
    return bad;
  }
  function roundTrip() {
    const out = [], a = JSON.parse(JSON.stringify(G)), b = migrate(JSON.parse(JSON.stringify(G)));
    const diff = (x, y, p) => { if (p === 'lastSeen') return; if (typeof x !== typeof y) return out.push(`${p} の型が違う`); if (x && typeof x === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y || {})])) diff(x[k], (y || {})[k], p ? p + '.' + k : k) } else if (x !== y) out.push(`${p}: ${x} → ${y}`) };
    diff(a, b, '');
    // 古い形式のデータが、新しい項目で補われるか
    const old = JSON.parse(JSON.stringify(G)); const f = fresh();
    Object.keys(f).filter(k => !['v', 'lv', 'mult', 'prev', 'dex', 'fish'].includes(k)).forEach(k => delete old[k]);
    const m = migrate(old); Object.keys(f).forEach(k => { if (m[k] === undefined) out.push(`旧形式の補完漏れ: ${k}`) });
    return out;
  }

  /* ---------- 操作 ---------- */
  function done(msg) { try { renderAll(); hud(); save() } catch (e) { log('error', 'render: ' + e.message) } log('admin', msg); render(); badge(); }
  const act = (msg, fn) => { try { fn(); done(msg) } catch (e) { log('error', `${msg}: ${e.message}`); render() } };
  function skipDay() {
    if (!G.home) { crewSim(Math.max(0, Math.ceil((DAY_END - G.min) / ATTEMPT_MIN))); G.min = DAY_END; dayEnd(); $('#veil').hidden = true; }
    sleep();
  }
  function setLevel(n) {
    let need = 0, l = G.level, e = G.exp; while (l < n && l < 99) { need += expNeed(l) - e; e = 0; l++ }
    if (need > 0) addExp(need);
  }
  function fillDex(area, withBoss) {
    SP.filter(s => (area == null || s.a === area) && (withBoss || !s.boss)).forEach(s => { G.dex[s.n] = { c: 3, best: s.max, min: s.min }; if (s.boss) { G.bossGot[s.a] = 1; G.comp[s.a] = 1 } });
    AREAS.forEach((_, i) => checkComplete(i));
  }
  function maxAll() { UP.forEach(u => G.lv[u.k] = u.c.length); FAC.forEach(f => G.fac[f.k] = f.c.length); G.crew = crewMax(); syncCrew(true); }
  function giveFish(n) { for (let i = 0; i < n && G.fish.length < cap(); i++) { const s = pickSpecies(); G.fish.push({ n: s.n, size: Math.round(s.min + (s.max - s.min) * Math.random()), fresh: 100 }) } }

  /* ---------- プリセット ---------- */
  const PRE = {
    early: { n: '序盤', day: 3, level: 5, money: 3000, earned: 6000, catches: 20, boat: 0, crew: 0, dex: 0, comp: [], lv: { rod: 1, line: 0, bait: 0, cool: 0, mkt: 0 }, fac: { house: 0, tank: 0, trophy: 0 } },
    mid: { n: '中盤', day: 25, level: 18, money: 80000, earned: 250000, catches: 220, boat: 2, crew: 4, dex: 1, comp: [0, 1], lv: { rod: 3, line: 3, bait: 2, cool: 3, mkt: 2 }, fac: { house: 1, tank: 2, trophy: 1 } },
    late: { n: '終盤', day: 80, level: 38, money: 5000000, earned: 1200000, catches: 900, boat: 5, crew: 10, dex: 5, comp: [0, 1, 2, 3, 4, 5], boss: [0, 1, 2, 3, 4, 5], lv: { rod: 5, line: 5, bait: 5, cool: 5, mkt: 5 }, fac: { house: 3, tank: 4, trophy: 3 } },
    all: { n: '全開放', day: 120, level: 60, money: 1e9, earned: 5e6, catches: 3000, boat: 5, crew: 10, dex: 5, comp: [0, 1, 2, 3, 4, 5], boss: [0, 1, 2, 3, 4, 5], lv: { rod: 5, line: 5, bait: 5, cool: 5, mkt: 5 }, fac: { house: 3, tank: 4, trophy: 3 } },
    blank: { n: 'まっさら（チュートリアルなし）', day: 1, level: 1, money: 500, earned: 0, catches: 0, boat: 0, crew: 0, dex: -1, comp: [], lv: { rod: 0, line: 0, bait: 0, cool: 0, mkt: 0 }, fac: { house: 0, tank: 0, trophy: 0 } }
  };
  function makeState(p) {
    const o = fresh(), L = p.level;
    Object.assign(o, { seen: 1, day: p.day, money: p.money, earned: p.earned, catches: p.catches, level: L, exp: 0, boat: p.boat, crew: p.crew, area: 0, min: 360, home: 0, lv: Object.assign({}, p.lv), fac: Object.assign({}, o.fac, p.fac) });
    const base = 1 + Math.round(1.2 * (L - 1)), spent = Math.round(3 * (L - 1) * .8), third = Math.floor(spent / 3);
    o.stat = { str: base + third, vit: base + third, agi: base, dex: base + spent - 2 * third, luk: base };
    o.alloc = { str: third, vit: third, agi: 0, dex: spent - 2 * third, luk: 0 }; o.bp = 3 * (L - 1) - spent;
    SP.forEach(s => { if (!s.boss && p.dex >= 0 && s.a <= p.dex) o.dex[s.n] = { c: 3, best: s.max, min: s.min } });
    (p.comp || []).forEach(a => o.comp[a] = 1); (p.boss || []).forEach(a => { o.bossGot[a] = 1; const b = bossOf(a); o.dex[b.n] = { c: 1, best: b.max, min: b.min } });
    o.rankGot = RANKS.filter(r => o.earned >= r[0]).length - 1; o.tk = { auto: 5, meal: 3 };
    return migrate(JSON.parse(JSON.stringify(o)));
  }
  A.check = check; A.makeState = makeState; A.PRE = PRE;
  const SLOTS = 'umikaze-admin-slots';
  const slots = () => { try { return JSON.parse(localStorage.getItem(SLOTS)) || {} } catch (e) { return {} } };
  const putSlots = s => { try { localStorage.setItem(SLOTS, JSON.stringify(s)) } catch (e) { } };

  /* ---------- 画面 ---------- */
  const css = `
  #adm-fab{position:fixed;left:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:30;background:#c0392b;color:#fff;border:0;border-radius:999px;padding:8px 14px;font:900 .85rem var(--mono,monospace);box-shadow:0 4px 14px rgba(0,0,0,.45);cursor:pointer}
  #adm-fab i{font-style:normal;background:#fff;color:#c0392b;border-radius:999px;padding:0 6px;margin-left:6px}
  #adm-tag{position:fixed;right:8px;top:calc(4px + env(safe-area-inset-top,0px));z-index:30;background:#c0392b;color:#fff;font:900 .65rem var(--mono,monospace);border-radius:4px;padding:1px 6px;pointer-events:none}
  #adm{position:fixed;inset:auto 0 0 0;z-index:31;max-height:82vh;display:flex;flex-direction:column;background:var(--panel,#112f46);color:var(--fg,#eaf3f1);border-top:3px solid #c0392b;border-radius:14px 14px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.5);max-width:620px;margin:0 auto}
  #adm[hidden]{display:none}
  #adm .hd{display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line,#2a5776)}
  #adm .hd b{flex:1;font-size:.9rem}
  #adm .tabs{display:flex;gap:4px;padding:6px 8px;overflow-x:auto;border-bottom:1px solid var(--line,#2a5776)}
  #adm .tabs button{flex:0 0 auto;background:var(--bg,#0a1c2b);border:1px solid var(--line,#2a5776);border-radius:8px;padding:6px 10px;font-size:.8rem}
  #adm .tabs button[aria-pressed=true]{background:#c0392b;border-color:#c0392b;color:#fff}
  #adm .bd{overflow:auto;padding:10px 12px 16px;font-size:.82rem}
  #adm h4{margin:12px 0 6px;font-size:.82rem;color:var(--sub,#8db2c3)}
  #adm h4:first-child{margin-top:0}
  #adm .r{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  #adm button,#adm select,#adm input{font:inherit;color:inherit}
  #adm .b{background:var(--panel2,#183f5c);border:1px solid var(--line,#2a5776);border-radius:8px;padding:7px 10px;cursor:pointer}
  #adm .b:active{filter:brightness(.85)}
  #adm .b.on{background:#c0392b;border-color:#c0392b;color:#fff}
  #adm select,#adm input[type=number]{background:var(--bg,#0a1c2b);border:1px solid var(--line,#2a5776);border-radius:6px;padding:6px}
  #adm input[type=number]{width:5.5em}
  #adm .ok{color:#5fdc9c}#adm .ng{color:#ff6b5e}
  #adm pre{margin:0;white-space:pre-wrap;word-break:break-all;font:.72rem var(--mono,monospace);background:var(--bg,#0a1c2b);border-radius:8px;padding:8px;max-height:30vh;overflow:auto}
  #adm table{width:100%;border-collapse:collapse}#adm td{padding:2px 4px;border-bottom:1px dashed var(--line,#2a5776)}#adm td:last-child{text-align:right;font-family:var(--mono,monospace)}
  #adm .lg{font:.72rem var(--mono,monospace)}#adm .lg div{padding:1px 0;border-bottom:1px dotted var(--line,#2a5776)}
  `;
  const TABS = [['prog', '進行'], ['unl', '解放'], ['fish', '釣り'], ['pre', 'プリセット'], ['ins', '調査']];
  const btn = (a, label, extra = '', cls = '') => `<button class="b ${cls}" data-a="${a}" ${extra}>${label}</button>`;
  const tog = (a, label, on) => `<button class="b ${on ? 'on' : ''}" data-a="${a}">${label}：${on ? 'ON' : 'OFF'}</button>`;
  function body() {
    const t = A.ui.tab;
    if (t === 'prog') return `<h4>日にちを進める（帰港→給料→相場→朝まで自動）</h4><div class="r">${[1, 7, 30, 100].map(n => btn('skip', `+${n}日`, `data-n="${n}"`)).join('')}</div>
      <h4>お金（売上にも加算）</h4><div class="r">${[1e4, 1e6, 1e8].map(n => btn('money', '+' + num(n), `data-n="${n}"`)).join('')}</div>
      <h4>今日のできごと</h4><div class="r">${Object.entries(EVS).map(([k, e]) => btn('ev', e.n, `data-n="${k}"`)).join('')}${btn('ev', 'なし', 'data-n="none"')}</div>
      <h4>経験値</h4><div class="r">${[1e3, 1e4, 1e5, 1e6].map(n => btn('exp', '+' + num(n), `data-n="${n}"`)).join('')}</div>
      <h4>レベルを指定（上げる方向のみ）</h4><div class="r"><input type="number" id="adm-lv" min="1" max="99" value="${A.ui.lv}">${btn('setlv', 'そのレベルまで上げる')}</div>
      <h4>ランクに到達させる</h4><div class="r"><select id="adm-rank">${RANKS.map((r, i) => `<option value="${i}" ${i === A.ui.rank ? 'selected' : ''}>${r[1]}（¥${num(r[0])}）</option>`).join('')}</select>${btn('setrank', '到達')}</div>
      <h4>BP・券・デイリー</h4><div class="r">${btn('bp', 'BP +10', 'data-n="10"')}${btn('bp', 'BP +100', 'data-n="100"')}${btn('tk', '券 +10 / 食事券 +5')}${btn('daily', 'デイリーを再取得できる状態に')}</div>
      <h4>倍率（実際の獲得に掛かる）</h4><div class="r">経験値×<select id="adm-mx">${[1, 2, 5, 10, 100].map(n => `<option ${n === A.mulExp ? 'selected' : ''}>${n}</option>`).join('')}</select> 売値×<select id="adm-ms">${[1, 2, 5, 10, 100].map(n => `<option ${n === A.mulSell ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
    if (t === 'unl') return `<h4>まとめて</h4><div class="r">${btn('boats', '全海域・全船')}${btn('maxall', '設備・施設・漁師を最大')}${btn('dexall', '図鑑を全登録')}${btn('dexboss', '主も討伐済みに')}</div>
      <h4>エリアをコンプ（コンプボーナスも付く）</h4><div class="r">${AREAS.map((a, i) => btn('comp', a.name, `data-n="${i}"`)).join('')}</div>
      <h4>魚箱</h4><div class="r">${btn('fish5', '魚を5匹追加')}${btn('fishfull', '魚箱を満タンに')}${btn('fishclear', '魚箱を空に')}</div>`;
    if (t === 'fish') {
      const sp = SP[A.ui.sp], lo = sp.min, hi = sp.max, sz = clamp(A.ui.size, lo, hi);
      return `<h4>次に釣れる魚を指定（1回だけ）</h4><div class="r"><select id="adm-sp">${AREAS.map((a, i) => `<optgroup label="${esc(a.name)}">${SP.map((s, j) => s.a === i ? `<option value="${j}" ${j === A.ui.sp ? 'selected' : ''}>${esc(s.n)}${s.boss ? '（主）' : ''}</option>` : '').join('')}</optgroup>`).join('')}</select></div>
        <div class="r" style="margin-top:6px"><input type="range" id="adm-size" min="${lo}" max="${hi}" value="${sz}" style="flex:1"><span class="num" id="adm-sizev">${sz}cm</span></div>
        <div class="r" style="margin-top:6px">${btn('force', '次の1匹に指定')}<span>${A.force ? `指定中：${esc(A.force.sp.n)} ${A.force.size}cm` : '指定なし'}</span></div>
        <h4>補助</h4><div class="r">${tog('t_boss', '主を必ず出す（いまの海域）', A.bossAlways)}${tog('t_bite', 'アタリ即時', A.instantBite)}${tog('t_win', '戦闘を自動で勝つ', A.autoWin)}${tog('t_nobreak', '糸が切れない', A.noBreak)}</div>
        <h4>いまの海域：${esc(AREAS[G.area].name)}</h4><div class="r">${AREAS.slice(0, G.boat + 1).map((a, i) => btn('area', a.name, `data-n="${i}"`, G.area === i ? 'on' : '')).join('')}</div>`;
    }
    if (t === 'pre') {
      const sl = slots();
      return `<h4>状態をまるごと読み込む（いまの状態は「控え」に残る）</h4><div class="r">${Object.entries(PRE).map(([k, p]) => btn('preset', p.n, `data-n="${k}"`)).join('')}</div>
        <h4>スロット（この端末のなか）</h4>${[1, 2, 3].map(i => `<div class="r" style="margin-bottom:4px"><b>${i}</b>${btn('slotsave', '保存', `data-n="${i}"`)}${btn('slotload', '読み込み', `data-n="${i}"`, '')}<span style="color:var(--sub)">${sl[i] ? `${fmtTime(sl[i].at)}　Lv.${sl[i].lv}・${sl[i].day}日目` : '空'}</span></div>`).join('')}`;
    }
    const bad = check(), rows = [['日/時刻', `${G.day}日目 ${G.home ? '夜' : Math.floor(G.min / 60) + ':' + String(G.min % 60).padStart(2, '0')}`], ['Lv/EXP', `${G.level} / ${G.exp}/${expNeed(G.level)}`], ['お金', '¥' + num(G.money)], ['累計売上', '¥' + num(G.earned)], ['BP', G.bp], ['釣った数', G.catches], ['船/海域', `${G.boat}/${G.area}`], ['漁師', `${G.crew}/${crewMax()}`], ['魚箱', `${G.fish.length}/${cap()}`], ['状態', S.st + (S.sp ? `（${S.sp.n}）` : '')], ['クラウド', Cloud.status]];
    return `<h4>不変条件（壊れた値がないか）</h4><div class="${bad.length ? 'ng' : 'ok'}">${bad.length ? 'NG：' + bad.length + '件' : 'OK'}</div>${bad.length ? `<pre>${esc(bad.join('\n'))}</pre>` : ''}
      <div class="r" style="margin-top:6px">${btn('check', '今すぐ検査')}${btn('roundtrip', '保存→読み込みの往復テスト')}</div><div id="adm-rt"></div>
      <h4>自動プレイ（まっさらなどから進めて、異常を探す。終わると元の状態に戻る）</h4>
      <div class="r">日数<select id="adm-bd">${[10, 30, 60, 100].map(n => `<option ${n === (A.ui.bd || 30) ? 'selected' : ''}>${n}</option>`).join('')}</select>腕前<select id="adm-bs">${['good', 'avg', 'poor'].map(n => `<option ${n === (A.ui.bs || 'avg') ? 'selected' : ''}>${n}</option>`).join('')}</select>乱数<input type="number" id="adm-bseed" value="${A.ui.bseed || 1}">開始<select id="adm-bst">${['blank', 'early', 'mid', 'current'].map(n => `<option ${n === (A.ui.bst || 'blank') ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="r" style="margin-top:6px">${btn('botrun', '実行')}${btn('botstop', '中止')}${btn('botcopy', 'レポートをコピー')}</div><div id="adm-bot" style="margin-top:6px">${A.botHtml || ''}</div>
      <h4>主の診断</h4><div class="r">${AREAS.slice(0, G.boat + 1).map((a, i) => btn('adv', a.name, `data-n="${i}"`)).join('')}</div>
      <h4>状態</h4><table>${rows.map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>
      <h4>ログ（新しい順・${A.log.length}件）</h4><div class="r">${btn('logcopy', 'コピー')}${btn('logclear', '消す')}</div>
      <div class="lg" style="margin-top:6px;max-height:26vh;overflow:auto">${A.log.slice(-60).reverse().map(l => `<div class="${l.kind === 'error' ? 'ng' : ''}">${new Date(l.t).toTimeString().slice(0, 8)} [${l.kind}] ${esc(l.msg)}</div>`).join('') || '<div>まだありません</div>'}</div>
      <details style="margin-top:8px"><summary>保存データ（JSON）</summary><pre>${esc(JSON.stringify(G, null, 1))}</pre></details>`;
  }
  function render() {
    const p = $('#adm'); if (!p) return;
    p.hidden = !A.ui.open; if (!A.ui.open) return;
    const keep = p.querySelector('.bd'), sc = keep ? keep.scrollTop : 0;
    p.innerHTML = `<div class="hd"><b>管理者パネル（DEV）</b><button class="b" data-a="close">閉じる</button></div>
      <div class="tabs">${TABS.map(([k, l]) => `<button data-a="tab" data-n="${k}" aria-pressed="${A.ui.tab === k}">${l}</button>`).join('')}</div><div class="bd">${body()}</div>`;
    p.querySelector('.bd').scrollTop = sc;
  }
  function badge() { const f = $('#adm-fab'); if (!f) return; const n = A.errs + check().length; f.innerHTML = `DEV${n ? `<i>${n}</i>` : ''}`; }

  const H = {
    close: () => { A.ui.open = false; render() },
    tab: n => { A.ui.tab = n; render() },
    skip: n => act(`+${n}日`, () => { for (let i = 0; i < n; i++) skipDay() }),
    ev: k => act(`できごと ${k}`, () => { G.ev = k === 'none' ? null : k; hud(); renderAll() }),
    money: n => act(`お金 +${n}`, () => { G.money += +n; earn(+n) }),
    exp: n => act(`EXP +${n}`, () => addExp(+n)),
    setlv: () => act('レベル指定', () => { A.ui.lv = +$('#adm-lv').value; setLevel(A.ui.lv) }),
    setrank: () => act('ランク到達', () => { A.ui.rank = +$('#adm-rank').value; const need = RANKS[A.ui.rank][0] - G.earned; if (need > 0) earn(need) }),
    bp: n => act(`BP +${n}`, () => { G.bp += +n }),
    tk: () => act('券付与', () => { G.tk.auto += 10; G.tk.meal += 5 }),
    daily: () => act('デイリー再取得', () => { G.dailyNo = -1 }),
    boats: () => act('全海域・全船', () => { G.boat = BOATS.length }),
    maxall: () => act('設備・施設を最大', maxAll),
    dexall: () => act('図鑑を全登録', () => fillDex(null, false)),
    dexboss: () => act('主も討伐済み', () => fillDex(null, true)),
    comp: n => act(`コンプ ${AREAS[n].name}`, () => fillDex(+n, false)),
    fish5: () => act('魚+5', () => giveFish(5)),
    fishfull: () => act('魚箱満タン', () => giveFish(cap())),
    fishclear: () => act('魚箱を空に', () => { G.fish = [] }),
    force: () => { A.force = { sp: SP[A.ui.sp], size: +$('#adm-size').value }; log('admin', `指定 ${A.force.sp.n} ${A.force.size}cm`); render() },
    t_boss: () => { A.bossAlways = !A.bossAlways; render() }, t_bite: () => { A.instantBite = !A.instantBite; render() },
    t_win: () => { A.autoWin = !A.autoWin; render() }, t_nobreak: () => { A.noBreak = !A.noBreak; render() },
    area: n => act('海域変更', () => { G.area = +n }),
    preset: k => act(`プリセット ${PRE[k].n}`, () => applySave(makeState(PRE[k]), '管理者のプリセット前')),
    slotsave: n => { const s = slots(); s[n] = { at: Date.now(), lv: G.level, day: G.day, json: JSON.stringify(G) }; putSlots(s); log('admin', `スロット${n}に保存`); render() },
    slotload: n => { const s = slots()[n]; if (!s) return; act(`スロット${n}を読み込み`, () => applySave(migrate(JSON.parse(s.json)), '管理者のスロット読み込み前')) },
    check: () => { check(); render(); badge() },
    roundtrip: () => { const r = roundTrip(); $('#adm-rt').innerHTML = r.length ? `<pre class="ng">${esc(r.join('\n'))}</pre>` : '<div class="ok">往復OK（旧形式の補完も問題なし）</div>'; log(r.length ? 'error' : 'admin', r.length ? '往復テスト NG ' + r.length + '件' : '往復テスト OK') },
    adv: n => { A.ui.open = false; render(); showBossAdvice(+n, 0) },
    logcopy: () => { const t = A.log.map(l => `${new Date(l.t).toISOString()} D${l.day} [${l.kind}] ${l.msg}`).join('\n'); try { navigator.clipboard.writeText(t).then(() => toast('ログをコピーしました'), () => prompt && 0) } catch (e) { } },
    botrun: async () => {
      if (window.Bot.running) return;
      A.ui.bd = +$('#adm-bd').value; A.ui.bs = $('#adm-bs').value; A.ui.bseed = +$('#adm-bseed').value; A.ui.bst = $('#adm-bst').value;
      A.botHtml = '実行中…'; render();
      const r = await window.Bot.run({ days: A.ui.bd, skill: A.ui.bs, seed: A.ui.bseed, start: A.ui.bst, onProgress: p => { A.botHtml = `実行中… ${p.done}/${p.total}日　Lv.${p.lv}　¥${num(p.money)}`; const e = $('#adm-bot'); if (e) e.textContent = A.botHtml } });
      A.botHtml = window.Bot.summaryHtml(r); log(r.ok ? 'admin' : 'error', `自動プレイ ${r.ok ? 'OK' : 'NG'}（${r.daysRun}日）`); render(); badge();
    },
    botstop: () => { window.Bot.stop = true },
    botcopy: () => { const r = window.Bot.last; if (!r) return; const t = window.Bot.markdown(r); try { navigator.clipboard.writeText(t).then(() => toast('レポートをコピーしました'), () => { }) } catch (e) { } },
    logclear: () => { A.log = []; A.errs = 0; A.seen = {}; render(); badge() }
  };
  function init() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const tag = document.createElement('div'); tag.id = 'adm-tag'; tag.textContent = 'DEV'; document.body.appendChild(tag);
    const fab = document.createElement('button'); fab.id = 'adm-fab'; fab.textContent = 'DEV'; fab.onclick = () => { A.ui.open = !A.ui.open; render() }; document.body.appendChild(fab);
    const p = document.createElement('div'); p.id = 'adm'; p.hidden = true; document.body.appendChild(p);
    p.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const f = H[b.dataset.a]; if (f) f(b.dataset.n) });
    p.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'adm-sp') { A.ui.sp = +t.value; A.ui.size = Math.round((SP[A.ui.sp].min + SP[A.ui.sp].max) / 2); render() }
      else if (t.id === 'adm-size') { A.ui.size = +t.value }
      else if (t.id === 'adm-mx') { A.mulExp = +t.value; log('admin', `経験値×${A.mulExp}`) }
      else if (t.id === 'adm-ms') { A.mulSell = +t.value; log('admin', `売値×${A.mulSell}`); try { renderAll() } catch (e) { } }
    });
    p.addEventListener('input', e => { if (e.target.id === 'adm-size') { const v = $('#adm-sizev'); if (v) v.textContent = e.target.value + 'cm'; A.ui.size = +e.target.value } });
    setInterval(() => { badge(); if (A.ui.open && A.ui.tab === 'ins' && !(window.Bot && window.Bot.running)) { const a = document.activeElement; if (!a || !p.contains(a)) render() } }, 3000);
    badge(); log('admin', '管理者パネルを有効にしました');
  }
  // 持ち主だけに出す（Claude上のプレビュー）。Claudeの外（ローカルで開いたとき）は、そのまま有効。
  (async () => {
    let ok = true;
    try { const c = window.claude; if (c && c.use) { const u = await c.use('user'); ok = u ? await u.isOwner() : false; } } catch (e) { ok = false; }
    if (ok) init();
  })();
})();
