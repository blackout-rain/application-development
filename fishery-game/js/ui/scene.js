/* ---------- scene ---------- */
const cv = $('#cv'),
  cx = cv.getContext('2d');
// ほかの人（漁師）。主人公と同じ、濃い紺のふち取りで描いて、絵がなじむようにする
function person(c, x, y, col, hat, s) {
  const ol = '#12142a',
    ob = (px, py, w, h, f) => {
      c.fillStyle = ol;
      c.fillRect(px - 1, py - 1, w + 2, h + 2);
      c.fillStyle = f;
      c.fillRect(px, py, w, h);
    };
  c.save();
  c.translate(x, y);
  c.scale(s * 1.2, s * 1.2);
  ob(-4, -10, 3.4, 9, '#44628a');
  ob(0.6, -10, 3.4, 9, '#3a5578');
  ob(-4.4, -2, 4, 2, '#eef2f6');
  ob(0.4, -2, 4, 2, '#eef2f6');
  ob(-5.5, -25, 11, 16, col);
  c.fillStyle = 'rgba(10,20,60,.2)';
  c.fillRect(1.5, -25, 4, 16);
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.fillRect(-5.5, -25, 11, 2);
  c.fillStyle = ol;
  c.beginPath();
  c.arc(0, -30, 6.3, 0, 7);
  c.fill();
  c.fillStyle = '#f4c9a0';
  c.beginPath();
  c.arc(0, -30, 5.3, 0, 7);
  c.fill();
  c.fillStyle = '#12142a';
  c.fillRect(-3, -30.4, 1.4, 2);
  c.fillRect(1.6, -30.4, 1.4, 2);
  c.fillStyle = 'rgba(255,120,130,.55)';
  c.fillRect(-4.2, -28, 1.8, 1.2);
  c.fillRect(2.4, -28, 1.8, 1.2);
  c.fillStyle = ol;
  c.beginPath();
  c.arc(0, -33, 6.1, Math.PI, 0);
  c.fill();
  c.fillRect(-7.4, -34, 14.8, 3.4);
  c.fillStyle = hat;
  c.beginPath();
  c.arc(0, -33, 5.2, Math.PI, 0);
  c.fill();
  c.fillRect(-6.4, -33, 12.8, 2.2);
  c.restore();
}
// ---- 主人公：用意した絵（男・女）を使う。足元の中心が (x, y)、高さが 50 * s ----
// 正面の絵（自宅・決める画面）と、海を向いて竿を持つ横向きの絵（釣り場面）がある
const HERO_UNIT = 50;
const HERO_IMG = {};
function heroPart(sex, pose) {
  const d = HERO_SPR[sex === 1 ? 'f' : 'm'];
  return pose === 'fish' ? d.fish : d;
}
function heroImg(sex, h, pose) {
  const d = heroPart(sex, pose),
    sz = ['S', 'M', 'L'].find(n => d.img[n] && d.img[n].h >= h) || (d.img.L ? 'L' : 'M'),
    key = (sex === 1 ? 'f' : 'm') + (pose || '') + sz;
  if (!HERO_IMG[key]) {
    HERO_IMG[key] = new Image();
    HERO_IMG[key].src = d.img[sz].src;
  }
  return HERO_IMG[key];
}
[0, 1].forEach(sx => ['', 'fish'].forEach(po => [20, 150, 400].forEach(h => heroImg(sx, h, po)))); // 先に読み込んでおく
let HERO_TMP = null;
// 色をかぶせた絵（夕方・夜に、景色になじませる）。絵の形の内側だけに色が乗る
function heroTinted(im, W, H, tint) {
  const t = HERO_TMP || (HERO_TMP = document.createElement('canvas')),
    w = Math.ceil(W),
    h = Math.ceil(H);
  if (t.width !== w || t.height !== h) {
    t.width = w;
    t.height = h;
  }
  const g = t.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.imageSmoothingQuality = 'high';
  g.globalCompositeOperation = 'source-over';
  g.drawImage(im, 0, 0, W, H);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = tint;
  g.fillRect(0, 0, w, h);
  return t;
}
// o: {pose: 'fish'なら横向き, bob: 上下のゆれ(px), lean: うしろへの傾き(ラジアン), tint: かぶせる色, onload: 画像がまだなら、読み込み後に呼ぶ}
// 戻り値: 竿の先の位置（そこから、ゲーム側で竿の続きと糸を描く）
function drawHero(c, x, y, s, sex = heroSex(), o = {}) {
  const d = heroPart(sex, o.pose),
    H = HERO_UNIT * s,
    W = H * d.aspect,
    im = heroImg(sex, H, o.pose),
    lean = o.lean || 0,
    fy = y + (o.bob || 0);
  c.save();
  c.fillStyle = 'rgba(0,20,40,.28)';
  c.beginPath();
  c.ellipse(x, y + 1, W * 0.36, Math.max(2, H * 0.045), 0, 0, 7);
  c.fill();
  c.translate(x, fy);
  c.rotate(lean);
  if (im.complete && im.naturalWidth) {
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(o.tint ? heroTinted(im, W, H, o.tint) : im, -d.foot * H, -H, W, H);
  } else if (o.onload) im.addEventListener('load', o.onload, {once: true});
  c.restore();
  const tx = (d.tip[0] - d.foot) * H,
    ty = (d.tip[1] - 1) * H;
  return {
    x: x + tx * Math.cos(lean) - ty * Math.sin(lean),
    y: fy + tx * Math.sin(lean) + ty * Math.cos(lean)
  };
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
  const dusk = clamp((p - 0.5) / 0.5, 0, 1); // 夕方から夜にかけて、人物にも景色の色を乗せる
  const rt = drawHero(cx, 44, 120, 1.5, heroSex(), {
    pose: 'fish',
    tint:
      dusk > 0
        ? dusk < 0.6
          ? `rgba(255,130,60,${(0.22 * dusk) / 0.6})`
          : `rgba(30,40,100,${0.22 + (0.2 * (dusk - 0.6)) / 0.4})`
        : '',
    bob: Math.sin(ts / 520) * 0.5,
    lean: S.st === 'fight' ? -0.03 - S.f.tens * 0.0004 : 0 // 大物とのやりとりでは、少し体を引く
  });
  // 竿の続き：絵の竿の先から、糸の出る位置（TIP）まで、しなる竿を描く
  cx.lineCap = 'round';
  cx.strokeStyle = '#4a2f1c';
  cx.lineWidth = 2.6;
  cx.beginPath();
  cx.moveTo(rt.x, rt.y);
  cx.quadraticCurveTo(rt.x + 22, rt.y - 14, TIP.x, TIP.y);
  cx.stroke();
  cx.strokeStyle = '#a2704a';
  cx.lineWidth = 1.2;
  cx.beginPath();
  cx.moveTo(rt.x, rt.y);
  cx.quadraticCurveTo(rt.x + 22, rt.y - 14, TIP.x, TIP.y);
  cx.stroke();
  cx.lineCap = 'butt';
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
