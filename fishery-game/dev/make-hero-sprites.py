#!/usr/bin/env python3
"""主人公の画像（dev/art/hero_m.jpg 男・hero_f.jpg 女）から、ゲームに入れるスプライトを作る。
  python3 dev/make-hero-sprites.py     → js/data/hero-sprites.js
やること: 背景（灰色の格子）を消す → 文字と、ぶら下がった糸・魚を消す → 切り出す → 2つの大きさに縮小して、PNGにして埋め込む。
必要: pip install pillow numpy scipy
"""
import base64, io, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# 消す四角（元画像の座標）: 竿の先からぶら下がる糸と魚（ゲーム側で糸を描く）
SRC = {
    'm': ('dev/art/hero_m.jpg', [(1268, 300, 1400, 1400)]),
    'f': ('dev/art/hero_f.jpg', [(1203, 262, 1400, 1400)]),
}
SIZES = {'S': 96, 'M': 160, 'L': 288}  # スプライトの高さ（px）。使う大きさに近いものを選んで描く


def cutout(path, erase):
    a = np.array(Image.open(os.path.join(ROOT, path)).convert('RGB')).astype(int)
    sat = a.max(2) - a.min(2)
    br = a.sum(2) / 3
    bgish = (sat <= 16) & (br >= 28) & (br <= 100)  # 灰色の背景・格子線
    lab, _ = ndi.label(bgish)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(border))
    for x0, y0, x1, y1 in erase:
        fg[y0:y1, x0:x1] = False
    lab2, k = ndi.label(fg)
    sizes = ndi.sum(fg, lab2, range(1, k + 1))
    keep = lab2 == (int(np.argmax(sizes)) + 1)  # いちばん大きい塊（人物と竿）だけ残す
    ys, xs = np.where(keep)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = np.dstack([a.astype(np.uint8), (keep * 255).astype(np.uint8)])[y0:y1, x0:x1]
    return Image.fromarray(rgba, 'RGBA')


def anchors(im):
    al = np.array(im)[:, :, 3] > 128
    h, w = al.shape
    ys, xs = np.where(al)
    tipx = xs.max()
    tipy = float(ys[xs >= tipx - 4].mean())  # 竿の先（いちばん右）
    foot = al[int(h * 0.9):]
    fx = float(np.where(foot)[1].mean())  # 足元の中心
    return dict(w=w, h=h, tip=[float(tipx), tipy], foot=fx)


def encode(im):
    q = im.quantize(colors=96, method=Image.FASTOCTREE, dither=Image.NONE)
    b = io.BytesIO()
    q.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def main():
    out = {}
    for sx, (path, erase) in SRC.items():
        big = cutout(path, erase)
        an = anchors(big)
        sprites = {}
        for name, hh in SIZES.items():
            ww = round(big.width * hh / big.height)
            small = big.resize((ww, hh), Image.LANCZOS)
            sprites[name] = dict(w=ww, h=hh, src=encode(small))
        # 位置は、高さ1に対する比率で持つ（どの大きさでも使える）
        out[sx] = dict(
            aspect=an['w'] / an['h'],
            tip=[an['tip'][0] / an['h'], an['tip'][1] / an['h']],
            foot=an['foot'] / an['h'],
            img=sprites,
        )
    js = '// 主人公のスプライト（男 m・女 f）。dev/make-hero-sprites.py が作る。手で編集しない。\n'
    js += 'const HERO_SPR = ' + json.dumps(out, separators=(',', ':')) + ';\n'
    dst = os.path.join(ROOT, 'js/data/hero-sprites.js')
    with open(dst, 'w') as f:
        f.write(js)
    try:  # 書式をそろえる（CIの整形チェックに通すため）。prettier がなければ、そのまま
        import subprocess
        subprocess.run(['npx', 'prettier', '--write', dst], cwd=ROOT, check=True, capture_output=True)
    except Exception as e:
        print('（prettier を実行できませんでした。手動で npx prettier --write js/data/hero-sprites.js を実行してください）', e)
    print('書き出し:', os.path.relpath(dst), round(len(js) / 1024), 'KB')
    for sx in out:
        print(sx, 'aspect %.3f tip %s foot %.3f' % (out[sx]['aspect'], [round(v, 3) for v in out[sx]['tip']], out[sx]['foot']))


if __name__ == '__main__':
    sys.exit(main())
