/* ---------- 支店（産地ブランド） ---------- */
// 海域ごとに支店を出すと、その海域の魚の売値が上がる。維持費がかかる
const brLv = a => (G.br && G.br[a]) || 0;
const BR_MAX = 4;
const branchCost = (a, l) => Math.round((AREAS[a].base * [40, 120, 300, 700][l]) / 100) * 100;
const branchUpkeep = () =>
  AREAS.reduce((t, _, a) => {
    let c = 0;
    for (let l = 0; l < brLv(a); l++) c += branchCost(a, l);
    return t + c * 0.003;
  }, 0);
