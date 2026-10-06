/* ---------- scene ---------- */
const cv = $('#cv'),
  cx = cv.getContext('2d');
// 画面の細かさに合わせて、キャンバスの解像度を上げる（座標は、いつも 横W×縦H のまま描ける）。スマホでも、絵がぼやけない。
function fitCanvas(cvs, c, W, H) {
  const k = clamp(Math.ceil((cvs.clientWidth * (window.devicePixelRatio || 1)) / W - 0.15), 1, 3);
  if (cvs.width !== W * k) {
    cvs.width = W * k;
    cvs.height = H * k;
  }
  c.setTransform(k, 0, 0, k, 0, 0);
  return k;
}
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
    im = heroImg(sex, H * (c.getTransform().a || 1), o.pose),
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
const fishX = f => SCN.fx0 + (1 - f.prog / 100) * SCN.fxw;
function draw(ts) {
  fitCanvas(cv, cx, 480, 250);
  cx.save();
  if (FX.shake > 0) cx.translate(rnd(-1, 1) * FX.shake * 8, rnd(-1, 1) * FX.shake * 8);
  const p = clamp((G.min - 360) / 720, 0, 1);
  // 港の堤防は、用意された絵（主人公入り）。ほかの海域は、これまでのドット絵の背景と、横向きの主人公
  const harbor = G.area === 0 && harborReady();
  SCN = harbor ? HG : LG;
  TIP.x = SCN.tip.x;
  TIP.y = SCN.tip.y;
  if (harbor) {
    drawHarborScene(cx, heroSex(), p, ts);
    CREW.forEach(cr => harborCrew(cr, ts));
  } else {
    drawBackdrop(cx, G.area, p, ts);
    const deckW = Math.min(478, 150 + G.crew * 32);
    drawDeck(cx, G.area, deckW, p, ts);
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
  }
  cx.lineWidth = 1;
  cx.strokeStyle = 'rgba(255,255,255,.8)';
  // 糸：港の絵のときは、絵のドットの大きさにそろえて描く
  const sline = (x0, y0, qx, qy, x1, y1, col, lw) => {
    if (harbor) harborLine(cx, x0, y0, qx, qy, x1, y1, col);
    else {
      cx.strokeStyle = col;
      cx.lineWidth = lw || 1;
      cx.beginPath();
      cx.moveTo(x0, y0);
      cx.quadraticCurveTo(qx, qy, x1, y1);
      cx.stroke();
    }
  };
  const st = S.st,
    tc = S.tier ? TIER[S.tier].c : null;
  if (st === 'fight') {
    const f = S.f,
      L = (58 + ((S.size - S.sp.min) / (S.sp.max - S.sp.min)) * 52) * (S.sp.boss ? 1.3 : 1),
      str = f.struggle;
    const fx = fishX(f) + (str ? 10 + Math.sin(ts / 90) * 5 : 0),
      fy =
        SCN.fy +
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
    sline(
      TIP.x,
      TIP.y,
      (TIP.x + mx) / 2,
      Math.min(TIP.y, my) - 10 + f.tens * 0.4,
      mx,
      my,
      `rgba(255,${gb},${gb},.9)`,
      1 + f.tens / 60
    );
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
    const bx = SCN.bx,
      by = SCN.by + (st === 'bite' ? 10 + Math.sin(ts / 50) * 6 : Math.sin(ts / 500) * 2);
    sline(TIP.x, TIP.y, (TIP.x + bx) / 2, harbor ? TIP.y + 18 : TIP.y - 6, bx, by, 'rgba(255,255,255,.8)', 1);
    if (st === 'bite' && tc) {
      cx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const r = ((ts / 450 + k / 3) % 1) * 34;
        cx.strokeStyle = tc;
        cx.globalAlpha = 1 - r / 34;
        cx.beginPath();
        cx.ellipse(bx, SCN.by, r * 1.3, r * 0.45, 0, 0, 7);
        cx.stroke();
      }
      cx.globalAlpha = 1;
      cx.lineWidth = 1;
    }
    if (!(harbor && harborBuoy(cx, bx, by))) {
      cx.fillStyle = '#ff5a4e';
      cx.beginPath();
      cx.arc(bx, by, 6, 0, 7);
      cx.fill();
    }
    if (st === 'bite') {
      cx.fillStyle = tc || '#ffd24a';
      cx.font = `900 ${S.tier ? 52 : 40}px sans-serif`;
      cx.fillText(S.tier >= 2 ? '!!' : '!', bx - (S.tier >= 2 ? 16 : 8), by - 24);
    }
  } else {
    sline(
      TIP.x,
      TIP.y,
      TIP.x + 2,
      (TIP.y + SCN.resY) / 2,
      TIP.x + SCN.resDx - 14,
      SCN.resY - 2,
      'rgba(255,255,255,.8)',
      1
    );
    if (st === 'result' && S.ok) {
      const y = SCN.resY + Math.sin(ts / 200) * 4;
      if (tc) glow(cx, TIP.x + SCN.resDx, y, 56, tc, 0.5);
      drawSp(cx, S.dsp || S.sp, TIP.x + SCN.resDx, y, 60);
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
