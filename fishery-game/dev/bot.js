/*__UMIKAZE_ADMIN__*/
// 自動プレイのボット（開発用）。ゲームの実際の処理（釣り・売却・購入・日送り）を使って、何日分も自動で遊び、
// 毎日の異常（壊れた値・止まった進行・例外）を検査して、バランスの指標を集める。製品版には入れない。
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Math.round(n).toLocaleString('ja-JP');
  const tick = () => new Promise(r => setTimeout(r, 0));
  // 操作の腕前：反応の遅れ(フレーム)・テンションを逃がす基準・ときどきするミス
  const SKILL = { good: { delay: 12, thr: 62, lapse: 0 }, avg: { delay: 27, thr: 58, lapse: .012 }, poor: { delay: 40, thr: 50, lapse: .03 } };
  const B = window.Bot = { running: false, stop: false, last: null };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }

  B.run = async function (opt) {
    if (B.running) throw new Error('実行中です');
    const o = Object.assign({ days: 30, seed: 1, skill: 'avg', start: 'blank', stopOnError: false, onProgress: null }, opt || {});
    const sk = SKILL[o.skill] || SKILL.avg, A = window.Admin;
    B.running = true; B.stop = false;
    const KEYSAVE = 'umikaze-bot-saved';
    const orig = Math.random, rngFn = mulberry32(o.seed >>> 0);
    const saved = { g: JSON.stringify(G), db: Cloud.db, tab: curTab, flags: A ? { force: A.force, bossAlways: A.bossAlways, instantBite: A.instantBite, autoWin: A.autoWin, noBreak: A.noBreak, mulExp: A.mulExp, mulSell: A.mulSell } : null };
    try { localStorage.setItem(KEYSAVE, saved.g) } catch (e) { }
    const rep = { config: { days: o.days, seed: o.seed, skill: o.skill, start: o.start }, ok: true, daysRun: 0, issues: [], timeline: [], milestones: {}, stats: { casts: 0, wins: 0, breaks: 0, escapes: 0, bossAttempts: 0, bossWins: 0, autoFish: 0, spoiled: 0, purchases: 0, chaos: 0 }, warnings: [], ms: 0 };
    const t0 = Date.now();
    const issue = (kind, msg, extra) => { rep.issues.push(Object.assign({ day: G.day, kind, msg: String(msg).slice(0, 500) }, extra)); if (kind === 'error') { rep.ok = false; if (o.stopOnError) B.stop = true } };
    const onErr = e => issue('error', `画面のエラー: ${e.message}`);
    addEventListener('error', onErr);
    const seeded = fn => { Math.random = rngFn; try { return fn() } finally { Math.random = orig } };   // 乱数は、同期処理の間だけ固定（画面の描画が乱数を使っても崩れない）
    const guard = (name, fn) => { try { return fn() } catch (e) { issue('error', `${name}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`) } };
    const first = (k, v) => { if (rep.milestones[k] === undefined) rep.milestones[k] = v };
    const area = { win: {}, tot: {} };

    const closeModals = () => {
      for (let i = 0; i < 4 && !$('#veil').hidden; i++) {
        const b = ['#nextday', '#autoOk', '#advOk', '#offOk', '#rk', '#bkNo', '#ngNo', '#wcNew', '#codeOk', '#delNo', '#cdNo'].map(s => $(s)).find(Boolean);
        if (b) b.click(); else $('#veil').hidden = true;
      }
    };
    const check = () => { const bad = (A && A.check) ? A.check() : []; bad.forEach(m => { if (!rep._seen[m]) { rep._seen[m] = 1; issue('error', '不変条件: ' + m) } }) };
    rep._seen = {};
    const click = (sel, pred) => { const b = [...document.querySelectorAll(sel)].find(x => !x.disabled && (!pred || pred(x))); if (b) { b.click(); return true } return false };
    const cost = b => +(b.textContent.replace(/[^0-9]/g, '') || 0);

    /* ----- 1回の釣り（アワセ済みから、巻き上げ→結果→次へ） ----- */
    function fightOnce() {
      const hist = []; let lapse = 0, steps = 0;
      while (S.st === 'fight') {
        hist.push(S.f.struggle); const seen = hist.length > sk.delay ? hist[hist.length - 1 - sk.delay] : false;
        let hold = !seen && S.f.tens < sk.thr;
        if (lapse > 0) { lapse--; hold = !hold } else if (Math.random() < sk.lapse) lapse = 14;
        S.holding = hold; fightStep(1 / 60);
        if (++steps > 7200) return false;
      }
      return true;
    }
    function attempt() {
      if (G.fish.length >= cap()) { openTab('sell'); click('#sellall'); if (G.fish.length >= cap()) { issue('error', '魚箱がいっぱいのまま、売れない'); return false } }
      rollFish(); S.st = 'bite'; hook();
      const sp = S.sp, isBoss = !!sp.boss;
      if (!fightOnce()) {   // 2分以上、決着しない（バランスの指摘）。逃げられた扱いで終わらせる
        rep.stats.stalemate = (rep.stats.stalemate || 0) + 1;
        const msg = `戦闘が2分以上、決着しない場面がありました（${sp.n}・${S.size}cm）`; if (!rep.warnings.includes(msg) && rep.warnings.length < 20) rep.warnings.push(msg);
        S.f.prog = -1; S.holding = false; fightStep(1 / 60);
      }
      rep.stats.casts++; area.tot[G.area] = (area.tot[G.area] || 0) + 1;
      if (isBoss) rep.stats.bossAttempts++;
      if (S.ok) { rep.stats.wins++; area.win[G.area] = (area.win[G.area] || 0) + 1; if (isBoss) { rep.stats.bossWins++; first('boss' + sp.a, G.day) } }
      else if (S.f && S.f.tens >= 100) rep.stats.breaks++; else rep.stats.escapes++;
      closeModals(); next(); closeModals();
      return true;
    }

    /* ----- 朝・夜の行動（実際の画面のボタンを押す） ----- */
    function morning() {
      if (G.home) sleep();
      G.dailyNo = dayNo() - 1; guard('デイリー', () => claimDaily());
      // 腕前に合った海域へ：直近の勝率が低いなら、1つ手前の海域に下げる
      let pick = 0; for (let a = G.boat; a >= 0; a--) { const t = area.tot[a] || 0; if (t < 10 || (area.win[a] || 0) / t >= .55) { pick = a; break } }
      if (pick !== G.area) { G.area = pick; guard('海域変更', () => renderAll()) }
      // ときどき食事・券
      if (!G.meal) { openTab('town'); const bs = [...document.querySelectorAll('[data-meal]')].reverse(); const b = bs.find(x => !x.disabled && cost(x) * 20 <= G.money); if (b) b.click(); }
      if (G.money > autoCost() * 40) { openTab('town'); click('[data-buytk="auto:5"]') }
      openTab('fish');
    }
    function evening() {
      openTab('sell'); for (let i = 0; i < 6; i++) { if (!click('[data-deliver]')) break; openTab('sell') }   // 注文の納品（実際のボタン）
      for (let i = 0; i < 2; i++) { if (!click('[data-proc]')) break; openTab('sell') }   // 加工場（あれば）に魚を出す
      click('#sellprod'); openTab('sell');
      click('#sellall');
      if (G.debt > 0 && G.money > G.debt * 1.5) { openTab('town'); click('[data-repay="all"]') }   // 借りていたら返す（実際の返済ボタンを通す）
      openTab('home');
      const reserve = G.crew * AREAS[G.boat].wage * 3 + 500;
      for (let i = 0; i < 14; i++) {
        // 次の船を目標にして、ためる：船の値段の1割を超える買い物は、船も買える余裕があるときだけ
        const nb = G.boat < BOATS.length ? BOATS[G.boat].c : 0;
        const can = b => G.money - cost(b) >= reserve && (!nb || cost(b) <= Math.max(3000, nb * .1) || G.money - cost(b) >= nb + reserve);
        if (click('[data-boat]', b => G.money - cost(b) >= reserve) || click('[data-fac="house"]', b => G.crew >= crewMax() && can(b)) || click('[data-crew]', can)) { rep.stats.purchases++; continue }
        const ups = [...document.querySelectorAll('[data-up]')].filter(b => !b.disabled && can(b)).sort((a, b) => cost(a) - cost(b));
        if (ups.length) { ups[0].click(); rep.stats.purchases++; continue }
        if (click('[data-fac="tank"],[data-fac="trophy"],[data-fac="plant"]', b => can(b) && G.money - cost(b) >= reserve * 3)) { rep.stats.purchases++; continue }
        break;
      }
      for (let i = 2; i < G.crew; i += 3) if (G.cr[i] && G.cr[i].r === 0) click(`[data-role="${i}"]`);   // 3人に1人は営業にする（実際の切り替えボタンを通す）
      openTab('stat'); const W = ['str', 'str', 'str', 'vit', 'vit', 'vit', 'dex', 'dex', 'dex', 'agi', 'luk'];
      for (let i = 0; G.bp > 0 && i < 400; i++) click(`[data-st="${W[Math.floor(Math.random() * W.length)]}"]`);
      // おまかせ釣りの券を使い切る日もある（実際に使われるコードを通す）
    }
    function chaos() {
      rep.stats.chaos++;
      const r = Math.random();
      if (r < .2) { G.diff = (G.diff + 1) % 3; G.fs = Math.floor(Math.random() * 3); applyUi(); save() }
      else if (r < .4) { applySave(migrate(JSON.parse(JSON.stringify(G))), 'ボット：保存→読み込み'); }
      else if (r < .7) { ['fish', 'sell', 'town', 'home', 'stat', 'dex', 'set'].forEach(t => guard('画面 ' + t, () => openTab(t))); openTab('fish') }
      else if (r < .8) { guard('銀行', () => { openTab('town'); click('[data-loan]'); openTab('fish') }) }
      else if (r < .85) { guard('ランク一覧', () => { showRanks(); closeModals() }) }
      else { const a = Math.floor(Math.random() * (G.boat + 1)); guard('主の診断', () => { showBossAdvice(a, 0); closeModals() }) }
    }
    function startState() {
      let st;
      if (o.start === 'current') st = migrate(JSON.parse(saved.g));
      else if (A && A.makeState && A.PRE[o.start]) st = A.makeState(A.PRE[o.start]);
      else { st = fresh(); st.seen = 1 }
      G = st; G.seen = 1; G.mute = 1; G.noFx = 1; G.noVib = 1; G.home = 0; if (o.start === 'blank') { G.day = 1 }
      S.st = 'idle'; CREW.length = 0; syncCrew(true); applyUi();
    }

    try {
      if (A) { A.force = null; A.bossAlways = A.instantBite = A.autoWin = A.noBreak = false; A.mulExp = A.mulSell = 1 }
      Cloud.db = null;
      seeded(() => startState());
      closeModals(); renderAll();
      let stagn = 0, lastEarned = G.earned, noCatchDays = 0;
      for (let d = 0; d < o.days && !B.stop; d++) {
        const dayStart = { casts: rep.stats.casts, wins: rep.stats.wins, earned: G.earned, money: G.money, level: G.level };
        seeded(() => {
          guard('朝', morning);
          if (isTourDay() && !tourIn()) guard('大会に参加', () => { openTab('town'); click('#tourGo'); openTab('fish') });
          let g = 0;
          while (!G.home && G.min < DAY_END && g++ < 80 && !B.stop) {
            const useAuto = G.tk.auto > 0 && Math.random() < .25 && G.min + 5 * ATTEMPT_MIN <= DAY_END;
            if (useAuto) { guard('おまかせ釣り', () => { autoFish(1); rep.stats.autoFish++; closeModals() }); if (!G.home && G.min >= DAY_END) { dayEnd(); closeModals() } }
            else { const ok = guard('釣り', attempt); if (ok === false) break; }
            check();
          }
          if (g >= 80) issue('error', '1日の釣りが終わらない（80回を超えた）');
          if (!G.home) { G.min = DAY_END; guard('日終了', () => { dayEnd(); closeModals() }) }
          const before = G.fish.length;
          guard('夜', evening);
          if (Math.random() < .35) guard('ランダム操作', chaos);
          if (!G.home) issue('error', '夜の状態になっていない');
          rep.stats.spoiled += Math.max(0, before - G.fish.length - 0);   // 売却分も含む粗い値。傾向を見るだけ
          check();
        });
        rep.daysRun++;
        const rk = rankIdx();
        first('rank' + rk, G.day); first('area' + G.boat, G.day); [10, 20, 30, 40, 50, 99].forEach(L => { if (G.level >= L) first('lv' + L, G.day) });
        AREAS.forEach((_, i) => { if (G.comp[i]) first('comp' + i, G.day) });
        if (G.crew >= crewMax()) first('crewMax', G.day);
        rep.timeline.push({ day: G.day, lv: G.level, money: G.money, earned: G.earned, rank: RANKS[rk][1], boat: G.boat, area: G.area, crew: G.crew, catches: G.catches, dex: Object.keys(G.dex).length, comp: Object.keys(G.comp).length, boss: Object.keys(G.bossGot).length });
        // 停滞・釣れない日の検出
        if (G.earned <= lastEarned) stagn++; else stagn = 0; lastEarned = G.earned;
        if (stagn === 4) rep.warnings.push(`${G.day}日目：4日間、売上が増えていません（進行が止まっている可能性）`);
        const dc = rep.stats.casts - dayStart.casts, dw = rep.stats.wins - dayStart.wins;
        if (dc > 0 && dw === 0) noCatchDays++; else noCatchDays = 0;
        if (noCatchDays === 3) rep.warnings.push(`${G.day}日目：3日続けて1匹も釣れていません（難しすぎる可能性）`);
        if (o.onProgress) o.onProgress({ done: d + 1, total: o.days, lv: G.level, money: G.money, day: G.day });
        await tick();
      }
    } catch (e) {
      issue('error', '中断: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e));
    } finally {
      removeEventListener('error', onErr);
      Math.random = orig;
      // 元の状態に戻す（ボットが進めた状態は、残さない）
      try {
        G = migrate(JSON.parse(saved.g)); S.st = 'idle'; CREW.length = 0; syncCrew(true); applyUi();
        Cloud.db = saved.db; if (A && saved.flags) Object.assign(A, saved.flags);
        closeModals(); save(); openTab(saved.tab || 'fish'); renderAll(); localStorage.removeItem(KEYSAVE);
      } catch (e) { issue('error', '元の状態に戻せませんでした: ' + e.message) }
      B.running = false;
    }
    rep.ms = Date.now() - t0; delete rep._seen;
    // 傾向の指摘
    const st = rep.stats, lastT = rep.timeline[rep.timeline.length - 1];
    if (st.casts) { const wr = st.wins / st.casts; if (wr < .5) rep.warnings.push(`全体の勝率が ${Math.round(wr * 100)}% と低めです（腕前:${o.skill}）`); if (wr > .97 && o.skill !== 'good') rep.warnings.push(`全体の勝率が ${Math.round(wr * 100)}% で、簡単すぎる可能性があります`) }
    if (lastT && lastT.money > lastT.earned * 2 && lastT.earned > 0) rep.warnings.push('所持金が累計売上の2倍を超えています（お金の入り方が不自然）');
    const m = rep.milestones, tl = rep.timeline;
    if (o.start === 'blank') {
      if (m.rank10 !== undefined && m.rank10 < 30) rep.warnings.push(`最高ランク「漁業王」まで ${m.rank10}日（1日の釣り18回なら、実時間で約${Math.round(m.rank10 * 6 / 60 * 10) / 10}時間）。進行が速すぎる可能性`);
      if (m.area5 !== undefined && m.area5 < 20) rep.warnings.push(`全海域の解放まで ${m.area5}日。終盤の内容を、早く使い切る可能性`);
      if (m.lv99 !== undefined && m.lv99 < 90) rep.warnings.push(`レベル上限（99）まで ${m.lv99}日。上限に達したあとの楽しみが必要`);
    }
    if (tl.length >= 15) { const a = tl[tl.length - 1], b = tl[tl.length - 11], inc = (a.earned - b.earned) / 10; if (inc > 0 && a.money > inc * 30) rep.warnings.push(`所持金（¥${num(a.money)}）が、日収（約¥${num(inc)}）の30日分を超えて余っています。お金の使い道が不足している可能性`); }
    B.last = rep; return rep;
  };

  /* ----- レポート ----- */
  const MS = [['area1', '沖合へ'], ['area2', '深海へ'], ['area3', 'サンゴ礁へ'], ['area4', '氷海へ'], ['area5', '幻の海域へ'], ['comp0', '港コンプ'], ['comp1', '沖合コンプ'], ['comp2', '深海コンプ'], ['boss0', '堤防の主を討伐'], ['boss1', '海原の主を討伐'], ['lv10', 'Lv10'], ['lv20', 'Lv20'], ['lv30', 'Lv30'], ['lv40', 'Lv40'], ['lv99', 'Lv99（上限）'], ['crewMax', '漁師が上限'], ['rank10', '漁業王']];
  B.markdown = function (r) {
    const c = r.config, s = r.stats, L = [];
    L.push(`# 自動プレイのレポート（${c.days}日・腕前 ${c.skill}・乱数 ${c.seed}・開始 ${c.start}）`, '', `- 結果: **${r.ok ? 'OK（異常なし）' : 'NG（異常あり）'}**　実行 ${r.daysRun}日 / ${(r.ms / 1000).toFixed(1)}秒`);
    L.push(`- 釣り ${s.casts}回（成功 ${s.wins}・糸切れ ${s.breaks}・逃走 ${s.escapes}）　主 ${s.bossWins}/${s.bossAttempts}　おまかせ ${s.autoFish}回　購入 ${s.purchases}回`, '');
    if (r.issues.length) { L.push('## 異常', ...r.issues.slice(0, 30).map(i => `- ${i.day}日目 [${i.kind}] ${i.msg}`), ''); }
    if (r.warnings.length) { L.push('## 気づき（バランス・進行）', ...r.warnings.map(w => `- ${w}`), ''); }
    L.push('## 到達した日', '', '| 目標 | 日 |', '|---|---|', ...MS.map(([k, n]) => `| ${n} | ${r.milestones[k] !== undefined ? r.milestones[k] + '日目' : '—'} |`), '');
    const tl = r.timeline, pick = tl.filter((_, i) => i === 0 || (i + 1) % Math.max(1, Math.round(tl.length / 10)) === 0 || i === tl.length - 1);
    L.push('## 経過', '', '| 日 | Lv | 所持金 | 累計売上 | ランク | 船 | 漁師 | 図鑑 | 主 |', '|---|---|---|---|---|---|---|---|---|', ...pick.map(t => `| ${t.day} | ${t.lv} | ¥${num(t.money)} | ¥${num(t.earned)} | ${t.rank} | ${t.boat} | ${t.crew} | ${t.dex} | ${t.boss} |`));
    return L.join('\n');
  };
  B.summaryHtml = function (r) {
    const s = r.stats, ms = MS.filter(([k]) => r.milestones[k] !== undefined).map(([k, n]) => `${esc(n)}：${r.milestones[k]}日目`);
    return `<div class="${r.ok ? 'ok' : 'ng'}"><b>${r.ok ? 'OK（異常なし）' : 'NG（異常あり）'}</b>　${r.daysRun}日 / ${(r.ms / 1000).toFixed(1)}秒</div>
      <div>釣り ${s.casts}回（成功 ${s.wins}・糸切れ ${s.breaks}・逃走 ${s.escapes}）／主 ${s.bossWins}/${s.bossAttempts}／おまかせ ${s.autoFish}／購入 ${s.purchases}</div>
      ${r.issues.length ? `<pre class="ng">${esc(r.issues.slice(0, 12).map(i => `${i.day}日目 [${i.kind}] ${i.msg}`).join('\n'))}</pre>` : ''}
      ${r.warnings.length ? `<div style="margin-top:4px"><b>気づき</b></div><ul style="margin:2px 0 0;padding-left:1.2em">${r.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      <div style="margin-top:4px;color:var(--sub)">${ms.join(' ／ ') || '到達した目標はありません'}</div>`;
  };
})();
