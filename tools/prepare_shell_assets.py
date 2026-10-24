"""Package recovered resources for the local openPS4 shell; originals are untouched."""
import sys, pathlib, json, shutil, zipfile, hashlib
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0,'work')
from render_wave_camera import mesh, poses, cam, inv, meta, joints, weights
from wave_pixel_reference import palettes, ramps, noise, uniforms
root=pathlib.Path('openPS4-PS4/openPS4/Shell'); assets=root/'assets'; assets.mkdir(parents=True,exist_ok=True)
manifest=[]
def copy(src,name):
 src=pathlib.Path(src); dst=assets/name; shutil.copy2(src,dst)
 manifest.append({'file':name,'source':str(src.resolve()),'sha256':hashlib.sha256(src.read_bytes()).hexdigest()})
raw=mesh['attributes_32_48']; half=raw[:,3].copy().view('<f2').reshape(-1,2)
arrays={'positions':mesh['positions'],'normals':mesh['normals'],'uv':mesh['uv'],'volume':np.c_[raw[:,:3],half[:,1]],'alpha':half[:,0], 'material':mesh['bytes_48_60'][:,0], 'joints':joints,'weights':weights,'poses':poses[:,:96], 'camera':cam,'inverse':inv,'indices':mesh['indices'],'ramps':ramps[1],'uniforms':uniforms(1,[0,0,0]),'noise':noise}
buf=bytearray(); info={}
for name,a in arrays.items():
 a=np.asarray(a,dtype='<f4');info[name]={'offset':len(buf),'count':a.size,'shape':list(a.shape)};buf.extend(a.tobytes())
(assets/'wave.bin').write_bytes(buf)
(assets/'wave.json').write_text(json.dumps({'arrays':info,'light':np.frombuffer(bytes.fromhex(meta['other_records'][0]['hex']),dtype='<f4')[4:7].tolist(),'speed':.7,'phase':35,'meshDuration':800/30,'cameraDuration':5600/30}))
# The recovered background is separate from material and screen treatment.
bg=np.load('outputs/PS4-wave-decoding/native-followup/background-palettes.npz')
(assets/'background.json').write_text(json.dumps({'palette':bg['palettes'][1].tolist(),'ramp':bg['ramps'][1].tolist()}))
base=pathlib.Path('outputs/PS4-original-6x-assets')
def original(group,filename,dest):
 for folder in ['PNG-conversions','extracted']:
  p=base/folder/group/filename
  if p.exists():copy(p,dest);return
 raise FileNotFoundError(filename)
for key,file in {'friends':'friend','notifications':'notification','messages':'message','party':'party','trophies':'trophy','settings':'setting','power':'power','communities':'community'}.items():
 original('Sce.Vsh.ShellUI.Theme',f'tex_{file}_src_4k.png',key+'.png')
original('Sce.Vsh.ShellUI.TopMenu','tex_plus_src_4k.png','plus.png')
original('Sce.Vsh.ShellUI.QuickMenu','tex_store_src_4k.png','store.png')
original('Sce.Vsh.ShellUI.VoiceRecognitionTutorial','tex_NUI_tutorial_appIcon_whatsNew_src_4k.png','whatsnew.png')
original('Sce.Vsh.ShellUI.Base','tex_default_loading_src.png','loading.png')
original('Sce.PlayStation.PUI','image_busyindicator_src_4k.png','symbols.png')
original('Sce.Vsh.ShellUI.Notification','tex_ps_button_src.png','psbutton.png')
original('Sce.Vsh.ShellUI.LoginMgr','tex_icon_logo_src.png','ps4logo.png')
original('Sce.Vsh.ShellUI.LoginMgr','tex_new_user_src.png','newuser.png')
original('Sce.Vsh.ShellUI.Theme','tex_event_src_4k.png','events.png')
for name,file in {'profile':'User.png','library':'GameLibrary.png','browser':'BrowserNew.png','gallery':'GalleryNew.png','music':'Music.png'}.items():
 p=pathlib.Path('openPS4-PS4/openPS4/Icons')/file
 if not p.exists():p=pathlib.Path('openPS4-PS4/openPS4/Icons/ControllerWhite.png')
 copy(p,name+'.png')
original('Sce.Vsh.ShellUI.Notification','tex_default_avatar_src_4k.png','profile.png')
for src,dst in [('01 Main.mp3','main.mp3'),('02 Login.mp3','login.mp3')]:copy(pathlib.Path('C:/Users/AlixHady/Downloads')/src,dst)
with zipfile.ZipFile('outputs/ps4-asset-research/PS4-System-Software-Sounds.zip') as z:
 for term,dest in [('Cursol_refine_C-','move.wav'),('se_log_login','login.wav'),('se_enter_menu','up.wav'),('se_back_menu','down.wav')]:
  found=[n for n in z.namelist() if term.lower() in n.lower() and n.lower().endswith('.wav')]
  if found:(assets/dest).write_bytes(z.read(found[0]));manifest.append({'file':dest,'source':'PS4-System-Software-Sounds.zip/'+found[0]})
(assets/'provenance.json').write_text(json.dumps(manifest,indent=2))
# Contact sheet includes original loading-sheet dimensions, not guessed symbol animation.
files=[p for p in assets.glob('*.png')];sheet=Image.new('RGB',(800,((len(files)+4)//5)*180),'#14467e');d=ImageDraw.Draw(sheet)
for i,p in enumerate(files):
 im=Image.open(p).convert('RGBA');size=im.size;im.thumbnail((140,140));x=i%5*160;y=i//5*180;sheet.paste(im,(x,y),im);d.text((x,y+142),p.name,fill='white');d.text((x,y+157),str(size),fill='white')
sheet.save('outputs/openPS4-readiness/integration-assets.jpg')
print('Packed',len(buf),'wave bytes;',len(manifest),'resources')
