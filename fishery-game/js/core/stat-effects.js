/* ---------- ステータスの効果 ----------
   どのステータスも、同じ形の曲線で効く：効果 = 最大 × v ÷ (v + h)。v は、初期値からふえたポイント数。
   ポイントをふやすほど、効果は少しずつ頭打ちに近づく（v が h のとき、最大の半分）。急に上限で止まることはない。
   調整は、下の表の数字だけを変える（max=最大の効果、h=最大の半分になるポイント数）。 */
const STAT_FX = {
  reel: {max: 4, h: 50}, // 力：巻き上げ速度の倍率（1＋効果）
  tension: {max: 0.9, h: 50}, // 体力：テンションの上がりやすさ（1−効果）
  pull: {max: 0.9, h: 50}, // 器用さ：寄せ戻される量（1−効果）
  recover: {max: 3, h: 50}, // 器用さ：テンションが下がる速さ（1＋効果）
  struggle: {max: 0.6, h: 50}, // 集中力：魚が暴れる時間（1−効果）
  biteSpeed: {max: 3, h: 50}, // 素早さ：アタリまでの速さ（たし算）
  hookWindow: {max: 4, h: 50}, // 素早さ：アワセの猶予（秒）
  rare: {max: 40, h: 50}, // 運：レア魚の出やすさ（エサなどの「レア度」にたし算）
  boss: {max: 4, h: 50}, // 運：主の出やすさ（1＋効果の倍率）
  size: {max: 1, h: 50}, // 運：大物サイズ（サイズの偏りの指数から引く）
  variant: {max: 0.036, h: 60}, // 運：色違いの確率にたし算
  sell: {max: 0.3, h: 50}, // 商才：魚の売値
  wage: {max: 0.2, h: 50}, // 商才：給料の割引
  haul: {max: 0.4, h: 50}, // 統率力：従業員の水揚げ
  growth: {max: 0.9, h: 50} // 統率力：従業員の成長の速さ
};
const statFx = (name, v) => {
  const p = STAT_FX[name],
    x = Math.max(0, v);
  return (p.max * x) / (x + p.h);
};
const SE = {
  reel: v => 1 + statFx('reel', v),
  tension: v => 1 - statFx('tension', v),
  pull: v => 1 - statFx('pull', v),
  recover: v => 1 + statFx('recover', v),
  struggle: v => 1 - statFx('struggle', v),
  biteSpeed: v => statFx('biteSpeed', v),
  hookWindow: v => statFx('hookWindow', v),
  rare: v => statFx('rare', v),
  boss: v => statFx('boss', v),
  size: v => statFx('size', v),
  variant: v => statFx('variant', v),
  sell: v => statFx('sell', v),
  wage: v => statFx('wage', v),
  haul: v => statFx('haul', v),
  growth: v => statFx('growth', v)
};
