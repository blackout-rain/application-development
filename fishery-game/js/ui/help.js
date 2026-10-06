/* ---------- 遊び方 ----------
   はじめての人には、基本の4ページだけを順に見せる（intro）。あとから開くと、分類ごとの目次を出す。
   目次から読みたい項目を選び、同じ分類の前後の項目へ移れる。未解放の機能の項目は、解放されるまで出さない。 */
const HELP_CATS = [
  {k: 'basic', n: T('はじめに')},
  {k: 'fishing', n: T('釣りのコツ')},
  {k: 'biz', n: T('経営')},
  {k: 'extra', n: T('やりこみ・イベント')},
  {k: 'tips', n: T('便利な機能')}
];
const helpVisible = () => HELP.filter(x => !x.k || feat(x.k));

// 入口：はじめての人は案内（intro）、それ以外は目次
function showHelp(i = 0) {
  if (!G.seen) {
    if (!heroSet())
      showHeroSetup(() => showHelpIntro(0)); // はじめての人は、先に主人公の名前と性別を決める
    else showHelpIntro(i);
  } else showHelpIndex();
}

function helpFinish(skipped) {
  G.seen = 1;
  save();
  $('#veil').hidden = true;
  openTab(G.home ? 'home' : 'fish');
  say(
    heroName()
      ? T('{1}さん、「投げる」を押して釣りを始めよう。', [heroName()])
      : T('「投げる」を押して釣りを始めよう。')
  );
  if (skipped) toast(T('遊び方は、右上の「遊び方」か、設定タブで、いつでも見られます'));
}

// はじめての人向け：基本の数ページを、順に
function showHelpIntro(i = 0) {
  const L = HELP.filter(x => x.intro),
    h = L[i] || L[0],
    last = i >= L.length - 1;
  $('#box').innerHTML = T(
    '<div class="help"><h3>{1}</h3>{2}<div class="row"><button class="ghost" id="hp" {3}>戻る</button><button class="big" id="hn" style="flex:1;width:auto">{4}</button>{5}</div><p class="dots">{6} / {7}</p></div>',
    [
      h.t,
      h.b,
      i ? '' : 'disabled',
      last ? T('はじめる') : T('次へ'),
      last ? '' : T('<button class="ghost" id="hs">スキップ</button>'),
      i + 1,
      L.length
    ]
  );
  $('#veil').hidden = false;
  $('#hp').onclick = () => showHelpIntro(i - 1);
  $('#hn').onclick = () => (last ? helpFinish(false) : showHelpIntro(i + 1));
  const hs = $('#hs');
  if (hs) hs.onclick = () => helpFinish(true);
}

// 目次：分類ごとに、読める項目を並べる
function showHelpIndex() {
  const vis = helpVisible();
  const cats = HELP_CATS.map(c => {
    const items = vis.filter(x => x.c === c.k);
    if (!items.length) return '';
    return `<div class="hcat"><h4>${c.n}</h4><div class="hgrid">${items
      .map(x => `<button class="chip" data-ht="${HELP.indexOf(x)}">${x.t}</button>`)
      .join('')}</div></div>`;
  }).join('');
  $('#box').innerHTML = T(
    '<div class="help"><h3>遊び方</h3><p class="hint">読みたい項目を選んでください。</p>{1}<div class="row"><button class="big" id="hc" style="flex:1;width:auto">閉じる</button></div></div>',
    [cats]
  );
  $('#veil').hidden = false;
  $('#box')
    .querySelectorAll('[data-ht]')
    .forEach(b => (b.onclick = () => showHelpTopic(+b.dataset.ht)));
  $('#hc').onclick = () => ($('#veil').hidden = true);
}

// 1つの項目：同じ分類の前後へ移れる。「目次」で戻る
function showHelpTopic(idx) {
  const h = HELP[idx],
    vis = helpVisible().filter(x => x.c === h.c),
    n = vis.indexOf(h),
    cat = HELP_CATS.find(c => c.k === h.c);
  $('#box').innerHTML = T(
    '<div class="help"><button class="ghost hback" id="hl">← 目次</button> <span class="hcn">{1}</span><h3>{2}</h3>{3}<div class="row"><button class="ghost" id="hp" {4}>前へ</button><button class="ghost" id="hn" {5}>次へ</button><button class="big" id="hc" style="flex:1;width:auto">閉じる</button></div><p class="dots">{6} / {7}</p></div>',
    [cat.n, h.t, h.b, n > 0 ? '' : 'disabled', n < vis.length - 1 ? '' : 'disabled', n + 1, vis.length]
  );
  $('#veil').hidden = false;
  $('#hl').onclick = showHelpIndex;
  $('#hp').onclick = () => showHelpTopic(HELP.indexOf(vis[n - 1]));
  $('#hn').onclick = () => showHelpTopic(HELP.indexOf(vis[n + 1]));
  $('#hc').onclick = () => ($('#veil').hidden = true);
}
