/* ---------- 釣り場面の背景（ドット絵）----------
   空・雲・海・波・桟橋（船）を、ドットで描く。時間（p）で色が変わるので、少しずつ描き直す（キャッシュ）。
   座標は「論理px」（横480×縦250）。ドットの絵は PXS 倍の細かさ。水平線は y=130。 */
const BD_W = 480 * PXS,
  BD_HOR = 130 * PXS,
  BD_SEA_H = 120 * PXS;
const BD = {cur: null};
const BD_INK = pxHex('#0f1230'); // ふち取り（主人公の絵と同じ濃い紺）

// 海域と時間から、空・海の色を決める
function bdColors(A, p, a) {
  const ev = clamp((p - 0.62) / 0.3, 0, 1),
    nt = a === 8 ? Math.max(0.85, clamp((p - 0.84) / 0.16, 0, 1)) : clamp((p - 0.84) / 0.16, 0, 1),
    lit = 62 - p * 16 + A.lb;
  let top = pxHsl(A.hue, A.ss + 10, lit - 9),
    hor = pxHsl(A.hue - 6, A.ss - 14, lit + 15);
  // 夕方：上は紫、水平線はだいだい色へ（色相をまわすと緑を通ってしまうので、色を混ぜる）
  top = pxMix(top, pxRgb(86, 58, 128), ev * 0.75);
  hor = pxMix(hor, pxRgb(255, 150, 84), ev * 0.85);
  top = pxMix(top, pxRgb(12, 16, 48), nt * 0.8);
  hor = pxMix(hor, pxRgb(64, 40, 88), nt * 0.7);
  return {
    ev,
    nt,
    top,
    hor,
    sun: pxMix(pxHsl(48, 92, 68), pxRgb(255, 120, 50), ev),
    seaTop: pxMix(pxHsl(A.sea, A.ss, 34 - p * 12 + A.lb), pxRgb(255, 140, 90), ev * 0.2),
    seaBot: pxHsl(A.sea + 8, A.ss + 5, 16 - p * 5 + A.lb * 0.6)
  };
}

// 空：ななめの網点でなじむ段のグラデーション、太陽（光の輪つき）、夜の星
function bdSky(a, p, cl) {
  const px = new Px(BD_W, BD_HOR);
  pxVGrad(px, 0, BD_HOR, cl.top, cl.hor, 14);
  if (cl.nt > 0.05) {
    const r = pxRng(11 + a);
    for (let i = 0; i < 90 * cl.nt; i++) {
      const x = Math.floor(r() * BD_W),
        y = Math.floor(r() * BD_HOR * 0.8),
        b = r();
      px.set(x, y, pxLight(cl.top, 0.55 + b * 0.4));
      if (b > 0.85) {
        px.set(x + 1, y, pxLight(cl.top, 0.5));
        px.set(x, y + 1, pxLight(cl.top, 0.5));
      }
    }
  }
  if (a !== 6 && a !== 8) {
    // 太陽（夕方は、水平線に近づく）
    const sx = 380 * PXS,
      sy = Math.min(110, 40 + p * 90) * PXS,
      R = 22 * PXS;
    const glow = (r, t) =>
      px.ell(
        sx,
        sy,
        r,
        r,
        (x, y) =>
          ((PX_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < t ? pxMix(px.get(x, y), cl.sun, 0.35) : 0) || 0
      );
    glow(R * 2.3, 0.25);
    glow(R * 1.7, 0.45);
    glow(R * 1.3, 0.7);
    px.disc(sx, sy, R, pxLight(cl.sun, 0.12));
    px.disc(sx - R * 0.18, sy - R * 0.2, R * 0.78, cl.sun);
    px.disc(sx - R * 0.3, sy - R * 0.34, R * 0.42, pxLight(cl.sun, 0.45));
    px.ell(sx + R * 0.2, sy + R * 0.42, R * 0.62, R * 0.3, pxMix(cl.sun, pxRgb(255, 110, 60), 0.35));
  }
  return px;
}

// 雲（ドット絵）：上が明るく、下が影。つなぎ目は網点
function bdCloud(w, h, seed, cl) {
  const px = new Px(w, h),
    r = pxRng(seed),
    bumps = [];
  const n = Math.max(4, Math.round(w / 34));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n,
      rad = h * (0.28 + 0.3 * Math.sin(Math.PI * t) * (0.7 + 0.5 * r()));
    bumps.push([w * (0.08 + 0.84 * t), h - rad * 0.92 - 2, rad]);
  }
  const base = pxMix(pxRgb(255, 255, 255), cl.hor, 0.18 + 0.5 * cl.ev),
    lit = pxLight(base, 0.5),
    shade = pxMix(base, cl.top, 0.45 + 0.2 * cl.nt),
    inside = (x, y) =>
      y < h - 3 && bumps.some(b => (x - b[0]) * (x - b[0]) + (y - b[1]) * (y - b[1]) <= b[2] * b[2]);
  for (let x = 0; x < w; x++) {
    let y0 = -1,
      y1 = -1;
    for (let y = 0; y < h; y++)
      if (inside(x, y)) {
        if (y0 < 0) y0 = y;
        y1 = y;
      }
    for (let y = y0; y >= 0 && y <= y1; y++) {
      const d = y - y0,
        u = y1 - y,
        th = (PX_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      px.set(x, y, d < 3 ? lit : u < 5 ? (u < 2 || (5 - u) / 4 > th ? shade : base) : base);
    }
  }
  return px.put();
}

// 海：段のグラデーション（沖は暗く）、水平線のもや、太陽の光の道
function bdSea(a, p, cl) {
  const px = new Px(BD_W, BD_SEA_H);
  pxVGrad(px, 0, BD_SEA_H, cl.seaTop, cl.seaBot, 18);
  px.rect(0, 0, BD_W, 3, pxMix(cl.hor, cl.seaTop, 0.25));
  px.rect(0, 3, BD_W, 6, pxMix(cl.hor, cl.seaTop, 0.6));
  if (a !== 6 && a !== 8 && cl.nt < 0.6) {
    const sx = 380 * PXS;
    for (let k = 0; k < 14; k++) {
      const y = 8 + k * 7 + (k * k) / 3,
        w = 14 + k * 5;
      for (let j = 0; j < 3; j++) {
        const ox = (((k * 37 + j * 53) % 41) - 20) * (0.4 + k / 14),
          c = pxMix(px.get(sx, y), cl.sun, 0.55 - k * 0.025);
        px.rect(
          sx + ox - w / 2 + j * (w / 3),
          y + j,
          sx + ox - w / 2 + j * (w / 3) + w / 3 - 3,
          y + j + 1,
          c
        );
      }
    }
  }
  return px;
}

// 波のすじ：奥は細かく、手前は大きい。横にゆっくり流す（描くのは一度だけ。左右がつながる）
function bdWaves(a, cl) {
  const px = new Px(BD_W, BD_SEA_H),
    r = pxRng(40 + a),
    N = 20;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1),
      y = Math.floor(8 + Math.pow(t, 1.5) * (BD_SEA_H - 30)),
      th = t < 0.35 ? 2 : t < 0.7 ? 3 : 4,
      len = 12 + t * 64,
      cnt = Math.round(3 + t * 4),
      base = pxMix(cl.seaTop, cl.seaBot, t),
      hi = pxLight(base, 0.3 + 0.1 * (1 - cl.nt)),
      mid = pxLight(base, 0.12),
      lo = pxDark(base, 0.22);
    for (let j = 0; j < cnt; j++) {
      const x0 = Math.floor(((j + 0.2 + r() * 0.6) / cnt) * BD_W),
        L = Math.floor(len * (0.7 + 0.7 * r())),
        foam = r() > 0.55;
      [0, -BD_W].forEach(o => {
        const x = x0 + o;
        px.rect(x + 1, y, x + L - 1, y + 1, hi);
        px.rect(x, y + 1, x + L, y + th - 1, mid);
        px.rect(x + 2, y + th - 1, x + L - 2, y + th, lo);
        px.rect(x + L * 0.25, y + th, x + L * 0.25 + L * 0.4, y + th + 1, lo);
        if (foam) px.rect(x + L * 0.15, y - 1, x + L * 0.15 + L * 0.25, y, pxLight(base, 0.55));
      });
    }
  }
  return px;
}

