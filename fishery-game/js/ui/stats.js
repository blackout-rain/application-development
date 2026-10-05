/* ---------- stats ---------- */
function renderStat() {
  const need = expNeed(G.level);
  const rows = ST.map(s => {
    const v = G.stat[s.k],
      a = G.alloc[s.k];
    return T(
      '<div class="item"><div class="t">{1} <span class="num" style="color:var(--accent)">{2}</span> <span class="num" style="color:var(--sub);font-size:.75rem">（自動{3}＋振り分け{4}）</span></div>\n      <button class="plus" data-st="{5}" {6} aria-label="{7}を上げる">＋</button>\n      <div class="s">{8}</div><div class="s" style="color:var(--good)">いまの効果：{9}</div></div>',
      [s.n, v, v - 1 - a, a, s.k, G.bp < 1 ? 'disabled' : '', s.n, s.d, s.fx(v - 1)]
    );
  }).join('');
  $('#p-stat').innerHTML = T(
    '<div class="card"><div class="kv"><span>レベル</span><b class="num">Lv.{1}</b><span>経験値</span><b class="num">{2} / {3}</b><span>ボーナスポイント（BP）</span><b class="num" style="color:var(--accent)">{4}</b></div>\n    <div class="bar" style="margin-top:8px"><i style="background:var(--good);width:{5}%"></i></div>\n    <p style="color:var(--sub);font-size:.8rem;margin:8px 0 0">魚を釣ると経験値がもらえます。レベルが上がると、各ステータスが<b>ランダムに0〜3</b>上がり、<b>BPが3</b>もらえます。BPは好きなステータスに振り分けられます。</p>{6}</div>\n    <div class="list">{7}</div>\n    <div class="row"><button class="ghost" id="stReset" {8}>BPを振り直す（無料）</button></div>\n    <h2>主への挑戦目安</h2><p style="color:var(--sub);font-size:.8rem;margin:0 0 8px">強い主に、どのステータスがどのくらい必要かを診断します。主に逃げられたときも自動で表示されます。</p>\n    <div class="list">{9}</div>',
    [
      G.level,
      G.exp,
      need,
      G.bp,
      Math.min(100, (G.exp / need) * 100),
      G.lastUp
        ? T('<p style="color:var(--good);font-size:.8rem;margin:6px 0 0">前回のレベルアップ：{1}</p>', [
            G.lastUp
          ])
        : '',
      rows,
      Object.values(G.alloc).some(v => v) ? '' : 'disabled',
      AREAS.map((a, i) =>
        i <= G.boat
          ? T(
              '<div class="item"><div class="t">{1}</div><button class="buy" data-adv="{2}" style="font-family:inherit">診断</button><div class="s">{3}・{4}</div></div>',
              [
                bossOf(i).n,
                i,
                a.name,
                G.bossGot[i] ? T('討伐済み') : G.comp[i] ? T('出現中') : T('エリアをコンプすると出現')
              ]
            )
          : ''
      ).join('')
    ]
  );
  $('#p-stat')
    .querySelectorAll('[data-adv]')
    .forEach(b => (b.onclick = () => showBossAdvice(+b.dataset.adv, 0)));
  $('#p-stat')
    .querySelectorAll('[data-st]')
    .forEach(
      b =>
        (b.onclick = () => {
          if (G.bp > 0) {
            G.bp--;
            G.stat[b.dataset.st]++;
            G.alloc[b.dataset.st]++;
            save();
            hud();
            renderStat();
          }
        })
    );
  $('#stReset').onclick = () => {
    let n = 0;
    for (const k in G.alloc) {
      G.stat[k] -= G.alloc[k];
      n += G.alloc[k];
      G.alloc[k] = 0;
    }
    G.bp += n;
    save();
    hud();
    renderStat();
    toast(T('BPを{1}ポイント戻しました', [n]));
  };
}
