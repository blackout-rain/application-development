/* ---------- price ---------- */
const sizeRatio = (sp, sz) => clamp((sz - sp.min) / (sp.max - sp.min), 0, 1);
const sizeMul = (sp, sz) => {
  const r = sizeRatio(sp, sz);
  return 0.7 + 0.8 * r + (r >= 0.9 ? 0.2 : 0);
};
function price(fi, sat) {
  const sp = SP.find(s => s.n === fi.n);
  const big = sizeMul(sp, fi.size),
    sv = sat === undefined ? G.sat[fi.n] || 0 : sat;
  return Math.round(
    fi.size *
      sp.p *
      G.mult[fi.n] *
      (1 - sv) *
      (fi.fresh / 100) *
      (fi.v ? VAR_PRICE : 1) *
      (fi.g === 1 ? FEMALE_PRICE : 1) *
      (inSeason(sp) ? SEA_PRICE : 1) *
      (1 + 0.06 * brLv(sp.a)) *
      (1 +
        0.05 * Math.min(8, G.lv.mkt) +
        0.025 * Math.max(0, G.lv.mkt - 8) +
        perks().sell / 100 +
        salesBonus() +
        0.03 * techLv('dist') +
        Math.min(0.3, 0.003 * sx('biz')) +
        (G.comp[sp.a] ? 0.05 : 0) +
        mealFx('sell') +
        evSell() +
        (petFx().sell || 0)) *
      big
  );
}
// 経営：需給（同じ魚を売るほど値崩れ）と、出荷先（卸売市場／直売所）、収支の記録
const SAT_STEP = 0.03,
  SAT_MAX = 0.4,
  STALL_MUL = 1.12;
const stallCap = () => (G.lv.mkt > 0 ? 3 + 2 * G.lv.mkt : 0);
const stallLeft = () => Math.max(0, stallCap() - G.stall);
function led(k, n) {
  if (n) G.led[k] = (G.led[k] || 0) + n;
}
// 売ったときの内訳を、実際に売らずに試算する。高い魚から順に、直売所の枠→卸売市場へ回す
function quote(idx) {
  const sat = Object.assign({}, G.sat);
  let left = stallLeft(),
    sum = 0,
    stall = 0;
  const rows = [];
  idx
    .map(i => ({i, f: G.fish[i]}))
    .sort((a, b) => price(b.f) - price(a.f))
    .forEach(({i, f}) => {
      const sv = sat[f.n] || 0,
        st = left > 0,
        p = Math.round(price(f, sv) * (st ? STALL_MUL : 1));
      if (st) {
        left--;
        stall++;
      }
      sat[f.n] = Math.min(SAT_MAX, sv + SAT_STEP * (st ? 0.5 : 1));
      sum += p;
      rows.push({i, n: f.n, p, st});
    });
  return {sum, sat, stall, rows};
}
