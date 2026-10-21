#!/usr/bin/env python3
"""
Builds the soundtrack for one cut and muxes it onto the silent render.

  python3 build-audio.py --cut 45 --video silent-45.mp4 --out shoonaya-film-45s.mp4

Sound = the app's own tanpura drone (assets/audio/tanpura, D) looped with cross-fades, plus a singing-bowl tone
synthesised here (no sample, so no third-party rights) struck at each scene change and once, lower and longer, on
the end card. Scene times come from timeline-<cut>.json, written by render.cjs, so sound and picture cannot drift.
"""
import argparse, json, math, os, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TANPURA = os.path.join(ROOT, 'assets', 'audio', 'tanpura', 'tanpura-d.mp3')

ap = argparse.ArgumentParser()
ap.add_argument('--cut', default='45')
ap.add_argument('--video', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--keep-wav', default=None)
args = ap.parse_args()

tl = json.load(open(os.path.join(HERE, f'timeline-{args.cut}.json')))
total = tl['total']
starts = {s['id']: s['t0'] for s in tl['scenes']}

# (time, base Hz, loudness, decay seconds). D4=293.66, A4=440, F#4=369.99, D5=587.33, D3=146.83
hits = [
    (0.9, 293.66, 0.55, 3.2),
    (starts['panchang'] + 0.05, 440.00, 0.50, 3.4),
    (starts['paths'] + 0.05, 293.66, 0.50, 3.4),
    (starts['japa'] + 0.05, 369.99, 0.42, 3.0),
    (starts['pathshala'] + 0.05, 440.00, 0.42, 3.0),
    (starts['tirtha'] + 0.05, 587.33, 0.38, 3.0),
    (starts['choose'] + 0.05, 369.99, 0.42, 3.2),
    (starts['wherever'] + 0.05, 293.66, 0.50, 3.6),
    (starts['end'] + 0.10, 146.83, 0.80, 6.5),
    (starts['end'] + 0.10, 293.66, 0.45, 6.0),
]

def bowl_expr(f, amp, tau):
    """A struck bowl: a fast attack, inharmonic partials that die at different rates, and a slight L/R detune for beating."""
    def side(detune):
        fr = f * detune
        partials = [(1.0, 1.0, tau), (2.76, 0.42, tau * 0.7), (5.40, 0.16, tau * 0.45)]
        terms = '+'.join(f'{a:.3f}*sin(2*PI*{fr * r:.3f}*t)*exp(-t/{d:.3f})' for r, a, d in partials)
        return f'{amp:.3f}*(1-exp(-t*70))*({terms})/1.6'
    return f"{side(1.000)}|{side(1.0025)}"

with tempfile.TemporaryDirectory() as tmp:
    inputs, chains, labels = [], [], []

    # 1) drone: enough copies, cross-faded, trimmed to the film
    FADE = 1.5
    per = 10.0 - FADE
    n = max(2, math.ceil(total / per) + 1)
    for _ in range(n):
        inputs += ['-i', TANPURA]
    prev = '[0:a]'
    for i in range(1, n):
        chains.append(f'{prev}[{i}:a]acrossfade=d={FADE}:c1=tri:c2=tri[x{i}]')
        prev = f'[x{i}]'
    chains.append(f'{prev}aresample=48000,aformat=channel_layouts=stereo,atrim=0:{total + 0.5:.3f},asetpts=PTS-STARTPTS,'
                  f'volume=0.34,afade=t=in:st=0:d=2.5,afade=t=out:st={total - 3.2:.3f}:d=3.2[drone]')
    labels.append('[drone]')

    # 2) bowls
    for j, (t, f, amp, tau) in enumerate(hits):
        inputs += ['-f', 'lavfi', '-t', f'{tau * 1.9:.2f}', '-i', f"aevalsrc='{bowl_expr(f, amp, tau)}':s=48000:c=stereo"]
        idx = n + j
        ms = int(t * 1000)
        chains.append(f'[{idx}:a]adelay={ms}|{ms},volume=0.55[b{j}]')
        labels.append(f'[b{j}]')

    mix = ''.join(labels) + f'amix=inputs={len(labels)}:duration=longest:normalize=0,' \
          f'atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=8,afade=t=out:st={total - 1.0:.3f}:d=1.0[a]'
    chains.append(mix)
    wav = args.keep_wav or os.path.join(tmp, 'mix.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(chains), '-map', '[a]', '-ar', '48000', wav], check=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', args.video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', args.out], check=True)
print('wrote', args.out)
