#version 300 es
// Native arithmetic: preserve VCC constants and RTZ half exports.
precision highp float;
precision highp int;
in vec4 A0; in vec4 A1; in vec4 A2; in vec4 A3;
uniform vec4 U[20]; uniform sampler2D ramps; uniform float noiseTable[256];
uniform vec2 resolution;
out vec4 color;
uint v[44]; uint s[128]; bool ex=true; bool vc=false; uint vcBits=0u;
float halfRTZ(float x){uint h=packHalf2x16(vec2(x,0.))&65535u;float y=unpackHalf2x16(h).x;if(!isnan(x)&&!isinf(x)&&abs(y)>abs(x)){h-=1u;}return unpackHalf2x16(h).x;}
vec2 halfRTZ2(vec2 x){return vec2(halfRTZ(x.x),halfRTZ(x.y));}
vec4 sampleRamp(float y,int row){float q=clamp(y,0.,1.)*4320.-.5;int i=int(floor(q));float f=q-float(i);return mix(texelFetch(ramps,ivec2(clamp(i,0,4319),row),0),texelFetch(ramps,ivec2(clamp(i+1,0,4319),row),0),f);}
void main(){
for(int i=0;i<44;i++)v[i]=0u; for(int i=0;i<128;i++)s[i]=0u;
v[2]=floatBitsToUint(gl_FragCoord.x);v[3]=floatBitsToUint(resolution.y-gl_FragCoord.y);
v[4]=gl_FrontFacing?1u:0u;
int material=int(round(A1.w));
vec4 r0=sampleRamp(A3.y,material*2);
vec4 r1=sampleRamp(A3.y,material*2+1);
for(int j=0;j<4;j++){v[17+j]=floatBitsToUint(r0[j]);v[13+j]=floatBitsToUint(r1[j]);}
v[28]=uint(material);vec2 rg=vec2(0),ba=vec2(0);

// b1e560 V_INTERP_P1_F32
// b1e564 V_INTERP_P2_F32
if(ex)v[5]=floatBitsToUint(A1[0]);
// b1e568 V_MUL_F32
if(ex)v[7]=floatBitsToUint((uintBitsToFloat(v[5])*uintBitsToFloat(v[5])));
// b1e56c V_INTERP_P1_F32
// b1e570 V_INTERP_P2_F32
if(ex)v[6]=floatBitsToUint(A1[2]);
// b1e574 V_CMP_EQ_U32
if(ex)vc=(0u==v[4]);
// b1e578 V_INTERP_P1_F32
// b1e57c V_INTERP_P2_F32
if(ex)v[4]=floatBitsToUint(A1[1]);
// b1e580 V_MAC_F32
if(ex)v[7]=floatBitsToUint((uintBitsToFloat(v[7])+uintBitsToFloat(v[4])*uintBitsToFloat(v[4])));
// b1e584 V_MAC_F32
if(ex)v[7]=floatBitsToUint((uintBitsToFloat(v[7])+uintBitsToFloat(v[6])*uintBitsToFloat(v[6])));
// b1e588 V_RSQ_F32
if(ex)v[8]=floatBitsToUint(inversesqrt(uintBitsToFloat(v[7])));
// b1e58c V_MUL_F32
if(ex)v[4]=floatBitsToUint((uintBitsToFloat(v[4])*uintBitsToFloat(v[8])));
// b1e590 S_BUFFER_LOAD_DWORDX4
s[4]=floatBitsToUint(U[0][0]);
s[5]=floatBitsToUint(U[0][1]);
s[6]=floatBitsToUint(U[0][2]);
s[7]=floatBitsToUint(U[0][3]);
// b1e594 V_INTERP_P1_F32
// b1e598 V_INTERP_P2_F32
if(ex)v[27]=floatBitsToUint(A0[0]);
// b1e59c V_INTERP_P1_F32
// b1e5a0 V_INTERP_P2_F32
if(ex)v[25]=floatBitsToUint(A0[1]);
// b1e5a4 V_INTERP_P1_F32
// b1e5a8 V_MUL_F32
if(ex)v[7]=floatBitsToUint((uintBitsToFloat(v[8])*-uintBitsToFloat(v[6])));
// b1e5b0 V_MUL_F32
if(ex)v[6]=floatBitsToUint((uintBitsToFloat(v[5])*uintBitsToFloat(v[8])));
// b1e5b4 S_WAITCNT
// b1e5b8 V_SUBREV_F32
if(ex)v[8]=floatBitsToUint((uintBitsToFloat(v[27])-uintBitsToFloat(s[4])));
// b1e5bc V_INTERP_P2_F32
if(ex)v[26]=floatBitsToUint(A0[2]);
// b1e5c0 V_SUBREV_F32
if(ex)v[5]=floatBitsToUint((uintBitsToFloat(v[26])-uintBitsToFloat(s[6])));
// b1e5c4 V_CNDMASK_B32
if(ex)v[31]=floatBitsToUint(((vc?1u:0u)!=0u?-uintBitsToFloat(v[6]):uintBitsToFloat(v[6])));
// b1e5cc V_SUBREV_F32
if(ex)v[6]=floatBitsToUint((uintBitsToFloat(v[25])-uintBitsToFloat(s[5])));
// b1e5d0 V_INTERP_P1_F32
// b1e5d4 V_CNDMASK_B32
if(ex)v[32]=floatBitsToUint(((vc?1u:0u)!=0u?-uintBitsToFloat(v[4]):uintBitsToFloat(v[4])));
// b1e5dc V_INTERP_P2_F32
if(ex)v[29]=floatBitsToUint(A2[3]);
// b1e5e0 V_CNDMASK_B32
if(ex)v[33]=floatBitsToUint(((vc?1u:0u)!=0u?-uintBitsToFloat(v[7]):uintBitsToFloat(v[7])));
// b1e5e8 V_ADD_I32
if(ex)v[4]=(2u+v[28]);
// b1e5ec V_MUL_F32
if(ex)v[7]=floatBitsToUint((uintBitsToFloat(v[8])*uintBitsToFloat(v[8])));
// b1e5f0 V_MAC_F32
if(ex)v[7]=floatBitsToUint((uintBitsToFloat(v[7])+uintBitsToFloat(v[6])*uintBitsToFloat(v[6])));
// b1e5f4 V_MAC_F32
if(ex)v[7]=floatBitsToUint((uintBitsToFloat(v[7])+uintBitsToFloat(v[5])*uintBitsToFloat(v[5])));
// b1e5f8 V_RSQ_F32
if(ex)v[7]=floatBitsToUint(inversesqrt(uintBitsToFloat(v[7])));
// b1e5fc V_MUL_F32
if(ex)v[35]=floatBitsToUint((uintBitsToFloat(v[7])*uintBitsToFloat(v[8])));
// b1e600 V_MUL_F32
if(ex)v[36]=floatBitsToUint((uintBitsToFloat(v[7])*uintBitsToFloat(v[6])));
// b1e604 V_MUL_F32
if(ex)v[6]=floatBitsToUint((uintBitsToFloat(v[31])*uintBitsToFloat(v[35])));
// b1e608 V_MAD_F32
if(ex)v[38]=floatBitsToUint((uintBitsToFloat(v[32])*uintBitsToFloat(v[36])+uintBitsToFloat(v[6])));
// b1e610 V_MUL_F32
if(ex)v[37]=floatBitsToUint((uintBitsToFloat(v[7])*-uintBitsToFloat(v[5])));
// b1e618 V_SUB_F32
if(ex)v[34]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(1.0))-uintBitsToFloat(v[29])));
// b1e61c S_WAITCNT
// b1e620 V_MUL_F32
if(ex)v[19]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[34])));
// b1e624 V_MAC_F32
if(ex)v[38]=floatBitsToUint((uintBitsToFloat(v[38])+uintBitsToFloat(v[37])*uintBitsToFloat(v[33])));
// b1e628 S_WAITCNT
// b1e62c V_MAC_F32
if(ex)v[19]=floatBitsToUint((uintBitsToFloat(v[19])+uintBitsToFloat(v[15])*uintBitsToFloat(v[29])));
// b1e630 V_MUL_F32
if(ex)v[30]=floatBitsToUint((uintBitsToFloat(v[17])*uintBitsToFloat(v[34])));
// b1e634 V_MUL_F32
if(ex)v[17]=floatBitsToUint((uintBitsToFloat(v[18])*uintBitsToFloat(v[34])));
// b1e638 V_MAC_F32
if(ex)v[17]=floatBitsToUint((uintBitsToFloat(v[17])+uintBitsToFloat(v[14])*uintBitsToFloat(v[29])));
// b1e63c V_MAC_F32
if(ex)v[30]=floatBitsToUint((uintBitsToFloat(v[30])+uintBitsToFloat(v[13])*uintBitsToFloat(v[29])));
// b1e640 TBUFFER_LOAD_FORMAT_XYZW
{ int idx=int(v[4]);
if(ex)v[12]=floatBitsToUint(U[idx][0]);
if(ex)v[13]=floatBitsToUint(U[idx][1]);
if(ex)v[14]=floatBitsToUint(U[idx][2]);
if(ex)v[15]=floatBitsToUint(U[idx][3]);
}
// b1e648 V_BCNT_U32_B32
if(ex)v[4]=(popcount(31u)+v[28]);
// b1e64c TBUFFER_LOAD_FORMAT_XYZW
{ int idx=int(v[4]);
if(ex)v[8]=floatBitsToUint(U[idx][0]);
if(ex)v[9]=floatBitsToUint(U[idx][1]);
if(ex)v[10]=floatBitsToUint(U[idx][2]);
if(ex)v[11]=floatBitsToUint(U[idx][3]);
}
// b1e654 V_SAD_U32
if(ex)v[4]=(uint(abs(int(11u)-int(0u)))+v[28]);
// b1e65c TBUFFER_LOAD_FORMAT_XYZW
{ int idx=int(v[4]);
if(ex)v[21]=floatBitsToUint(U[idx][0]);
if(ex)v[22]=floatBitsToUint(U[idx][1]);
if(ex)v[23]=floatBitsToUint(U[idx][2]);
if(ex)v[24]=floatBitsToUint(U[idx][3]);
}
// b1e664 V_SAD_U32
if(ex)v[4]=(uint(abs(int(17u)-int(0u)))+v[28]);
// b1e66c TBUFFER_LOAD_FORMAT_XYZW
{ int idx=int(v[4]);
if(ex)v[4]=floatBitsToUint(U[idx][0]);
if(ex)v[5]=floatBitsToUint(U[idx][1]);
if(ex)v[6]=floatBitsToUint(U[idx][2]);
if(ex)v[7]=floatBitsToUint(U[idx][3]);
}
// b1e674 S_WAITCNT
// b1e678 V_MUL_F32
if(ex)v[42]=floatBitsToUint((abs(uintBitsToFloat(v[38]))*uintBitsToFloat(v[14])));
// b1e680 V_MUL_F32
if(ex)v[40]=floatBitsToUint((abs(uintBitsToFloat(v[38]))*uintBitsToFloat(v[13])));
// b1e688 V_MUL_F32
if(ex)v[18]=floatBitsToUint((uintBitsToFloat(v[42])*uintBitsToFloat(v[19])));
// b1e68c V_MUL_F32
if(ex)v[39]=floatBitsToUint((uintBitsToFloat(v[40])*uintBitsToFloat(v[17])));
// b1e690 V_CMP_GE_F32
if(ex)vc=(uintBitsToFloat(v[39])>=uintBitsToFloat(v[18]));
// b1e694 V_MAD_F32
if(ex)v[43]=floatBitsToUint((uintBitsToFloat(v[40])*uintBitsToFloat(v[17])+-uintBitsToFloat(v[18])));
// b1e69c V_CNDMASK_B32
if(ex)v[17]=floatBitsToUint(((vc?1u:0u)!=0u?uintBitsToFloat(floatBitsToUint(1.0)):uintBitsToFloat(0u)));
// b1e6a4 V_MUL_F32
if(ex)v[41]=floatBitsToUint((uintBitsToFloat(v[12])*abs(uintBitsToFloat(v[38]))));
// b1e6ac V_MUL_F32
if(ex)v[40]=floatBitsToUint((uintBitsToFloat(v[41])*uintBitsToFloat(v[30])));
// b1e6b0 V_MAD_F32
if(ex)v[19]=floatBitsToUint((uintBitsToFloat(v[42])*uintBitsToFloat(v[19])+-uintBitsToFloat(v[39])));
// b1e6b8 V_MAD_F32
if(ex)v[42]=floatBitsToUint((uintBitsToFloat(v[17])*uintBitsToFloat(v[43])+uintBitsToFloat(v[18])));
// b1e6c0 V_CMP_GE_F32
if(ex)vc=(uintBitsToFloat(v[40])>=uintBitsToFloat(v[42]));
// b1e6c4 V_MAD_F32
if(ex)v[43]=floatBitsToUint((uintBitsToFloat(v[41])*uintBitsToFloat(v[30])+-uintBitsToFloat(v[42])));
// b1e6cc V_MAD_F32
if(ex)v[30]=floatBitsToUint((-uintBitsToFloat(v[41])*uintBitsToFloat(v[30])+uintBitsToFloat(v[42])));
// b1e6d4 V_MAD_F32
if(ex)v[17]=floatBitsToUint((uintBitsToFloat(v[17])*uintBitsToFloat(v[19])+uintBitsToFloat(v[39])));
// b1e6dc V_CNDMASK_B32
if(ex)v[19]=floatBitsToUint(((vc?1u:0u)!=0u?uintBitsToFloat(floatBitsToUint(1.0)):uintBitsToFloat(0u)));
// b1e6e4 V_MAD_F32
if(ex)v[43]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[43])+uintBitsToFloat(v[42])));
// b1e6ec V_MAD_F32
if(ex)v[42]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[30])+uintBitsToFloat(v[40])));
// b1e6f4 S_WAITCNT
// b1e6f8 V_ADD_F32
if(ex)v[30]=floatBitsToUint((uintBitsToFloat(v[11])+uintBitsToFloat(v[43])));
// b1e6fc V_MAC_F32
if(ex)v[30]=floatBitsToUint((uintBitsToFloat(v[30])+uintBitsToFloat(v[43])*-uintBitsToFloat(v[11])));
// b1e704 V_MIN_F32
if(ex)v[11]=floatBitsToUint(min(uintBitsToFloat(v[17]),uintBitsToFloat(v[42])));
// b1e708 S_WAITCNT
// b1e70c V_CMP_GT_F32
if(ex)vc=(uintBitsToFloat(v[24])>uintBitsToFloat(v[30]));
// b1e710 V_SUB_F32
if(ex)v[41]=floatBitsToUint((uintBitsToFloat(v[43])-uintBitsToFloat(v[11])));
// b1e714 V_ADD_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(786163455u)+uintBitsToFloat(v[43])));
// b1e71c V_RCP_F32
if(ex)v[11]=floatBitsToUint((1./uintBitsToFloat(v[11])));
// b1e720 V_MUL_F32
if(ex)v[40]=floatBitsToUint((uintBitsToFloat(v[11])*uintBitsToFloat(v[41])));
// b1e724 V_SUB_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(v[24])-uintBitsToFloat(v[30])));
// b1e728 V_CMP_GT_F32
s[4]=(uintBitsToFloat(floatBitsToUint(0.5))>uintBitsToFloat(v[11]))?1u:0u;
// b1e730 S_AND_SAVEEXEC_B64
{bool old=ex;ex=ex&&((vc?1u:0u)!=0u);s[8]=old?1u:0u;}
// b1e734 S_CBRANCH_EXECZ
// b1e738 S_AND_SAVEEXEC_B64
{bool old=ex;ex=ex&&(s[4]!=0u);vc=old;}
// b1e73c S_CBRANCH_EXECZ
// b1e740 V_MUL_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(1078530011u)*uintBitsToFloat(v[11])));
// b1e748 V_MUL_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(1042479491u)*uintBitsToFloat(v[11])));
// b1e750 V_FRACT_F32
if(ex)v[11]=floatBitsToUint(fract(uintBitsToFloat(v[11])));
// b1e754 V_COS_F32
if(ex)v[11]=floatBitsToUint(cos(uintBitsToFloat(v[11])*6.28318530718));
// b1e758 V_MAD_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(-0.5))*uintBitsToFloat(v[11])+uintBitsToFloat(floatBitsToUint(0.5))));
// b1e760 S_ANDN2_B64
ex=((vc?1u:0u)!=0u)&&!((ex?1u:0u)!=0u);
// b1e764 S_CBRANCH_EXECZ
// b1e768 V_MOV_B32
if(ex)v[24]=3226013659u;
// b1e770 V_MADAK_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(v[24])*uintBitsToFloat(v[11])+uintBitsToFloat(1078530011u)));
// b1e778 V_MUL_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(1042479491u)*uintBitsToFloat(v[11])));
// b1e780 V_FRACT_F32
if(ex)v[11]=floatBitsToUint(fract(uintBitsToFloat(v[11])));
// b1e784 V_COS_F32
if(ex)v[11]=floatBitsToUint(cos(uintBitsToFloat(v[11])*6.28318530718));
// b1e788 V_FMA_F32
if(ex)v[11]=floatBitsToUint((-uintBitsToFloat(v[11])*uintBitsToFloat(floatBitsToUint(-0.5))+uintBitsToFloat(floatBitsToUint(-0.5))));
// b1e790 V_ADD_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(1.0))+uintBitsToFloat(v[11])));
// b1e794 S_MOV_B64
ex=((vc?1u:0u)!=0u);
// b1e798 S_WAITCNT
// b1e79c V_MAC_F32
if(ex)v[40]=floatBitsToUint((uintBitsToFloat(v[40])+uintBitsToFloat(v[11])*uintBitsToFloat(v[7])));
// b1e7a0 S_MOV_B64
ex=(s[8]!=0u);
// b1e7a4 S_WAITCNT
// b1e7a8 V_MUL_F32
if(ex)v[7]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(2.0))*uintBitsToFloat(v[38])));
// b1e7ac V_MAC_F32
if(ex)v[35]=floatBitsToUint((uintBitsToFloat(v[35])+uintBitsToFloat(v[7])*-uintBitsToFloat(v[31])));
// b1e7b4 V_MAC_F32
if(ex)v[36]=floatBitsToUint((uintBitsToFloat(v[36])+uintBitsToFloat(v[7])*-uintBitsToFloat(v[32])));
// b1e7bc V_INTERP_P1_F32
// b1e7c0 V_INTERP_P2_F32
if(ex)v[32]=floatBitsToUint(A2[1]);
// b1e7c4 V_MAC_F32
if(ex)v[37]=floatBitsToUint((uintBitsToFloat(v[37])+uintBitsToFloat(v[7])*-uintBitsToFloat(v[33])));
// b1e7cc V_CVT_I32_F32
if(ex)v[31]=uint(int(uintBitsToFloat(v[2])));
// b1e7d0 V_SAD_U32
if(ex)v[11]=(uint(abs(int(8u)-int(0u)))+v[28]);
// b1e7d8 S_BUFFER_LOAD_DWORD
s[4]=floatBitsToUint(U[1][0]);
// b1e7dc V_SUB_F32
if(ex)v[42]=floatBitsToUint((uintBitsToFloat(v[42])-uintBitsToFloat(v[17])));
// b1e7e0 V_INTERP_P1_F32
// b1e7e4 V_MUL_F32
if(ex)v[7]=floatBitsToUint((uintBitsToFloat(v[20])*uintBitsToFloat(v[34])));
// b1e7e8 V_INTERP_P2_F32
if(ex)v[24]=floatBitsToUint(A3[2]);
// b1e7ec V_MAC_F32
if(ex)v[7]=floatBitsToUint((uintBitsToFloat(v[7])+uintBitsToFloat(v[16])*uintBitsToFloat(v[29])));
// b1e7f0 V_MUL_F32
if(ex)v[29]=floatBitsToUint((uintBitsToFloat(v[40])*uintBitsToFloat(v[30])));
// b1e7f4 V_MUL_F32
if(ex)v[16]=floatBitsToUint((uintBitsToFloat(v[13])*uintBitsToFloat(v[22])));
// b1e7f8 V_MUL_F32
if(ex)v[17]=floatBitsToUint((uintBitsToFloat(v[12])*uintBitsToFloat(v[21])));
// b1e7fc V_ADD_I32
if(ex)v[12]=(14u+v[28]);
// b1e800 V_CMP_GE_F32
if(ex)vc=(uintBitsToFloat(v[39])>=uintBitsToFloat(v[18]));
// b1e804 V_CNDMASK_B32
if(ex)v[13]=floatBitsToUint(((vc?1u:0u)!=0u?uintBitsToFloat(0u):uintBitsToFloat(floatBitsToUint(-1.0))));
// b1e80c V_MOV_B32
if(ex)v[28]=1051372202u;
// b1e814 V_MUL_F32
if(ex)v[18]=floatBitsToUint((uintBitsToFloat(v[14])*uintBitsToFloat(v[23])));
// b1e818 V_MOV_B32
if(ex)v[23]=3207244459u;
// b1e820 V_CNDMASK_B32
if(ex)v[14]=floatBitsToUint((vc?uintBitsToFloat(v[28]):uintBitsToFloat(v[23])));
// b1e824 V_ADD_F32
if(ex)v[20]=floatBitsToUint((uintBitsToFloat(v[13])+uintBitsToFloat(v[14])));
// b1e828 V_MOV_B32
if(ex)v[13]=1059760811u;
// b1e830 V_MOV_B32
if(ex)v[14]=3198855850u;
// b1e838 V_CNDMASK_B32
if(ex)v[22]=floatBitsToUint((vc?uintBitsToFloat(v[14]):uintBitsToFloat(v[13])));
// b1e83c S_MOV_B32
vcBits=1051372203u;vc=(vcBits!=0u);
// b1e844 V_MAC_F32
if(ex)v[22]=floatBitsToUint((uintBitsToFloat(v[22])+uintBitsToFloat(v[20])*uintBitsToFloat(v[19])));
// b1e848 V_CVT_F32_I32
if(ex)v[19]=floatBitsToUint(float(int(6u)));
// b1e84c V_MADAK_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[41])+uintBitsToFloat(786163455u)));
// b1e854 V_RCP_F32
if(ex)v[21]=floatBitsToUint((1./uintBitsToFloat(v[21])));
// b1e858 V_MAD_F32
if(ex)v[20]=floatBitsToUint((uintBitsToFloat(v[21])*uintBitsToFloat(v[42])+uintBitsToFloat(v[22])));
// b1e860 V_ADD_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(vcBits)+abs(uintBitsToFloat(v[20]))));
// b1e868 S_MOV_B32
vcBits=1059760811u;vc=(vcBits!=0u);
// b1e870 V_FRACT_F32
if(ex)v[21]=floatBitsToUint(fract(uintBitsToFloat(v[21])));
// b1e874 V_MADAK_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[21])+uintBitsToFloat(3225419776u)));
// b1e87c V_ADD_F32
if(ex)v[21]=floatBitsToUint(clamp((uintBitsToFloat(floatBitsToUint(-1.0))+abs(uintBitsToFloat(v[21]))),0.,1.));
// b1e884 V_ADD_F32
if(ex)v[22]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(-1.0))+uintBitsToFloat(v[21])));
// b1e888 V_ADD_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(vcBits)+abs(uintBitsToFloat(v[20]))));
// b1e890 V_FRACT_F32
if(ex)v[21]=floatBitsToUint(fract(uintBitsToFloat(v[21])));
// b1e894 V_ADD_F32
if(ex)v[20]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(1.0))+abs(uintBitsToFloat(v[20]))));
// b1e89c V_MADAK_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[21])+uintBitsToFloat(3225419776u)));
// b1e8a4 V_FRACT_F32
if(ex)v[20]=floatBitsToUint(fract(uintBitsToFloat(v[20])));
// b1e8a8 V_ADD_F32
if(ex)v[21]=floatBitsToUint(clamp((uintBitsToFloat(floatBitsToUint(-1.0))+abs(uintBitsToFloat(v[21]))),0.,1.));
// b1e8b0 V_MADAK_F32
if(ex)v[20]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[20])+uintBitsToFloat(3225419776u)));
// b1e8b8 V_ADD_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(-1.0))+uintBitsToFloat(v[21])));
// b1e8bc V_ADD_F32
if(ex)v[20]=floatBitsToUint(clamp((uintBitsToFloat(floatBitsToUint(-1.0))+abs(uintBitsToFloat(v[20]))),0.,1.));
// b1e8c4 V_ADD_F32
if(ex)v[34]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(-1.0))+uintBitsToFloat(v[20])));
// b1e8c8 V_MAD_F32
if(ex)v[20]=floatBitsToUint((uintBitsToFloat(v[29])*uintBitsToFloat(v[21])+uintBitsToFloat(v[30])));
// b1e8d0 V_MAD_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(v[29])*uintBitsToFloat(v[34])+uintBitsToFloat(v[30])));
// b1e8d8 V_MAD_F32
if(ex)v[22]=floatBitsToUint((uintBitsToFloat(v[29])*uintBitsToFloat(v[22])+uintBitsToFloat(v[30])));
// b1e8e0 V_MUL_F32
if(ex)v[29]=floatBitsToUint((uintBitsToFloat(v[27])*uintBitsToFloat(v[27])));
// b1e8e4 V_MAC_F32
if(ex)v[29]=floatBitsToUint((uintBitsToFloat(v[29])+uintBitsToFloat(v[25])*uintBitsToFloat(v[25])));
// b1e8e8 V_MAC_F32
if(ex)v[29]=floatBitsToUint((uintBitsToFloat(v[29])+uintBitsToFloat(v[26])*uintBitsToFloat(v[26])));
// b1e8ec V_RSQ_F32
if(ex)v[29]=floatBitsToUint(inversesqrt(uintBitsToFloat(v[29])));
// b1e8f0 V_MUL_F32
if(ex)v[27]=floatBitsToUint((uintBitsToFloat(v[27])*uintBitsToFloat(v[29])));
// b1e8f4 V_MUL_F32
if(ex)v[25]=floatBitsToUint((uintBitsToFloat(v[25])*uintBitsToFloat(v[29])));
// b1e8f8 V_MUL_F32
if(ex)v[30]=floatBitsToUint((uintBitsToFloat(v[35])*uintBitsToFloat(v[27])));
// b1e8fc V_INTERP_P1_F32
// b1e900 V_INTERP_P2_F32
if(ex)v[27]=floatBitsToUint(A2[2]);
// b1e904 V_CMP_GE_F32
if(ex)vc=(uintBitsToFloat(v[32])>=uintBitsToFloat(v[27]));
// b1e908 V_MUL_F32
if(ex)v[26]=floatBitsToUint((uintBitsToFloat(v[29])*-uintBitsToFloat(v[26])));
// b1e910 V_MAC_F32
if(ex)v[30]=floatBitsToUint((uintBitsToFloat(v[30])+uintBitsToFloat(v[25])*uintBitsToFloat(v[36])));
// b1e914 V_MUL_F32
if(ex)v[25]=floatBitsToUint((uintBitsToFloat(v[35])*uintBitsToFloat(v[35])));
// b1e918 V_MAC_F32
if(ex)v[25]=floatBitsToUint((uintBitsToFloat(v[25])+uintBitsToFloat(v[36])*uintBitsToFloat(v[36])));
// b1e91c V_MAC_F32
if(ex)v[25]=floatBitsToUint((uintBitsToFloat(v[25])+uintBitsToFloat(v[37])*uintBitsToFloat(v[37])));
// b1e920 V_CNDMASK_B32
if(ex)v[23]=floatBitsToUint((vc?uintBitsToFloat(v[28]):uintBitsToFloat(v[23])));
// b1e924 V_CNDMASK_B32
if(ex)v[28]=floatBitsToUint(((vc?1u:0u)!=0u?uintBitsToFloat(floatBitsToUint(1.0)):uintBitsToFloat(0u)));
// b1e92c V_MAC_F32
if(ex)v[30]=floatBitsToUint((uintBitsToFloat(v[30])+uintBitsToFloat(v[26])*uintBitsToFloat(v[37])));
// b1e930 V_RSQ_F32
if(ex)v[26]=floatBitsToUint(inversesqrt(uintBitsToFloat(v[25])));
// b1e934 V_CNDMASK_B32
if(ex)v[25]=floatBitsToUint(((vc?1u:0u)!=0u?uintBitsToFloat(0u):uintBitsToFloat(floatBitsToUint(-1.0))));
// b1e93c V_ADD_F32
if(ex)v[23]=floatBitsToUint((uintBitsToFloat(v[25])+uintBitsToFloat(v[23])));
// b1e940 V_MUL_F32
if(ex)v[26]=floatBitsToUint((-uintBitsToFloat(v[26])*uintBitsToFloat(v[30])));
// b1e948 V_MAX_F32
if(ex)v[30]=floatBitsToUint(max(uintBitsToFloat(0u),uintBitsToFloat(v[26])));
// b1e94c V_AND_B32
if(ex)v[25]=(255u&v[31]);
// b1e954 V_MUL_I32_I24
if(ex)v[26]=(4u*v[25]);
// b1e958 V_CNDMASK_B32
if(ex)v[31]=floatBitsToUint((vc?uintBitsToFloat(v[14]):uintBitsToFloat(v[13])));
// b1e95c V_SUB_F32
if(ex)v[13]=floatBitsToUint((uintBitsToFloat(v[32])-uintBitsToFloat(v[27])));
// b1e960 V_MAD_F32
if(ex)v[33]=floatBitsToUint((uintBitsToFloat(v[28])*uintBitsToFloat(v[13])+uintBitsToFloat(v[27])));
// b1e968 V_SUB_F32
if(ex)v[14]=floatBitsToUint((uintBitsToFloat(v[27])-uintBitsToFloat(v[32])));
// b1e96c V_MAC_F32
if(ex)v[32]=floatBitsToUint((uintBitsToFloat(v[32])+uintBitsToFloat(v[14])*uintBitsToFloat(v[28])));
// b1e970 V_INTERP_P1_F32
// b1e974 V_INTERP_P2_F32
if(ex)v[28]=floatBitsToUint(A2[0]);
// b1e978 V_CMP_GE_F32
if(ex)vc=(uintBitsToFloat(v[28])>=uintBitsToFloat(v[33]));
// b1e97c V_CNDMASK_B32
if(ex)v[1]=floatBitsToUint(((vc?1u:0u)!=0u?uintBitsToFloat(floatBitsToUint(1.0)):uintBitsToFloat(0u)));
// b1e984 V_MAC_F32
if(ex)v[31]=floatBitsToUint((uintBitsToFloat(v[31])+uintBitsToFloat(v[23])*uintBitsToFloat(v[1])));
// b1e988 V_SUB_F32
if(ex)v[23]=floatBitsToUint((uintBitsToFloat(v[33])-uintBitsToFloat(v[28])));
// b1e98c S_WAITCNT
// b1e990 V_ADD_F32
if(ex)v[25]=floatBitsToUint((uintBitsToFloat(s[4])+uintBitsToFloat(v[3])));
// b1e994 S_MOV_B32
vcBits=1092616192u;vc=(vcBits!=0u);
// b1e99c V_LOG_F32
if(ex)v[27]=floatBitsToUint(log2(uintBitsToFloat(v[30])));
// b1e9a0 V_MAD_F32
if(ex)v[30]=floatBitsToUint((uintBitsToFloat(v[1])*uintBitsToFloat(v[23])+uintBitsToFloat(v[28])));
// b1e9a8 V_SUB_F32
if(ex)v[23]=floatBitsToUint((uintBitsToFloat(v[28])-uintBitsToFloat(v[33])));
// b1e9ac V_MIN_F32
if(ex)v[28]=floatBitsToUint(min(uintBitsToFloat(v[32]),uintBitsToFloat(v[30])));
// b1e9b0 V_MAC_F32
if(ex)v[33]=floatBitsToUint((uintBitsToFloat(v[33])+uintBitsToFloat(v[23])*uintBitsToFloat(v[1])));
// b1e9b4 V_SUB_F32
if(ex)v[29]=floatBitsToUint((uintBitsToFloat(v[33])-uintBitsToFloat(v[28])));
// b1e9b8 V_MADAK_F32
if(ex)v[13]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[29])+uintBitsToFloat(786163455u)));
// b1e9c0 V_RCP_F32
if(ex)v[13]=floatBitsToUint((1./uintBitsToFloat(v[13])));
// b1e9c4 V_SUB_F32
if(ex)v[1]=floatBitsToUint((uintBitsToFloat(v[30])-uintBitsToFloat(v[32])));
// b1e9c8 V_ADD_F32
if(ex)v[30]=floatBitsToUint((uintBitsToFloat(786163455u)+uintBitsToFloat(v[33])));
// b1e9d0 V_RCP_F32
if(ex)v[30]=floatBitsToUint((1./uintBitsToFloat(v[30])));
// b1e9d4 V_MAD_F32
if(ex)v[28]=floatBitsToUint((uintBitsToFloat(v[13])*uintBitsToFloat(v[1])+uintBitsToFloat(v[31])));
// b1e9dc TBUFFER_LOAD_FORMAT_XY
{ int idx=int(v[12]);
if(ex)v[0]=floatBitsToUint(U[idx][0]);
if(ex)v[1]=floatBitsToUint(U[idx][1]);
}
// b1e9e4 TBUFFER_LOAD_FORMAT_XYZW
{ int idx=int(v[11]);
if(ex)v[11]=floatBitsToUint(U[idx][0]);
if(ex)v[12]=floatBitsToUint(U[idx][1]);
if(ex)v[13]=floatBitsToUint(U[idx][2]);
if(ex)v[14]=floatBitsToUint(U[idx][3]);
}
// b1e9ec S_GETPC_B64
// b1e9f0 S_ADD_U32
// b1e9f8 S_ADDC_U32
// b1e9fc S_MOV_B32
s[3]=536920068u;
// b1ea04 S_MOVK_I32
// b1ea08 V_MUL_F32
if(ex)v[31]=floatBitsToUint((uintBitsToFloat(v[30])*uintBitsToFloat(v[29])));
// b1ea0c V_CVT_I32_F32
if(ex)v[29]=uint(int(uintBitsToFloat(v[3])));
// b1ea10 V_AND_B32
if(ex)v[29]=(255u&v[29]);
// b1ea18 V_MUL_I32_I24
if(ex)v[30]=(4u*v[29]);
// b1ea1c TBUFFER_LOAD_FORMAT_X
{ int idx=int(v[26]);
if(ex)v[29]=floatBitsToUint(noiseTable[(idx/4)&255]);
}
// b1ea24 TBUFFER_LOAD_FORMAT_X
{ int idx=int(v[30]);
if(ex)v[30]=floatBitsToUint(noiseTable[(idx/4)&255]);
}
// b1ea2c V_MUL_F32
if(ex)v[26]=floatBitsToUint((uintBitsToFloat(v[33])*uintBitsToFloat(v[31])));
// b1ea30 V_ADD_F32
if(ex)v[31]=floatBitsToUint((uintBitsToFloat(s[4])+uintBitsToFloat(v[2])));
// b1ea34 S_WAITCNT
// b1ea38 V_ADD_F32
if(ex)v[28]=floatBitsToUint((abs(uintBitsToFloat(v[28]))+uintBitsToFloat(v[1])));
// b1ea40 S_WAITCNT
// b1ea44 V_MAD_F32
if(ex)v[1]=floatBitsToUint((uintBitsToFloat(vcBits)*uintBitsToFloat(v[11])+uintBitsToFloat(floatBitsToUint(2.0))));
// b1ea4c V_MUL_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(s[7])*uintBitsToFloat(v[14])));
// b1ea50 V_MUL_F32
if(ex)v[24]=floatBitsToUint((uintBitsToFloat(v[11])*uintBitsToFloat(v[24])));
// b1ea54 V_EXP_F32
if(ex)v[1]=floatBitsToUint(exp2(uintBitsToFloat(v[1])));
// b1ea58 V_MUL_F32
if(ex)v[1]=floatBitsToUint((uintBitsToFloat(v[1])*uintBitsToFloat(v[27])));
// b1ea5c V_EXP_F32
if(ex)v[1]=floatBitsToUint(exp2(uintBitsToFloat(v[1])));
// b1ea60 V_MUL_F32
if(ex)v[23]=floatBitsToUint((uintBitsToFloat(v[13])*uintBitsToFloat(v[20])));
// b1ea64 S_WAITCNT
// b1ea68 V_MAC_F32
if(ex)v[3]=floatBitsToUint((uintBitsToFloat(v[3])+uintBitsToFloat(v[31])*uintBitsToFloat(v[29])));
// b1ea6c S_WAITCNT
// b1ea70 V_MAC_F32
if(ex)v[2]=floatBitsToUint((uintBitsToFloat(v[2])+uintBitsToFloat(v[25])*uintBitsToFloat(v[30])));
// b1ea74 V_CVT_I32_F32
if(ex)v[3]=uint(int(uintBitsToFloat(v[3])));
// b1ea78 V_CVT_I32_F32
if(ex)v[2]=uint(int(uintBitsToFloat(v[2])));
// b1ea7c V_AND_B32
if(ex)v[3]=(255u&v[3]);
// b1ea84 V_AND_B32
if(ex)v[2]=(255u&v[2]);
// b1ea8c V_MUL_I32_I24
if(ex)v[3]=(4u*v[3]);
// b1ea90 V_MUL_I32_I24
if(ex)v[2]=(4u*v[2]);
// b1ea94 V_MUL_F32
if(ex)v[27]=floatBitsToUint((uintBitsToFloat(v[12])*uintBitsToFloat(v[1])));
// b1ea98 TBUFFER_LOAD_FORMAT_X
{ int idx=int(v[3]);
if(ex)v[3]=floatBitsToUint(noiseTable[(idx/4)&255]);
}
// b1eaa0 TBUFFER_LOAD_FORMAT_X
{ int idx=int(v[2]);
if(ex)v[12]=floatBitsToUint(noiseTable[(idx/4)&255]);
}
// b1eaa8 V_MUL_F32
if(ex)v[2]=floatBitsToUint((uintBitsToFloat(v[24])*uintBitsToFloat(v[7])));
// b1eaac V_RCP_F32
if(ex)v[20]=floatBitsToUint((1./uintBitsToFloat(v[2])));
// b1eab0 V_MUL_F32
if(ex)v[15]=floatBitsToUint((uintBitsToFloat(v[15])*uintBitsToFloat(v[20])));
// b1eab4 V_FRACT_F32
if(ex)v[20]=floatBitsToUint(fract(uintBitsToFloat(v[28])));
// b1eab8 V_ADD_F32
if(ex)v[14]=floatBitsToUint((uintBitsToFloat(1051372203u)+uintBitsToFloat(v[20])));
// b1eac0 V_FRACT_F32
if(ex)v[14]=floatBitsToUint(fract(uintBitsToFloat(v[14])));
// b1eac4 V_MADAK_F32
if(ex)v[14]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[14])+uintBitsToFloat(3225419776u)));
// b1eacc V_MUL_F32
if(ex)v[32]=floatBitsToUint((uintBitsToFloat(v[13])*uintBitsToFloat(v[21])));
// b1ead0 V_ADD_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(1059760811u)+uintBitsToFloat(v[20])));
// b1ead8 V_ADD_F32
if(ex)v[20]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(1.0))+uintBitsToFloat(v[20])));
// b1eadc V_FRACT_F32
if(ex)v[21]=floatBitsToUint(fract(uintBitsToFloat(v[21])));
// b1eae0 V_FRACT_F32
if(ex)v[20]=floatBitsToUint(fract(uintBitsToFloat(v[20])));
// b1eae4 V_MADAK_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[21])+uintBitsToFloat(3225419776u)));
// b1eaec V_MADAK_F32
if(ex)v[20]=floatBitsToUint((uintBitsToFloat(v[19])*uintBitsToFloat(v[20])+uintBitsToFloat(3225419776u)));
// b1eaf4 V_ADD_F32
if(ex)v[21]=floatBitsToUint(clamp((uintBitsToFloat(floatBitsToUint(-1.0))+abs(uintBitsToFloat(v[21]))),0.,1.));
// b1eafc V_ADD_F32
if(ex)v[19]=floatBitsToUint(clamp((uintBitsToFloat(floatBitsToUint(-1.0))+abs(uintBitsToFloat(v[20]))),0.,1.));
// b1eb04 V_ADD_F32
if(ex)v[20]=floatBitsToUint(clamp((uintBitsToFloat(floatBitsToUint(-1.0))+abs(uintBitsToFloat(v[14]))),0.,1.));
// b1eb0c V_ADD_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(-1.0))+uintBitsToFloat(v[21])));
// b1eb10 V_ADD_F32
if(ex)v[14]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(-1.0))+uintBitsToFloat(v[19])));
// b1eb14 V_ADD_F32
if(ex)v[19]=floatBitsToUint((uintBitsToFloat(floatBitsToUint(-1.0))+uintBitsToFloat(v[20])));
// b1eb18 V_MAD_F32
if(ex)v[21]=floatBitsToUint((uintBitsToFloat(v[26])*uintBitsToFloat(v[21])+uintBitsToFloat(v[33])));
// b1eb20 V_MAD_F32
if(ex)v[19]=floatBitsToUint((uintBitsToFloat(v[26])*uintBitsToFloat(v[19])+uintBitsToFloat(v[33])));
// b1eb28 V_MAC_F32
if(ex)v[33]=floatBitsToUint((uintBitsToFloat(v[33])+uintBitsToFloat(v[14])*uintBitsToFloat(v[26])));
// b1eb2c V_MUL_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(v[13])*uintBitsToFloat(v[22])));
// b1eb30 V_MAC_F32
if(ex)v[9]=floatBitsToUint((uintBitsToFloat(v[9])+uintBitsToFloat(v[21])*uintBitsToFloat(v[0])));
// b1eb34 V_MAC_F32
if(ex)v[8]=floatBitsToUint((uintBitsToFloat(v[8])+uintBitsToFloat(v[33])*uintBitsToFloat(v[0])));
// b1eb38 V_MAC_F32
if(ex)v[10]=floatBitsToUint((uintBitsToFloat(v[10])+uintBitsToFloat(v[19])*uintBitsToFloat(v[0])));
// b1eb3c V_MAX_F32
if(ex)v[13]=floatBitsToUint(clamp(max(uintBitsToFloat(0u),uintBitsToFloat(v[27])),0.,1.));
// b1eb44 V_MAC_F32
if(ex)v[23]=floatBitsToUint((uintBitsToFloat(v[23])+uintBitsToFloat(v[9])*uintBitsToFloat(v[7])));
// b1eb48 V_MAC_F32
if(ex)v[32]=floatBitsToUint((uintBitsToFloat(v[32])+uintBitsToFloat(v[8])*uintBitsToFloat(v[7])));
// b1eb4c V_MAC_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(v[11])+uintBitsToFloat(v[10])*uintBitsToFloat(v[7])));
// b1eb50 V_MAC_F32
if(ex)v[23]=floatBitsToUint((uintBitsToFloat(v[23])+uintBitsToFloat(v[13])*uintBitsToFloat(v[16])));
// b1eb54 V_MAC_F32
if(ex)v[32]=floatBitsToUint((uintBitsToFloat(v[32])+uintBitsToFloat(v[13])*uintBitsToFloat(v[17])));
// b1eb58 V_MAC_F32
if(ex)v[11]=floatBitsToUint((uintBitsToFloat(v[11])+uintBitsToFloat(v[13])*uintBitsToFloat(v[18])));
// b1eb5c S_WAITCNT
// b1eb60 V_ADD_F32
if(ex)v[3]=floatBitsToUint((uintBitsToFloat(v[3])+uintBitsToFloat(v[12])));
// b1eb64 V_MUL_F32
if(ex)v[3]=floatBitsToUint((uintBitsToFloat(v[15])*uintBitsToFloat(v[3])));
// b1eb68 V_MUL_F32
if(ex)v[0]=floatBitsToUint((uintBitsToFloat(989888641u)*uintBitsToFloat(v[3])));
// b1eb70 V_MAD_F32
if(ex)v[1]=floatBitsToUint((uintBitsToFloat(v[5])*uintBitsToFloat(v[23])+uintBitsToFloat(v[0])));
// b1eb78 V_MAD_F32
if(ex)v[5]=floatBitsToUint((uintBitsToFloat(v[6])*uintBitsToFloat(v[11])+uintBitsToFloat(v[0])));
// b1eb80 V_MAC_F32
if(ex)v[0]=floatBitsToUint((uintBitsToFloat(v[0])+uintBitsToFloat(v[32])*uintBitsToFloat(v[4])));
// b1eb84 V_CVT_PKRTZ_F16_F32
rg=halfRTZ2(vec2(uintBitsToFloat(v[0]),uintBitsToFloat(v[1])));
// b1eb88 V_CVT_PKRTZ_F16_F32
ba=halfRTZ2(vec2(uintBitsToFloat(v[5]),uintBitsToFloat(v[2])));
// b1eb8c S_MOV_B64
ex=true;
// b1eb90 EXP
// b1eb98 S_ENDPGM
color=ba.y<=0.?vec4(0.):clamp(vec4(rg,ba),0.,1.);}