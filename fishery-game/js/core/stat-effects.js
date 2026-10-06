/* ---------- ステータスの効果 ----------
   どのステータスも、同じ形の曲線で効く：効果 = 最大 × v ÷ (v + h)。v は、初期値からふえたポイント数。
   ポイントをふやすほど、効果は少しずつ頭打ちに近づく（v が h のとき、最大の半分）。急に上限で止まることはない。
   調整は、下の表の数字だけを変える（max=最大の効果、h=最大の半分になるポイント数）。 */
const STAT_FX = {
  reel: {max: 0.99, h: 46}, // 力：画面に出す効果（0〜99%）。実際の巻き上げ速度は、これに REEL_UNIT をかけた値
  tension: {max: 0.97, h: 46}, // 体力：テンションの上がりやすさ（1−効果）
  pull: {max: 0.97, h: 46}, // 器用さ：寄せ戻される量（1−効果）
  recover: {max: 0.99, h: 46}, // 器用さ：画面に出す効果（0〜99%）。実際のテンションが下がる速さは、これに RECOVER_UNIT をかけた値
  struggle: {max: 0.46, h: 46}, // 集中力：魚が暴れる時間（1−効果）
  biteSpeed: {max: 4, h: 46}, // 素早さ：アタリまでの速さ（たし算）
  hookWindow: {max: 5, h: 46}, // 素早さ：アワセの猶予（秒）
  rare: {max: 0.99, h: 60}, // 運：画面に出す効果（0〜99%）。実際のレア魚の出やすさ（エサなどの「レア度」にたし算）は、これに RARE_UNIT をかけた値
  boss: {max: 4, h: 46}, // 運：主の出やすさ（1＋効果の倍率）
  size: {max: 1, h: 46}, // 運：大物サイズ（サイズの偏りの指数から引く）
  variant: {max: 0.05, h: 60}, // 運：色違いの確率にたし算
  sell: {max: 0.45, h: 70}, // 商才：魚の売値
  wage: {max: 0.3, h: 70}, // 商才：給料の割引
  haul: {max: 0.55, h: 70}, // 統率力：従業員の水揚げ
  growth: {max: 0.9, h: 50} // 統率力：従業員の成長の速さ
};
// 力・器用さ（テンション回復）・運（レア魚）は、画面の数字を2桁（最大99%）に収めるため、内部ではそれぞれ〜_UNIT 倍して使う（実際の効果は、以前の式と同じ）
const REEL_UNIT = 7.9,
  RECOVER_UNIT = 3.94,
  RARE_UNIT = 50.5;
const statFx = (name, v) => {
  const p = STAT_FX[name],
    x = Math.max(0, v);
  return (p.max * x) / (x + p.h);
};
const SE = {
  reel: v => 1 + REEL_UNIT * statFx('reel', v),
  tension: v => 1 - statFx('tension', v),
  pull: v => 1 - statFx('pull', v),
  recover: v => 1 + RECOVER_UNIT * statFx('recover', v),
  struggle: v => 1 - statFx('struggle', v),
  biteSpeed: v => statFx('biteSpeed', v),
  hookWindow: v => statFx('hookWindow', v),
  rare: v => RARE_UNIT * statFx('rare', v),
  boss: v => statFx('boss', v),
  size: v => statFx('size', v),
  variant: v => statFx('variant', v),
  sell: v => statFx('sell', v),
  wage: v => statFx('wage', v),
  haul: v => statFx('haul', v),
  growth: v => statFx('growth', v)
};
