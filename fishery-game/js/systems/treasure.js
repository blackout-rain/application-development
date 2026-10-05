/* ---------- 漂流物・宝箱 ---------- */
// 釣りの合間に、ときどき（4%）漂流物を見つける
const TREASURE_NAMES = [
  T('流れ着いた木箱'),
  T('古い宝箱'),
  T('漂流瓶'),
  T('ガラス玉の浮き'),
  T('錆びた金庫')
];
function treasureRoll() {
  if (!feat('treasure') || Math.random() >= 0.04) return;
  const nm = TREASURE_NAMES[Math.floor(Math.random() * TREASURE_NAMES.length)],
    r = Math.random();
  G.treasure++;
  let msg;
  if (r < 0.5) {
    const g = Math.round((tourBase() * rnd(4, 12)) / 10) * 10;
    G.money += g;
    led('gold', g);
    msg = `${yen(g)}`;
  } else if (r < 0.7) {
    G.tk.auto++;
    msg = T('おまかせ釣り券×1');
  } else if (r < 0.85) {
    G.tk.meal++;
    msg = T('食事券×1');
  } else if (r < 0.95) {
    G.bp++;
    msg = 'BP+1';
  } else {
    const g = Math.round((tourBase() * rnd(20, 40)) / 10) * 10;
    G.money += g;
    led('gold', g);
    G.bp += 2;
    msg = `${yen(g)}・BP+2`;
    banner(T('大当たり！'), T('{1}から {2}', [nm, msg]), '#ffd24a');
  }
  toast(T('🎁 {1}を見つけた！ {2}', [nm, msg]));
  sfx(2);
}
