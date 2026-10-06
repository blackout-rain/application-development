/* ---------- home ---------- */
function renderHome() {
  const night = G.home;
  const list = FAC.filter(f => !FEATS.some(x => x.k === f.k) || feat(f.k) || (G.fac[f.k] || 0) > 0)
    .map(f => {
      const l = G.fac[f.k],
        max = l >= f.c.length;
      return T(
        '<div class="item"><div class="t">{1} <span class="num">Lv{2}</span> <span class="tag" style="background:var(--accent)">{3}</span></div>\n      <button class="buy" data-fac="{4}" {5}>{6}</button>\n      <div class="s">{7}<br>効果：{8}{9}</div></div>',
        [
          f.n,
          l,
          f.names[l],
          f.k,
          max || G.money < f.c[l] ? 'disabled' : '',
          max ? 'MAX' : yen(f.c[l]),
          f.d,
          f.eff(l),
          max ? '' : T('　→　次：{1}', [f.eff(l + 1)])
        ]
      );
    })
    .join('');
  $('#homeUi').innerHTML =
    (night
      ? T('<button class="big" id="sleep">ぐっすり眠る（{1}日目の朝へ）</button>', [G.day + 1])
      : T(
          '<p class="hint" style="margin-top:0">いまは日中です。夜になると、ここに帰って休み、朝を迎えます。</p>'
        )) +
    T(
      '<h2>施設（自宅に建てる）</h2><div class="list">{1}</div>\n    <p class="hint">道具・船・漁師は下の「設備」で買えます。買ったものは上の風景に並び、レベルが上がるほど立派に育ちます。</p>',
      [list]
    );
  const s = $('#sleep');
  if (s) s.onclick = sleep;
  $('#homeUi')
    .querySelectorAll('[data-fac]')
    .forEach(
      b =>
        (b.onclick = () => {
          const f = FAC.find(x => x.k === b.dataset.fac),
            l = G.fac[f.k],
            c = f.c[l];
          if (G.money >= c) {
            G.money -= c;
            led('buy', c);
            G.fac[f.k]++;
            save();
            hud();
            renderAll();
            toast(T('{1}が「{2}」になった！', [f.n, f.names[l + 1]]));
            sfx(1);
          }
        })
    );
}
const hv = $('#hv'),
  hc = hv.getContext('2d');
