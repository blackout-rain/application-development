/* ---------- 保険と故障 ---------- */
// 毎朝5%で船が故障（修理費は船の値段の3%）。保険（毎晩・船の値段の0.2%）に入っていると、修理費は無料
const boatPrice=()=>G.boat>0?BOATS[G.boat-1].c:0;
const premium=()=>Math.round(boatPrice()*.002);
const repairCost=()=>Math.max(300,Math.round(boatPrice()*.03));
