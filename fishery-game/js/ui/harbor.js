/* ---------- 釣り場面：港の堤防（用意された絵）----------
   絵は、236×122ドットの小さな画像（男・女の主人公入り）。画面には、にじませずに拡大して貼る。
   時間で色を変え（夕方・夜）、水面は4コマでゆらす。糸・浮き・従業員は、絵と同じドットの大きさで、ゲーム側で描く。 */
const HG = {
  tip: {x: 273, y: 35}, // 竿の先（糸の出る位置）
  bx: 372, // 浮きの位置
  by: 176,
  fx0: 236, // 大物をやりとりする魚の位置（遠い端）
  fxw: 190, // （近い端までの幅）
  fy: 192,
  resDx: 24, // 釣れた魚を見せる位置（竿の先から）
  resY: 106
};
const LG = {tip: {x: 120, y: 72}, bx: 300, by: 148, fx0: 140, fxw: 270, fy: 176, resDx: 46, resY: 112};
let SCN = LG; // いまの場面のつくり（海域で変わる）
const HAR = {ok: false, w: 0, h: 0, px: {}, key: '', frames: []};
const HAR_SW = 480 / 236,
  HAR_SH = 250 / 122; // 1ドットの、画面での大きさ（論理px）
function harborLoad() {
  const load = src =>
    new Promise(res => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
  Promise.all([load(SCENE_ART.m), load(SCENE_ART.f)]).then(([m, f]) => {
    if (!m || !f) return;
    [m, f].forEach((im, i) => {
      const cv = document.createElement('canvas');
      cv.width = im.width;
      cv.height = im.height;
      const g = cv.getContext('2d', {willReadFrequently: true});
      g.drawImage(im, 0, 0);
      HAR.px[i ? 'f' : 'm'] = g.getImageData(0, 0, cv.width, cv.height);
      HAR.w = cv.width;
      HAR.h = cv.height;
    });
    HAR.ok = true;
  });
}
harborLoad();
const harborReady = () => HAR.ok;

// 時間（p）で色を変えた絵と、水面をゆらした4コマを作る（時間は14段階）
function harborBake(sx, step) {
  const p = step / 14,
    src = HAR.px[sx],
    w = HAR.w,
    h = HAR.h,
    ev = clamp((p - 0.62) / 0.3, 0, 1),
    nt = clamp((p - 0.84) / 0.16, 0, 1),
    d = new Uint8ClampedArray(src.data);
  const HOR = 48;
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++) {
      const i = (r * w + c) * 4;
      let R = d[i],
        G = d[i + 1],
        B = d[i + 2];
      const sky = r < HOR,
        sun = r < 20 && c > 184 && c < 212 && R > 235 && G > 190 && B < 150,
        lamp = r > 14 && r < 32 && c < 40 && R > 190 && G > 130 && B < 150;
      if (sun) {
        // 太陽：夕方は赤く、夜は月の色に
        const tr = R + (255 - R) * ev * 0.4,
          tg = G + (120 - G) * ev * 0.75,
          tb = B + (50 - B) * ev * 0.8;
        R = tr + (232 - tr) * nt;
        G = tg + (234 - tg) * nt;
        B = tb + (214 - tb) * nt;
      } else if (!lamp) {
        if (ev > 0) {
          const k = ev * (sky ? 0.78 : 0.55);
          G *= 1 - k * 0.26;
          B *= 1 - k * 0.5;
          if (sky) {
            const t = clamp((r - 20) / (HOR - 20), 0, 1);
            R += (255 - R) * ev * 0.35 * t;
            G += (150 - G) * ev * 0.35 * t;
            B += (84 - B) * ev * 0.2 * t;
            R += (86 - R) * ev * 0.4 * (1 - t);
            B += (128 - B) * ev * 0.3 * (1 - t);
          }
        }
        if (nt > 0) {
          const inHero = c > 50 && c < 114 && r < 98,
            k = nt * (inHero ? 0.6 : 0.86); // 主人公のまわりは、街灯と月のあかりで、少し明るく
          R *= 1 - k * 0.55;
          G *= 1 - k * 0.48;
          B *= 1 - k * 0.2;
          if (sky) {
            R += (12 - R) * nt * 0.5;
            G += (18 - G) * nt * 0.5;
            B += (54 - B) * nt * 0.5;
          }
        }
      }
      d[i] = R;
      d[i + 1] = G;
      d[i + 2] = B;
    }
  // 水面のゆれ：水の色の点だけを、1ドットずつ横にずらす（4コマ）
  const water = new Uint8Array(w * h);
  for (let r = HOR + 1; r < h; r++)
    for (let c = 0; c < w; c++) {
      const i = (r * w + c) * 4,
        R = src.data[i],
        G = src.data[i + 1],
        B = src.data[i + 2];
      const inHero = c > 50 && c < 114 && r < 98;
      water[r * w + c] = !inHero && B > 150 && B > R + 70 && G > R + 20 ? 1 : 0;
    }
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const o = new ImageData(new Uint8ClampedArray(d), w, h);
    for (let r = HOR + 1; r < h; r++) {
      const s = Math.round(Math.sin((f * Math.PI) / 2 + r * 0.55) * 1.1);
      if (!s) continue;
      for (let c = 0; c < w; c++) {
        const c2 = c - s;
        if (c2 >= 0 && c2 < w && water[r * w + c] && water[r * w + c2]) {
          const i = (r * w + c) * 4,
            j = (r * w + c2) * 4;
          o.data[i] = d[j];
          o.data[i + 1] = d[j + 1];
          o.data[i + 2] = d[j + 2];
        }
      }
    }
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    cv.getContext('2d').putImageData(o, 0, 0);
    frames.push(cv);
  }
  return frames;
}
// 星（夜）。決まった場所に、またたく
const HAR_STARS = (() => {
  const r = pxRng(8),
    a = [];
  for (let i = 0; i < 46; i++) a.push([Math.floor(r() * 232), Math.floor(r() * 40), r() * 6]);
  return a;
})();
function drawHarborScene(c, sex, p, ts) {
  const step = Math.round(p * 14),
    key = (sex ? 'f' : 'm') + step;
  if (HAR.key !== key) {
    HAR.key = key;
    HAR.frames = harborBake(sex ? 'f' : 'm', step);
  }
  const t = ts / 1000,
    nt = clamp((step / 14 - 0.84) / 0.16, 0, 1),
    ev = clamp((step / 14 - 0.62) / 0.3, 0, 1);
  c.imageSmoothingEnabled = false;
  c.drawImage(HAR.frames[Math.floor(t * 2.2) % 4], 0, 0, 480, 250);
  c.imageSmoothingEnabled = true;
  if (nt > 0.1) {
    for (const [sc, sr, ph] of HAR_STARS) {
      const f = 0.5 + 0.5 * Math.sin(t * 1.6 + ph);
      c.fillStyle = `rgba(255,255,255,${nt * (0.35 + 0.65 * f)})`;
      c.fillRect(sc * HAR_SW, sr * HAR_SH, HAR_SW, HAR_SH);
    }
  }
  // 街灯のあかり（夕方から夜）
  if (ev > 0 || nt > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    const a = (0.12 + 0.3 * ev + 0.25 * nt) * (0.9 + 0.1 * Math.sin(t * 7)),
      g = c.createRadialGradient(56, 47, 2, 56, 47, 46);
    g.addColorStop(0, `rgba(255,190,100,${a})`);
    g.addColorStop(1, 'rgba(255,190,100,0)');
    c.fillStyle = g;
    c.fillRect(8, 0, 96, 100);
    c.restore();
  }
}
// 絵のドットの大きさに合わせて描く道具（糸・浮き）
function harborCells(c, pts, col, w = 1) {
  c.fillStyle = col;
  let lx = -1,
    ly = -1;
  pts.forEach(([x, y]) => {
    const cx0 = Math.floor(x / HAR_SW),
      cy0 = Math.floor(y / HAR_SH);
    if (cx0 === lx && cy0 === ly) return;
    lx = cx0;
    ly = cy0;
    c.fillRect(cx0 * HAR_SW, cy0 * HAR_SH, HAR_SW * w, HAR_SH);
  });
}
function harborLine(c, x0, y0, qx, qy, x1, y1, col) {
  const pts = [];
  for (let i = 0; i <= 90; i++) {
    const t = i / 90,
      u = 1 - t;
    pts.push([u * u * x0 + 2 * u * t * qx + t * t * x1, u * u * y0 + 2 * u * t * qy + t * t * y1]);
  }
  harborCells(c, pts, col);
}
// 浮き：絵と同じドットの大きさで描く（赤と白）。位置は、ドットの格子にそろえる
let HAR_BUOY = null;
function harborBuoy(c, x, y) {
  if (!HAR_BUOY) {
    const px = new Px(7, 9),
      ink = pxHex('#12142a');
    px.rect(3, 0, 4, 2, pxHex('#f2f2f6'));
    px.poly(
      [
        [1, 2],
        [6, 2],
        [7, 5],
        [0, 5]
      ],
      pxHex('#e8392e')
    );
    px.rect(1, 3, 2, 5, pxHex('#ff7a68'));
    px.rect(0, 5, 7, 6, pxHex('#f6f6fa'));
    px.poly(
      [
        [0, 6],
        [7, 6],
        [6, 8],
        [1, 8]
      ],
      pxHex('#c8261c')
    );
    px.outline(ink);
    HAR_BUOY = px.put();
  }
  const w = HAR_BUOY.width * HAR_SW,
    h = HAR_BUOY.height * HAR_SH;
  c.imageSmoothingEnabled = false;
  c.drawImage(
    HAR_BUOY,
    Math.round((x - w / 2) / HAR_SW) * HAR_SW,
    Math.round((y - h * 0.75) / HAR_SH) * HAR_SH,
    w,
    h
  );
  c.imageSmoothingEnabled = true;
  // 水面の輪
  c.fillStyle = 'rgba(230,248,255,.75)';
  const gx = Math.round((x - 7) / HAR_SW) * HAR_SW,
    gy = Math.round((y + h * 0.2) / HAR_SH) * HAR_SH;
  c.fillRect(gx, gy, HAR_SW * 3, HAR_SH);
  c.fillRect(gx + HAR_SW * 5, gy, HAR_SW * 3, HAR_SH);
  return true;
}

