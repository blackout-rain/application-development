#!/usr/bin/env python3
"""主人公のスプライトを作って、js/data/hero-sprites.js に埋め込む。
  python3 dev/make-hero-sprites.py
■ 正面の絵（自宅・主人公の決定画面）… 用意された画像 dev/art/hero_m.jpg（男）・hero_f.jpg（女）から作る。
   背景（灰色の格子）を消す → 文字と、ぶら下がった糸・魚を消す → 切り出す →
   男女で、ドットの細かさ（160段）と、色数（くっきり）をそろえる。
   最後に、斜めの線のギザギザをなめらかにして（Scale2x＋軽いぼかし）、3つの大きさにする。
■ 釣り場面の絵（海を向いて竿を持つ横向き）… dev/art/fishing_pose.py で、同じ服・色で描く。
必要: pip install pillow numpy scipy
"""
import base64, io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'art'))
from fishing_pose import draw_fishing
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# 消す四角（元画像の座標）: 竿の先からぶら下がる糸と魚（ゲーム側で糸を描く）
SRC = {
    'm': ('dev/art/hero_m.jpg', [(1268, 300, 1400, 1400)]),
    'f': ('dev/art/hero_f.jpg', [(1203, 262, 1400, 1400)]),
}
NATIVE_H = 160   # 正面の絵のドットの段数（男女そろえる。女の絵の細かさ＝約158段をそのまま生かす）
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
    """男女で、ドットの細かさ・色の出方をそろえる：160段に縮め、色数を絞って、輪郭をくっきりさせる"""
    w = round(big.width * NATIVE_H / big.height)
    sm = big.resize((w, NATIVE_H), Image.LANCZOS)
    a = np.array(sm)
    alpha = a[:, :, 3] >= 128
    q = np.array(Image.fromarray(a[:, :, :3]).quantize(colors=QUANT, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB'))
    return Image.fromarray(np.dstack([q, (alpha * 255).astype(np.uint8)]), 'RGBA')


def scale2x(im):
    """ドット絵の斜めの線を、なめらかにつなぎながら2倍にする（Scale2x）。色の境目はそのまま、階段状のギザギザだけ減る"""
    a = np.array(im.convert('RGBA'))
    a[a[:, :, 3] == 0] = 0  # 透明は、色も0にそろえる
    v = np.ascontiguousarray(a).view('<u4')[:, :, 0]
    pad = np.pad(v, 1, mode='edge')
    P = pad[1:-1, 1:-1]
    A, B, C, D = pad[:-2, 1:-1], pad[1:-1, 2:], pad[1:-1, :-2], pad[2:, 1:-1]  # 上・右・左・下
    E0 = np.where((C == A) & (C != D) & (A != B), A, P)
    E1 = np.where((A == B) & (A != C) & (B != D), B, P)
    E2 = np.where((D == C) & (D != B) & (C != A), C, P)
    E3 = np.where((B == D) & (B != A) & (D != C), D, P)
    h, w = P.shape
    out = np.empty((h * 2, w * 2), dtype='<u4')
    out[0::2, 0::2], out[0::2, 1::2], out[1::2, 0::2], out[1::2, 1::2] = E0, E1, E2, E3
    return Image.fromarray(out.view(np.uint8).reshape(h * 2, w * 2, 4), 'RGBA')


def encode_rgba(im):
    b = io.BytesIO()
    im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def smooth_big(im):
    """ドット絵を4倍にして、輪郭の階段（ギザギザ）をなだらかにする。
    ① Scale2xを2回（斜めの線をつなぐ） ② 輪郭（透明度）をぼかして、しきい値で切り直す＝直線・曲線がなめらかになり、縁にアンチエイリアスが付く
    ③ 色は、透明度でかけ算してから軽くぼかす（縁が黒ずまない）"""
    big = np.array(scale2x(scale2x(im))).astype(np.float32)
    al = big[:, :, 3] / 255.0
    rgb = big[:, :, :3]
    pre = rgb * al[:, :, None]

    def blur(x, sg):
        return ndi.gaussian_filter(x, sg)

    a1 = blur(al, 1.0)
    c1 = np.stack([blur(pre[:, :, k], 1.0) for k in range(3)], 2) / np.maximum(a1, 1e-3)[:, :, None]
    a3 = blur(al, 3.0)
    c3 = np.stack([blur(pre[:, :, k], 3.0) for k in range(3)], 2) / np.maximum(a3, 1e-3)[:, :, None]
    w = np.clip(a1 / 0.6, 0, 1)[:, :, None]
    color = c1 * w + c3 * (1 - w)
    t = np.clip((blur(al, 2.2) - 0.32) / 0.36, 0, 1)  # 輪郭：ぼかして、しきい値で切り直す
    alpha = t * t * (3 - 2 * t)
    out = np.dstack([np.clip(color, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def pack(im, heights):
    """なめらかにした絵を、いくつかの高さで持つ（縮小は、透明度をかけ算した状態で行う）"""
    big = smooth_big(im)
    out = {}
    for name, hh in heights:
        ww = round(big.width * hh / big.height)
        small = big.convert('RGBa').resize((ww, hh), Image.LANCZOS).convert('RGBA')
        out[name] = dict(w=ww, h=hh, src=encode_rgba(small))
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
            img=pack(front, [('S', 96), ('M', 192), ('L', 384)]),
            fish=dict(
                aspect=fish.width / fish.height,
                foot=foot / fish.height,
                tip=[(xs.max() + 1) / fish.height, float(ys[xs >= xs.max() - 1].mean()) / fish.height],  # 竿の持ち手のはし
                img=pack(fish, [('S', 96), ('M', 192), ('L', 288)]),
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
