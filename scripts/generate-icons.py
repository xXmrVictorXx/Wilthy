"""从 assets/Wilthy_Logo.png 生成其余图标：浅色、深色应用图标（PNG + SVG）与 Windows 托盘 ICO。

用法：python scripts/generate-icons.py
依赖（仅开发期，不进应用依赖）：Pillow
  python -m pip install --target <临时目录> pillow，再以 PYTHONPATH=<临时目录> 运行

Logo 须为 1254px 见方、透明底。应用图标沿用旧版几何：圆角方块铺满画布、圆角 225px、
图案占边长 74%。深色版把 Logo 的主色（最常见的深色）映射成底色，让大块深色融进背景。
托盘 ICO 裁掉底板留白、每档尺寸各自从原图缩小，避免 Windows 高缩放下放大发糊。
"""

from __future__ import annotations

import base64
import io
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ASSETS = Path(__file__).resolve().parent.parent / 'assets'
SIZE = 1254
RADIUS = 225
ART_SCALE = 0.74
SUPERSAMPLE = 4
LIGHT_BG = (255, 255, 255)
DARK_BG = (10, 10, 10)
TRAY_MARGIN = 0.13
TRAY_SIZES = [16, 20, 24, 32, 40, 48, 64, 256]


def plate(color: tuple[int, int, int]) -> Image.Image:
    big = Image.new('L', (SIZE * SUPERSAMPLE, SIZE * SUPERSAMPLE), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        (0, 0, SIZE * SUPERSAMPLE - 1, SIZE * SUPERSAMPLE - 1), RADIUS * SUPERSAMPLE, fill=255
    )
    base = Image.new('RGBA', (SIZE, SIZE), color + (255,))
    base.putalpha(big.resize((SIZE, SIZE), Image.LANCZOS))
    return base


def ink_color(logo: Image.Image) -> tuple[int, int, int]:
    """Logo 里最常见的不透明深色像素，作为深色版要融进背景的主色。"""
    counts = Counter(
        (r, g, b)
        for r, g, b, a in logo.getdata()
        if a > 200 and 0.299 * r + 0.587 * g + 0.114 * b < 100
    )
    if not counts:
        raise SystemExit('Logo 里没有深色主色，无法生成深色版图标')
    return counts.most_common(1)[0][0]


def recolor_dark(logo: Image.Image, ink: tuple[int, int, int]) -> Image.Image:
    """逐通道线性映射：主色变成深色底色，白色保持白色，其他颜色按比例跟随。"""
    r, g, b, a = logo.split()
    channels = [
        channel.point(
            [
                max(0, min(255, round(DARK_BG[i] + (v - ink[i]) * (255 - DARK_BG[i]) / (255 - ink[i]))))
                for v in range(256)
            ]
        )
        for i, channel in enumerate((r, g, b))
    ]
    return Image.merge('RGBA', (*channels, a))


def compose(bg: tuple[int, int, int], art: Image.Image) -> Image.Image:
    art = art.crop(art.getbbox())
    ratio = round(SIZE * ART_SCALE) / max(art.size)
    art = art.resize((round(art.width * ratio), round(art.height * ratio)), Image.LANCZOS)
    icon = plate(bg)
    layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    layer.paste(art, ((SIZE - art.width) // 2, (SIZE - art.height) // 2), art)
    result = Image.alpha_composite(icon, layer)
    result.putalpha(icon.getchannel('A'))
    return result


def save_icon(name: str, image: Image.Image) -> None:
    image.save(ASSETS / f'{name}.png', optimize=True)
    buffer = io.BytesIO()
    image.save(buffer, 'PNG', optimize=True)
    data = base64.b64encode(buffer.getvalue()).decode()
    (ASSETS / f'{name}.svg').write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="100%" height="100%">'
        f'<image href="data:image/png;base64,{data}" width="{SIZE}" height="{SIZE}"/></svg>\n',
        encoding='utf-8',
        newline='\n',
    )


def save_tray(name: str, icon: Image.Image) -> None:
    margin = int(SIZE * TRAY_MARGIN)
    crop = icon.crop((margin, margin, SIZE - margin, SIZE - margin))
    frames = []
    for size in TRAY_SIZES:
        frame = crop.resize((size, size), Image.LANCZOS)
        if size <= 48:
            frame = frame.filter(ImageFilter.UnsharpMask(radius=0.6, percent=60, threshold=0))
        frames.append(frame)
    frames[-1].save(
        ASSETS / f'{name}.ico',
        format='ICO',
        sizes=[(size, size) for size in TRAY_SIZES],
        append_images=frames[:-1],
    )


def main() -> None:
    logo = Image.open(ASSETS / 'Wilthy_Logo.png').convert('RGBA')
    if logo.size != (SIZE, SIZE):
        raise SystemExit(f'Wilthy_Logo.png 应为 {SIZE}x{SIZE}，实际是 {logo.size[0]}x{logo.size[1]}')
    variants = {
        'white': compose(LIGHT_BG, logo),
        'black': compose(DARK_BG, recolor_dark(logo, ink_color(logo))),
    }
    for variant, icon in variants.items():
        save_icon(f'Wilthy_{variant}_bg', icon)
        save_tray(f'Wilthy_{variant}_tray', icon)
    print('已生成：' + '、'.join(
        f'Wilthy_{v}_bg.png/.svg、Wilthy_{v}_tray.ico' for v in variants
    ))


if __name__ == '__main__':
    main()