// 時間（p）と海域ごとに、背景の絵を作る。時間は14段階。次の段は、あいた時間に少しずつ先に作っておく（画面が止まらないように）
const BDC = {};
const BD_STAGES = [
  e => (e.sky = bdSky(e.a, e.q, e.cols).put()),
  e => (e.sea = bdSea(e.a, e.q, e.cols).put()),
  e => (e.wave = bdWaves(e.a, e.cols).put()),
  e => {
    const far = new Px(BD_W, BD_FAR_H);
    bdFar(far, e.a, e.q, e.cols);
    e.far = far.put();
  },
  e =>
    (e.clouds = [
      bdCloud(210, 54, 3, e.cols),
      bdCloud(150, 40, 8, e.cols),
      bdCloud(100, 28, 15, e.cols),
      bdCloud(260, 46, 21, e.cols)
    ])
];
function bdEntry(a, step) {
  const key = a + ':' + step;
  if (!BDC[key]) {
    const q = step / 14;
    BDC[key] = {key, a, q, step, i: 0, cols: bdColors(AREAS[a], q, a), t: Date.now()};
    const keys = Object.keys(BDC);
    if (keys.length > 5) {
      keys.sort((x, y) => BDC[x].t - BDC[y].t);
      delete BDC[keys[0]];
    }
  }
  return BDC[key];
}
const bdDone = e => e.i >= BD_STAGES.length;
function bdGet(a, p) {
  const step = Math.round(p * 14),
    e = bdEntry(a, step);
  while (!bdDone(e)) BD_STAGES[e.i++](e);
  e.t = Date.now();
  BD.cur = e;
  if (step < 14) {
    const nx = bdEntry(a, step + 1);
    if (!bdDone(nx) && !nx.sched) {
      nx.sched = 1;
      const tick = () => {
        if (!bdDone(nx)) {
          BD_STAGES[nx.i++](nx);
          setTimeout(tick, 40);
        }
      };
      setTimeout(tick, 80);
    }
  }
  return e;
}

