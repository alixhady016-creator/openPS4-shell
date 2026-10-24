"""Translate the existing diagnostic pixel arithmetic to GLSL, keeping VA comments.
This is an offline build tool; the application contains no instruction emulator.
"""
import json,pathlib
insns=json.loads(pathlib.Path('outputs/PS4-wave-decoding/wave-pixel-gcn.json').read_text())
out=['''#version 300 es
precision highp float;
precision highp int;
in vec4 A0; in vec4 A1; in vec4 A2; in vec4 A3;
uniform vec4 U[20]; uniform sampler2D ramps; uniform float noiseTable[256];
uniform vec2 resolution;
out vec4 color;
uint v[44]; uint s[128]; bool ex=true; bool vc=false;
void main(){
for(int i=0;i<44;i++)v[i]=0u; for(int i=0;i<128;i++)s[i]=0u;
v[2]=floatBitsToUint(gl_FragCoord.x);v[3]=floatBitsToUint(resolution.y-gl_FragCoord.y);
v[4]=gl_FrontFacing?1u:0u;
int material=int(round(A1.w));
vec4 r0=texture(ramps,vec2(clamp(A3.y,0.,1.),(float(material*2)+.5)/6.));
vec4 r1=texture(ramps,vec2(clamp(A3.y,0.,1.),(float(material*2)+1.5)/6.));
for(int j=0;j<4;j++){v[17+j]=floatBitsToUint(r0[j]);v[13+j]=floatBitsToUint(r1[j]);}
v[28]=uint(material);vec2 rg=vec2(0),ba=vec2(0);
''']
def val(k,lit):
 if k>=256:return f'v[{k-256}]'
 if k==106:return '(vc?1u:0u)'
 if k==126:return '(ex?1u:0u)'
 if k==255:return f'{lit}u'
 if 128<=k<=192:return f'{k-128}u'
 if 193<=k<=208:return f'{(192-k)&0xffffffff}u'
 if 240<=k<=247:return 'floatBitsToUint('+str([.5,-.5,1.,-1.,2.,-2.,4.,-4.][k-240])+')'
 return f's[{k}]'
