#!/usr/bin/env python3
"""釣り場面（港の堤防）の絵を、ゲーム用の小さなドット絵にする。
  python3 dev/make-scene-art.py     → js/data/scene-art.js
元の絵（dev/art/scene_m.jpg 男・scene_f.jpg 女）は、8px = 1ドットの絵を拡大したもの。
  1. 8px×8pxごとの中央値で、元のドット（約250×122）に戻す（にじみを消す）
  2. 画面の文字・ボタン（絵のうえに重ねてあった）を、まわりの水で埋める
  3. 竿の先から浮きまで伸びていた糸と、浮きを消す（糸と浮きは、ゲーム側で絵と同じドットの大きさで描く）
  4. 右の端を切って、画面の縦横比（480×250）に合わせる
必要: pip install pillow numpy
"""
import base64, io, json, os, subprocess, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OX, OY, Y0, Y1 = 4, 2, 396, 1378   # 元の絵の、ドットの格子のずれ・場面の上下
CROP_W = 236                        # 右の端を切って、横236ドットにする（480:250に近づける）
TIP = (133.3, 15.9)                 # 竿の先（ドットの座標：列, 行）
BUOY = (201.5, 81.5)                # 浮き


def native(path):
    a = np.array(Image.open(os.path.join(ROOT, path)).convert('RGB'))[Y0:Y1]
    h = (a.shape[0] - OY) // 8
    w = (a.shape[1] - OX) // 8
    sub = a[OY:OY + h * 8, OX:OX + w * 8].reshape(h, 8, w, 8, 3)
    c = sub[:, 2:6, :, 2:6, :].transpose(0, 2, 1, 3, 4).reshape(h, w, 16, 3)
    return np.median(c, axis=2).astype(np.int16)


def fill_ui(X):
    """画面の文字・ボタンを、右の水のようすで埋める（横にならぶ波なので、右の帯を折り返して使う）"""
    H, W, _ = X.shape
    r0, r1, c0, c1 = 91, 123, 66, 185
    src0, src1 = 187, 249
    n = src1 - src0
    for r in range(r0, min(r1, H)):
        for c in range(c0, c1):
            k = (c - c0) % (2 * n)
            k = k if k < n else 2 * n - 1 - k
            X[r, c] = X[r, src0 + k]
    return X


def remove_line_and_buoy(X):
    """竿の先から浮きまでの糸と、浮きを消す。浮きの絵は、あとで使うので取っておく"""
    H, W, _ = X.shape
    ref = X.copy()
    for r in range(int(TIP[1]) + 3, int(BUOY[1]) + 2):
        c0 = r + 115  # 糸は、ほぼ45度（列 = 行 + 115）
        for c in range(int(round(c0)) - 2, int(round(c0)) + (12 if r > 66 else 3)):
            if not (4 <= c < W - 4):
                continue
            nb = [ref[r, c - 4], ref[r, c + 4], ref[r, c - 3], ref[r, c + 3]]
            base = np.median(np.array([n.sum() for n in nb]))
            if r < 46 or ref[r, c].sum() > base + 28:  # 空は、糸のまわりをすべてならす
                X[r, c] = ((ref[r, c - 3] + ref[r, c + 3]) // 2)
    # 浮きとまわりの波紋（白い輪）を消す：左右の水から、横にならして埋める
    sprite = None
    b0, b1, rr0, rr1 = 190, 213, 74, 90
    ref = X.copy()
    for r in range(rr0, rr1):
        L, R = ref[r, b0 - 3], ref[r, b1 + 3]
        for c in range(b0, b1):
            t = (c - b0) / (b1 - b0)
            X[r, c] = (L * (1 - t) + R * t).astype(np.int16)
    return X, ref


def enc(im, colors=0):
    if colors:
        im = im.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)
    b = io.BytesIO()
    im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def main():
    out = {'w': CROP_W, 'tip': TIP, 'buoy': BUOY}
    for sx, path in (('m', 'dev/art/scene_m.jpg'), ('f', 'dev/art/scene_f.jpg')):
        X = native(path)
        before = X.copy()
        X = fill_ui(X)
        before2 = X.copy()
        X, ref = remove_line_and_buoy(X)
        im = Image.fromarray(np.clip(X, 0, 255).astype(np.uint8)[:, :CROP_W])
        out['h'] = im.height
        out[sx] = enc(im, 96)
        im.resize((im.width * 4, im.height * 4), Image.NEAREST).save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'art', f'_preview_{sx}.png'))
    js = '// 釣り場面（港の堤防）の絵。dev/make-scene-art.py が作る。手で編集しない。\n' + 'const SCENE_ART = ' + json.dumps(out, separators=(',', ':')) + ';\n'
    dst = os.path.join(ROOT, 'js/data/scene-art.js')
    with open(dst, 'w') as f:
        f.write(js)
    try:
        subprocess.run(['npx', 'prettier', '--write', dst], cwd=ROOT, check=True, capture_output=True)
    except Exception as e:
        print('（prettier を実行できませんでした）', e)
    print('書き出し:', os.path.relpath(dst), round(os.path.getsize(dst) / 1024), 'KB')


if __name__ == '__main__':
    sys.exit(main())