// ---- 遠くの景色（海域ごと）。透明な層に描いて、海の上に重ねる。水平線は y = BD_HOR ----
const BD_FAR_H = BD_HOR + 60;
// 山なみ（ぎざぎざの稜線を、2色で塗る）
function bdRidge(px, base, amp, seed, c0, c1, f = 1) {
  const r = pxRng(seed),
    ph = [r() * 9, r() * 9, r() * 9];
  for (let x = 0; x < px.w; x++) {
    const h =
      amp *
      (0.5 +
        0.28 * Math.sin(x * 0.011 * f + ph[0]) +
        0.16 * Math.sin(x * 0.029 * f + ph[1]) +
        0.08 * Math.sin(x * 0.071 * f + ph[2]));
    const y0 = Math.floor(base - h);
    for (let y = y0; y < base; y++) {
      const t = (y - y0) / Math.max(1, base - y0);
      px.set(
        x,
        y,
        y === y0
          ? pxLight(c0, 0.3)
          : t < 0.5
            ? c0
            : (PX_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < (t - 0.5) * 2
              ? c1
              : c0
      );
    }
  }
}
// やしの木
function bdPalm(px, x, y, h, d, seed) {
  const r = pxRng(seed),
    top = [x + d * h * 0.28, y - h];
  for (let i = 0; i <= h; i++) {
    const t = i / h,
      cx = x + d * h * 0.28 * t * t * 1.3 + Math.sin(t * 3) * d,
      cy = y - i;
    px.rect(cx - 1.5, cy, cx + 1.5, cy + 1, pxMix(pxHex('#6b4a2a'), pxHex('#4a3220'), (i % 6) / 6));
  }
  const tx = x + d * h * 0.28 * 1.3 + Math.sin(3) * d;
  for (let k = 0; k < 7; k++) {
    const ang = -Math.PI * 0.95 + (k / 6) * Math.PI * 0.95 * 1.05,
      len = h * (0.55 + 0.15 * r());
    for (let i = 0; i < len; i++) {
      const t = i / len,
        lx = tx + Math.cos(ang) * i,
        ly = y - h + Math.sin(ang) * i * 0.55 + t * t * len * 0.55;
      px.rect(lx, ly, lx + 2, ly + 1.5, i % 5 === 0 ? pxHex('#6fd08a') : pxHex('#2f9a58'));
      if (t > 0.15) px.set(lx, ly + 2, pxHex('#1f6a3c'));
    }
  }
  px.disc(tx, y - h + 3, 2.4, pxHex('#5a3a22'));
}
function bdFar(px, a, p, cl) {
  const hz = BD_HOR,
    haze = c => pxMix(c, cl.hor, 0.35);
  const dark = pxMix(cl.top, pxRgb(10, 20, 40), 0.5),
    ridge1 = pxMix(cl.hor, cl.top, 0.35),
    ridge2 = pxMix(cl.hor, cl.top, 0.15);
  const lampOn = cl.nt > 0.3 || cl.ev > 0.5;
  if (a === 0) {
    bdRidge(px, hz, 36, 5, ridge1, pxMix(ridge1, cl.hor, 0.4), 1);
    bdRidge(px, hz, 16, 9, ridge2, pxMix(ridge2, cl.hor, 0.4), 1.6);
    // 港の町（小さな家々）
    const r = pxRng(21);
    for (let i = 0; i < 11; i++) {
      const x = 560 + i * 15 + Math.floor(r() * 5),
        w = 11 + Math.floor(r() * 6),
        h = 9 + Math.floor(r() * 10),
        wall = pxMix(pxHex('#d8d0c0'), cl.top, 0.45 + 0.25 * cl.nt),
        roof = pxMix(
          [pxHex('#b0584a'), pxHex('#4a6a8a'), pxHex('#8a7a5a')][i % 3],
          cl.top,
          0.35 + 0.25 * cl.nt
        );
      px.rect(x, hz - h, x + w, hz, wall);
      px.rect(x + w - 3, hz - h, x + w, hz, pxDark(wall, 0.18));
      px.poly(
        [
          [x - 2, hz - h],
          [x + w / 2, hz - h - 7],
          [x + w + 2, hz - h]
        ],
        roof
      );
      if (lampOn) px.rect(x + 3, hz - h + 4, x + 5, hz - h + 6, pxHex('#ffd98a'));
    }
    // 防波堤
    px.rect(420, hz - 6, 700, hz + 2, pxMix(pxHex('#8a8f98'), cl.top, 0.25));
    for (let x = 422; x < 700; x += 14)
      px.rect(x, hz - 6, x + 1, hz + 2, pxMix(pxHex('#5f646e'), cl.top, 0.25));
    px.rect(420, hz - 7, 700, hz - 6, pxLight(pxHex('#8a8f98'), 0.3));
    // 灯台
    const lx = 868;
    for (let y = hz - 76; y < hz - 6; y++) {
      const t = (y - (hz - 76)) / 70,
        hw = 7 + t * 4,
        band = Math.floor((y - (hz - 76)) / 14) % 2,
        c = band ? pxHex('#d9503f') : pxHex('#f2eee6');
      px.rect(lx - hw, y, lx + hw, y + 1, pxMix(c, cl.top, 0.18 + 0.3 * cl.nt));
      px.rect(lx + hw - 4, y, lx + hw, y + 1, pxDark(pxMix(c, cl.top, 0.18), 0.2));
    }
    px.rect(lx - 10, hz - 84, lx + 10, hz - 76, pxHex('#3a3a46'));
    px.rect(lx - 6, hz - 94, lx + 6, hz - 84, lampOn ? pxHex('#ffe9a0') : pxHex('#9fb4c0'));
    px.poly(
      [
        [lx - 9, hz - 94],
        [lx, hz - 104],
        [lx + 9, hz - 94]
      ],
      pxHex('#d9503f')
    );
  } else if (a === 1) {
    bdRidge(px, hz, 22, 7, ridge1, pxMix(ridge1, cl.hor, 0.4), 1.4);
    [
      [330, 80, 24],
      [770, 110, 32]
    ].forEach(([x, w, h], i) => {
      px.ell(x, hz, w, h, (xx, yy) =>
        yy > hz
          ? 0
          : yy < hz - h * 0.55
            ? pxMix(pxHex('#3f9a5a'), cl.top, 0.3)
            : pxMix(pxHex('#6a5a48'), cl.top, 0.3)
      );
      for (let k = 0; k < 6; k++)
        px.disc(
          x - w * 0.5 + k * (w / 5.5),
          hz - h * 0.85 - (k % 2) * 3,
          7,
          pxMix(pxHex('#2f8a50'), cl.top, 0.3)
        );
    });
    // ヨット
    const bx = 540,
      by = hz - 2;
    px.poly(
      [
        [bx - 18, by],
        [bx + 20, by],
        [bx + 12, by + 7],
        [bx - 12, by + 7]
      ],
      pxHex('#e9e4d8')
    );
    px.poly(
      [
        [bx, by - 34],
        [bx, by - 2],
        [bx + 18, by - 2]
      ],
      pxHex('#fbfaf5')
    );
    px.poly(
      [
        [bx - 2, by - 26],
        [bx - 2, by - 2],
        [bx - 14, by - 2]
      ],
      pxHex('#e4ddc8')
    );
    px.rect(bx - 0.5, by - 36, bx + 1, by, pxHex('#5a4630'));
  } else if (a === 2) {
    // 嵐の雲（重たい灰色）
    const r = pxRng(31);
    for (let i = 0; i < 26; i++) {
      const x = r() * BD_W,
        y = 8 + r() * 64,
        rad = 24 + r() * 40;
      px.ell(x, y, rad * 1.5, rad * 0.6, (xx, yy) =>
        yy > y + rad * 0.2 ? pxMix(cl.top, pxRgb(8, 14, 30), 0.65) : pxMix(cl.top, pxRgb(40, 54, 80), 0.5)
      );
    }
    bdRidge(px, hz, 10, 3, pxMix(cl.hor, dark, 0.5), dark, 2);
  } else if (a === 3) {
    px.ell(820, hz, 150, 24, pxMix(pxHex('#2d8a5a'), cl.top, 0.15));
    px.ell(820, hz + 2, 140, 10, pxHex('#e8d49a'));
    px.rect(690, hz - 2, 950, hz + 3, pxHex('#e8d49a'));
    bdPalm(px, 784, hz - 4, 74, 1, 3);
    bdPalm(px, 866, hz - 4, 62, -1, 4);
    // さんご礁（水平線の近くの、赤い岩）
    for (let i = 0; i < 9; i++)
      px.disc(
        560 + i * 14,
        hz + 3 + (i % 3),
        6 + (i % 2) * 2,
        pxMix(pxHex('#ff7a8a'), cl.hor, 0.2 + (i % 3) * 0.1)
      );
  } else if (a === 4) {
    [
      [600, 100, 68],
      [780, 144, 96],
      [904, 48, 48]
    ].forEach(([x, w, h]) => {
      const y = hz + 4,
        top = [
          [x, y],
          [x + w * 0.3, y - h],
          [x + w * 0.52, y - h * 0.58],
          [x + w * 0.72, y - h * 0.82],
          [x + w, y]
        ];
      px.poly(top, (xx, yy) =>
        xx < x + w * 0.42 ? pxHex('#f4fbff') : xx < x + w * 0.7 ? pxHex('#d4e8f4') : pxHex('#a8c8de')
      );
      px.poly(
        [
          [x + w * 0.3, y - h],
          [x + w * 0.4, y - h * 0.62],
          [x + w * 0.22, y - h * 0.45]
        ],
        pxHex('#ffffff')
      );
      px.line(x + w * 0.3, y - h, x + w * 0.52, y - h * 0.58, pxHex('#8fb4cc'));
      // 水に映る、青い氷
      px.poly(
        [
          [x + w * 0.1, y],
          [x + w * 0.9, y],
          [x + w * 0.5, y + h * 0.4]
        ],
        (xx, yy) => ((xx + yy) & 1 ? pxMix(pxHex('#8fd0e8'), cl.seaTop, 0.5) : 0)
      );
    });
  } else if (a === 5) {
    // 幻の島：宙にうかぶ、むらさきの岩と水晶
    const x = 640,
      y = hz - 46;
    px.ell(x, y + 44, 90, 20, pxMix(pxHex('#b080ff'), cl.hor, 0.6), 0);
    px.poly(
      [
        [x - 90, y],
        [x + 90, y],
        [x + 48, y + 22],
        [x + 12, y + 48],
        [x - 14, y + 30],
        [x - 54, y + 22]
      ],
      (xx, yy) => (yy < y + 6 ? pxHex('#7a5ad0') : xx < x ? pxHex('#4a3a8a') : pxHex('#352a6a'))
    );
    px.rect(x - 90, y - 3, x + 90, y + 2, pxHex('#6fd0b0'));
    [
      [-40, 26],
      [-12, 40],
      [24, 30],
      [58, 18]
    ].forEach(([dx, h], i) =>
      px.poly(
        [
          [x + dx - 7, y - 3],
          [x + dx, y - 3 - h],
          [x + dx + 7, y - 3]
        ],
        i % 2 ? pxHex('#9ff0ff') : pxHex('#e0a8ff')
      )
    );
  } else if (a === 6) {
    // 火山
    const x0 = 560,
      x1 = 960;
    px.poly(
      [
        [x0, hz + 2],
        [650, hz - 140],
        [772, hz - 140],
        [x1, hz + 2]
      ],
      (xx, yy) => (xx < 700 + (yy - hz) * -0.4 ? pxHex('#3a2822') : pxHex('#241812'))
    );
    for (let k = 0; k < 6; k++) px.line(660 + k * 20, hz - 136, 600 + k * 70, hz, pxHex('#18100c'));
    px.poly(
      [
        [650, hz - 140],
        [772, hz - 140],
        [746, hz - 124],
        [700, hz - 130],
        [670, hz - 122]
      ],
      pxHex('#ff7a2a')
    );
    px.poly(
      [
        [690, hz - 130],
        [704, hz - 130],
        [696, hz - 96],
        [700, hz - 70],
        [690, hz - 100]
      ],
      pxHex('#ff9a3a')
    );
    px.rect(650, hz - 142, 772, hz - 140, pxHex('#ffd070'));
    px.ell(711, hz - 150, 60, 24, (xx, yy) =>
      ((xx + yy) & 1) === 0 ? pxMix(pxHex('#ff5a2a'), cl.top, 0.5) : 0
    );
  } else if (a === 7) {
    // 沈没船：折れたマストと、くずれた船体
    px.poly(
      [
        [560, hz + 2],
        [606, hz - 28],
        [820, hz - 20],
        [860, hz + 2]
      ],
      (xx, yy) =>
        yy < hz - 18 ? pxHex('#5a4630') : (xx + (yy >> 1)) % 14 < 2 ? pxHex('#1c130c') : pxHex('#3a2a1c')
    );
    for (let k = 0; k < 7; k++)
      px.rect(604 + k * 34, hz - 32 - (k % 2) * 4, 608 + k * 34, hz - 22, pxHex('#2a1c12'));
    px.rect(716, hz - 126, 722, hz - 22, pxHex('#4a3828'));
    px.rect(716, hz - 126, 718, hz - 22, pxHex('#6a5238'));
    px.rect(716, hz - 96, 760, hz - 94, pxHex('#4a3828'));
    px.poly(
      [
        [722, hz - 120],
        [756, hz - 96],
        [722, hz - 78]
      ],
      (xx, yy) => ((xx + yy) & 3 ? pxMix(pxHex('#d8d4c4'), cl.top, 0.45) : 0)
    );
    px.line(722, hz - 124, 800, hz - 30, pxHex('#3a2c1c'));
    bdRidge(px, hz, 10, 12, pxMix(cl.hor, dark, 0.4), dark, 2);
  } else if (a === 8) {
    // 氷の丘
    bdRidge(px, hz, 30, 14, pxMix(pxHex('#e8f4ff'), cl.top, 0.28), pxMix(pxHex('#a8c4e0'), cl.top, 0.4), 1.2);
    bdRidge(px, hz, 14, 16, pxMix(pxHex('#f4fbff'), cl.top, 0.18), pxMix(pxHex('#bcd4ea'), cl.top, 0.3), 2);
  } else if (a === 9) {
    // 竜宮：金の柱
    [
      [660, 140],
      [780, 100],
      [900, 124]
    ].forEach(([x, h], i) => {
      px.rect(x, hz - h, x + 24, hz + 4, (xx, yy) =>
        xx < x + 7 ? pxHex('#ffe48a') : xx > x + 17 ? pxHex('#c88a2a') : pxHex('#f2b83a')
      );
      for (let y = hz - h + 10; y < hz; y += 14) px.rect(x, y, x + 24, y + 2, pxHex('#a8701c'));
      px.rect(x - 8, hz - h - 10, x + 32, hz - h, pxHex('#ff7a9a'));
      px.rect(x - 8, hz - h - 10, x + 32, hz - h - 8, pxHex('#ffb0c4'));
      px.poly(
        [
          [x - 14, hz - h - 10],
          [x + 12, hz - h - 28],
          [x + 38, hz - h - 10]
        ],
        pxHex('#e84a6a')
      );
      px.disc(x + 12, hz - h - 32, 4, pxHex('#fff6c8'));
    });
  }
}

// 動く景色（毎フレーム、軽く描く）：海鳥・オーロラ・噴煙・泡・精霊など
function bdPix(c, x, y, w, h, col) {
  c.fillStyle = col;
  c.fillRect(x, y, w / PXS, h / PXS);
}
const pxCss = (c, a = 1) => `rgba(${c & 255},${(c >>> 8) & 255},${(c >>> 16) & 255},${a})`;
function bdLive(c, a, p, ts, cl) {
  const t = ts / 1000;
  if ((a === 0 || a === 1 || a === 3) && cl.nt < 0.5) {
    for (let i = 0; i < 3; i++) {
      const x = ((i * 190 + t * (10 + i * 3)) % 560) - 40,
        y = 36 + i * 17 + Math.sin(t * 0.8 + i) * 4,
        f = Math.floor(t * 4 + i) % 2;
      c.fillStyle = cl.ev > 0.4 ? '#3a2a4a' : '#e8f0f4';
      bdPix(c, x, y + f, 2, 1, c.fillStyle);
      bdPix(c, x + 1, y + (1 - f), 2, 1, c.fillStyle);
      bdPix(c, x + 3, y + f, 2, 1, c.fillStyle);
      bdPix(c, x + 4, y, 2, 1, c.fillStyle);
      bdPix(c, x - 1, y - f + 1, 2, 1, c.fillStyle);
    }
  }
  if (a === 5 || a === 8) {
    const n = a === 8 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const hue = a === 8 ? 140 + k * 45 : 280 + k * 40;
      for (let x = 0; x < 480; x += 2) {
        const y = 26 + k * 18 + Math.sin(x / 60 + t / 1.5 + k * 2) * 11,
          hh = 10 + 5 * Math.sin(x / 33 + t / 2 + k);
        const g = c.createLinearGradient(0, y, 0, y + hh);
        g.addColorStop(0, `hsla(${hue},85%,66%,.55)`);
        g.addColorStop(1, `hsla(${hue},85%,66%,0)`);
        c.fillStyle = g;
        c.fillRect(x, y, 2, hh);
      }
    }
  }
  if (a === 5) {
    for (let i = 0; i < 12; i++) {
      const x = (i * 71 + t * 12) % 480,
        y = 60 + ((i * 37) % 60) + Math.sin(t * 1.4 + i) * 6;
      c.fillStyle = `hsla(${260 + i * 10},85%,80%,${0.4 + 0.3 * Math.sin(t * 3 + i)})`;
      c.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 1.5, 1.5);
    }
  }
  if (a === 6) {
    for (let i = 0; i < 9; i++) {
      const u = (t / 3.2 + i / 9) % 1,
        r = 4 + u * 12,
        x = 356 + Math.sin(i * 1.7 + u * 3) * (6 + u * 10) + u * 14,
        y = 60 - u * 62;
      c.fillStyle = `rgba(${90 + u * 20},${70 + u * 10},${70 + u * 10},${0.6 * (1 - u)})`;
      for (let k = 0; k < 3; k++) {
        const dx = (k - 1) * r * 0.6,
          dy = (k % 2) * r * 0.3;
        c.fillRect(Math.round((x + dx - r / 2) * 2) / 2, Math.round((y + dy - r / 3) * 2) / 2, r, r * 0.7);
      }
    }
    c.fillStyle = 'rgba(255,120,40,.12)';
    c.fillRect(0, 0, 480, 130);
  }
  if (a === 9) {
    for (let i = 0; i < 14; i++) {
      const u = (t / 5 + i * 0.071) % 1,
        x = ((i * 67) % 480) + Math.sin(t / 0.9 + i) * 4,
        y = 250 - u * 120;
      c.fillStyle = `rgba(255,255,255,${0.55 * (1 - u)})`;
      bdPix(c, x, y, 3 + (i % 3) * 2, 3 + (i % 3) * 2, c.fillStyle);
      bdPix(c, x + 1, y + 1, 1, 1, `rgba(255,255,255,${0.9 * (1 - u)})`);
    }
  }
}

