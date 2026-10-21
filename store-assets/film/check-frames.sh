#!/bin/bash
# Samples 36 evenly spaced frames and reports average brightness: a black or half-black frame shows as a low YAVG.
f="$1"; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
python3 - "$f" "$d" <<'PY'
import subprocess,sys,re
f,d=sys.argv[1],float(sys.argv[2]); low=[]
vals=[]
for i in range(36):
    t=2.0+(d-4.0)*i/35
    out=subprocess.run(['ffmpeg','-v','error','-ss',f'{t:.2f}','-i',f,'-frames:v','1','-vf','signalstats,metadata=print:file=-','-f','null','-'],capture_output=True,text=True).stdout
    m=re.search(r'YAVG=([0-9.]+)',out)
    y=float(m.group(1)) if m else -1
    vals.append(y)
    if y<45: low.append((round(t,1),y))
print(f.split('/')[-1],'min YAVG',min(vals),'mean',round(sum(vals)/len(vals),1),'| frames under 45:',low)
PY
