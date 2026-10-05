/* ---------- オス・メス ---------- */
// 釣れた魚には、オス(0)・メス(1)がいる。メスは売値+5%。養殖で、同じ種のオスとメスがそろうと、稚魚が生まれることがある
const GMARK=['♂','♀'],GNAME=[T("オス"),T("メス")],GCOL=['#6cc4ff','#ff9ec4'],FEMALE_PRICE=1.05,BREED_CHANCE=.2;
const rndG=()=>Math.random()<.5?0:1;
const gmark=f=>f.g===0||f.g===1?`<span style="color:${GCOL[f.g]};font-weight:900">${GMARK[f.g]}</span>`:'';
const gtext=f=>f.g===0||f.g===1?GMARK[f.g]:'';
