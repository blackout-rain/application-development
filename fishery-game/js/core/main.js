let last = performance.now();
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000);
  G.playSec += Math.min(1, (ts - last) / 1000); // プレイ時間（画面を見ている間だけ。長い空白は1秒までにする）
  last = ts;
  if (!veilOpen()) {
    if (S.st === 'wait') {
      S.t -= dt;
      if (S.t <= 0) {
        rollFish();
        S.st = 'bite';
        S.t = 1.4 + 0.05 * G.lv.bait + SE.hookWindow(sx('agi'));
        say(
          S.tier >= 4
            ? T('水面が大きく盛り上がった…！ 主だ！！ アワセろ！')
            : S.v
              ? T('アタリ！ いつもと色が違う…！？ アワセ！')
              : S.tier >= 2
                ? T('ものすごいアタリだ！！ 逃すな、アワセ！')
                : S.tier === 1
                  ? T('アタリ！ いつもと違う引きだ…！ アワセ！')
                  : T('アタリ！ 今だ、アワセ！')
        );
        if (S.tier) vibe(S.tier);
        if (S.tier >= 4 && !G.noFx) FX.shake = 0.4;
        label();
      }
    } else if (S.st === 'bite') {
      S.t -= dt;
      if (S.t <= 0) {
        say(
          S.tier >= 4
            ? T('逃した…今のは主だったかもしれない！')
            : S.tier
              ? T('逃した…今のはレアな魚だったかも！')
              : T('エサだけ取られた…')
        );
        S.ok = false;
        end(false);
      }
    } else if (S.st === 'fight') {
      fightStep(dt);
    } else if (S.st === 'result') {
      S.t += dt;
    }
  }
  if (S.st === 'fight' && S.f.struggle && !G.noFx) {
    S.f.spl = (S.f.spl || 0) - dt;
    if (S.f.spl <= 0) {
      S.f.spl = 0.06;
      const x = fishX(S.f);
      for (let k = 0; k < 3; k++)
        PT.push({
          x: x + rnd(-20, 20),
          y: 150,
          vx: rnd(-50, 50),
          vy: rnd(-170, -90),
          g: 400,
          life: rnd(0.4, 0.8),
          c: '#dff3ff',
          r: rnd(1.5, 2.8),
          s: false
        });
    }
  }
  syncCrew();
  crewStep(dt);
  for (let i = PT.length - 1; i >= 0; i--) {
    const q = PT[i];
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += q.g * dt;
    q.life -= dt;
    if (q.life <= 0 || q.y > 260) PT.splice(i, 1);
  }
  if (FX.rain > 0) {
    FX.rain -= dt;
    for (let k = 0; k < 2; k++)
      PT.push({
        x: rnd(0, 480),
        y: -5,
        vx: rnd(-10, 10),
        vy: rnd(60, 140),
        g: 30,
        life: rnd(1.2, 2),
        c: Math.random() < 0.5 ? '#ffd24a' : '#fff',
        r: rnd(1.5, 3),
        s: true
      });
  }
  FX.flash = Math.max(0, FX.flash - dt * 1.2);
  FX.shake = Math.max(0, FX.shake - dt);
  const f = S.f;
  $('#tens').style.width = (S.st === 'fight' ? f.tens : 0) + '%';
  $('#tens').classList.toggle('hot', S.st === 'fight' && f.tens > 75);
  $('#prog').style.width = (S.st === 'fight' ? f.prog : 0) + '%';
  if (!$('#p-fish').hidden) draw(ts);
  if (!$('#p-home').hidden) drawHome(ts);
  requestAnimationFrame(loop);
}
applyUi();
syncCrew(true);
renderAll();
AREAS.forEach((_, a) => checkComplete(a));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save();
    cloudPush(false);
    notifyPlan();
  } else {
    cloudRecheck();
    if (window.AppNotify) AppNotify.cancel();
    if (
      !veilOpen() &&
      (S.st === 'idle' || S.st === 'result') &&
      G.lastSeen &&
      Date.now() - G.lastSeen >= 15 * 60000
    )
      offlineGain();
  }
});
window.addEventListener('focus', cloudRecheck);
label();
say(T('「投げる」を押して釣りを始めよう。'));
if (G.home) {
  openTab('home');
  say(T('夜です。自宅で休もう。'));
}
(async () => {
  await Promise.race([cloudInit(), new Promise(r => setTimeout(r, 2500))]);
  if (!veilOpen()) {
    if (!G.seen) {
      if (Cloud.kind === 'app' && Cloud.status === 'signedout' && !hasProgress()) showWelcome();
      else showHelp(0);
    } else {
      settleNight();
      offlineGain();
    }
  }
})();
requestAnimationFrame(loop);
