"""釣り場面用の、横向き（右＝海を向く）の主人公を、ドットで描く。
正面の絵（hero_m.jpg / hero_f.jpg）と同じ服・髪・色で、竿を両手で前に出した姿。
draw_fishing('m' or 'f') → 80×96 の RGBA 画像（足元は下の端、竿の持ち手は右の端）。
"""
from PIL import Image, ImageDraw

W, H = 80, 96
OL = '#0c0c26'  # ふち取り（元の絵と同じ濃い紺）

PAL = {
    'm': dict(skin='#e9a577', skin_hi='#f6c49c', skin_sh='#c9835a', hair='#6b3d22', hair_hi='#8a5530',
              eye='#4a78c0', brow='#4a2a18',
              cap='#3b6cb0', cap_sh='#2c4f8c', cap_hi='#eef6fb', cap_wsh='#c3d6e8',
              top='#2b3052', top_sh='#1d2140', top_hi='#3d4574', trim='#d8dce8',
              jeans='#4d78a9', jeans_sh='#3a608c', jeans_hi='#6a93c0',
              shoe='#2c3355', shoe_hi='#4a5382', sole='#f2f2f6', sole_sh='#c4c8d4'),
    'f': dict(skin='#d89a6c', skin_hi='#eab48a', skin_sh='#b87a52', hair='#7a4a2c', hair_hi='#9a6238',
              eye='#4f6f98', brow='#4a2a18',
              cap='#33476f', cap_sh='#27385a', cap_hi='#4a6090', cap_wsh='#1c2a48',
              top='#e7dcc1', top_sh='#cdbf9f', top_hi='#f6efdc', trim='#bfae88',
              jeans='#4d78a9', jeans_sh='#3a608c', jeans_hi='#6a93c0',
              shoe='#3d4258', shoe_hi='#5a6080', sole='#f2f2f6', sole_sh='#c4c8d4'),
}


