/* ---------- 季節・天候 ---------- */
// 12日ごとに季節が変わる。旬の魚は、よく釣れて売値も高い。天気は毎朝ランダム（晴れ50%・くもり30%・雨20%）
const SEASON_LEN=12,SEASONS=[{n:T("春"),e:'🌸'},{n:T("夏"),e:'🌻'},{n:T("秋"),e:'🍁'},{n:T("冬"),e:'⛄'}];
const seasonOf=()=>Math.floor((G.day-1)/SEASON_LEN)%4;
const SEA_SET={'タイ':0,'サヨリ':0,'カツオ':0,'ニシン':0,'メバル':0,'アジ':1,'キス':1,'クロダイ':1,'シイラ':1,'クマノミ':1,'ブダイ':1,'サバ':2,'イワシ':2,'サケ':2,'ハゼ':2,'クルマエビ':2,'サワラ':2,'ブリ':3,'ヒラメ':3,'カレイ':3,'タラ':3,'イセエビ':3,'フグ':3,'ホッケ':3,'タラバガニ':3,'アンコウ':3,'キンメダイ':3};
const seasonOfSp=sp=>{if(sp.n in SEA_SET)return SEA_SET[sp.n];let h=0;for(const ch of sp.n)h=(h*31+ch.charCodeAt(0))%997;return h%4};
const inSeason=sp=>feat('season')&&!sp.boss&&seasonOfSp(sp)===seasonOf();
const SEA_PRICE=1.15,SEA_WEIGHT=1.5;
const WX=[{n:T("晴れ"),e:'☀️',d:''},{n:T("くもり"),e:'☁️',d:T("アタリが早い")},{n:T("雨"),e:'🌧️',d:T("珍しい魚が寄りやすいが、糸が切れやすい")}];
const wxWait=()=>G.wx===1?.85:1,wxDiff=()=>G.wx===2?1.08:1,wxRare=()=>G.wx===2?1:0;
// 潮：毎日2時間の満潮の時間帯があり、アタリが早く、珍しい魚が寄りやすい（時間帯は日によって変わる）
const tideStartH=()=>6+((G.day*5)%9);
const tideNow=()=>{const s=tideStartH()*60;return feat('tide')&&!G.home&&G.min>=s&&G.min<s+120};
const tideRare=()=>tideNow()?1:0,tideWait=()=>tideNow()?.9:1;
