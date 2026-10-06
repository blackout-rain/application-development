#!/usr/bin/env python3
"""主人公のスプライトを作って、js/data/hero-sprites.js に埋め込む。
  python3 dev/make-hero-sprites.py
■ 正面の絵（自宅・主人公の決定画面）… 用意された画像 dev/art/hero_m.jpg（男）・hero_f.jpg（女）から作る。
   背景（灰色の格子）を消す → 文字と、ぶら下がった糸・魚を消す → 切り出す →
   男女で、ドットの細かさ（128段）と、色数（くっきり）をそろえる。
■ 釣り場面の絵（海を向いて竿を持つ横向き）… dev/art/fishing_pose.py で、同じ服・色で描く。
必要: pip install pillow numpy scipy
"""
import base64, io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'art'))
from fishing_pose import draw_fishing
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# 消す四角（元画像の座標）: 竿の先からぶら下がる糸と魚（ゲーム側で糸を描く）
SRC = {
    'm': ('dev/art/hero_m.jpg', [(1268, 300, 1400, 1400)]),
    'f': ('dev/art/hero_f.jpg', [(1203, 262, 1400, 1400)]),
}
NATIVE_H = 128   # 正面の絵のドットの段数（男女そろえる。女の絵の細かさに近い）
QUANT = 56       # 色数（JPEGのにじみを消して、くっきりさせる）


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


def normalize(big):
    """男女で、ドットの細かさ・色の出方をそろえる：128段に縮め、色数を絞って、輪郭をくっきりさせる"""
    w = round(big.width * NATIVE_H / big.height)
    sm = big.resize((w, NATIVE_H), Image.LANCZOS)
    a = np.array(sm)
    alpha = a[:, :, 3] >= 128
    q = np.array(Image.fromarray(a[:, :, :3]).quantize(colors=QUANT, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB'))
    return Image.fromarray(np.dstack([q, (alpha * 255).astype(np.uint8)]), 'RGBA')


def pack(im, scales):
    """元の大きさ N と、整数倍に拡大した絵を、小さい順に持つ（ドットがにじまない）"""
    out = {}
    for name, k in scales:
        big = im if k == 1 else im.resize((im.width * k, im.height * k), Image.NEAREST)
        out[name] = dict(w=big.width, h=big.height, src=encode(big))
    return out


def main():
    out = {}
    for sx, (path, erase) in SRC.items():
        front = normalize(cutout(path, erase))
        an = anchors(front)
        # 釣り場面（横向き）
        fish = draw_fishing(sx)
        fa = np.array(fish)[:, :, 3] > 128
        ys, xs = np.where(fa)
        foot = float(np.where(fa[int(fish.height * 0.9):])[1].mean())
        out[sx] = dict(
            aspect=an['w'] / an['h'],
            tip=[an['tip'][0] / an['h'], an['tip'][1] / an['h']],
            foot=an['foot'] / an['h'],
            img=pack(front, [('N', 1), ('L', 2)]),
            fish=dict(
                aspect=fish.width / fish.height,
                foot=foot / fish.height,
                tip=[(xs.max() + 1) / fish.height, float(ys[xs >= xs.max() - 1].mean()) / fish.height],  # 竿の持ち手のはし
                img=pack(fish, [('N', 1), ('L', 3)]),
            ),
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
    print('書き出し:', os.path.relpath(dst), round(os.path.getsize(dst) / 1024), 'KB')
    for sx in out:
        print(sx, 'front', [round(v, 3) for v in out[sx]['tip']], 'fish tip', [round(v, 3) for v in out[sx]['fish']['tip']], 'foot %.3f' % out[sx]['fish']['foot'])


if __name__ == '__main__':
    sys.exit(main())