def draw_fishing(sx):
    P = PAL[sx]
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def poly(pts, fill, ol=True):
        d.polygon(pts, fill=fill, outline=OL if ol else None)

    def rect(x0, y0, x1, y1, c):
        d.rectangle([x0, y0, x1, y1], fill=c)

    def ell(x0, y0, x1, y1, fill, ol=True):
        d.ellipse([x0, y0, x1, y1], fill=fill, outline=OL if ol else None)

    # ---- 竿（うしろ側）：手元から右上へ。持ち手と、リール
    rod = [(44, 54), (49, 50), (79, 31), (79, 35), (50, 56)]
    poly(rod, '#8a5a36')
    d.line([(52, 50), (78, 33)], fill='#b9885a', width=1)
    ell(44, 54, 50, 60, '#8d93a8')  # リール
    d.point((46, 56), fill='#d6dbe8')

    # ---- 奥の腕（うしろ）と奥の脚
    poly([(30, 40), (38, 39), (52, 46), (50, 52), (40, 52)], P['top_sh'])  # 奥の腕
    # 奥の脚（うしろに引いた脚）
    poly([(22, 66), (33, 66), (30, 90), (19, 90)], P['jeans_sh'])
    poly([(13, 89), (31, 89), (32, 92), (31, 95), (13, 95)], P['shoe'])
    rect(14, 93, 31, 94, P['sole_sh'])
    # ---- 手前の脚（前に出した脚）
    poly([(29, 66), (42, 66), (46, 90), (35, 90)], P['jeans'])
    d.polygon([(38, 70), (42, 66), (46, 90), (43, 90)], fill=P['jeans_sh'])
    d.line([(31, 70), (36, 88)], fill=P['jeans_hi'])
    poly([(32, 88), (52, 88), (55, 91), (55, 95), (32, 95)], P['shoe'])
    rect(33, 92, 55, 94, P['sole'])
    rect(33, 94, 55, 94, P['sole_sh'])
    d.line([(46, 89), (52, 90)], fill=P['shoe_hi'])
    d.point((45, 90), fill='#e8ecf4')
    d.point((48, 89), fill='#e8ecf4')

    # ---- 胴
    body = [(23, 35), (40, 34), (44, 46), (45, 60), (43, 68), (21, 68), (19, 52)]
    poly(body, P['top'])
    d.polygon([(36, 38), (40, 34), (44, 46), (45, 60), (43, 68), (37, 68), (39, 52)], fill=P['top_sh'])
    d.line([(24, 38), (21, 52)], fill=P['top_hi'])
    if sx == 'm':
        ell(15, 33, 29, 45, P['top'])  # フード
        d.arc([16, 34, 28, 44], 200, 340, fill=P['top_hi'])
        rect(36, 52, 38, 53, P['trim'])  # ひも
        rect(36, 54, 37, 57, P['trim'])
        rect(21, 65, 43, 67, P['top_sh'])  # すそ
    else:
        ell(14, 33, 29, 46, P['top'])  # フード
        for yy in range(52, 67, 3):
            d.line([(25, yy), (42, yy)], fill=P['top_sh'])  # あみ目
        poly([(20, 63), (44, 63), (43, 68), (21, 68)], P['trim'])  # すそのリブ
        for xx in range(23, 43, 3):
            d.line([(xx, 64), (xx, 67)], fill=P['top_sh'])
    # ---- 首
    rect(30, 30, 38, 36, P['skin_sh'])

    # ---- 頭
    ell(20, 5, 49, 35, P['skin'])
    # 顔の前（右）をふくらませて、横顔にする
    poly([(44, 14), (49, 15), (51, 20), (49, 22), (48, 27), (44, 33)], P['skin'], ol=False)
    d.line([(49, 15), (51, 20), (49, 22)], fill=OL)
    d.line([(48, 23), (48, 27), (44, 33)], fill=OL)
    d.line([(42, 30), (45, 31)], fill=P['skin_sh'])
    d.point((50, 20), fill=P['skin_hi'])
    # ほほ・ほおの赤み
    d.point((43, 26), fill='#ff9a8a')
    d.point((44, 26), fill='#ff9a8a')
    # 耳
    ell(27, 18, 33, 26, P['skin_sh'])
    d.point((30, 21), fill=P['skin'])
    # 目
    rect(41, 17, 46, 24, '#f6f8fc')
    rect(42, 18, 46, 24, P['eye'])
    rect(43, 19, 46, 23, '#1c2440')
    d.point((45, 19), fill='#ffffff')
    d.point((42, 18), fill='#ffffff')
    d.line([(41, 15), (47, 15)], fill=P['brow'])
    d.point((40, 16), fill=P['brow'])
    # 鼻・口
    d.point((49, 23), fill=P['skin_sh'])
    d.line([(44, 29), (46, 29)], fill='#8a3a3a')
    d.point((47, 28), fill='#8a3a3a')

    # ---- 髪・ぼうし
    if sx == 'm':
        # 後ろ髪（ぼうしの下）
        poly([(19, 14), (30, 13), (31, 24), (28, 31), (22, 33), (19, 26)], P['hair'])
        d.line([(21, 18), (23, 28)], fill=P['hair_hi'])
        # もみあげ
        rect(31, 17, 33, 21, P['hair'])
        # ぼうし本体（うしろは青、前は白）
        poly([(18, 13), (19, 5), (30, 0), (44, 2), (46, 11), (30, 11)], P['cap'])
        poly([(31, 1), (44, 2), (46, 11), (36, 11)], P['cap_hi'])
        d.line([(33, 3), (42, 5)], fill='#ffffff')
        d.polygon([(18, 14), (19, 5), (24, 3), (23, 13)], fill=P['cap_sh'])
        # つば
        poly([(40, 9), (59, 11), (59, 14), (54, 16), (41, 13)], P['cap'])
        d.line([(44, 10), (57, 12)], fill=P['cap_hi'])
        d.line([(42, 13), (53, 15)], fill=P['cap_sh'])
    else:
        # ボブヘア：後ろから横にかけて
        poly([(17, 12), (31, 11), (33, 26), (30, 34), (18, 34), (15, 22)], P['hair'])
        d.line([(19, 16), (18, 30)], fill=P['hair_hi'])
        d.line([(24, 20), (23, 31)], fill=P['hair_hi'])
        rect(31, 14, 34, 24, P['hair'])
        # 前髪
        poly([(36, 13), (47, 13), (48, 17), (44, 16), (40, 17)], P['hair'])
        # ニット帽
        poly([(15, 14), (16, 4), (28, -1), (43, 2), (47, 12), (46, 15), (17, 15)], P['cap'])
        d.polygon([(15, 14), (16, 4), (22, 2), (21, 14)], fill=P['cap_wsh'])
        for xx in range(19, 45, 5):
            d.line([(xx, 1), (xx + 1, 11)], fill=P['cap_sh'])
        poly([(14, 8), (47, 8), (48, 13), (14, 13)], P['cap_hi'])  # 折り返し
        for xx in range(16, 47, 3):
            d.line([(xx, 9), (xx, 12)], fill=P['cap'])

    # ---- 手前の腕（竿を持つ）：ひじを曲げ、前腕を前へ
    poly([(26, 38), (37, 37), (41, 56), (31, 57)], P['top'])  # 二の腕
    d.polygon([(34, 40), (37, 37), (41, 56), (37, 57)], fill=P['top_sh'])
    d.line([(28, 40), (31, 54)], fill=P['top_hi'])
    poly([(34, 49), (49, 45), (52, 53), (36, 59)], P['top'])  # 前腕
    d.polygon([(40, 50), (49, 45), (52, 53), (43, 56)], fill=P['top_sh'])
    d.line([(36, 51), (47, 47)], fill=P['top_hi'])
    poly([(47, 45), (51, 44), (54, 52), (50, 54)], P['trim'] if sx == 'f' else P['top_sh'])  # そで口
    # 手（竿をにぎる）
    ell(49, 44, 58, 54, P['skin'])
    d.line([(51, 47), (57, 47)], fill=P['skin_sh'])
    d.line([(51, 50), (57, 50)], fill=P['skin_sh'])
    d.point((52, 45), fill=P['skin_hi'])
    return im


if __name__ == '__main__':
    import sys
    for sx in 'mf':
        im = draw_fishing(sx)
        bg = Image.new('RGBA', im.size, (190, 225, 240, 255))
        bg.alpha_composite(im)
        bg.resize((im.width * 8, im.height * 8), Image.NEAREST).convert('RGB').save(sys.argv[1] + f'/fishing_{sx}.png')
