/* ---------- scene ---------- */
const cv = $('#cv'),
  cx = cv.getContext('2d');
function person(c, x, y, col, hat, s) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = '#2b3a4a';
  c.fillRect(-3.5, -9, 3, 9);
  c.fillRect(0.5, -9, 3, 9);
  c.fillStyle = col;
  c.fillRect(-5, -24, 10, 15);
  c.fillStyle = '#f1c9a0';
  c.beginPath();
  c.arc(0, -29, 5, 0, 7);
  c.fill();
  c.fillStyle = hat;
  c.fillRect(-6.5, -33, 13, 2.5);
  c.beginPath();
  c.arc(0, -33, 5, Math.PI, 0);
  c.fill();
  c.restore();
}
// 主人公（男・女で、髪型・服・帽子が違う）
function drawHero(c, x, y, s, sex = heroSex()) {
  const f = sex === 1;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  if (f) {
    c.fillStyle = '#5b3a29'; // 長い髪（体のうしろ）
    c.fillRect(-6.5, -32, 13, 15);
  }
  c.fillStyle = '#2b3a4a';
  c.fillRect(-3.5, -9, 3, 9);
  c.fillRect(0.5, -9, 3, 9);
  if (f) {
    c.fillStyle = '#e8e2d0'; // スカート
    c.beginPath();
    c.moveTo(-5.5, -14);
    c.lineTo(5.5, -14);
    c.lineTo(8, -7);
    c.lineTo(-8, -7);
    c.fill();
  }
  c.fillStyle = f ? '#3fb8a8' : '#ffb454';
  c.fillRect(-5, -24, 10, f ? 11 : 15);
  c.fillStyle = '#f1c9a0';
  c.beginPath();
  c.arc(0, -29, 5, 0, 7);
  c.fill();
  if (f) {
    c.fillStyle = '#5b3a29'; // 前髪
    c.beginPath();
    c.arc(0, -30, 5.2, Math.PI, 0);
    c.fill();
    c.fillStyle = '#f2d08a'; // 麦わら帽子
    c.fillRect(-8, -33.5, 16, 2.2);
    c.beginPath();
    c.arc(0, -33.5, 5, Math.PI, 0);
    c.fill();
    c.fillStyle = '#ff7aa2';
    c.fillRect(-5, -35.2, 10, 1.6);
  } else {
    c.fillStyle = '#c0392b';
    c.fillRect(-6.5, -33, 13, 2.5);
    c.beginPath();
    c.arc(0, -33, 5, Math.PI, 0);
    c.fill();
  }
  c.restore();
}
function glow(c, x, y, r, col, a) {
  const g = c.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, col + '00');
  c.save();
  c.globalAlpha = a;
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, 7);
  c.fill();
  c.restore();
}
function drawCrew(cr, ts) {
  const x = crewX(cr.i),
    e = cr.ev && cr.ev.delay <= 0 ? cr.ev : null;
  cx.save();
  cx.globalAlpha = cr.pop;
  cx.translate(0, -(1 - cr.pop) * 24);
  person(cx, x, 120, COLS[cr.i % 10], HATS[cr.i % 5], 0.8);
  const rx = x + 24,
    ry = 86,
    bx = x + 30;
  let by = 148 + Math.sin(ts / 600 + cr.i * 1.7) * 2;
  if (e && e.t < 0.5) by += 5;
  cx.strokeStyle = '#d9c7a8';
  cx.lineWidth = 2;
  cx.beginPath();
  cx.moveTo(x + 4, 104);
  cx.lineTo(rx, ry);
  cx.stroke();
  cx.strokeStyle = 'rgba(255,255,255,.7)';
  cx.lineWidth = 1;
  cx.beginPath();
  cx.moveTo(rx, ry);
  cx.lineTo(bx, by);
  cx.stroke();
  if (!e || e.t < 0.3) {
    cx.fillStyle = cr.i % 2 ? '#ff5a4e' : '#ffd24a';
    cx.beginPath();
    cx.arc(bx, by, 3.2, 0, 7);
    cx.fill();
  }
  if (e && e.t >= 0.3 && e.t < 1.3) {
    const u = (e.t - 0.3) / 1,
      fx = bx + (x + 8 - bx) * u,
      fy = by + (ry - by) * u - Math.sin(u * Math.PI) * 22;
    drawSp(cx, e.sp, fx, fy, 24);
  }
  if (e && e.t >= 1.2) {
    cx.globalAlpha = cr.pop * clamp(1 - (e.t - 1.2) / 1.2, 0, 1);
    cx.fillStyle = '#ffd24a';
    cx.font = '900 13px sans-serif';
    cx.textAlign = 'center';
    cx.fillText('+' + yen(e.val), x + 6, 78 - (e.t - 1.2) * 14);
  }
  cx.restore();
}
const HULLC = [
    '',
    '#3a6f8f',
    '#2b4a63',
    '#2d8f8a',
    '#a33a3a',
    '#5a3f9a',
    '#7a2a1a',
    '#4a4a3a',
    '#2a4a7a',
    '#b04a6a'
  ],
  TOPC = [
    '',
    '#c9d3d9',
    '#e4e9ec',
    '#f4f4f4',
    '#e8e8ee',
    '#d9c8ff',
    '#ffd0b0',
    '#d8d0b8',
    '#d0e4ff',
    '#fff0c8'
  ],
  STRIPEC = [
    '',
    '#d9503f',
    '#d9503f',
    '#ffd24a',
    '#ffffff',
    '#ffd0ff',
    '#ff5a2a',
    '#c8a04a',
    '#6ab0ff',
    '#ffd24a'
  ];
