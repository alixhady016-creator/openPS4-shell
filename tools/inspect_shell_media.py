import sys,pathlib,json,wave,hashlib
sys.path.insert(0,'work/video-libs');import av
import numpy as np
from PIL import Image,ImageDraw
out=pathlib.Path('outputs/openPS4-readiness');assets=pathlib.Path('openPS4-PS4/openPS4/Shell/assets')
src=pathlib.Path('outputs/PS4-original-6x-assets/systembgm/bgm_main.at9')
res=av.AudioResampler(format='s16',layout='stereo',rate=48000)
with wave.open(str(assets/'main.wav'),'wb') as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(48000)
 with av.open(str(src)) as c:
  for frame in c.decode(audio=0):
   for f in res.resample(frame):w.writeframes(f.to_ndarray().tobytes())
 for f in res.resample(None):w.writeframes(f.to_ndarray().tobytes())
report={'main':{'source':str(src),'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'decode':'ATRAC9 to 48 kHz stereo PCM; use recovered firmware track'},'login':{'source':'Downloads/02 Login.mp3','metadata':av.open('C:/Users/AlixHady/Downloads/02 Login.mp3').metadata,'status':'Local candidate tagged bgm_login, not matched to an extracted login AT9'}}
targets=[10.5,19.6,22.6,25.6,31.6];images=[];measure=[]
with av.open('C:/Users/AlixHady/AppData/Local/Temp/ps4_boot.mp4') as c:
 j=0
 for f in c.decode(video=0):
  if f.time>=targets[j]:
   im=f.to_image().crop((240,0,2160,1080));arr=np.asarray(im)/255
   # Left-edge patches avoid most icons and wave at these timestamps.
   sample=[arr[y:y+40,10:50].mean((0,1)).tolist() for y in [150,500,900]]
   measure.append({'requested':targets[j],'actual':f.time,'top_middle_bottom_RGB':sample});images.append(im.resize((640,360)));j+=1
   if j==len(targets):break
sheet=Image.new('RGB',(1280,3*390),'#141414');d=ImageDraw.Draw(sheet)
for i,im in enumerate(images):x=i%2*640;y=i//2*390;sheet.paste(im,(x,y));d.text((x+10,y+365),str(measure[i]['actual'])+' s real recording; skips not used as durations',fill='white')
sheet.save(out/'screen-treatment-footage.jpg');report['footage']=measure
report['conclusion']='Welcome lower region is darker; later home uses more uniform blue. User skips prevent assuming total boot duration. Settings use a reversible screen wash, not a proven native palette switch.'
(out/'integration-media-evidence.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
