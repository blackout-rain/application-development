/* ---------- エサ・ルアー ---------- */
// 魚には好物のエサがある。つけると、好物の魚が2.5倍よく釣れる（1投ごとに1個使う）。店で10個入りを買う
const BAITS = [
  {k: 'krill', n: T('オキアミ'), d: T('アジ型・細長い魚'), shapes: ['a', 'l'], cost: 1},
  {k: 'worm', n: T('ゴカイ'), d: T('根魚・ヒラメなど底の魚'), shapes: ['r', 'f'], cost: 1},
  {k: 'lure', n: T('ルアー'), d: T('ブリ・マグロなど大型の回遊魚'), shapes: ['b', 't'], cost: 1.5},
  {k: 'live', n: T('生き餌'), d: T('カニ・イカ・タコ・エビ'), shapes: ['e'], cost: 1.2}
];
const BAIT_MUL = 2.5;
const baitOf = sp => {
  const sh = sp.d ? sp.d[2] : 'e';
  return BAITS.find(b => b.shapes.includes(sh)) || BAITS[0];
};
const baitPack = b => Math.round((tourBase() * 3 * b.cost) / 10) * 10;