function areaDeco(a, ts) {
  if (a === 2) {
    cx.fillStyle = 'rgba(0,10,30,.25)';
    cx.fillRect(0, 130, 480, 120);
  } else if (a === 3) {
    cx.fillStyle = '#2d6a4f';
    cx.beginPath();
    cx.ellipse(410, 134, 70, 12, 0, Math.PI, 0);
    cx.fill();
    [
      [392, 100, 1],
      [432, 106, -1]
    ].forEach(([x, y, d]) => {
      cx.strokeStyle = '#5a4028';
      cx.lineWidth = 3;
      cx.beginPath();
      cx.moveTo(x, 130);
      cx.quadraticCurveTo(x + 4 * d, y + 16, x + 2 * d, y);
      cx.stroke();
      cx.fillStyle = '#3fae6a';
      for (let k = 0; k < 5; k++) {
        cx.beginPath();
        cx.ellipse(x + 2 * d, y, 15, 3.5, -1.3 + k * 0.65, 0, 7);
        cx.fill();
      }
    });
  } else if (a === 4) {
    [
      [300, 50, 34],
      [390, 72, 48],
      [452, 40, 24]
    ].forEach(([x, w, hh], i) => {
      const dx = Math.sin(ts / 4000 + i) * 3;
      cx.fillStyle = 'rgba(230,243,252,.95)';
      cx.beginPath();
      cx.moveTo(x + dx, 134);
      cx.lineTo(x + dx + w * 0.35, 134 - hh);
      cx.lineTo(x + dx + w * 0.6, 134 - hh * 0.55);
      cx.lineTo(x + dx + w * 0.78, 134 - hh * 0.8);
      cx.lineTo(x + dx + w, 134);
      cx.closePath();
      cx.fill();
      cx.fillStyle = 'rgba(190,220,240,.3)';
      cx.beginPath();
      cx.moveTo(x + dx, 134);
      cx.lineTo(x + dx + w, 134);
      cx.lineTo(x + dx + w * 0.5, 134 + hh * 0.5);
      cx.closePath();
      cx.fill();
    });
  } else if (a === 5) {
    for (let k = 0; k < 3; k++) {
      cx.strokeStyle = `hsla(${160 + k * 60},80%,65%,.28)`;
      cx.lineWidth = 10;
      cx.beginPath();
      for (let x = 0; x <= 480; x += 10) {
        const y = 30 + k * 18 + Math.sin(x / 70 + ts / 1200 + k * 2) * 10;
        x ? cx.lineTo(x, y) : cx.moveTo(x, y);
      }
      cx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const x = (i * 71 + ts / 40) % 480,
        y = 50 + ((i * 37) % 70) + Math.sin(ts / 700 + i) * 6;
      cx.fillStyle = `hsla(${260 + i * 10},80%,78%,${0.35 + 0.3 * Math.sin(ts / 400 + i)})`;
      cx.beginPath();
      cx.arc(x, y, 2 + (i % 3), 0, 7);
      cx.fill();
    }
  }
}
function areaDeco2(a, ts) {
  if (a === 6) {
    // 海底火山：赤い空と、噴煙
    cx.fillStyle = 'rgba(255,90,30,.22)';
    cx.fillRect(0, 0, 480, 130);
    cx.fillStyle = '#2a1a16';
    cx.beginPath();
    cx.moveTo(300, 134);
    cx.lineTo(380, 60);
    cx.lineTo(410, 60);
    cx.lineTo(480, 134);
    cx.closePath();
    cx.fill();
    cx.fillStyle = '#ff6a2a';
    cx.beginPath();
    cx.moveTo(380, 62);
    cx.lineTo(410, 62);
    cx.lineTo(396, 72);
    cx.closePath();
    cx.fill();
    for (let i = 0; i < 5; i++) {
      const t = (ts / 1400 + i * 0.2) % 1;
      cx.fillStyle = 'rgba(90,70,70,' + 0.5 * (1 - t) + ')';
      cx.beginPath();
      cx.arc(395 + Math.sin(i + t * 3) * 10, 60 - t * 50, 6 + t * 14, 0, 7);
      cx.fill();
    }
  } else if (a === 7) {
    // 沈没船：海面から突き出た船体とマスト
    cx.fillStyle = '#3a2a20';
    cx.beginPath();
    cx.moveTo(300, 134);
    cx.lineTo(330, 112);
    cx.lineTo(440, 118);
    cx.lineTo(460, 134);
    cx.closePath();
    cx.fill();
    cx.strokeStyle = '#4a3a2a';
    cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(372, 116);
    cx.lineTo(366, 60);
    cx.moveTo(366, 70);
    cx.lineTo(400, 100);
    cx.stroke();
    cx.fillStyle = 'rgba(220,220,230,.35)';
    cx.beginPath();
    cx.moveTo(366, 70);
    cx.lineTo(392, 92);
    cx.lineTo(366, 96);
    cx.fill();
  } else if (a === 8) {
    // 極夜：オーロラと星
    for (let k = 0; k < 3; k++) {
      cx.strokeStyle = 'hsla(' + (130 + k * 40) + ',85%,62%,.3)';
      cx.lineWidth = 12;
      cx.beginPath();
      for (let x = 0; x <= 480; x += 10) {
        const y = 26 + k * 20 + Math.sin(x / 60 + ts / 1500 + k * 2) * 12;
        x ? cx.lineTo(x, y) : cx.moveTo(x, y);
      }
      cx.stroke();
    }
    cx.fillStyle = '#fff';
    for (let i = 0; i < 30; i++) {
      cx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(ts / 800 + i));
      cx.fillRect((i * 83) % 480, (i * 41) % 100, 1.6, 1.6);
    }
    cx.globalAlpha = 1;
  } else if (a === 9) {
    // 竜宮：黄金の柱と、あわ
    [
      [330, 70],
      [390, 50],
      [450, 62]
    ].forEach(([x, h]) => {
      cx.fillStyle = 'rgba(255,210,90,.85)';
      cx.fillRect(x, 134 - h, 12, h);
      cx.fillStyle = 'rgba(255,120,150,.9)';
      cx.fillRect(x - 4, 134 - h - 6, 20, 6);
    });
    for (let i = 0; i < 14; i++) {
      const t = (ts / 2600 + i * 0.071) % 1;
      cx.fillStyle = 'rgba(255,255,255,' + 0.5 * (1 - t) + ')';
      cx.beginPath();
      cx.arc(((i * 67) % 480) + Math.sin(ts / 500 + i) * 4, 250 - t * 120, 2 + (i % 3), 0, 7);
      cx.fill();
    }
  }
}
const fishX = f => 140 + (1 - f.prog / 100) * 270;
function draw(ts) {
  cx.save();
  if (FX.shake > 0) cx.translate(rnd(-1, 1) * FX.shake * 8, rnd(-1, 1) * FX.shake * 8);
  const p = clamp((G.min - 360) / 720, 0, 1);
  const A = AREAS[G.area];
  const hue = p < 0.7 ? A.hue : A.hue - ((p - 0.7) / 0.3) * (A.hue - 15),
    lit = 62 - p * 32 + A.lb;
  cx.fillStyle = `hsl(${hue},${A.ss}%,${lit}%)`;
  cx.fillRect(0, 0, 480, 130);
  cx.fillStyle = `hsl(${p < 0.7 ? 45 : 30},90%,${70 - p * 20}%)`;
  cx.beginPath();
  cx.arc(380, Math.min(110, 40 + p * 90), 22, 0, 7);
  cx.fill();
  const sea = cx.createLinearGradient(0, 130, 0, 250);
  sea.addColorStop(0, `hsl(${A.sea},${A.ss}%,${34 - p * 14 + A.lb}%)`);
  sea.addColorStop(1, `hsl(${A.sea + 8},${A.ss + 5}%,${16 - p * 6 + A.lb * 0.6}%)`);
  cx.fillStyle = sea;
  cx.fillRect(0, 130, 480, 120);
  cx.strokeStyle = 'rgba(255,255,255,.18)';
  cx.lineWidth = 1.5;
  for (let r = 0; r < 5; r++) {
    cx.beginPath();
    for (let x = 0; x <= 480; x += 8) {
      const y = 146 + r * 20 + Math.sin(x / 38 + ts / 700 + r) * 3;
      x ? cx.lineTo(x, y) : cx.moveTo(x, y);
    }
    cx.stroke();
  }
  areaDeco(G.area, ts);
  areaDeco2(G.area, ts);
  const deckW = Math.min(478, 150 + G.crew * 32);
  if (G.area === 0) {
    cx.fillStyle = '#5b4332';
    cx.fillRect(0, 120, deckW, 14);
    for (let x = 14; x < deckW - 8; x += 86) cx.fillRect(x, 134, 8, 40);
  } else {
    cx.fillStyle = TOPC[G.area];
    cx.fillRect(0, 118, deckW, 6);
    cx.fillStyle = HULLC[G.area];
    cx.beginPath();
    cx.moveTo(0, 124);
    cx.lineTo(deckW + 14, 124);
    cx.lineTo(deckW - 8, 148);
    cx.lineTo(0, 148);
    cx.closePath();
    cx.fill();
    cx.fillStyle = STRIPEC[G.area];
    cx.fillRect(0, 132, deckW, 3);
  }
  CREW.forEach(cr => drawCrew(cr, ts));
  drawHero(cx, 46, 120, 1.25);
  cx.strokeStyle = '#d9c7a8';
  cx.lineWidth = 3;
  cx.beginPath();
  cx.moveTo(54, 97);
  cx.lineTo(TIP.x, TIP.y);
  cx.stroke();
  cx.lineWidth = 1;
  cx.strokeStyle = 'rgba(255,255,255,.8)';
  const st = S.st,
    tc = S.tier ? TIER[S.tier].c : null;
  if (st === 'fight') {
    const f = S.f,
      L = (58 + ((S.size - S.sp.min) / (S.sp.max - S.sp.min)) * 52) * (S.sp.boss ? 1.3 : 1),
      str = f.struggle;
    const fx = fishX(f) + (str ? 10 + Math.sin(ts / 90) * 5 : 0),
      fy =
        176 +
        Math.sin(ts / 300) * 4 +
        (str ? Math.sin(ts / 38) * (S.tier === 3 ? 12 : 8) + Math.sin(ts / 97) * 4 : 0);
    const ang = str ? Math.sin(ts / 55) * 0.38 * f.flip + 0.15 : Math.sin(ts / 500) * 0.06;
    const ml = (-f.flip * L) / 2,
      mx = fx + ml * Math.cos(ang),
      my = fy + ml * Math.sin(ang);
    if (str) {
      for (let k = 0; k < 2; k++) {
        const r = ((ts / 350 + k / 2) % 1) * 30;
        cx.strokeStyle = 'rgba(255,255,255,' + 0.55 * (1 - r / 30) + ')';
        cx.lineWidth = 1.5;
        cx.beginPath();
        cx.ellipse(fx, 150, r * 1.6, r * 0.4, 0, 0, 7);
        cx.stroke();
      }
    }
    const gb = Math.round(255 - f.tens * 2.2);
    cx.strokeStyle = `rgba(255,${gb},${gb},.9)`;
    cx.lineWidth = 1 + f.tens / 60;
    cx.beginPath();
    cx.moveTo(TIP.x, TIP.y);
    cx.quadraticCurveTo((TIP.x + mx) / 2, Math.min(TIP.y, my) - 10 + f.tens * 0.4, mx, my);
    cx.stroke();
    cx.lineWidth = 1;
    cx.save();
    cx.translate(fx, fy);
    cx.rotate(ang);
    cx.scale(f.flip, 1);
    if (tc) glow(cx, 0, 0, L * 0.95, tc, 0.45 + 0.2 * Math.sin(ts / 150));
    drawSp(cx, S.dsp || S.sp, 0, 0, L);
    cx.restore();
    if (S.sp.boss) {
      cx.fillStyle = '#ffd24a';
      cx.font = '900 12px sans-serif';
      cx.textAlign = 'center';
      cx.fillText(S.sp.n, Math.min(430, Math.max(60, fx)), fy - L * 0.5 - 22);
      cx.textAlign = 'left';
    }
    if (str) {
      cx.fillStyle = '#ff6b5e';
      cx.font = '900 22px sans-serif';
      cx.textAlign = 'center';
      cx.fillText('!!', fx, fy - L * 0.42 - 6 + Math.sin(ts / 60) * 2);
      cx.textAlign = 'left';
    }
  } else if (st === 'wait' || st === 'bite') {
    const bx = 300,
      by = 148 + (st === 'bite' ? 10 + Math.sin(ts / 50) * 6 : Math.sin(ts / 500) * 2);
    cx.beginPath();
    cx.moveTo(TIP.x, TIP.y);
    cx.quadraticCurveTo((TIP.x + bx) / 2, TIP.y - 6, bx, by);
    cx.stroke();
    if (st === 'bite' && tc) {
      cx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const r = ((ts / 450 + k / 3) % 1) * 34;
        cx.strokeStyle = tc;
        cx.globalAlpha = 1 - r / 34;
        cx.beginPath();
        cx.ellipse(bx, 148, r * 1.3, r * 0.45, 0, 0, 7);
        cx.stroke();
      }
      cx.globalAlpha = 1;
      cx.lineWidth = 1;
    }
    cx.fillStyle = '#ff5a4e';
    cx.beginPath();
    cx.arc(bx, by, 6, 0, 7);
    cx.fill();
    if (st === 'bite') {
      cx.fillStyle = tc || '#ffd24a';
      cx.font = `900 ${S.tier ? 52 : 40}px sans-serif`;
      cx.fillText(S.tier >= 2 ? '!!' : '!', bx - (S.tier >= 2 ? 16 : 8), by - 24);
    }
  } else {
    cx.beginPath();
    cx.moveTo(TIP.x, TIP.y);
    cx.lineTo(TIP.x + 4, 150);
    cx.stroke();
    if (st === 'result' && S.ok) {
      const y = 112 + Math.sin(ts / 200) * 4;
      if (tc) glow(cx, TIP.x + 46, y, 56, tc, 0.5);
      drawSp(cx, S.dsp || S.sp, TIP.x + 46, y, 60);
    }
  }
  PT.forEach(q => {
    cx.globalAlpha = Math.min(1, q.life / 0.6);
    cx.fillStyle = q.c;
    if (q.s) {
      cx.save();
      cx.translate(q.x, q.y);
      cx.rotate(q.life * 6);
      cx.fillRect(-q.r, -q.r, q.r * 2, q.r * 2);
      cx.restore();
    } else {
      cx.beginPath();
      cx.arc(q.x, q.y, q.r, 0, 7);
      cx.fill();
    }
  });
  cx.globalAlpha = 1;
  if (FX.flash > 0) {
    cx.globalAlpha = Math.min(0.6, FX.flash);
    cx.fillStyle = FX.col;
    cx.fillRect(0, 0, 480, 250);
    cx.globalAlpha = 1;
  }
  cx.restore();
}
