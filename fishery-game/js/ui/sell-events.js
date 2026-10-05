// 市場タブのボタンを押したときの動作
function bindSell(all) {
  $('#p-sell')
    .querySelectorAll('.buy')
    .forEach(b => (b.onclick = () => sell([+b.dataset.i])));
  const sa = $('#sellall');
  if (sa) sa.onclick = () => sell(all);
  $('#p-sell')
    .querySelectorAll('[data-farm]')
    .forEach(b => (b.onclick = () => startFarm(+b.dataset.farm)));
  $('#p-sell')
    .querySelectorAll('[data-harvest]')
    .forEach(b => (b.onclick = () => harvestFarm(+b.dataset.harvest)));
  $('#p-sell')
    .querySelectorAll('[data-proc]')
    .forEach(
      b =>
        (b.onclick = () => {
          const [i, k] = b.dataset.proc.split(':');
          startProc(+i, +k);
        })
    );
  const sp2 = $('#sellprod');
  if (sp2) sp2.onclick = sellProd;
  $('#p-sell')
    .querySelectorAll('[data-deliver]')
    .forEach(b => (b.onclick = () => deliver(+b.dataset.deliver)));
}
