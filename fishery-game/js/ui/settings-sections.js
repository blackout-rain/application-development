function toggleItemsHtml() {
  return TG.concat(
    window.AppNotify
      ? [
          [
            'noNotif',
            T('通知'),
            T('留守の水揚げが満タンになったとき・デイリーボーナスの受け取り忘れをお知らせ（アプリ版）'),
            1
          ]
        ]
      : []
  )
    .map(([k, l, d, inv]) => {
      const on = inv ? !G[k] : !!G[k];
      return `<div class="item"><div class="t">${l}</div><button class="chip" data-tg="${k}" aria-pressed="${on}">${on ? 'ON' : 'OFF'}</button><div class="s">${d}</div></div>`;
    })
    .join('');
}

function difficultyChipsHtml() {
  return DIFFN.map(
    (n, i) => `<button class="chip" data-df="${i}" aria-pressed="${G.diff === i}">${n}</button>`
  ).join('');
}

function fontSizeChipsHtml() {
  return FSN.map(
    (n, i) => `<button class="chip" data-fs="${i}" aria-pressed="${(G.fs || 0) === i}">${n}</button>`
  ).join('');
}
