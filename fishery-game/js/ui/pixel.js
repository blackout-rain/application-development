/* ---------- ドット絵の道具（背景用）----------
   背景は、論理座標1px = PXS×PXS個のドットで描く。主人公の絵と同じくらいの細かさ。
   重い計算は「一度だけ」画像に描いて覚えておき（キャッシュ）、毎フレームは貼るだけにする。 */
const PXS = 2;
const PX_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// 色は、1つの数（0xAABBGGRR）で持つ
const pxRgb = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
function pxHsl(h, s, l, a = 255) {
  h = (((h % 360) + 360) % 360) / 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
    p = 2 * l - q,
    f = t => {
      t = (t + 1) % 1;
      return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    };
  return pxRgb(Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255), a);
}
const pxHex = s =>
  pxRgb(parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16));
function pxMix(c0, c1, t) {
  const m = k => Math.round(((c0 >>> k) & 255) * (1 - t) + ((c1 >>> k) & 255) * t);
  return pxRgb(m(0), m(8), m(16), m(24));
}
const pxLight = (c, t) => pxMix(c, 0xffffffff, t),
  pxDark = (c, t) => pxMix(c, 0xff000000, t);
function pxRng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 画像（ドットの並び）。set/rect/disc/ell/poly/line で描いて、put() でキャンバスにする
class Px {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.cv = document.createElement('canvas');
    this.cv.width = w;
    this.cv.height = h;
    this.ctx = this.cv.getContext('2d');
    this.im = this.ctx.createImageData(w, h);
    this.u = new Uint32Array(this.im.data.buffer);
  }
  put() {
    this.ctx.putImageData(this.im, 0, 0);
    return this.cv;
  }
  set(x, y, c) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.u[y * this.w + x] = c;
  }
  get(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.u[y * this.w + x] : 0;
  }
  // c は、色、または (x,y) => 色 の関数（0なら描かない）
  rect(x0, y0, x1, y1, c) {
    x0 = Math.max(0, Math.floor(x0));
    y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(this.w, Math.floor(x1));
    y1 = Math.min(this.h, Math.floor(y1));
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const v = typeof c === 'function' ? c(x, y) : c;
        if (v) this.u[y * this.w + x] = v;
      }
  }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx,
          dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          const v = typeof c === 'function' ? c(x, y) : c;
          if (v) this.set(x, y, v);
        }
      }
  }
  disc(cx, cy, r, c) {
    this.ell(cx, cy, r, r, c);
  }
  // 多角形（偶奇規則の走査線）。pts: [[x,y],...]
  poly(pts, c) {
    let y0 = Infinity,
      y1 = -Infinity;
    pts.forEach(p => {
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    });
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, Math.ceil(y1)); y++) {
      const xs = [],
        yy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i],
          b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy))
          xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2)
        for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) {
          const v = typeof c === 'function' ? c(x, y) : c;
          if (v) this.set(x, y, v);
        }
    }
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0),
      sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        e += dx;
        y0 += sy;
      }
    }
  }
  // 絵のまわりに、1ドットのふち取りをつける（主人公の絵と同じ、濃い紺）
  outline(c) {
    const src = this.u.slice();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (src[y * this.w + x] >>> 24) continue;
        if (
          (x > 0 && src[y * this.w + x - 1] >>> 24) ||
          (x < this.w - 1 && src[y * this.w + x + 1] >>> 24) ||
          (y > 0 && src[(y - 1) * this.w + x] >>> 24) ||
          (y < this.h - 1 && src[(y + 1) * this.w + x] >>> 24)
        )
          this.u[y * this.w + x] = c;
      }
  }
}
// 上から下へ、c0 → c1 に変わる色。段の境目は、市松の網点でなじませる（ドット絵の「ディザ」）
function pxVGrad(px, y0, y1, c0, c1, steps, x0 = 0, x1 = px.w) {
  for (let y = Math.max(0, y0); y < Math.min(px.h, y1); y++) {
    const v = ((y - y0 + 0.5) / (y1 - y0)) * steps,
      lv = Math.floor(v),
      fr = v - lv;
    for (let x = x0; x < x1; x++) {
      const th = (PX_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16,
        k = Math.min(steps, lv + (fr > th ? 1 : 0));
      px.u[y * px.w + x] = pxMix(c0, c1, k / steps);
    }
  }
}
// ドットの絵を、画面に貼る（にじませない）
function pxBlit(c, img, x, y, w, h) {
  c.imageSmoothingEnabled = false;
  c.drawImage(img, x, y, w === undefined ? img.width / PXS : w, h === undefined ? img.height / PXS : h);
  c.imageSmoothingEnabled = true;
}