// ---- 従業員：小さなボートに乗って、沖で釣る（ドット絵）----
const HAR_BOAT = {};
function harborBoatSprite(col, hat) {
  const key = col + hat;
  if (HAR_BOAT[key]) return HAR_BOAT[key];
  const px = new Px(15, 14),
    ink = pxHex('#12142a'),
    sk = pxHex('#f4c9a0');
  // ボート
  px.poly(
    [
      [0, 10],
      [15, 10],
      [13, 14],
      [2, 14]
    ],
    (x, y) => (y < 11 ? pxHex('#e8e0d0') : y < 13 ? pxHex('#9a5a3a') : pxHex('#6a3c26'))
  );
  // 人：足・胴・頭・ぼうし
  px.rect(5, 8, 7, 10, pxHex('#44628a'));
  px.rect(8, 8, 10, 10, pxHex('#3a5578'));
  px.rect(4, 4, 11, 9, pxHex(col));
  px.rect(9, 4, 11, 9, pxDark(pxHex(col), 0.2));
  px.rect(5, 0, 10, 4, sk);
  px.rect(6, 2, 7, 3, ink);
  px.rect(8, 2, 9, 3, ink);
  px.rect(4, 0, 11, 2, pxHex(hat));
  px.rect(3, 1, 12, 2, pxHex(hat));
  px.outline(ink);
  return (HAR_BOAT[key] = px.put());
}
const harborSlot = i => {
  const row = Math.floor(i / 6),
    col = i % 6;
  return {x: 252 + col * 36 + (row % 2) * 18, y: 124 + row * 17};
};
function harborCrew(cr, ts) {
  const sl = harborSlot(cr.i),
    e = cr.ev && cr.ev.delay <= 0 ? cr.ev : null,
    hex = n => (n && n[0] === '#' ? n : '#888888'),
    sp = harborBoatSprite(hex(COLS[cr.i % 10]), hex(HATS[cr.i % 5])),
    bob = Math.sin(ts / 700 + cr.i * 1.3) > 0.4 ? HAR_SH : 0;
  cx.save();
  cx.globalAlpha = cr.pop;
  const bx0 = Math.round((sl.x - 15) / HAR_SW) * HAR_SW,
    by0 = Math.round((sl.y - 14) / HAR_SH) * HAR_SH + bob;
  cx.imageSmoothingEnabled = false;
  cx.drawImage(sp, bx0, by0 - (1 - cr.pop) * 24, sp.width * HAR_SW, sp.height * HAR_SH);
  cx.imageSmoothingEnabled = true;
  // 竿と糸
  const rx = sl.x + 14,
    ry = sl.y - 24,
    ux = sl.x + 22;
  let uy = sl.y + 8 + Math.sin(ts / 600 + cr.i * 1.7) * 1.5;
  if (e && e.t < 0.5) uy += 3;
  harborLine(cx, sl.x + 4, sl.y - 11, (sl.x + rx) / 2, sl.y - 20, rx, ry, 'rgba(120,80,52,.95)');
  harborLine(cx, rx, ry, rx + 3, (ry + uy) / 2, ux, uy, 'rgba(240,248,255,.8)');
  if (!e || e.t < 0.3) {
    cx.fillStyle = cr.i % 2 ? '#ff5a4e' : '#ffd24a';
    cx.fillRect(
      Math.round(ux / HAR_SW) * HAR_SW - HAR_SW,
      Math.round(uy / HAR_SH) * HAR_SH,
      HAR_SW * 2,
      HAR_SH * 2
    );
  }
  if (e && e.t >= 0.3 && e.t < 1.3) {
    const u = (e.t - 0.3) / 1,
      fx = ux + (sl.x + 4 - ux) * u,
      fy = uy + (ry - uy) * u - Math.sin(u * Math.PI) * 18;
    drawSp(cx, e.sp, fx, fy, 20);
  }
  if (e && e.t >= 1.2) {
    cx.globalAlpha = cr.pop * clamp(1 - (e.t - 1.2) / 1.2, 0, 1);
    cx.fillStyle = '#ffd24a';
    cx.font = '900 12px sans-serif';
    cx.textAlign = 'center';
    cx.fillText('+' + yen(e.val), sl.x, sl.y - 34 - (e.t - 1.2) * 12);
  }
  cx.restore();
}
