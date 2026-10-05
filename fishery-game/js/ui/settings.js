/* ---------- settings ---------- */
const TG = [
  ['mute', T('効果音'), T('釣れたときやランクアップの音'), 1],
  ['noFx', T('画面演出'), T('紙吹雪・画面の揺れ・光の演出'), 1],
  ['noVib', T('振動'), T('レア魚のアタリで振動（対応する端末のみ）'), 1],
  ['autoSell', T('自動売却'), T('魚箱がいっぱいのとき、自動で全部売ります（釣りの手間を減らします）'), 0]
];
const FSN = [T('標準'), T('大'), T('特大')],
  FSV = [1, 1.2, 1.4];
function applyUi() {
  document.documentElement.style.setProperty('--fs', FSV[G.fs || 0]);
}
function backupCard() {
  const b = getBackup();
  return T('<div class="card"><b>直前のデータ（控え）</b>{1}</div>', [
    b
      ? T(
          '<div class="kv" style="margin-top:6px"><span>控えた日時</span><b class="num">{1}</b><span>内容</span><b class="num">Lv.{2}・{3}日目・{4}</b><span>理由</span><b>{5}</b></div><button class="ghost" id="bkRestore" style="margin-top:8px">この控えに戻す</button>',
          [fmtTime(b.at), b.lv || 1, b.day || 1, yen(b.money || 0), esc(T(b.reason || ''))]
        )
      : T(
          '<div style="color:var(--sub);font-size:.8rem;margin-top:4px">データが置き換わる直前に、自動で1つだけ控えます。いまは、控えはありません。</div>'
        )
  ]);
}
function askRestoreBackup() {
  const b = getBackup();
  if (!b) {
    toast(T('控えはありません'));
    return;
  }
  $('#box').innerHTML = T(
    '<h3>直前のデータに戻しますか？</h3>\n    <div class="card" style="margin:0 0 10px"><div class="kv"><span>控え（{1}）</span><b class="num">Lv.{2}・{3}日目・{4}</b><span>いまのデータ</span><b class="num">Lv.{5}・{6}日目・{7}</b></div></div>\n    <p style="margin:0 0 10px;color:var(--sub);font-size:.8rem">いまのデータは、控えとして残ります。もう一度押すと、入れ替わります。</p>\n    <button class="big" id="bkGo">控えに戻す</button><button class="ghost" id="bkNo" style="width:100%;margin-top:8px">やめる</button>',
    [fmtTime(b.at), b.lv || 1, b.day || 1, yen(b.money || 0), G.level, G.day, yen(G.money)]
  );
  $('#veil').hidden = false;
  $('#bkNo').onclick = () => ($('#veil').hidden = true);
  $('#bkGo').onclick = () => {
    let o = null;
    try {
      o = migrate(JSON.parse(b.json));
    } catch (e) {}
    $('#veil').hidden = true;
    if (!o) {
      toast(T('戻せませんでした'));
      return;
    }
    applySave(o, T('控えに戻す前'));
    cloudPush(true);
    if (curTab === 'set') renderSet();
    toast(T('控えに戻しました'));
  };
}
function cloudSection() {
  const app = Cloud.kind === 'app',
    signed = Cloud.status !== 'signedout' && !!Cloud.user;
  if (app && !signed)
    return T(
      '<div class="card"><div id="cloudStatus"></div>\n      <div style="color:var(--sub);font-size:.8rem;margin:8px 0">Googleでログインすると、進み具合が自動でクラウドに保存されます。機種変更のときは、新しい端末で同じGoogleアカウントにログインするだけで、引き継げます。</div>\n      <button class="big" id="loginBtn">Googleでログイン</button></div>{1}',
      [backupCard()]
    );
  if (app)
    return T(
      '<div class="card"><div id="cloudStatus"></div>\n      <div style="color:var(--sub);font-size:.8rem;margin-top:8px">新しい端末で、同じGoogleアカウントにログインすると、最新のデータが自動で読み込まれます。</div>\n      <div class="row"><button class="ghost" id="cloudNow">今すぐ保存</button><button class="ghost" id="cloudLoad">クラウドから読み込む</button><button class="ghost" id="logoutBtn">ログアウト</button></div></div>\n    {1}\n    <button class="ghost" id="delAcct" style="color:var(--bad);border-color:var(--bad)">アカウントとクラウドのデータを削除</button>',
      [backupCard()]
    );
  return T(
    '<div class="card"><div id="cloudStatus"></div>\n      <div style="color:var(--sub);font-size:.8rem;margin-top:8px">進み具合は、ログイン中のアカウントに自動で保存されます。新しい端末で、同じアカウントでこのゲームを開くと、最新のデータが自動で読み込まれます。両方で進めてしまったときだけ、どちらを使うか聞かれます。</div>\n      <div class="row"><button class="ghost" id="cloudNow">今すぐ保存</button><button class="ghost" id="cloudLoad">クラウドから読み込む</button></div></div>\n    {1}\n    {2}',
    [
      backupCard(),
      Cloud.status === 'off'
        ? ''
        : T(
            '<div class="card"><b>引き継ぎコード</b>\n      <div style="color:var(--sub);font-size:.8rem;margin:4px 0 8px">アカウントが違う端末へ移すときは、コードを使います。</div>\n      <button class="big" id="codeIssue">引き継ぎコードを発行する</button>\n      <div class="row"><input id="codeIn" placeholder="ABCD-EFGH" maxlength="9" autocapitalize="characters" autocomplete="off" aria-label="引き継ぎコード" style="flex:1;min-width:0;font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase;background:var(--panel2);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:10px"><button class="ghost" id="codeUse">コードで引き継ぐ</button></div></div>'
          )
    ]
  );
}
function bindCloud() {
  const on = (id, fn) => {
    const e = document.getElementById(id);
    if (e) e.onclick = fn;
  };
  on('cloudNow', async () => {
    if (!Cloud.db) {
      toast(T('クラウド保存を使えません'));
      return;
    }
    const ok = await cloudPush(true);
    toast(ok ? T('クラウドに保存しました') : T('保存できませんでした'));
  });
  on('cloudLoad', async () => {
    if (!Cloud.db) {
      toast(T('クラウド保存を使えません'));
      return;
    }
    try {
      const d = await Remote.get();
      if (!d) {
        toast(T('クラウドにデータがありません'));
        return;
      }
      askRestore(d, 'manual');
    } catch (e) {
      toast(T('読み込めませんでした'));
    }
  });
  on('codeIssue', issueCode);
  on('codeUse', () => useCode($('#codeIn').value));
  on('bkRestore', askRestoreBackup);
  on('loginBtn', () => loginGoogle());
  on('logoutBtn', logoutGoogle);
  on('delAcct', askDeleteAccount);
}
// 通知（アプリ版のみ。Webでは何もしない）：アプリを閉じたあと、留守の水揚げ（8時間）とデイリーボーナスの受け取り忘れを知らせる
function notifyPlan() {
  if (!window.AppNotify || G.noNotif) return;
  const now = Date.now(),
    items = [];
  if (G.crew > 0)
    items.push({
      k: 'away',
      at: now + 8 * 3600e3,
      title: T('今日も大漁ですか？'),
      body: T('漁師たちの留守の水揚げが満タンです。受け取りに戻ろう！')
    });
  const d = new Date();
  d.setHours(19, 0, 0, 0);
  if (!(dailyReady() && d.getTime() > now)) d.setDate(d.getDate() + 1);
  items.push({
    k: 'daily',
    at: d.getTime(),
    title: T('今日も大漁ですか？'),
    body: T('今日のデイリーボーナス（おまかせ釣り券・食事券）を受け取ろう')
  });
  AppNotify.schedule(items);
}
function setLang(l) {
  if (l === LANG) return;
  try {
    localStorage.setItem('umikaze-lang', l);
  } catch (e) {}
  save();
  location.reload();
}
function renderSet() {
  const tg = toggleItemsHtml();
  const df = difficultyChipsHtml();
  const got = NORM.filter(s => G.dex[s.n]).length;
  const fz = fontSizeChipsHtml();
  $('#p-set').innerHTML = T(
    '<h2>文字の大きさ</h2><div class="row" style="margin-top:0">{1}</div><p class="hint">選ぶと、画面全体の文字が大きくなります。</p>\n    <h2>表示と音</h2><div class="list">{2}</div>\n    <h2>難易度</h2><div class="row" style="margin-top:0">{3}</div><p class="hint">釣りのときのテンションの上がりやすさが変わります。（かんたん：×0.8／ふつう：×1／むずかしい：×1.3）</p>\n    <h2>遊び方</h2><button class="ghost" id="setHelp">遊び方をもう一度見る</button>\n    <h2>これまでの記録</h2><div class="card"><div class="kv"><span>プレイ日数</span><b class="num">{4}日</b><span>釣った魚</span><b class="num">{5}匹</b><span>累計売上</span><b class="num">{6}</b><span>図鑑</span><b class="num">{7}/{8}</b><span>レベル</span><b class="num">Lv.{9}</b></div></div>\n    <h2>データの引き継ぎ（機種変更）</h2>{10}\n    <details style="margin-top:6px"><summary style="cursor:pointer;color:var(--sub)">その他の方法（文字列で書き出し・読み込み）</summary>\n      <textarea id="exp" readonly aria-label="書き出したデータ" style="margin-top:8px"></textarea><div class="row"><button class="ghost" id="expCopy">データを書き出してコピー</button></div>\n      <textarea id="imp" placeholder="ここに書き出したデータを貼り付け" aria-label="読み込むデータ" style="margin-top:12px"></textarea><div class="row"><button class="ghost" id="impGo">読み込む</button></div></details>\n    <h2>データ</h2><button class="ghost" id="reset">最初からやり直す</button>',
    [fz, tg, df, G.day, G.catches, yen(G.earned), got, NORM.length, G.level, cloudSection()]
  );
  bindSet($('#p-set'));
}