function houseArt(c, lv, night, ts) {
  const gy = 200,
    win = night ? '#ffd98a' : '#9fc4d9';
  if (lv === 0) {
    c.fillStyle = '#d8b86a';
    c.beginPath();
    c.moveTo(20, gy);
    c.lineTo(75, gy - 62);
    c.lineTo(130, gy);
    c.closePath();
    c.fill();
    c.fillStyle = night ? '#ffcf70' : '#5a4318';
    c.beginPath();
    c.moveTo(62, gy);
    c.lineTo(75, gy - 32);
    c.lineTo(88, gy);
    c.fill();
    c.strokeStyle = '#8a6a2a';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(75, gy - 62);
    c.lineTo(75, gy - 72);
    c.stroke();
  } else if (lv === 1) {
    c.fillStyle = '#9c7448';
    c.fillRect(20, gy - 56, 110, 56);
    c.fillStyle = '#6b4a3c';
    c.beginPath();
    c.moveTo(10, gy - 54);
    c.lineTo(75, gy - 92);
    c.lineTo(140, gy - 54);
    c.closePath();
    c.fill();
    c.fillStyle = '#4a3322';
    c.fillRect(64, gy - 34, 22, 34);
    c.fillStyle = win;
    c.fillRect(32, gy - 42, 18, 16);
    c.fillRect(100, gy - 42, 18, 16);
  } else if (lv === 2) {
    c.fillStyle = '#c9a36a';
    c.fillRect(12, gy - 74, 130, 74);
    c.fillStyle = '#a14c3c';
    c.beginPath();
    c.moveTo(2, gy - 72);
    c.lineTo(77, gy - 112);
    c.lineTo(152, gy - 72);
    c.closePath();
    c.fill();
    c.fillStyle = '#6b4a3c';
    c.fillRect(110, gy - 120, 12, 24);
    c.fillStyle = '#4a3322';
    c.fillRect(64, gy - 40, 26, 40);
    c.fillStyle = win;
    c.fillRect(24, gy - 56, 22, 20);
    c.fillRect(106, gy - 56, 22, 20);
    if (night)
      for (let k = 0; k < 3; k++) {
        c.fillStyle = 'rgba(220,220,230,' + (0.5 - k * 0.15) + ')';
        c.beginPath();
        c.arc(116 + Math.sin(ts / 600 + k) * 4, gy - 128 - k * 12 - ((ts / 80) % 12), 4 + k * 2, 0, 7);
        c.fill();
      }
  } else {
    c.fillStyle = '#e6d3a8';
    c.fillRect(6, gy - 112, 150, 112);
    c.fillStyle = '#3d5f8f';
    c.beginPath();
    c.moveTo(-4, gy - 110);
    c.lineTo(81, gy - 152);
    c.lineTo(166, gy - 110);
    c.closePath();
    c.fill();
    c.fillStyle = '#6b4a3c';
    c.fillRect(124, gy - 160, 14, 30);
    c.fillStyle = '#4a3322';
    c.fillRect(66, gy - 46, 30, 46);
    c.fillStyle = '#d9b45a';
    c.fillRect(80, gy - 46, 2, 46);
    c.fillStyle = win;
    [
      [20, gy - 98],
      [110, gy - 98],
      [20, gy - 58],
      [116, gy - 58]
    ].forEach(([x, y]) => c.fillRect(x, y, 24, 20));
    c.strokeStyle = '#4a3322';
    c.lineWidth = 2;
    c.strokeRect(18, gy - 100, 28, 24);
    c.strokeRect(108, gy - 100, 28, 24);
    c.fillStyle = '#d9503f';
    c.fillRect(80, gy - 176, 2, 24);
    c.fillRect(82, gy - 176, 14, 9);
    if (night)
      for (let k = 0; k < 3; k++) {
        c.fillStyle = 'rgba(220,220,230,' + (0.5 - k * 0.15) + ')';
        c.beginPath();
        c.arc(131 + Math.sin(ts / 600 + k) * 4, gy - 168 - k * 12 - ((ts / 80) % 12), 4 + k * 2, 0, 7);
        c.fill();
      }
    if (lv >= 4) {
      c.fillStyle = '#d8c090';
      c.fillRect(148, gy - 72, 38, 72);
      c.fillStyle = '#8a4a3a';
      c.beginPath();
      c.moveTo(144, gy - 70);
      c.lineTo(167, gy - 96);
      c.lineTo(190, gy - 70);
      c.closePath();
      c.fill();
      c.fillStyle = win;
      c.fillRect(158, gy - 52, 16, 14);
    }
    if (lv >= 5) {
      c.fillStyle = '#ffd24a';
      c.fillRect(30, gy - 170, 2, 20);
      c.fillRect(32, gy - 170, 12, 8);
    }
    if (lv >= 6) {
      c.strokeStyle = '#ffd24a';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-4, gy - 110);
      c.lineTo(81, gy - 152);
      c.lineTo(166, gy - 110);
      c.stroke();
    }
    if (lv >= 7) {
      [
        [58, gy - 30],
        [100, gy - 30]
      ].forEach(([x, y]) => {
        c.fillStyle = night ? '#ffd98a' : '#c0503a';
        c.beginPath();
        c.arc(x, y, 6, 0, 7);
        c.fill();
      });
    }
    if (lv >= 8) {
      c.fillStyle = '#ffd24a';
      c.beginPath();
      c.moveTo(81, gy - 196);
      c.lineTo(75, gy - 176);
      c.lineTo(87, gy - 176);
      c.closePath();
      c.fill();
    }
  }
}
function trophyArt(c) {
  const lv = G.fac.trophy,
    bx = 186,
    by = 104,
    w = 104,
    h = 96;
  c.font = 'bold 10px sans-serif';
  c.textAlign = 'center';
  c.fillStyle = 'rgba(255,255,255,.85)';
  if (!lv) {
    c.setLineDash([4, 3]);
    c.strokeStyle = 'rgba(255,255,255,.4)';
    c.strokeRect(bx, by, w, h);
    c.setLineDash([]);
    c.fillText(T('魚拓棚（未建設）'), bx + w / 2, by + h / 2 + 3);
    c.textAlign = 'left';
    return;
  }
  c.fillStyle = '#7a5a3a';
  c.fillRect(bx, by, w, h);
  c.fillStyle = '#5a4028';
  c.fillRect(bx, by, w, 4);
  const cols = lv === 1 ? 2 : 3,
    rows = lv >= 3 ? 3 : 2,
    fw = (w - 8 - (cols - 1) * 4) / cols,
    fh = (h - 12 - (rows - 1) * 4) / rows;
  const list = SP.filter(s => G.dex[s.n]).sort(
    (a, b) => tier(b) - tier(a) || G.dex[b.n].best / b.max - G.dex[a.n].best / a.max
  );
  for (let i = 0; i < cols * rows; i++) {
    const x = bx + 4 + (i % cols) * (fw + 4),
      y = by + 8 + ((i / cols) | 0) * (fh + 4);
    c.fillStyle = '#efe3c4';
    c.fillRect(x, y, fw, fh);
    c.strokeStyle = '#3d2b18';
    c.lineWidth = 1.5;
    c.strokeRect(x, y, fw, fh);
    const sp = list[i];
    if (sp)
      drawSp(
        c,
        G.dex[sp.n] && G.dex[sp.n].vc && !sp.boss ? vSp(sp) : sp,
        x + fw / 2,
        y + fh / 2,
        Math.min(fw - 8, fh * 1.5, 40)
      );
    else {
      c.fillStyle = 'rgba(60,40,20,.35)';
      c.font = 'bold 14px sans-serif';
      c.fillText('？', x + fw / 2, y + fh / 2 + 5);
    }
  }
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.font = 'bold 10px sans-serif';
  c.fillText(T('魚拓棚'), bx + w / 2, by - 4);
  c.textAlign = 'left';
}
function toolsArt(c, ts) {
  // 道具小屋
  c.fillStyle = '#6b4a3c';
  c.beginPath();
  c.moveTo(292, 152);
  c.lineTo(338, 130);
  c.lineTo(384, 152);
  c.closePath();
  c.fill();
  c.fillStyle = '#2c2118';
  c.fillRect(298, 152, 80, 48);
  c.strokeStyle = '#8b6a4a';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(298, 178);
  c.lineTo(378, 178);
  c.stroke();
  const RC = ['#d9c7a8', '#8fbf6a', '#6aa6d9', '#c28fd9', '#ffd24a'];
  for (let i = 0; i < Math.min(5, G.lv.rod); i++) {
    c.strokeStyle = RC[i];
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(304 + i * 13, 198);
    c.lineTo(311 + i * 13, 156);
    c.stroke();
  }
  for (let i = 0; i < Math.min(5, G.lv.line); i++) {
    c.fillStyle = RC[i];
    c.beginPath();
    c.arc(306 + i * 14, 172, 5, 0, 7);
    c.fill();
    c.strokeStyle = '#fff';
    c.lineWidth = 1;
    c.stroke();
  }
  for (let i = 0; i < Math.min(5, G.lv.bait); i++) {
    const x = 298 + i * 15,
      y = 214;
    c.fillStyle = '#e08a3a';
    c.beginPath();
    c.moveTo(x, y - 10);
    c.lineTo(x + 12, y - 10);
    c.lineTo(x + 10, y);
    c.lineTo(x + 2, y);
    c.closePath();
    c.fill();
    c.strokeStyle = '#a85f20';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x + 6, y - 10, 5, Math.PI, 0);
    c.stroke();
  }
  for (let i = 0; i < Math.min(5, G.lv.cool); i++) {
    const x = 382 + (i % 2) * 19,
      y = 200 - (((i / 2) | 0) + 1) * 13;
    c.fillStyle = '#3a8fd6';
    c.fillRect(x, y, 17, 12);
    c.fillStyle = '#e8f1f5';
    c.fillRect(x, y, 17, 4);
  }
  // 直売所
  const m = G.lv.mkt,
    x0 = 424,
    w = 54;
  c.fillStyle = '#7a5a3a';
  c.fillRect(x0, 180, w, 20);
  c.fillStyle = '#9c7448';
  c.fillRect(x0, 176, w, 5);
  if (m > 0) {
    const ah = 18 + m * 2;
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i % 2 ? '#f2e8d0' : m >= 4 ? '#d9503f' : '#4a8fd9';
      c.fillRect(x0 + i * (w / 6), 176 - ah, w / 6, ah - 4);
    }
    c.fillStyle = '#5a4028';
    c.fillRect(x0, 172 - ah, 2, ah + 28);
    c.fillRect(x0 + w - 2, 172 - ah, 2, ah + 28);
  }
  const fl = G.fish.slice(0, 3).map(f => spOfFish(f));
  fl.forEach((sp, i) => drawSp(c, sp, x0 + 12 + i * 15, 174, 16));
  c.font = 'bold 10px sans-serif';
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.textAlign = 'center';
  c.fillText(T('道具小屋'), 338, 126);
  c.textAlign = 'right';
  c.fillText(
    m ? T('直売所 Lv{1}（売値+{2}%）', [m, mktBonus(m)]) : T('直売所（未強化）'),
    478,
    m ? 158 - m * 2 : 170
  );
  c.textAlign = 'left';
}
function decoArt(c, ts) {
  c.textAlign = 'center';
  c.font = '18px sans-serif';
  DECOS.forEach(d => {
    if (G.deco[d.k]) c.fillText(d.e, d.x, d.y + (d.k === 'flag' ? Math.sin(ts / 500) * 2 : 0));
  });
  c.textAlign = 'left';
}
function petArt(c, ts) {
  const p = PETS.find(x => x.k === G.pet);
  if (!p) return;
  c.textAlign = 'center';
  c.font = '20px sans-serif';
  c.fillText(p.e, 142 + Math.sin(ts / 900) * 10, 262 + Math.abs(Math.sin(ts / 300)) * -3);
  c.textAlign = 'left';
}
function farmArt(c, ts) {
  const lv = G.fac.farm || 0;
  if (!lv) return;
  const x = 96,
    y = 304 + Math.sin(ts / 900) * 1.2,
    w = 40 + Math.min(lv, 4) * 14;
  c.fillStyle = '#8a6a44';
  c.fillRect(x, y, w, 7);
  c.strokeStyle = 'rgba(255,255,255,.55)';
  c.lineWidth = 1.2;
  c.strokeRect(x + 2, y - 12, w - 4, 12);
  c.fillStyle = 'rgba(120,200,255,.3)';
  c.fillRect(x + 2, y - 12, w - 4, 12);
  for (let k = 0; k < Math.min(G.farm.length, 5); k++) {
    c.fillStyle = '#ffb454';
    c.beginPath();
    c.ellipse(x + 8 + k * ((w - 16) / 5) + Math.sin(ts / 500 + k) * 2, y - 6, 4, 2, 0, 0, 7);
    c.fill();
  }
  c.font = 'bold 10px sans-serif';
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.fillText(T('養殖 {1}/{2}', [G.farm.length, farmCap(lv)]), x, y + 19);
}
function plantArt(c, ts) {
  const lv = G.fac.plant || 0,
    x = 306,
    y = 226;
  if (!lv && !feat('plant')) return;
  c.font = 'bold 10px sans-serif';
  c.fillStyle = 'rgba(255,255,255,.85)';
  if (!lv) {
    c.setLineDash([4, 3]);
    c.strokeStyle = 'rgba(255,255,255,.4)';
    c.strokeRect(x, y, 70, 34);
    c.setLineDash([]);
    c.fillText(T('加工場（未建設）'), x + 2, y + 21);
    return;
  }
  const vl = Math.min(lv, 4),
    w = 56 + vl * 16,
    h = 28 + vl * 4;
  c.fillStyle = '#8a8f94';
  c.fillRect(x, y + 34 - h, w, h);
  c.fillStyle = '#b24a3c';
  c.beginPath();
  c.moveTo(x - 3, y + 34 - h);
  c.lineTo(x + w / 2, y + 34 - h - 12);
  c.lineTo(x + w + 3, y + 34 - h);
  c.closePath();
  c.fill();
  c.fillStyle = '#5a4028';
  c.fillRect(x + w - 14, y + 34 - h - 22, 7, 16);
  c.fillStyle = 'rgba(235,235,235,.5)';
  for (let k = 0; k < 3; k++) {
    c.beginPath();
    c.arc(x + w - 10 + Math.sin(ts / 600 + k) * 3, y + 34 - h - 26 - k * 8 - ((ts / 90) % 8), 3 + k, 0, 7);
    c.fill();
  }
  c.fillStyle = '#2c2118';
  c.fillRect(x + 8, y + 16, 14, 18);
  c.fillStyle = '#ffd24a';
  c.fillRect(x + w - 26, y + 14, 14, 10);
  c.fillStyle = 'rgba(255,255,255,.9)';
  c.fillText(
    `${FAC.find(f => f.k === 'plant').names[lv]}${G.proc.length ? T('（加工中{1}）', [G.proc.length]) : ''}`,
    x,
    y + 46
  );
}
function tankArt(c, ts) {
  const lv = G.fac.tank,
    vl = Math.min(lv, 4),
    x = 12,
    y = 208,
    w = 60 + vl * 45,
    h = 38 + vl * 5;
  c.font = 'bold 10px sans-serif';
  c.fillStyle = 'rgba(255,255,255,.85)';
  if (!lv) {
    c.setLineDash([4, 3]);
    c.strokeStyle = 'rgba(255,255,255,.4)';
    c.strokeRect(x, y, 150, 50);
    c.setLineDash([]);
    c.fillText(T('生け簀（未建設）'), x + 36, y + 29);
    return;
  }
  c.fillStyle = '#8a8f94';
  c.fillRect(x - 4, y - 4, w + 8, h + 8);
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#3aa0c9');
  g.addColorStop(1, '#14506f');
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(255,255,255,.25)';
  c.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    for (let k = 0; k <= w; k += 6) {
      const yy = y + 8 + i * 14 + Math.sin(k / 9 + ts / 500 + i) * 2;
      k ? c.lineTo(x + k, yy) : c.moveTo(x + k, yy);
    }
    c.stroke();
  }
  const cap = tankCap(lv),
    st = G.fish
      .map(f => ({f, p: price(f)}))
      .sort((a, b) => b.p - a.p)
      .slice(0, cap);
  st.forEach(({f}, i) => {
    const sp = SP.find(s => s.n === f.n);
    const px = x + 16 + (w - 32) * (0.5 + 0.45 * Math.sin((ts / 2200) * (0.6 + i * 0.11) + i * 1.7)),
      py = y + 16 + (h - 26) * (0.5 + 0.42 * Math.sin(ts / 1800 + i * 2.1));
    drawSp(c, f.v ? vSp(sp) : sp, px, py, 26);
  });
  c.fillStyle = 'rgba(255,255,255,.95)';
  c.fillText(T('生け簀 {1}/{2}匹', [st.length, cap]), x + 5, y + 12);
}
function boatArt(c, ts) {
  if (G.boat < 1) return;
  const b = G.boat,
    bob = Math.sin(ts / 700) * 2,
    len = [0, 80, 130, 150, 170, 160, 170, 180, 190, 200][b],
    x = [0, 330, 300, 290, 280, 290, 280, 270, 260, 250][b],
    y = 306 + bob;
  c.fillStyle = HULLC[b];
  c.beginPath();
  c.moveTo(x, y - 12);
  c.lineTo(x + len, y - 12);
  c.lineTo(x + len - 16, y + 10);
  c.lineTo(x + 8, y + 10);
  c.closePath();
  c.fill();
  c.fillStyle = TOPC[b];
  c.fillRect(x, y - 16, len, 5);
  if (b >= 2) {
    c.fillStyle = TOPC[b];
    c.fillRect(x + len - 62, y - 38, 44, 22);
    c.fillStyle = '#4aa3e8';
    c.fillRect(x + len - 56, y - 32, 12, 9);
    c.fillRect(x + len - 38, y - 32, 12, 9);
    c.fillStyle = STRIPEC[b];
    c.fillRect(x + len - 48, y - 48, 8, 10);
  } else {
    c.strokeStyle = '#d9c7a8';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 20, y - 16);
    c.lineTo(x + 34, y - 40);
    c.stroke();
  }
  if (b >= 3) {
    c.strokeStyle = '#d9c7a8';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 30, y - 16);
    c.lineTo(x + 30, y - 54);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.85)';
    c.beginPath();
    c.moveTo(x + 30, y - 52);
    c.lineTo(x + 58, y - 26);
    c.lineTo(x + 30, y - 26);
    c.fill();
  }
  if (b >= 5) {
    c.save();
    c.globalAlpha = 0.22 + 0.1 * Math.sin(ts / 300);
    c.fillStyle = ['#c8a0ff', '#ff9a6a', '#8ad0ff', '#9affd8', '#ffd24a'][b - 5];
    c.beginPath();
    c.arc(x + len / 2, y - 10, len * 0.55, 0, 7);
    c.fill();
    c.restore();
  }
  c.font = 'bold 10px sans-serif';
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.fillText(BOATS[b - 1].n, x, y + 24);
}
function drawHome(ts) {
  fitCanvas(hv, hc, 480, 340);
  const c = hc,
    night = !!G.home,
    p = clamp((G.min - 360) / 720, 0, 1);
  const sk = c.createLinearGradient(0, 0, 0, 200);
  if (night) {
    sk.addColorStop(0, '#0a1330');
    sk.addColorStop(1, '#26305e');
  } else {
    sk.addColorStop(0, `hsl(${p < 0.7 ? 205 : 200 - ((p - 0.7) / 0.3) * 185},60%,${64 - p * 28}%)`);
    sk.addColorStop(1, `hsl(${p < 0.7 ? 200 : 30},55%,${80 - p * 26}%)`);
  }
  c.fillStyle = sk;
  c.fillRect(0, 0, 480, 340);
  if (night) {
    c.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) {
      c.globalAlpha = 0.35 + 0.6 * Math.abs(Math.sin(ts / 900 + i));
      c.fillRect((i * 97) % 480, (i * 53) % 110, 1.6, 1.6);
    }
    c.globalAlpha = 1;
    c.fillStyle = '#f4efd0';
    c.beginPath();
    c.arc(430, 36, 15, 0, 7);
    c.fill();
  } else {
    c.fillStyle = `hsl(${p < 0.7 ? 45 : 30},90%,${72 - p * 20}%)`;
    c.beginPath();
    c.arc(430, Math.min(90, 30 + p * 70), 18, 0, 7);
    c.fill();
  }
  c.fillStyle = night ? '#17233f' : '#4f7f5a';
  c.beginPath();
  c.moveTo(0, 185);
  c.quadraticCurveTo(120, 140, 240, 182);
  c.quadraticCurveTo(360, 155, 480, 182);
  c.lineTo(480, 210);
  c.lineTo(0, 210);
  c.fill();
  c.fillStyle = night ? '#1b3a2c' : '#3f7a4a';
  c.fillRect(0, 198, 480, 92);
  c.fillStyle = night ? '#4a4132' : '#c8b48a';
  c.fillRect(0, 266, 480, 8);
  c.fillStyle = night ? '#0f2a44' : '#2a6f95';
  c.fillRect(0, 300, 480, 40);
  c.strokeStyle = 'rgba(255,255,255,.18)';
  c.lineWidth = 1.5;
  for (let r = 0; r < 3; r++) {
    c.beginPath();
    for (let x = 0; x <= 480; x += 8) {
      const y = 312 + r * 10 + Math.sin(x / 30 + ts / 700 + r) * 2;
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  c.fillStyle = '#6b4f38';
  c.fillRect(0, 288, 480, 12);
  houseArt(c, G.fac.house, night, ts);
  trophyArt(c);
  toolsArt(c, ts);
  tankArt(c, ts);
  plantArt(c, ts);
  farmArt(c, ts);
  boatArt(c, ts);
  for (let i = 0; i < G.crew; i++)
    person(c, 24 + i * 22, 294 + Math.sin(ts / 500 + i) * 0.6, COLS[i % 10], HATS[i % 5], 0.8);
  drawHero(c, 112, 258, 1.3, heroSex(), {bob: Math.sin(ts / 400) * 0.8});
  decoArt(c, ts);
  petArt(c, ts);
  if (night) {
    c.fillStyle = 'rgba(10,19,48,.25)';
    c.fillRect(0, 0, 480, 340);
  }
}