// 背景をまるごと描く（空・雲・遠くの景色・海・波・動くもの）
function drawBackdrop(c, a, p, ts) {
  const b = bdGet(a, p),
    cl = b.cols,
    t = ts / 1000;
  pxBlit(c, b.sky, 0, 0, 480, 130);
  if (a !== 8) {
    const sp = [4, 6.5, 10, 3],
      yy = [10, 36, 22, 54];
    b.clouds.forEach((img, i) => {
      const w = img.width / PXS,
        x = ((i * 170 + t * sp[i]) % (480 + w)) - w;
      c.globalAlpha = a === 2 ? 0.55 : 0.95;
      pxBlit(c, img, Math.round(x * 2) / 2, yy[i]);
    });
    c.globalAlpha = 1;
  }
  pxBlit(c, b.far, 0, 0);
  pxBlit(c, b.sea, 0, 130);
  // 波のすじ：6つの帯を、それぞれの速さで流す
  const bandH = b.wave.height / 6;
  for (let i = 0; i < 6; i++) {
    const off = (t * (3 + i * 3.2) * (i % 2 ? -1 : 1)) % (BD_W / PXS),
      o = off < 0 ? off + BD_W / PXS : off,
      sy = i * bandH;
    c.imageSmoothingEnabled = false;
    c.drawImage(b.wave, 0, sy, BD_W, bandH, -o, 130 + sy / PXS, BD_W / PXS, bandH / PXS);
    c.drawImage(b.wave, 0, sy, BD_W, bandH, BD_W / PXS - o, 130 + sy / PXS, BD_W / PXS, bandH / PXS);
    c.imageSmoothingEnabled = true;
  }
  // 水面のきらめき
  if (cl.nt < 0.8) {
    const r = pxRng(77);
    for (let i = 0; i < 26; i++) {
      const x = r() * 480,
        y = 136 + Math.pow(r(), 1.3) * 108,
        f = Math.sin(t * 2.2 + i * 1.9);
      if (f > 0.55) {
        c.fillStyle = 'rgba(255,255,255,' + 0.75 * f + ')';
        bdPix(c, Math.round(x * 2) / 2, Math.round(y * 2) / 2, 3, 1, c.fillStyle);
        bdPix(c, Math.round(x * 2) / 2 + 0.5, Math.round(y * 2) / 2 - 0.5, 1, 1, c.fillStyle);
      }
    }
  }
  bdLive(c, a, p, ts, cl);
  if (a === 2) {
    c.fillStyle = 'rgba(0,10,30,.25)';
    c.fillRect(0, 130, 480, 120);
  }
}

