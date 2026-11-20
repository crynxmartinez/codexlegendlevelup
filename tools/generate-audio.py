import wave, math, random, struct, pathlib
out=pathlib.Path('assets/audio'); out.mkdir(exist_ok=True)
rng=random.Random(72)
# Original procedural sound designs. No third-party samples.
for name,freq,duration,grit in [('select',880,.07,.04),('confirm',660,.12,.08),('cancel',310,.11,.04),('flip',1200,.14,.6),('block',240,.32,.28),('crack',1700,.38,.75),('force',620,.48,.06),('codex',360,.45,.1),('essence',740,.28,.04),('vent',300,.26,.2),('offer',140,.35,.3)]:
 for variant in range(3):
  sr=24000; data=[]; f=freq*(1+(variant-1)*.035)
  for i in range(int(sr*duration)):
   t=i/sr; x=t/duration; env=min(1,t/.006)*math.exp(-5*x)*(1-x)
   rise=1 if name in ['force','essence','codex','confirm'] else -1
   phase=2*math.pi*f*(t+rise*t*t/(duration*5))
   value=(math.sin(phase)+.22*math.sin(phase*1.503))*(1-grit)+rng.uniform(-1,1)*grit
   data.append(struct.pack('<h',int(max(-1,min(1,value*env*.42))*32767)))
  with wave.open(str(out/f'{name}-{variant}.wav'),'wb') as w:
   w.setparams((1,2,sr,0,'NONE','not compressed')); w.writeframes(b''.join(data))