def write(dst,r,integer=False):return f'if(ex)v[{dst}]='+ (r if integer else f'floatBitsToUint({r})')+';'
for ins in insns:
 a=ins['address'];name=ins['name'];typ=ins['type'];w=ins['word'];w2=ins['word2'] or 0
 if a<0xb1e560:continue
 out.append(f'// {a:x} {name}')
 if name in ('S_WAITCNT','S_CBRANCH_EXECZ','V_INTERP_P1_F32','S_ENDPGM','EXP'):continue
 if name=='V_INTERP_P2_F32':out.append(write((w>>18)&255,f'A{(w>>10)&63}[{(w>>8)&3}]'));continue
 if name.startswith('S_BUFFER_LOAD'):
  dst=(w>>15)&127;off=w&255;count=1<<(((w>>22)&31)-8)
  for j in range(count):out.append(f's[{dst+j}]=floatBitsToUint(U[{(off+j)//4}][{(off+j)%4}]);')
  continue
 if name.startswith('TBUFFER_LOAD_FORMAT'):
  dst=(w2>>8)&255;idx=w2&255;count={'X':1,'XY':2,'XYZ':3,'XYZW':4}[name.split('_')[-1]]
  out.append('{ int idx=int(v['+str(idx)+']);')
  for j in range(count):out.append(write(dst+j,'noiseTable[(idx/4)&255]' if a>=0xb1ea1c else f'U[idx][{j}]'))
  out.append('}');continue
 if name in ('S_GETPC_B64','S_ADD_U32','S_ADDC_U32','S_MOVK_I32'):continue
 if name=='S_MOV_B32':
  v=f'{ins["literal"]}u' if ins['literal'] is not None else val(ins['src'][0],None);dst=(w>>16)&127
  out.append(f'vc=({v}!=0u);' if dst==106 else f's[{dst}]={v};');continue
 if name=='S_AND_SAVEEXEC_B64':
  dst=(w>>16)&127;out.append('{bool old=ex;ex=ex&&('+val(ins['src'][0],None)+'!=0u);'+('vc=old;' if dst==106 else f's[{dst}]=old?1u:0u;')+'}');continue
 if name=='S_ANDN2_B64':out.append('ex=('+val(ins['src'][0],None)+'!=0u)&&!('+val(ins['src'][1],None)+'!=0u);');continue
 if name=='S_MOV_B64':out.append('ex=true;' if a==0xb1eb8c else 'ex=('+val(ins['src'][0],None)+'!=0u);');continue
 dst=(w&255) if typ=='VOP3' else ((w>>17)&255)
 raw=[val(k,ins['literal']) for k in ins['src']];f=[f'uintBitsToFloat({x})' for x in raw]
 if typ=='VOP3':
  ab=(w>>8)&7;neg=(w2>>29)&7
  f=[('-' if (neg>>j)&1 else '')+(f'abs({x})' if (ab>>j)&1 else x) for j,x in enumerate(f)]
 if name.startswith('V_CMP_'):
  op={'EQ':'==','NE':'!=','GE':'>=','GT':'>','LT':'<','LE':'<='}[name.split('_')[2]];aa,bb=raw[:2] if name.endswith(('U32','I32')) else f[:2];r=f'({aa}{op}{bb})'
  out.append(f'if(ex)vc={r};' if typ!='VOP3' or dst==106 else f's[{dst}]={r}?1u:0u;');continue
 if name=='V_MOV_B32':out.append(write(dst,raw[0],True));continue
 if name=='V_CNDMASK_B32':out.append(write(dst,f'({raw[2]}!=0u?{f[1]}:{f[0]})' if typ=='VOP3' else f'(vc?{f[1]}:{f[0]})'));continue
 if name=='V_CVT_I32_F32':out.append(write(dst,f'uint(int({f[0]}))',True));continue
 if name=='V_CVT_F32_I32':out.append(write(dst,f'float(int({raw[0]}))'));continue
 if name in ('V_ADD_I32','V_BCNT_U32_B32','V_SAD_U32','V_AND_B32','V_MUL_I32_I24'):
  if name=='V_ADD_I32':r=f'({raw[0]}+{raw[1]})'
  elif name=='V_BCNT_U32_B32':r=f'(popcount({raw[0]})+{raw[1]})'
  elif name=='V_SAD_U32':r=f'(uint(abs(int({raw[0]})-int({raw[1]})))+{raw[2]})'
  elif name=='V_AND_B32':r=f'({raw[0]}&{raw[1]})'
  else:r=f'({raw[0]}*{raw[1]})'
  out.append(write(dst,r,True));continue
 if name=='V_CVT_PKRTZ_F16_F32':out.append(('rg' if dst==0 else 'ba')+f'=vec2({f[0]},{f[1]});');continue
 operations={'V_MUL_F32':lambda:f'({f[0]}*{f[1]})','V_ADD_F32':lambda:f'({f[0]}+{f[1]})','V_SUB_F32':lambda:f'({f[0]}-{f[1]})','V_SUBREV_F32':lambda:f'({f[1]}-{f[0]})','V_MAD_F32':lambda:f'({f[0]}*{f[1]}+{f[2]})','V_FMA_F32':lambda:f'({f[0]}*{f[1]}+{f[2]})','V_MAC_F32':lambda:f'(uintBitsToFloat(v[{dst}])+{f[0]}*{f[1]})','V_MADAK_F32':lambda:f'({f[0]}*{f[1]}+uintBitsToFloat({ins["literal"]}u))','V_RSQ_F32':lambda:f'inversesqrt({f[0]})','V_RCP_F32':lambda:f'(1./{f[0]})','V_MIN_F32':lambda:f'min({f[0]},{f[1]})','V_MAX_F32':lambda:f'max({f[0]},{f[1]})','V_FRACT_F32':lambda:f'fract({f[0]})','V_COS_F32':lambda:f'cos({f[0]}*6.28318530718)','V_LOG_F32':lambda:f'log2({f[0]})','V_EXP_F32':lambda:f'exp2({f[0]})'}
 r=operations[name]()
 if typ=='VOP3':
  mul=[1,2,4,.5][(w2>>27)&3]
  if mul!=1:r=f'({r}*{float(mul)})'
  if (w>>11)&1:r=f'clamp({r},0.,1.)'
 out.append(write(dst,r))
out.append('color=clamp(vec4(rg,ba),0.,1.);}')
pathlib.Path('openPS4-PS4/openPS4/Shell/wave.frag').write_text('\n'.join(out))
print('Generated shader',len(out),'lines')
