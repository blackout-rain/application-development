// 街タブのボタンを押したときの動作
function bindTown(t) {
  $('#daily').onclick = claimDaily;
  t.querySelectorAll('[data-nrbuy]').forEach(b => (b.onclick = () => norenBuy(b.dataset.nrbuy)));
  const ng = $('#nrGo');
  if (ng && !ng.disabled) ng.onclick = norenConfirm;
  t.querySelectorAll('[data-meal]').forEach(b => (b.onclick = () => eat(+b.dataset.meal, false)));
  t.querySelectorAll('[data-mealtk]').forEach(b => (b.onclick = () => eat(+b.dataset.mealtk, true)));
  t.querySelectorAll('[data-buytk]').forEach(
    b =>
      (b.onclick = () => {
        const [k, n] = b.dataset.buytk.split(':');
        buyTk(k, +n);
      })
  );
  t.querySelectorAll('[data-loan]').forEach(
    b =>
      (b.onclick = () => {
        const a = Math.min(+b.dataset.loan, loanAvail());
        if (a > 0) {
          G.money += a;
          G.debt += a;
          G.borrowed = 1;
          save();
          hud();
          renderAll();
          toast(T('{1}を借りました', [yen(a)]));
        }
      })
  );
  t.querySelectorAll('[data-repay]').forEach(
    b =>
      (b.onclick = () => {
        const a = Math.min(G.debt, G.money, b.dataset.repay === 'half' ? Math.ceil(G.debt / 2) : G.debt);
        if (a > 0) {
          G.money -= a;
          G.debt -= a;
          save();
          hud();
          renderAll();
          toast(T('{1}を返しました', [yen(a)]));
        }
      })
  );
  t.querySelectorAll('[data-baitsel]').forEach(
    b =>
      (b.onclick = () => {
        G.baitSel = b.dataset.baitsel;
        save();
        hud();
        renderAll();
      })
  );
  t.querySelectorAll('[data-baitbuy]').forEach(
    b =>
      (b.onclick = () => {
        const bt = BAITS.find(x => x.k === b.dataset.baitbuy),
          c = baitPack(bt);
        if (G.money >= c) {
          G.money -= c;
          led('buy', c);
          G.bt[bt.k] += 10;
          if (!G.baitSel) G.baitSel = bt.k;
          save();
          hud();
          renderAll();
          toast(T('{1}を10個買いました', [bt.n]));
        }
      })
  );
  const bo = $('#baitOff');
  if (bo)
    bo.onclick = () => {
      G.baitSel = '';
      save();
      hud();
      renderAll();
    };
  const ib = $('#insBtn');
  if (ib)
    ib.onclick = () => {
      G.ins = G.ins ? 0 : 1;
      save();
      hud();
      renderAll();
      toast(G.ins ? T('船の保険に入りました') : T('保険をやめました'));
    };
  t.querySelectorAll('[data-pet]').forEach(
    b =>
      (b.onclick = () => {
        const p = PETS.find(x => x.k === b.dataset.pet);
        if (G.pets[p.k]) {
          if (G.pet !== p.k && G.petDay === G.day) {
            toast(T('相棒の付け替えは、1日1回までです'));
            return;
          }
          G.pet = p.k;
          G.petDay = G.day;
        } else if (G.money >= p.c) {
          G.money -= p.c;
          led('buy', p.c);
          G.pets[p.k] = 1;
          if (G.petDay !== G.day) {
            G.pet = p.k;
            G.petDay = G.day;
            toast(T('{1}が仲間になった！', [p.n]));
          } else toast(T('{1}が仲間になった！（付け替えは、あしたから）', [p.n]));
          sfx(2);
        }
        save();
        hud();
        renderAll();
      })
  );
  t.querySelectorAll('[data-branch]').forEach(
    b =>
      (b.onclick = () => {
        const a = +b.dataset.branch,
          l = brLv(a),
          c = branchCost(a, l);
        if (l < BR_MAX && G.money >= c) {
          G.money -= c;
          led('buy', c);
          G.br[a] = l + 1;
          save();
          hud();
          renderAll();
          toast(T('{1}支店がLv{2}になった！', [AREAS[a].name, l + 1]));
          sfx(1);
        }
      })
  );
  t.querySelectorAll('[data-tech]').forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.tech,
          tc = TECH.find(x => x.k === k),
          l = techLv(k),
          c = tc.c[l];
        if (c && G.money >= c) {
          G.money -= c;
          led('buy', c);
          G.tech[k] = l + 1;
          save();
          hud();
          renderAll();
          toast(T('{1}がLv{2}になった！', [tc.n, l + 1]));
          sfx(1);
        }
      })
  );
  const tg = $('#tourGo');
  if (tg) tg.onclick = tourEnter;
  $('#townAuto1').onclick = () => autoFish(1);
  $('#townAutoAll').onclick = () => autoFish(99);
}
