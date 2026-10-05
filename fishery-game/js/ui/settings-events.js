// 設定タブの、言語の切り替え・各種ボタンの動作
function bindSet(q) {
  q.insertAdjacentHTML(
    'afterbegin',
    `<h2>言語 / Language</h2><div class="row" style="margin-top:0"><button class="chip" data-lang="ja" aria-pressed="${LANG === 'ja'}">日本語</button><button class="chip" data-lang="en" aria-pressed="${LANG === 'en'}">English</button></div>`
  );
  q.querySelectorAll('[data-lang]').forEach(b => (b.onclick = () => setLang(b.dataset.lang)));
  q.querySelectorAll('[data-tg]').forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.tg;
        G[k] = G[k] ? 0 : 1;
        applyUi();
        save();
        renderSet();
        if (k === 'mute' && !G.mute) sfx(0);
      })
  );
  q.querySelectorAll('[data-fs]').forEach(
    b =>
      (b.onclick = () => {
        G.fs = +b.dataset.fs;
        applyUi();
        save();
        renderSet();
      })
  );
  renderCloudCard();
  bindCloud();
  q.querySelectorAll('[data-df]').forEach(
    b =>
      (b.onclick = () => {
        G.diff = +b.dataset.df;
        save();
        renderSet();
      })
  );
  $('#setHelp').onclick = () => {
    if (S.st === 'idle' || S.st === 'result') showHelp(0);
    else toast(T('釣りの合間に開いてね'));
  };
  $('#expCopy').onclick = () => {
    const t = JSON.stringify(G),
      ta = $('#exp');
    ta.value = t;
    ta.select();
    try {
      navigator.clipboard.writeText(t).then(
        () => toast(T('コピーしました')),
        () => toast(T('選択しました。コピーしてください'))
      );
    } catch (e) {
      toast(T('選択しました。コピーしてください'));
    }
  };
  $('#impGo').onclick = () => {
    let o = null;
    try {
      o = migrate(JSON.parse($('#imp').value.trim()));
    } catch (e) {}
    if (!o) {
      toast(T('読み込めませんでした。データを確かめてください'));
      return;
    }
    applySave(o, T('文字列を読み込む前'));
    cloudPush(true);
    toast(T('読み込みました'));
  };
  $('#reset').onclick = function () {
    if (this.dataset.arm) {
      makeBackup(G, 'local', T('最初からやり直す前'));
      G = fresh();
      S.st = 'idle';
      CREW.length = 0;
      applyUi();
      save();
      label();
      say('');
      renderAll();
      openTab('fish');
      toast(T('最初からやり直します'));
      if (Cloud.db)
        Remote.remove().then(
          () => {
            Cloud.dirty = false;
            Cloud.lastPush = 0;
            renderCloudCard();
          },
          () => {}
        );
      if (!G.seen) showHelp(0);
    } else {
      this.dataset.arm = 1;
      this.textContent = T('本当に消す？もう一度押すと確定');
    }
  };
}