function hint() {
  const el = $('#hint'),
    a = G.area,
    l = areaSp(a),
    f = l.filter(s => G.dex[s.n]).length;
  let t = G.comp[a]
    ? G.bossGot[a]
      ? T('<b>{1}は制覇済み。</b>主は倒した。{2}', [
          AREAS[a].name,
          legOk(a) ? T('<b>伝説の主</b>が、まれに姿を見せる…') : T('それでも低確率で、また姿を見せる…')
        ])
      : T('<b>{1}を制覇！</b> 低確率で<b>主</b>が現れます。とても強いので、準備を整えて挑もう。', [
          AREAS[a].name
        ])
    : T(
        '{1}の図鑑 <b class="num">{2}/{3}</b>。全種類釣るとコンプボーナス（祝い金・BP・売値+5%）。さらに<b>主</b>が現れます。',
        [AREAS[a].name, f, l.length]
      );
  if (G.boat < BOATS.length) {
    const b = BOATS[G.boat],
      n = AREAS[G.boat + 1].name;
    t += `<br>${G.money >= b.c ? T('<b>{1}が買えます！</b> 「自宅・設備」タブの「船」で買うと{2}に出られます。', [b.n, n]) : T('{1}へは「自宅・設備」タブの「船」で{2}（{3}）を買うと行けます。あと<b class="num">{4}</b>。', [n, b.n, yen(b.c), yen(b.c - G.money)])}`;
  }
  el.innerHTML = t;
  el.hidden = false;
}
$('#help').onclick = () => {
  if (S.st === 'idle' || S.st === 'result') showHelp(0);
  else toast(T('釣りの合間に開いてね'));
};
$('#rankbox').onclick = () => {
  if (!veilOpen()) showRanks();
};
$('#rankbox').onkeydown = e => {
  if (e.key === 'Enter' && !veilOpen()) showRanks();
};
$('#lvrow').onclick = () => {
  if (!veilOpen()) openTab('stat');
};
$('#auto1').onclick = () => autoFish(1);
$('#autoAll').onclick = () => autoFish(99);
$('#lvrow').onkeydown = e => {
  if (e.key === 'Enter' && !veilOpen()) openTab('stat');
};
const act = $('#act');
act.addEventListener('pointerdown', e => {
  e.preventDefault();
  press();
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
  act.addEventListener(ev, () => {
    release();
    label();
  })
);
addEventListener('keydown', e => {
  if (
    e.code === 'Space' &&
    !e.repeat &&
    !/INPUT|TEXTAREA/.test(e.target.tagName) &&
    e.target.tagName !== 'BUTTON' &&
    e.target.id !== 'rankbox' &&
    e.target.id !== 'lvrow' &&
    !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)
  ) {
    e.preventDefault();
    press();
  }
});
addEventListener('keyup', e => {
  if (e.code === 'Space') {
    release();
    label();
  }
});
$('#home').onclick = () => {
  if (G.home) return;
  if (S.st === 'idle' || S.st === 'result') {
    if (G.min < DAY_END) crewSim(Math.ceil((DAY_END - G.min) / ATTEMPT_MIN));
    G.min = DAY_END;
    S.st = 'result';
    S.t = 1;
    dayEnd();
  } else toast(T('釣りの合間に帰港できます'));
};
