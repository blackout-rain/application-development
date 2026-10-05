/* ---------- cloud save / 引き継ぎ ----------
   Cloud は保存先の差し替え口。いまはClaudeのアーティファクト機能（ログイン中のアカウントごとの私用領域）を使う。
   ストア版では get/put/remove/getShared/putShared を、Firebase・Play Games・iCloudなどに置き換えれば、画面側はそのまま使える。 */
const Cloud = {
  kind: 'claude',
  user: null,
  db: null,
  uid: null,
  dev: null,
  status: 'checking',
  err: '',
  lastPush: 0,
  dirty: false,
  busy: false,
  timer: 0,
  remote: null
};
const useApp = () => !!window.AppCloud;
function devId() {
  try {
    let d = localStorage.getItem('umikaze-dev');
    if (!d) {
      d = Math.random().toString(36).slice(2, 10);
      localStorage.setItem('umikaze-dev', d);
    }
    return d;
  } catch (e) {
    return 'nodev';
  }
}
const hasProgress = () => G.catches > 0 || G.day > 1 || G.earned > 0;
const whenFree = fn => {
  if (!veilOpen()) fn();
  else setTimeout(() => whenFree(fn), 700);
};
const fmtTime = t => {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const sumLine = o => T('Lv.{1}・{2}日目・{3}', [o.lv || o.level || 1, o.day, yen(o.money)]);
const Remote = {
  async get() {
    if (useApp()) return AppCloud.get();
    const s = await Cloud.db.doc(`data/users/${Cloud.uid}/save`).get();
    return s.exists ? s.data() : null;
  },
  async put(d) {
    if (useApp()) return AppCloud.put(d);
    await Cloud.db.doc(`data/users/${Cloud.uid}/save`).set(d);
  },
  async remove() {
    if (useApp()) return AppCloud.remove();
    await Cloud.db.doc(`data/users/${Cloud.uid}/save`).delete();
  },
  async getShared(k) {
    const s = await Cloud.db.doc('transfer/' + k).get();
    return s.exists ? s.data() : null;
  },
  async putShared(k, d) {
    await Cloud.db.doc('transfer/' + k).set(d);
  },
  async removeShared(k) {
    await Cloud.db.doc('transfer/' + k).delete();
  }
};
function cloudStatusHtml() {
  const s = Cloud.status,
    app = Cloud.kind === 'app';
  if (s === 'checking') return T('<span style="color:var(--sub)">接続しています…</span>');
  if (s === 'signedout')
    return T(
      '<span style="color:var(--bad)">未ログイン</span><br><span style="color:var(--sub);font-size:.8rem">機種変更やアンインストールで、データが消えるおそれがあります。Googleでログインすると、クラウドに保存されます。</span>'
    );
  if (s === 'off')
    return T(
      '<span style="color:var(--bad)">この環境ではクラウド保存を使えません</span><br><span style="color:var(--sub);font-size:.8rem">Claudeにログインして開くと、自動で保存されます。</span>'
    );
  if (s === 'error')
    return T(
      '<span style="color:var(--bad)">クラウドに保存できませんでした</span><br><span style="color:var(--sub);font-size:.8rem">{1}</span>',
      [
        Cloud.err === 'not_configured'
          ? T('Firebaseの設定が未入力です（app/src/firebase-config.js）。')
          : Cloud.err === 'invalid_argument'
            ? T('このアカウントには書き込み権限がありません。')
            : T('通信の状態を確かめて、もう一度試してください。')
      ]
    );
  return `<span style="color:var(--good)">● ${app ? T('Googleでログイン中{1}　自動保存中', [Cloud.user && (Cloud.user.email || Cloud.user.name) ? `（${esc(Cloud.user.email || Cloud.user.name)}）` : '']) : T('自動保存中')}</span>${Cloud.lastPush ? T('<br><span style="color:var(--sub);font-size:.8rem">最終保存 {1}</span>', [fmtTime(Cloud.lastPush)]) : ''}`;
}
const esc = s =>
  String(s).replace(
    /[&<>"']/g,
    c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]
  );
function renderCloudCard() {
  const el = $('#cloudStatus');
  if (el) setHtml(el, cloudStatusHtml());
}
// 同期の目印：進み具合が変わると変わる文字列。「前回の同期から、この端末が変わったか」を調べるのに使う
const sig = o => [o.earned, o.catches, o.day, o.min, o.level, o.exp, o.money].join('|');
const docHas = d => !!d && ((d.day || 1) > 1 || (d.lv || 1) > 1 || (d.earned || 0) > 0);
// クラウドのデータ a と、この端末のデータ b の、進み具合を比べる（a が進んでいれば正、遅れていれば負）
function cmpProg(a, b) {
  if (a.earned !== undefined && a.earned !== b.earned) return a.earned > b.earned ? 1 : -1;
  const al = a.lv || 1,
    bl = b.level || 1;
  if (al !== bl) return al > bl ? 1 : -1;
  const ad = a.day || 1,
    bd = b.day || 1;
  if (ad !== bd) return ad > bd ? 1 : -1;
  return 0;
}
// 上書きされるデータを、1つだけ端末の中に控える（何も進んでいないデータは控えない）
const BKEY = 'umikaze-fishery-backup';
const hasProgressOf = o => (o.catches || 0) > 0 || (o.day || 1) > 1 || (o.earned || 0) > 0;
function makeBackup(o, from, reason) {
  try {
    if (!o || !hasProgressOf(o)) return;
    localStorage.setItem(
      BKEY,
      JSON.stringify({
        at: Date.now(),
        from,
        reason,
        json: JSON.stringify(o),
        lv: o.level,
        day: o.day,
        money: o.money
      })
    );
  } catch (e) {}
}
function getBackup() {
  try {
    return JSON.parse(localStorage.getItem(BKEY));
  } catch (e) {
    return null;
  }
}
async function cloudPush(force) {
  if (!Cloud.db || Cloud.busy) return false;
  if (!force && !Cloud.dirty) return true;
  Cloud.busy = true;
  let ok = false,
    redo = false;
  try {
    // 自動の保存では、書き込む前に「他の端末が先に進めていないか」を確かめる（上書きで進み具合を失わないため）
    if (!force) {
      const d = await Remote.get();
      if (d && docHas(d) && d.savedAt !== G.syncAt && d.sig !== sig(G) && !(d.dev === Cloud.dev && !G.syncAt))
        redo = true;
    }
    if (!redo) {
      const s = sig(G),
        at = Date.now();
      await Remote.put({
        json: JSON.stringify(G),
        savedAt: at,
        dev: Cloud.dev,
        v: 1,
        lv: G.level,
        day: G.day,
        money: G.money,
        earned: G.earned,
        sig: s
      });
      G.syncAt = at;
      G.syncSig = s;
      try {
        localStorage.setItem(KEY, JSON.stringify(G));
      } catch (e) {}
      Cloud.dirty = false;
      Cloud.lastPush = at;
      Cloud.status = 'ready';
      Cloud.err = '';
      ok = true;
    }
  } catch (e) {
    Cloud.status = 'error';
    Cloud.err = (e && e.code) || '';
  }
  Cloud.busy = false;
  renderCloudCard();
  if (redo) {
    try {
      await cloudDecide();
    } catch (e) {}
  }
  return ok;
}
// ゲームを保存するたびに呼ばれる。15秒に1回までまとめて送る
function cloudDirty() {
  try {
    if (!Cloud.db || !hasProgress() || G.syncSig === sig(G)) return;
    Cloud.dirty = true;
    if (!Cloud.timer)
      Cloud.timer = setTimeout(() => {
        Cloud.timer = 0;
        cloudPush(false);
      }, 15000);
  } catch (e) {}
}
// 保存データを丸ごと入れ替える。入れ替える前のデータは、控えとして残す
// 夕方（18時）を過ぎたまま保存されていたら、読み込んだあとで、夜の精算をする
function settleNight() {
  if (!G.home && G.min >= DAY_END) {
    S.st = 'result';
    dayEnd();
  }
}
function applySave(o, reason, syncAt) {
  makeBackup(G, 'local', reason || T('上書きされる前'));
  G = o;
  if (syncAt) {
    G.syncAt = syncAt;
    G.syncSig = sig(G);
  }
  S.st = 'idle';
  CREW.length = 0;
  syncCrew(true);
  applyUi();
  save();
  label();
  say('');
  renderAll();
  settleNight();
  if (G.home) openTab('home');
  else openTab('fish');
}
// クラウドのデータを、確認なしで読み込む
function autoLoad(d, reason) {
  let o = null;
  try {
    o = migrate(JSON.parse(d.json));
  } catch (e) {}
  if (!o) return false;
  applySave(o, reason || T('クラウドから読み込む前'), d.savedAt);
  Cloud.lastPush = d.savedAt;
  Cloud.dirty = false;
  toast(T('クラウドの最新データを読み込みました（{1}）。違っていたら、設定から元に戻せます', [sumLine(d)]));
  sfx(2);
  return true;
}
// 衝突したとき（両方が進んでいるときなど）だけ、どちらを使うか聞く
function askRestore(d, mode) {
  whenFree(() => {
    const c = cmpProg(d, G),
      manual = mode === 'manual';
    const rec = c > 0 ? T('クラウド') : c < 0 ? T('この端末') : '';
    $('#box').innerHTML = T(
      '<h3>{1}</h3>\n      <p style="margin:0 0 8px;color:var(--sub)">{2}{3}</p>\n      <div class="card" style="margin:0 0 10px"><div class="kv"><span>クラウド</span><b class="num">{4}</b><span>保存日時</span><b class="num">{5}</b><span>この端末</span><b class="num">{6}</b></div></div>\n      <p style="margin:0 0 10px;color:var(--sub);font-size:.8rem">どちらを選んでも、置き換わるほうのデータは、控えとして残ります。設定から元に戻せます。</p>\n      <button class="big" id="rsCloud">クラウドのデータで続ける</button>\n      <button class="ghost" id="rsLocal" style="width:100%;margin-top:8px">この端末のデータで続ける（クラウドは上書き）</button>',
      [
        manual ? T('クラウドから読み込む') : T('別の端末でも進んでいます'),
        manual ? T('クラウドのデータに入れ替えますか？') : T('どちらのデータで続けますか？'),
        rec && !manual
          ? T('<br>進みが大きいのは、<b style="color:var(--accent)">{1}</b>のほうです。', [rec])
          : '',
        sumLine(d),
        fmtTime(d.savedAt),
        sumLine({lv: G.level, day: G.day, money: G.money})
      ]
    );
    $('#veil').hidden = false;
    $('#rsCloud').onclick = () => {
      $('#veil').hidden = true;
      if (!autoLoad(d)) toast(T('読み込めませんでした'));
    };
    $('#rsLocal').onclick = () => {
      $('#veil').hidden = true;
      try {
        makeBackup(migrate(JSON.parse(d.json)), 'cloud', T('クラウドを上書きする前'));
      } catch (e) {}
      cloudPush(true);
    };
  });
}
// クラウドと端末を比べて、読み込む・保存する・聞く、のどれかを行う（起動時・ログイン直後・画面に戻ったとき）
// 戻り値: 'none'(クラウドにデータなし) 'synced'(同じ) 'loaded'(読み込んだ) 'pushed'(保存した) 'asked'(確認を出した) 'error'
async function cloudDecide() {
  const d = await Remote.get();
  Cloud.status = 'ready';
  if (!docHas(d)) {
    if (hasProgress()) {
      await cloudPush(true);
      return 'pushed';
    }
    return 'none';
  }
  Cloud.lastPush = d.savedAt;
  const mine = sig(G);
  if (!G.syncAt && d.dev === Cloud.dev) G.syncAt = d.savedAt; // 前の版で、この端末が保存したもの
  if (d.sig === mine) {
    G.syncAt = d.savedAt;
    G.syncSig = mine;
    return 'synced';
  }
  if (!hasProgress()) return autoLoad(d) ? 'loaded' : 'error'; // 新しい端末：確認なしで読み込む
  const changed = d.savedAt !== G.syncAt,
    dirty = G.syncSig !== mine,
    c = cmpProg(d, G);
  if (!changed) {
    if (dirty) {
      await cloudPush(true);
      return 'pushed';
    }
    return 'synced';
  }
  if (!dirty && c >= 0) return autoLoad(d) ? 'loaded' : 'error'; // この端末は変えていない＋クラウドが進んでいる：確認なしで読み込む
  if (dirty && c < 0) {
    await cloudPush(true);
    return 'pushed';
  } // この端末のほうが進んでいる：保存する
  askRestore(d, 'conflict');
  return 'asked'; // 進みが逆転している・両方が進んでいる：聞く
}
// 開いたままの画面に戻ってきたとき、クラウドの新しさを確かめる
let lastCheck = 0;
async function cloudRecheck() {
  if (!Cloud.db || Cloud.busy || veilOpen() || Date.now() - lastCheck < 10000) return;
  if (S.st !== 'idle' && S.st !== 'result') return;
  lastCheck = Date.now();
  try {
    await cloudDecide();
  } catch (e) {}
  renderCloudCard();
}
async function cloudInit() {
  try {
    Cloud.dev = devId();
    if (useApp()) {
      Cloud.kind = 'app';
      const u = await AppCloud.init();
      if (!u) {
        Cloud.status = 'signedout';
        renderCloudCard();
        return;
      }
      Cloud.user = u;
      Cloud.uid = u.uid;
      Cloud.db = true;
      await cloudDecide();
    } else {
      const c = window.claude;
      if (!c || !c.use) {
        Cloud.status = 'off';
        renderCloudCard();
        return;
      }
      const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
      const uid = user ? await user.id() : null;
      if (!db || !uid) {
        Cloud.status = 'off';
        renderCloudCard();
        return;
      }
      Cloud.db = db;
      Cloud.uid = uid;
      await cloudDecide();
    }
  } catch (e) {
    Cloud.status = 'error';
    Cloud.err = (e && (e.code || e.message)) || '';
  }
  renderCloudCard();
  hud();
}
// Googleログイン（ストア版）。戻り値: 'asked'=引き継ぎ確認を出した / 'none'=クラウドにデータなし / 'cancel' / 'error'
async function loginGoogle() {
  try {
    const u = await AppCloud.signIn();
    Cloud.user = u;
    Cloud.uid = u.uid;
    Cloud.db = true;
    Cloud.dev = devId();
    Cloud.status = 'ready';
    Cloud.err = '';
    const r = await cloudDecide();
    renderCloudCard();
    if (curTab === 'set') renderSet();
    hud();
    if (r === 'none' && hasProgress()) toast(T('ログインしました。データをクラウドに保存しました'));
    else if (r === 'synced' || r === 'pushed') toast(T('ログインしました'));
    return r;
  } catch (e) {
    if (e && e.code === 'cancelled') return 'cancel';
    Cloud.status = 'error';
    Cloud.err = (e && (e.code || e.message)) || '';
    renderCloudCard();
    toast(T('ログインできませんでした'));
    return 'error';
  }
}
async function logoutGoogle() {
  try {
    await cloudPush(true);
    await AppCloud.signOut();
  } catch (e) {}
  Cloud.user = null;
  Cloud.uid = null;
  Cloud.db = null;
  Cloud.status = 'signedout';
  if (curTab === 'set') renderSet();
  hud();
  toast(T('ログアウトしました'));
}
function askDeleteAccount() {
  $('#box').innerHTML = T(
    '<h3>アカウントを削除</h3><p style="margin:0 0 10px">クラウドに保存したデータと、Googleアカウントとの紐づけを<b>完全に削除</b>します。元に戻せません。</p><p style="margin:0 0 12px;color:var(--sub);font-size:.85rem">この端末の中のデータは、そのまま残ります。</p>\n    <button class="big" id="delGo" style="background:var(--bad);color:#fff">削除する</button><button class="ghost" id="delNo" style="width:100%;margin-top:8px">やめる</button>'
  );
  $('#veil').hidden = false;
  $('#delNo').onclick = () => ($('#veil').hidden = true);
  $('#delGo').onclick = async () => {
    $('#delGo').disabled = true;
    try {
      if (Cloud.timer) {
        clearTimeout(Cloud.timer);
        Cloud.timer = 0;
      }
      await Remote.remove();
      await AppCloud.deleteAccount();
      Cloud.user = null;
      Cloud.uid = null;
      Cloud.db = null;
      Cloud.dirty = false;
      Cloud.lastPush = 0;
      Cloud.status = 'signedout';
      $('#veil').hidden = true;
      if (curTab === 'set') renderSet();
      hud();
      toast(T('アカウントとクラウドのデータを削除しました'));
    } catch (e) {
      $('#veil').hidden = true;
      toast(T('削除できませんでした。もう一度ログインしてから、お試しください'));
    }
  };
}
// 初回（データがない端末）の選択。引き継ぎたい人はここからログインできる
function showWelcome() {
  whenFree(() => {
    $('#box').innerHTML = T(
      '<h3>ようこそ！</h3><p style="margin:0 0 12px;color:var(--sub)">はじめて遊ぶ場合も、前の端末から引き継ぐ場合も、ここから始められます。</p>\n      <button class="big" id="wcNew">はじめから遊ぶ</button>\n      <button class="ghost" id="wcLogin" style="width:100%;margin-top:8px">Googleでログインして引き継ぐ</button>'
    );
    $('#veil').hidden = false;
    $('#wcNew').onclick = () => {
      $('#veil').hidden = true;
      showHelp(0);
    };
    $('#wcLogin').onclick = async () => {
      $('#veil').hidden = true;
      const r = await loginGoogle();
      if (r === 'asked' || r === 'loaded') return;
      if (r === 'none' || r === 'synced' || r === 'pushed') toast(T('引き継げるデータはありませんでした'));
      if (!G.seen) showHelp(0);
    };
  });
}
// 2日目以降、一度だけ「ログインしておくと安心」をお知らせする
function showNudge() {
  whenFree(() => {
    $('#box').innerHTML = T(
      '<h3>データを守りましょう</h3><p style="margin:0 0 12px">Googleでログインしておくと、機種変更やアンインストールのあとも、データを引き継げます。</p>\n      <button class="big" id="ngGo">Googleでログインする</button><button class="ghost" id="ngNo" style="width:100%;margin-top:8px">あとで</button>'
    );
    $('#veil').hidden = false;
    $('#ngNo').onclick = () => ($('#veil').hidden = true);
    $('#ngGo').onclick = () => {
      $('#veil').hidden = true;
      loginGoogle();
    };
  });
}
// 引き継ぎコード：アカウントが違う端末へ移すときなどに使う（8文字・24時間有効・1回きり）
const CODE_CH = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function newCode() {
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  let c = '';
  a.forEach(v => (c += CODE_CH[v % CODE_CH.length]));
  return c.slice(0, 4) + '-' + c.slice(4);
}
async function issueCode() {
  if (!Cloud.db) {
    toast(T('この環境ではコードを使えません'));
    return;
  }
  try {
    const code = newCode();
    await Remote.putShared(code, {
      json: JSON.stringify(G),
      exp: Date.now() + 24 * 3600e3,
      lv: G.level,
      day: G.day,
      money: G.money,
      v: 1
    });
    $('#box').innerHTML = T(
      '<h3>引き継ぎコード</h3><p style="margin:0 0 8px;color:var(--sub)">新しい端末の「設定」で、このコードを入力します。24時間のあいだ、1回だけ使えます。</p>\n      <div class="card" style="text-align:center;font-size:2rem;font-weight:900;letter-spacing:.12em;font-family:var(--mono)" id="codeShow">{1}</div>\n      <div class="row"><button class="ghost" id="codeCopy" style="flex:1">コピー</button><button class="big" id="codeOk" style="flex:1;width:auto">閉じる</button></div>',
      [code]
    );
    $('#veil').hidden = false;
    $('#codeOk').onclick = () => ($('#veil').hidden = true);
    $('#codeCopy').onclick = () => {
      try {
        navigator.clipboard.writeText(code).then(
          () => toast(T('コピーしました')),
          () => toast(T('コードを控えてください'))
        );
      } catch (e) {
        toast(T('コードを控えてください'));
      }
    };
  } catch (e) {
    toast(T('コードを発行できませんでした'));
  }
}
async function useCode(raw) {
  if (!Cloud.db) {
    toast(T('この環境ではコードを使えません'));
    return;
  }
  const c = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (c.length !== 8) {
    toast(T('コードは8文字です（例 ABCD-EFGH）'));
    return;
  }
  const key = c.slice(0, 4) + '-' + c.slice(4);
  try {
    const d = await Remote.getShared(key);
    if (!d || d.exp < Date.now()) {
      toast(T('コードが見つからないか、期限が切れています'));
      return;
    }
    $('#box').innerHTML = T(
      '<h3>データを引き継ぎます</h3><p style="margin:0 0 8px;color:var(--sub)">この端末の今のデータは、置き換えられます。</p>\n      <div class="card" style="margin:0 0 10px"><div class="kv"><span>引き継ぐデータ</span><b class="num">{1}</b><span>この端末</span><b class="num">{2}</b></div></div>\n      <button class="big" id="cdGo">引き継ぐ</button><button class="ghost" id="cdNo" style="width:100%;margin-top:8px">やめる</button>',
      [
        sumLine(d),
        hasProgress() ? sumLine({lv: G.level, day: G.day, money: G.money}) : T('まだ始めていません')
      ]
    );
    $('#veil').hidden = false;
    $('#cdNo').onclick = () => ($('#veil').hidden = true);
    $('#cdGo').onclick = async () => {
      let o = null;
      try {
        o = migrate(JSON.parse(d.json));
      } catch (e) {}
      $('#veil').hidden = true;
      if (!o) {
        toast(T('読み込めませんでした'));
        return;
      }
      applySave(o, T('引き継ぎコードを使う前'));
      try {
        await Remote.removeShared(key);
      } catch (e) {}
      cloudPush(true);
      toast(T('引き継ぎました'));
      sfx(2);
    };
  } catch (e) {
    toast(T('読み込めませんでした。通信を確かめてください'));
  }
}