// ---- 桟橋・船（人が立つ足場）。横幅は、従業員の数で変わるので、幅ごとに描いて覚える ----
const BD_DECK = {key: '', cv: null, y0: 0};
function bdPierPx(w) {
  const y0 = 94,
    px = new Px(w * PXS, (182 - y0) * PXS),
    r = pxRng(5),
    top = (120 - y0) * PXS,
    bot = (134 - y0) * PXS;
  // 杭（水の中へ）
  for (let x = 14; x < w - 6; x += 86) {
    const X = x * PXS;
    px.rect(X, bot, X + 20, 164, (xx, yy) => {
      const c = xx < X + 5 ? pxHex('#8a6240') : xx > X + 14 ? pxHex('#3a2416') : pxHex('#5f4129');
      return yy > 118 ? pxMix(c, pxHex('#2a5a78'), 0.4) : yy % 22 < 2 ? pxDark(c, 0.3) : c;
    });
    for (let k = 0; k < 6; k++)
      px.rect(X + 2 + k * 3, 146 + (k % 3) * 4, X + 4 + k * 3, 148 + (k % 3) * 4, pxHex('#a8c8c0'));
    px.ell(X + 10, 162, 17, 3, (xx, yy) => ((xx + yy) % 5 < 3 ? pxHex('#d8eef4') : 0));
  }
  // 板（正面）：3段の板、つなぎ目、くぎ
  const boards = [
    [top + 2, top + 10, '#9a7048'],
    [top + 11, top + 19, '#8a6240'],
    [top + 20, top + 27, '#7a5636']
  ];
  boards.forEach(([y0b, y1b, col], bi) => {
    const c = pxHex(col);
    px.rect(0, y0b, w * PXS, y1b, (x, y) =>
      (x * 7 + y * 13 + bi * 5) % 23 === 0 && x % 9
        ? pxLight(c, 0.12)
        : (x + bi * 40) % 118 < 2
          ? pxDark(c, 0.4)
          : y === y0b
            ? pxLight(c, 0.2)
            : y === y1b - 1
              ? pxDark(c, 0.15)
              : c
    );
    for (let x = 30 + bi * 40; x < w * PXS; x += 118) {
      px.set(x - 4, (y0b + y1b) >> 1, pxHex('#d8b080'));
      px.set(x + 4, (y0b + y1b) >> 1, pxHex('#d8b080'));
    }
  });
  px.rect(0, top, w * PXS, top + 2, pxHex('#d2a872'));
  px.rect(0, top + 27, w * PXS, bot + 1, pxHex('#2c1a10'));
  // 足元の道具：係船柱・ロープ・バケツ
  const bx = 96 * PXS;
  px.rect(bx, top - 14, bx + 14, top, (x, y) =>
    x < bx + 4 ? pxHex('#8a8f9a') : x > bx + 10 ? pxHex('#3e424c') : pxHex('#5f6572')
  );
  px.rect(bx - 3, top - 16, bx + 17, top - 13, pxHex('#a0a6b2'));
  px.ell(124 * PXS, top - 4, 12, 4, pxHex('#c8aa78'));
  px.ell(124 * PXS, top - 7, 10, 3, pxHex('#d8bc88'));
  px.rect(124 * PXS - 8, top - 8, 124 * PXS + 8, top - 6, pxHex('#a88a58'));
  px.rect(136 * PXS, top - 14, 136 * PXS + 14, top, (x, y) =>
    x < 136 * PXS + 3 ? pxHex('#8ab4d0') : x > 136 * PXS + 10 ? pxHex('#3e6a88') : pxHex('#5c8cae')
  );
  px.rect(136 * PXS - 1, top - 15, 136 * PXS + 15, top - 13, pxHex('#c8dcea'));
  // 端の街灯
  const lx = (w - 12) * PXS;
  px.rect(lx, 6, lx + 4, top, pxHex('#3a2a1c'));
  px.rect(lx - 6, 6, lx + 10, 26, pxHex('#2c2018'));
  px.rect(lx - 4, 9, lx + 8, 23, pxHex('#ffe0a0'));
  px.rect(lx - 4, 9, lx + 8, 12, pxHex('#fff2c8'));
  px.poly(
    [
      [lx - 8, 6],
      [lx + 2, -2],
      [lx + 12, 6]
    ],
    pxHex('#2c2018')
  );
  px.outline(BD_INK);
  return px;
}
function bdBoatPx(a, w) {
  const y0 = 100,
    px = new Px((w + 20) * PXS, (154 - y0) * PXS),
    deck = (118 - y0) * PXS,
    hull = pxHex(HULLC[a]),
    topc = pxHex(TOPC[a]),
    stripe = pxHex(STRIPEC[a]),
    wl = (148 - y0) * PXS;
  // 手すり
  for (let x = 6; x < w + 8; x += 26) px.rect(x * PXS, deck - 18, x * PXS + 3, deck, pxHex('#c8ced6'));
  px.rect(0, deck - 19, (w + 8) * PXS, deck - 17, pxHex('#e4e8ee'));
  px.rect(0, deck - 10, (w + 8) * PXS, deck - 8, pxHex('#c8ced6'));
  // 甲板
  px.rect(0, deck, (w + 14) * PXS, deck + 12, (x, y) =>
    y < deck + 2
      ? pxLight(topc, 0.35)
      : (x * 3 + y) % 31 < 1
        ? pxDark(topc, 0.12)
        : y > deck + 9
          ? pxDark(topc, 0.18)
          : topc
  );
  // 船体：先（右）がすぼまる
  const hp = [
    [0, deck + 12],
    [(w + 14) * PXS, deck + 12],
    [(w - 8) * PXS, wl],
    [0, wl]
  ];
  px.poly(hp, (x, y) => {
    const t = (y - deck - 12) / (wl - deck - 12),
      plank = (y - deck) % 10 < 1,
      c = pxMix(pxLight(hull, 0.18), pxDark(hull, 0.25), t);
    return plank ? pxDark(c, 0.22) : x > (w + 8) * PXS - (y - deck) * 0.4 ? pxLight(c, 0.1) : c;
  });
  px.rect(0, (132 - y0) * PXS, (w + 10) * PXS - 10, (135 - y0) * PXS, stripe);
  px.rect(0, (132 - y0) * PXS, (w + 10) * PXS - 10, (132 - y0) * PXS + 1, pxLight(stripe, 0.35));
  for (let x = 24; x < w - 20; x += 40) {
    px.disc(x * PXS, (141 - y0) * PXS - 6, 6, pxHex('#1c2a38'));
    px.disc(x * PXS, (141 - y0) * PXS - 6, 4.5, pxHex('#bfe3ee'));
    px.disc(x * PXS - 1.5, (141 - y0) * PXS - 8, 1.5, pxHex('#ffffff'));
  }
  px.rect(0, wl - 4, (w - 8) * PXS, wl, pxDark(hull, 0.5));
  px.outline(BD_INK);
  return px;
}
function drawDeck(c, a, deckW, p, ts) {
  const key = a + ':' + deckW;
  if (BD_DECK.key !== key) {
    BD_DECK.key = key;
    BD_DECK.cv = (a === 0 ? bdPierPx(deckW) : bdBoatPx(a, deckW)).put();
    BD_DECK.y0 = a === 0 ? 94 : 100;
  }
  pxBlit(c, BD_DECK.cv, 0, BD_DECK.y0);
  if (a === 0 && p > 0.62) {
    // 端の街灯のあかり
    const x = deckW - 12 + 1;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, 106, 2, x, 106, 34);
    g.addColorStop(0, 'rgba(255,200,110,' + 0.5 * clamp((p - 0.62) / 0.2, 0, 1) + ')');
    g.addColorStop(1, 'rgba(255,200,110,0)');
    c.fillStyle = g;
    c.fillRect(x - 34, 72, 68, 68);
    c.restore();
  }
}

