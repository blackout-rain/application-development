// 自宅・設備タブ（道具・船・人・模様替え）のボタンを押したときの動作
function bindShop(b, cc) {
  const sh = $('#p-shop');
  sh.querySelectorAll('[data-up]').forEach(
    e =>
      (e.onclick = () => {
        const u = UP.find(x => x.k === e.dataset.up);
        const c = u.c[G.lv[u.k]];
        if (G.money >= c) {
          G.money -= c;
          led('buy', c);
          G.lv[u.k]++;
          save();
          hud();
          renderAll();
        }
      })
  );
  sh.querySelectorAll('[data-boat]').forEach(
    e =>
      (e.onclick = () => {
        if (G.money >= b.c) {
          G.money -= b.c;
          led('buy', b.c);
          G.boat++;
          G.area = G.boat;
          save();
          hud();
          renderAll();
          toast(T('{1}に出られます！釣りタブへ', [AREAS[G.boat].name]));
        }
      })
  );
  sh.querySelectorAll('[data-deco]').forEach(
    e =>
      (e.onclick = () => {
        const d = DECOS.find(x => x.k === e.dataset.deco);
        if (d && !G.deco[d.k] && G.money >= d.c) {
          G.money -= d.c;
          led('buy', d.c);
          G.deco[d.k] = 1;
          save();
          hud();
          renderAll();
          toast(T('{1}を飾りました', [d.n]));
          sfx(1);
        }
      })
  );
  sh.querySelectorAll('[data-retire]').forEach(
    e =>
      (e.onclick = () => {
        if (!e.dataset.arm) {
          e.dataset.arm = 1;
          e.textContent = T('本当に辞めてもらう？（もう一度）');
          setTimeout(() => {
            delete e.dataset.arm;
            e.textContent = T('辞めてもらう');
          }, 3000);
          return;
        }
        const i = +e.dataset.retire,
          m = G.cr[i];
        if (!m) return;
        G.cr.splice(i, 1);
        G.crew--;
        syncCrew();
        save();
        hud();
        renderAll();
        toast(T('{1}が辞めました', [m.n]));
      })
  );
  sh.querySelectorAll('[data-hire]').forEach(
    e =>
      (e.onclick = () => {
        const l = +e.dataset.hire,
          c = hireCost(l);
        if (G.money >= c && G.crew < crewMax()) {
          G.money -= c;
          led('buy', c);
          G.crew++;
          normCrew();
          const m = G.cr[G.cr.length - 1];
          m.x = clvx(l - 1);
          save();
          hud();
          renderAll();
          toast(T('{1}（Lv{2}・{3}）を雇いました', [m.n, l, TRAITS[m.t].n]));
        }
      })
  );
  sh.querySelectorAll('[data-role]').forEach(
    e =>
      (e.onclick = () => {
        const m = G.cr[+e.dataset.role];
        if (m) {
          if (m.nr === undefined) m.nr = m.r ^ 1;
          else delete m.nr;
          save();
          renderAll();
          if (m.nr !== undefined) toast(T('{1}は、あしたの朝から「{2}」になります', [m.n, CROLE[m.nr]]));
        }
      })
  );
  sh.querySelectorAll('[data-crew]').forEach(
    e =>
      (e.onclick = () => {
        if (G.money >= cc && G.crew < crewMax()) {
          G.money -= cc;
          led('buy', cc);
          G.crew++;
          normCrew();
          save();
          hud();
          renderAll();
        }
      })
  );
}
