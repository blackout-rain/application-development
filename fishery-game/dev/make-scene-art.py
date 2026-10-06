#!/usr/bin/env python3
"""釣り場面（港の堤防）の絵を、ゲーム用の小さなドット絵にする。
  python3 dev/make-scene-art.py     → js/data/scene-art.js
元の絵（dev/art/scene_m.jpg 男・scene_f.jpg 女）は、8px = 1ドットの絵を拡大したもの。
  ただし、場所によって、ドットの格子が少しずれている（絵の中で、位置が±4pxずれる）。
  1. 4px×4pxごとの中央値で、半分のドット（約500×245）に戻す。格子のずれに左右されず、服の柄などの細かい絵を残せる（にじみは消える）
  2. 画面の文字・ボタン（絵のうえに重ねてあった）を、まわりの水で埋める
  3. 竿の先から浮きまで伸びていた糸と、浮きを消す（糸と浮きは、ゲーム側で絵と同じドットの大きさで描く）
  4. 右の端を切って、画面の縦横比（480×250）に合わせる
必要: pip install pillow numpy
"""
import base64, io, json, os, subprocess, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
B = 4                               # 1つの点の大きさ（元の絵のpx）。元の1ドット(8px)の、半分
K = 2                               # 元の1ドットは、B×K = 8px
Y0, Y1 = 396, 1378                  # 場面の上下（元の絵のpx）
CROP_W = 236 * K                    # 右の端を切って、横236ドット（472点）にする（480:250に近づける）


def native(path):
    a = np.array(Image.open(os.path.join(ROOT, path)).convert('RGB'))[Y0:Y1]
    h = a.shape[0] // B
    w = a.shape[1] // B
    sub = a[:h * B, :w * B].reshape(h, B, w, B, 3)
    c = sub[:, 1:3, :, 1:3, :].transpose(0, 2, 1, 3, 4).reshape(h, w, 4, 3)  # 4px四方の、まん中の2×2の中央値
    return np.median(c, axis=2).astype(np.int16)


def fill_ui(X):
    """画面の文字・ボタンを、右の水のようすで埋める（横にならぶ波なので、右の帯を折り返して使う）"""
    H, W, _ = X.shape
    r0, r1, c0, c1 = 91 * K, 123 * K, 66 * K, 185 * K
    src0, src1 = 187 * K, 249 * K
    n = src1 - src0
    for r in range(r0, min(r1, H)):
        for c in range(c0, c1):
            k = (c - c0) % (2 * n)
            k = k if k < n else 2 * n - 1 - k
            X[r, c] = X[r, src0 + k]
    return X


def remove_line_and_buoy(X):
    """竿の先から浮きまでの糸と、浮きを消す（糸は、ほぼ45度。列 = 行 + 230点）"""
    H, W, _ = X.shape
    ref = X.copy()
    for r in range(18 * K, 83 * K):
        c0 = r + 231
        sky = r < 46 * K
        for c in range(c0 - 4, c0 + (24 if r > 66 * K else 6)):
            if not (8 <= c < W - 8):
                continue
            nb = [ref[r, c - 8], ref[r, c + 8], ref[r, c - 6], ref[r, c + 6]]
            base = np.median(np.array([n.sum() for n in nb]))
            if sky or ref[r, c].sum() > base + 28:
                X[r, c] = (ref[r, c - 7] + ref[r, c + 7]) // 2
    # 浮きと、まわりの波紋（白い輪）を消す：左右の水から、横にならして埋める
    b0, b1, rr0, rr1 = 190 * K, 213 * K, 74 * K, 90 * K
    ref = X.copy()
    for r in range(rr0, rr1):
        L, R = ref[r, b0 - 6], ref[r, b1 + 6]
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
    out = {'k': K}
    for sx, path in (('m', 'dev/art/scene_m.jpg'), ('f', 'dev/art/scene_f.jpg')):
        X = native(path)
        X = fill_ui(X)
        X, _ = remove_line_and_buoy(X)
        im = Image.fromarray(np.clip(X, 0, 255).astype(np.uint8)[:, :CROP_W])
        out['w'], out['h'] = im.width, im.height
        out[sx] = enc(im)
        im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'art', f'_preview_{sx}.png'))
    js = '// 釣り場面（港の堤防）の絵。dev/make-scene-art.py が作る。手で編集しない。\n' + 'const SCENE_ART = ' + json.dumps(out, separators=(',', ':')) + ';\n'
    dst = os.path.join(ROOT, 'js/data/scene-art.js')
    with open(dst, 'w') as f:
        f.write(js)
    try:
        subprocess.run(['npx', 'prettier', '--write', dst], cwd=ROOT, check=True, capture_output=True)
    except Exception as e:
        print('（prettier を実行できませんでした）', e)
    print('書き出し:', os.path.relpath(dst), round(os.path.getsize(dst) / 1024), 'KB', out['w'], 'x', out['h'])


if __name__ == '__main__':
    sys.exit(main())
