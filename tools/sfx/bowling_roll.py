"""Tạo tiếng bóng bowling lăn trên ván gỗ (tổng hợp, không cần tệp ngoài) cho bộ âm 'bowling'.
Chạy:  python3 tools/sfx/bowling_roll.py <thư mục bộ âm>   -> ghi <thư mục>/gen/bowling_roll.wav
Cần numpy. Tiếng ù trầm (nhiễu nâu lọc thấp) có nhịp lộc cộc nhẹ của khe ván, to dần rồi nhỏ dần."""
import sys, os, wave, numpy as np
SR, DUR = 32000, 2.6
rng = np.random.default_rng(7)
n = int(SR * DUR); t = np.arange(n) / SR
w = rng.standard_normal(n)
b = np.cumsum(w); b -= np.convolve(b, np.ones(801) / 801, 'same')      # nhiễu nâu, bỏ trôi DC
for _ in range(3): b = np.convolve(b, np.ones(9) / 9, 'same')            # lọc thấp ~ 400 Hz
hum = 0.35 * np.sin(2 * np.pi * 62 * t + 0.6 * np.sin(2 * np.pi * 3.1 * t))
board = 1 + 0.18 * np.sign(np.sin(2 * np.pi * 15 * t)) * np.exp(-((t * 15) % 1) * 6)
x = (b / np.abs(b).max() + hum) * board
env = np.minimum(1, t / 0.08) * np.clip((DUR - t) / 0.9, 0, 1) ** 1.4
x = x * env; x = 0.8 * x / np.abs(x).max()
out = os.path.join(sys.argv[1], 'gen'); os.makedirs(out, exist_ok=True)
with wave.open(os.path.join(out, 'bowling_roll.wav'), 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((x * 32767).astype('<i2').tobytes())
