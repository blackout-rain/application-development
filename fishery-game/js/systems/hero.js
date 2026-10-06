/* ---------- 主人公（名前と性別） ----------
   G.hero = {name, sex（0=男・1=女）, set（1=決めたあと）}。はじめて遊ぶときに一度だけ決める（決めたあとは、変えられない）。
   古いセーブには、名前なし・男・決めたあと、を補う。名前は入力された文字なので、HTMLに入れるときは必ず esc() を通す。 */
const HERO_NAME_MAX = 8;
const heroName = () => (G.hero && G.hero.name) || '';
const heroSex = () => (G.hero && G.hero.sex === 1 ? 1 : 0);
const heroSet = () => !!(G.hero && G.hero.set);
const heroLabel = () => heroName() || T('あなた'); // 名前がないときの呼び名
const cleanHeroName = s =>
  Array.from(
    String(s || '')
      .replace(/[<>&"'`\u0000-\u001f]/g, '')
      .trim()
  )
    .slice(0, HERO_NAME_MAX)
    .join('');

// 名前と性別を、保存して画面に反映する
function setHero(name, sex) {
  G.hero = {name: cleanHeroName(name), sex: sex === 1 ? 1 : 0, set: 1};
  save();
  hud();
  renderAll();
}

// 見本の絵（決める画面・設定タブ）
function drawHeroPreview(id, sex) {
  const cv = document.getElementById(id);
  if (!cv) return;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#bfe3f2';
  c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#7a5c3a';
  c.fillRect(0, cv.height - 12, cv.width, 12);
  drawHero(c, cv.width / 2, cv.height - 12, (cv.height - 22) / HERO_UNIT, sex, {
    onload: () => drawHeroPreview(id, sex)
  });
}

// はじめて遊ぶとき：名前と性別を決める。決めたら done() を呼ぶ
function showHeroSetup(done) {
  let sex = heroSex();
  $('#box').innerHTML = T(
    '<div class="help"><h3>主人公を決めよう</h3><p class="hint">名前と性別を選んでください。</p><canvas id="heroPrev" width="400" height="370" style="display:block;margin:0 auto 10px;border-radius:10px"></canvas><label class="lbl" for="heroIn">名前（{1}文字まで）</label><input id="heroIn" class="txt" maxlength="{1}" autocomplete="off" placeholder="{2}" value="{3}"><div class="row" id="heroSex"><button class="chip" data-hs="0" aria-pressed="{4}">男</button><button class="chip" data-hs="1" aria-pressed="{5}">女</button></div><p class="hint"><b>※ 決定すると、名前と性別は、あとから変更できません。</b></p><div class="row"><button class="big" id="heroOk" style="flex:1;width:auto">これで決定</button></div></div>',
    [HERO_NAME_MAX, esc(T('あなた')), esc(heroName()), sex === 0, sex === 1]
  );
  $('#veil').hidden = false;
  drawHeroPreview('heroPrev', sex);
  document.querySelectorAll('#heroSex [data-hs]').forEach(
    b =>
      (b.onclick = () => {
        sex = +b.dataset.hs;
        document.querySelectorAll('#heroSex [data-hs]').forEach(x => x.setAttribute('aria-pressed', x === b));
        drawHeroPreview('heroPrev', sex);
      })
  );
  $('#heroOk').onclick = () => {
    setHero($('#heroIn').value, sex);
    $('#veil').hidden = true;
    if (done) done();
  };
}
