"""Turns docs/image-targets/scenario{1..5}.png into Y4M "camera" clips for Chromium's
--use-file-for-fake-video-capture. Needs Pillow (pip install pillow)."""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'docs', 'image-targets')
OUT = os.environ.get('FAKE_CAMERA_DIR', os.path.join(HERE, 'out'))
W, H = 640, 480
os.makedirs(OUT, exist_ok=True)
for i in range(1, 6):
    card = Image.open(os.path.join(SRC, f'scenario{i}.png')).convert('RGB')
    card.thumbnail((int(W * 0.8), int(H * 0.9)))
    frame = Image.new('RGB', (W, H), (235, 235, 235))
    frame.paste(card, ((W - card.width) // 2, (H - card.height) // 2))
    y, u, v = frame.convert('YCbCr').split()
    u, v = u.resize((W // 2, H // 2)), v.resize((W // 2, H // 2))
    with open(os.path.join(OUT, f'target{i}.y4m'), 'wb') as f:
        f.write(f'YUV4MPEG2 W{W} H{H} F10:1 Ip A1:1 C420jpeg\n'.encode())
        for _ in range(20):
            f.write(b'FRAME\n' + y.tobytes() + u.tobytes() + v.tobytes())
print('fake camera clips in', OUT)
