import sys, numpy as np, cv2
from PIL import Image

K = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1))

def build_alpha(name, strip_dark_neutral=False, choke=2, speck=200):
    vis = np.array(Image.open(f"out/{name}.vision.png").convert("RGBA"))
    a = (vis[:, :, 3] > 127).astype(np.uint8)
    if strip_dark_neutral:
        # Glow-heavy art: dark/neutral grey squares are checker, never subject. Only act near the silhouette edge.
        src = np.array(Image.open(f"src/{name}.jpg").convert("RGB")).astype(np.int16)
        chroma = src.max(axis=2) - src.min(axis=2); val = src.max(axis=2)
        edge_band = (a == 1) & (cv2.erode(a, K(60)) == 0)
        a[edge_band & (chroma < 26) & (val < 120)] = 0
    a = cv2.morphologyEx(a, cv2.MORPH_OPEN, K(2))
    a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, K(3))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(a, 8)           # drop isolated specks
    keep = np.zeros_like(a)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= speck: keep[lab == i] = 1
    a = keep
    if choke: a = cv2.erode(a, K(choke))                                # remove the blended grey rim
    return cv2.GaussianBlur(a.astype(np.float32) * 255.0, (0, 0), 1.1)  # soft anti-aliased edge

def finalize(name, size=256, fill=0.88, **kw):
    alpha = build_alpha(name, **kw)
    rgb = np.array(Image.open(f"src/{name}.jpg").convert("RGB")).astype(np.float32)
    ys, xs = np.where(alpha > 8)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgb, alpha = rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]
    side = int(np.ceil(max(rgb.shape[0], rgb.shape[1]) / fill))           # object fills `fill` of the canvas
    canvas_rgb = np.zeros((side, side, 3), np.float32); canvas_a = np.zeros((side, side), np.float32)
    oy, ox = (side - rgb.shape[0]) // 2, (side - rgb.shape[1]) // 2
    canvas_rgb[oy:oy + rgb.shape[0], ox:ox + rgb.shape[1]] = rgb; canvas_a[oy:oy + alpha.shape[0], ox:ox + alpha.shape[1]] = alpha
    pm = canvas_rgb * (canvas_a[:, :, None] / 255.0)                      # premultiply, resize, un-premultiply => no dark/light halos
    pm = cv2.resize(pm, (size, size), interpolation=cv2.INTER_AREA); a2 = cv2.resize(canvas_a, (size, size), interpolation=cv2.INTER_AREA)
    out = np.where(a2[:, :, None] > 0.5, pm / np.maximum(a2[:, :, None] / 255.0, 1e-4), 0)
    rgba = np.rint(np.dstack([np.clip(out, 0, 255), np.clip(a2, 0, 255)])).astype(np.uint8)   # round, don't truncate (254 != 255)
    Image.fromarray(rgba, "RGBA").save(f"final/{name}.png", optimize=True)
    return rgba

if __name__ == "__main__":
    spec = {"diya-bronze": {}, "khanda-gold": {}, "trishula-gold": {}, "mala": {}, "dharma-wheel": {},
            "chakra": {"strip_dark_neutral": True}, "halo": {"strip_dark_neutral": True}}
    import os
    for n, kw in spec.items():
        r = finalize(n, **kw); a = r[:, :, 3]
        print(f"{n:14} 256x256  opaque {np.mean(a==255):5.1%}  transparent {np.mean(a==0):5.1%}  size {os.path.getsize(f'final/{n}.png')//1024}KB")