/* ---------- 自宅の画面の背景（ドット絵）----------
   空・丘・草原・砂の道・海・桟橋。論理座標は横480×縦340。夜（G.home）は、夜の色・星・ほたる。 */
const HB_W = 480 * PXS,
  HB_H = 340 * PXS;
const HB = {key: '', base: null, wave: null, clouds: [], night: false, cl: null};
function hbColors(night, p) {
  const ev = night ? 0 : clamp((p - 0.62) / 0.3, 0, 1);
  let top = pxHsl(205, 60, 64 - p * 18),
    hor = pxHsl(198, 52, 82 - p * 14);
  top = pxMix(top, pxRgb(86, 58, 128), ev * 0.7);
  hor = pxMix(hor, pxRgb(255, 160, 96), ev * 0.85);
  if (night) {
    top = pxRgb(9, 17, 44);
    hor = pxRgb(40, 50, 98);
  }
  const tintN = c => (night ? pxMix(c, pxRgb(10, 22, 60), 0.62) : pxMix(c, pxRgb(255, 140, 80), ev * 0.18));
  return {night, ev, top, hor, tintN, sun: pxMix(pxHsl(48, 92, 68), pxRgb(255, 120, 50), ev)};
}
function hbTree(px, x, y, h, kind, cl, r) {
  const g0 = cl.tintN(pxHex(kind ? '#2f7a4a' : '#3f9a58')),
    g1 = cl.tintN(pxHex(kind ? '#1f5a38' : '#2c7a44')),
    g2 = cl.tintN(pxHex(kind ? '#4aa066' : '#66c27a')),
    trunk = cl.tintN(pxHex('#5a3e28'));
  px.rect(x - 1.5, y - h * 0.3, x + 1.5, y, trunk);
  if (kind) {
    // 針葉樹：三角を重ねる
    for (let k = 0; k < 3; k++) {
      const yy = y - h * 0.25 - k * h * 0.26,
        w = h * (0.36 - k * 0.07);
      px.poly(
        [
          [x - w, yy],
          [x, yy - h * 0.42],
          [x + w, yy]
        ],
        (xx, yy2) => (xx < x - w * 0.15 ? g2 : xx > x + w * 0.35 ? g1 : g0)
      );
    }
  } else {
    px.disc(x, y - h * 0.62, h * 0.4, g0);
    px.disc(x + h * 0.16, y - h * 0.56, h * 0.3, g1);
    px.disc(x - h * 0.14, y - h * 0.78, h * 0.26, g2);
  }
}
function hbBake(night, p) {
  const cl = hbColors(night, p),
    px = new Px(HB_W, HB_H),
    r = pxRng(91),
    SKY_H = 200 * PXS;
  pxVGrad(px, 0, SKY_H, cl.top, cl.hor, 16);
  if (night) {
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(r() * HB_W),
        y = Math.floor(r() * 120 * PXS),
        b = r();
      px.set(x, y, pxLight(cl.top, 0.55 + b * 0.4));
      if (b > 0.88) {
        px.set(x + 1, y, pxLight(cl.top, 0.45));
        px.set(x, y + 1, pxLight(cl.top, 0.45));
      }
    }
    // 月
    const mx = 430 * PXS,
      my = 36 * PXS,
      R = 15 * PXS;
    px.ell(mx, my, R * 2, R * 2, (x, y) =>
      (PX_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < 0.3 ? pxMix(px.get(x, y), pxRgb(230, 230, 190), 0.3) : 0
    );
    px.disc(mx, my, R, pxHex('#f4efd0'));
    px.disc(mx - R * 0.15, my - R * 0.15, R * 0.8, pxHex('#fbf7e0'));
    [
      [-0.3, -0.2, 0.22],
      [0.28, 0.15, 0.18],
      [-0.05, 0.4, 0.14]
    ].forEach(([dx, dy, rr]) => px.disc(mx + dx * R, my + dy * R, rr * R, pxHex('#d6d0a8')));
  } else {
    const sx = 430 * PXS,
      sy = Math.min(90, 30 + p * 70) * PXS,
      R = 18 * PXS;
    [
      [2.2, 0.25],
      [1.7, 0.45],
      [1.3, 0.7]
    ].forEach(([k, t]) =>
      px.ell(sx, sy, R * k, R * k, (x, y) =>
        (PX_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < t ? pxMix(px.get(x, y), cl.sun, 0.35) : 0
      )
    );
    px.disc(sx, sy, R, pxLight(cl.sun, 0.12));
    px.disc(sx - R * 0.18, sy - R * 0.2, R * 0.78, cl.sun);
    px.disc(sx - R * 0.3, sy - R * 0.34, R * 0.4, pxLight(cl.sun, 0.45));
  }
  // 遠い山と、手前の丘（木が並ぶ）
  const hill = (base, amp, seed, c0, c1, f) => {
    const rr = pxRng(seed),
      ph = [rr() * 9, rr() * 9, rr() * 9];
    for (let x = 0; x < HB_W; x++) {
      const h =
          amp *
          (0.5 +
            0.3 * Math.sin(x * 0.009 * f + ph[0]) +
            0.14 * Math.sin(x * 0.024 * f + ph[1]) +
            0.06 * Math.sin(x * 0.06 * f + ph[2])),
        y0 = Math.floor(base - h);
      for (let y = y0; y < 210 * PXS; y++) {
        const t = (y - y0) / 40;
        px.set(
          x,
          y,
          y === y0
            ? pxLight(c0, 0.28)
            : t < 0.5
              ? c0
              : (PX_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < Math.min(1, (t - 0.5) * 2)
                ? c1
                : c0
        );
      }
    }
  };
  hill(
    185 * PXS,
    46 * PXS,
    5,
    cl.tintN(pxMix(pxHex('#5c8fa0'), cl.hor, 0.3)),
    cl.tintN(pxMix(pxHex('#4a7d8c'), cl.hor, 0.3)),
    0.7
  );
  hill(196 * PXS, 30 * PXS, 8, cl.tintN(pxHex('#5aa070')), cl.tintN(pxHex('#3f7f58')), 1.1);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * HB_W),
      yb = 188 * PXS + r() * 14 * PXS;
    hbTree(px, x, yb, (10 + r() * 12) * PXS * 0.8, r() > 0.55 ? 1 : 0, cl, r);
  }
  // 草原
  const gy0 = 196 * PXS,
    gy1 = 290 * PXS,
    gl = cl.tintN(pxHex('#6cc070')),
    gm = cl.tintN(pxHex('#4c9a56')),
    gd = cl.tintN(pxHex('#3a7a46'));
  pxVGrad(px, gy0, gy1, gl, gd, 14);
  px.rect(0, gy0, HB_W, gy0 + 2, cl.tintN(pxHex('#8ad88a')));
  for (let i = 0; i < 700; i++) {
    const x = Math.floor(r() * HB_W),
      y = Math.floor(gy0 + 8 + r() * (gy1 - gy0 - 12)),
      hh = 2 + Math.floor(r() * 3);
    px.rect(x, y - hh, x + 1, y, r() > 0.5 ? gl : gd);
    if (r() > 0.6) px.rect(x - 1, y - hh + 1, x, y - hh + 2, gl);
  }
  [
    ['#ffffff', 40],
    ['#ff8fb8', 30],
    ['#ffd23a', 34],
    ['#b48aff', 20]
  ].forEach(([col, n]) => {
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * HB_W),
        y = Math.floor(gy0 + 20 + r() * (gy1 - gy0 - 26));
      px.rect(x, y, x + 1, y + 4, cl.tintN(pxHex('#2f7a40')));
      px.rect(x - 1, y - 2, x + 3, y, cl.tintN(pxHex(col)));
      px.rect(x, y - 3, x + 2, y - 2, cl.tintN(pxHex(col)));
      px.set(x + 1, y - 1, cl.tintN(pxHex('#f0a020')));
    }
  });
  // 砂の道（海ぞい）
  const sa = cl.tintN(pxHex('#d8c08a')),
    sd = cl.tintN(pxHex('#b89c64'));
  for (let y = 266 * PXS; y < 274 * PXS; y++)
    for (let x = 0; x < HB_W; x++) {
      const e = y < 267 * PXS || y > 273 * PXS - 3;
      px.set(x, y, e && (PX_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < 0.5 ? sd : sa);
    }
  for (let i = 0; i < 120; i++)
    px.set(
      Math.floor(r() * HB_W),
      266 * PXS + 3 + Math.floor(r() * 10),
      r() > 0.5 ? sd : cl.tintN(pxHex('#f0e0b0'))
    );
  // 護岸（木の桟橋の面）と海
  const wood = cl.tintN(pxHex('#8a6240'));
  px.rect(0, 288 * PXS, HB_W, 300 * PXS, (x, y) => {
    const yy = y - 288 * PXS;
    return yy < 2
      ? cl.tintN(pxHex('#c49a66'))
      : yy % 8 === 7
        ? pxDark(wood, 0.4)
        : x % 92 < 2
          ? pxDark(wood, 0.35)
          : yy > 20
            ? pxDark(wood, 0.3)
            : (x * 3 + yy * 5) % 29 === 0
              ? pxLight(wood, 0.12)
              : wood;
  });
  const seaTop = cl.tintN(pxHex('#2a8ab5')),
    seaBot = cl.tintN(pxHex('#16507a'));
  pxVGrad(px, 300 * PXS, 340 * PXS, seaTop, seaBot, 10);
  px.rect(0, 300 * PXS, HB_W, 300 * PXS + 3, pxDark(wood, 0.55));
  // 波（海のすじ）：別の層にして流す
  const wv = new Px(HB_W, 40 * PXS);
  for (let i = 0; i < 6; i++) {
    const t = i / 5,
      y = Math.floor(6 + i * 13),
      base = pxMix(seaTop, seaBot, t),
      hi = pxLight(base, 0.3),
      mid = pxLight(base, 0.12),
      lo = pxDark(base, 0.22);
    for (let j = 0; j < 5; j++) {
      const x0 = Math.floor(((j + 0.2 + r() * 0.6) / 5) * HB_W),
        L = Math.floor(30 + r() * 50);
      [0, -HB_W].forEach(o => {
        const x = x0 + o;
        wv.rect(x + 1, y, x + L - 1, y + 1, hi);
        wv.rect(x, y + 1, x + L, y + 3, mid);
        wv.rect(x + 2, y + 3, x + L - 2, y + 4, lo);
      });
    }
  }
  HB.wave = wv.put();
  HB.base = px.put();
  HB.cl = cl;
  HB.clouds = night
    ? []
    : [
        bdCloud(200, 50, 33, {ev: cl.ev, nt: 0, top: cl.top, hor: cl.hor}),
        bdCloud(130, 36, 41, {ev: cl.ev, nt: 0, top: cl.top, hor: cl.hor}),
        bdCloud(250, 44, 52, {ev: cl.ev, nt: 0, top: cl.top, hor: cl.hor})
      ];
}
function drawHomeBackdrop(c, night, p, ts) {
  const step = Math.round(p * 14),
    key = (night ? 'n' : 'd') + step;
  if (HB.key !== key) {
    HB.key = key;
    hbBake(night, step / 14);
  }
  const t = ts / 1000;
  pxBlit(c, HB.base, 0, 0);
  // 雲（空にだけ。丘の手前には出ない）
  if (!night) {
    const sp = [4, 7, 3],
      yy = [26, 62, 90];
    c.save();
    c.beginPath();
    c.rect(0, 0, 480, 170);
    c.clip();
    HB.clouds.forEach((img, i) => {
      const w = img.width / PXS,
        x = ((i * 180 + t * sp[i]) % (480 + w)) - w;
      pxBlit(c, img, Math.round(x * 2) / 2, yy[i]);
    });
    c.restore();
  } else {
    const r = pxRng(5);
    for (let i = 0; i < 22; i++) {
      const x = r() * 480,
        y = r() * 110,
        f = Math.sin(t * 2.4 + i * 1.7);
      if (f > 0.4) {
        c.fillStyle = 'rgba(255,255,255,' + 0.85 * f + ')';
        c.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 1, 1);
      }
    }
    // ほたる
    for (let i = 0; i < 9; i++) {
      const x = (i * 53 + Math.sin(t * 0.7 + i) * 18 + 20) % 480,
        y = 226 + ((i * 29) % 40) + Math.sin(t * 1.1 + i * 2) * 8,
        f = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.3);
      c.fillStyle = `rgba(255,240,140,${0.2 + 0.7 * f})`;
      c.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 1.5, 1.5);
    }
  }
  // 海の波
  const o = (t * 7) % (HB_W / PXS);
  c.imageSmoothingEnabled = false;
  c.drawImage(HB.wave, 0, 0, HB_W, HB.wave.height, -o, 300, HB_W / PXS, HB.wave.height / PXS);
  c.drawImage(HB.wave, 0, 0, HB_W, HB.wave.height, HB_W / PXS - o, 300, HB_W / PXS, HB.wave.height / PXS);
  c.imageSmoothingEnabled = true;
}
