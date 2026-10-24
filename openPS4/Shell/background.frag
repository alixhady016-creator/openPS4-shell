#version 300 es
precision highp float;precision highp int;
uniform vec4 U[8];uniform sampler2D ramp;uniform float noiseTable[256];out vec4 color;uint v[20];uint s[64];
float halfRTZ(float x){uint h=packHalf2x16(vec2(x,0.))&65535u;float y=unpackHalf2x16(h).x;if(!isnan(x)&&!isinf(x)&&abs(y)>abs(x))h-=1u;return unpackHalf2x16(h).x;}
vec3 sampleBackgroundRamp(float y){float q=clamp(y,0.,1.)*2160.-.5;int i=int(floor(q));float f=q-float(i);return mix(texelFetch(ramp,ivec2(clamp(i,0,2159),0),0).rgb,texelFetch(ramp,ivec2(clamp(i+1,0,2159),0),0).rgb,f);}
vec2 rg,ba;void main(){v[2]=floatBitsToUint(gl_FragCoord.x);v[3]=floatBitsToUint(U[7].w-gl_FragCoord.y);
// b20274 S_MOV_B32
// b2027c S_MOV_B32
// b20284 S_TTRACEDATA
// b20288 S_BUFFER_LOAD_DWORDX16
s[4]=floatBitsToUint(U[0][0]);
s[5]=floatBitsToUint(U[0][1]);
s[6]=floatBitsToUint(U[0][2]);
s[7]=floatBitsToUint(U[0][3]);
s[8]=floatBitsToUint(U[1][0]);
s[9]=floatBitsToUint(U[1][1]);
s[10]=floatBitsToUint(U[1][2]);
s[11]=floatBitsToUint(U[1][3]);
s[12]=floatBitsToUint(U[2][0]);
s[13]=floatBitsToUint(U[2][1]);
s[14]=floatBitsToUint(U[2][2]);
s[15]=floatBitsToUint(U[2][3]);
s[16]=floatBitsToUint(U[3][0]);
s[17]=floatBitsToUint(U[3][1]);
s[18]=floatBitsToUint(U[3][2]);
s[19]=floatBitsToUint(U[3][3]);
// b2028c S_BUFFER_LOAD_DWORDX16
s[20]=floatBitsToUint(U[4][0]);
s[21]=floatBitsToUint(U[4][1]);
s[22]=floatBitsToUint(U[4][2]);
s[23]=floatBitsToUint(U[4][3]);
s[24]=floatBitsToUint(U[5][0]);
s[25]=floatBitsToUint(U[5][1]);
s[26]=floatBitsToUint(U[5][2]);
s[27]=floatBitsToUint(U[5][3]);
s[28]=floatBitsToUint(U[6][0]);
s[29]=floatBitsToUint(U[6][1]);
s[30]=floatBitsToUint(U[6][2]);
s[31]=floatBitsToUint(U[6][3]);
s[32]=floatBitsToUint(U[7][0]);
s[33]=floatBitsToUint(U[7][1]);
s[34]=floatBitsToUint(U[7][2]);
s[35]=floatBitsToUint(U[7][3]);
// b20290 S_GETPC_B64
// b20294 S_ADD_U32
// b2029c S_ADDC_U32
// b202a0 S_MOV_B32
// b202a8 S_MOVK_I32
// b202ac S_MOV_B64
// b202b0 S_WQM_B64
// b202b4 S_WAITCNT
// b202b8 V_MUL_F32
v[0]=floatBitsToUint(clamp((uintBitsToFloat(s[4])*uintBitsToFloat(v[2])),0.,1.));
// b202c0 V_ADD_F32
v[9]=floatBitsToUint(uintBitsToFloat(floatBitsToUint(-0.5))+uintBitsToFloat(v[0]));
// b202c4 V_MUL_F32
v[4]=floatBitsToUint(clamp((uintBitsToFloat(s[5])*uintBitsToFloat(v[3])),0.,1.));
// b202cc V_MOV_B32
v[1]=s[20];
// b202d0 V_ADD_F32
v[8]=floatBitsToUint(uintBitsToFloat(floatBitsToUint(-0.5))+uintBitsToFloat(v[4]));
// b202d4 V_MAD_F32
v[1]=floatBitsToUint(uintBitsToFloat(s[8])*uintBitsToFloat(v[9])+-uintBitsToFloat(v[1]));
// b202dc V_MOV_B32
v[0]=s[21];
// b202e0 V_MUL_F32
v[1]=floatBitsToUint(uintBitsToFloat(v[1])*uintBitsToFloat(v[1]));
// b202e4 V_MAD_F32
v[0]=floatBitsToUint(uintBitsToFloat(s[9])*uintBitsToFloat(v[8])+-uintBitsToFloat(v[0]));
// b202ec V_MAC_F32
v[1]=floatBitsToUint(uintBitsToFloat(v[1])+uintBitsToFloat(v[0])*uintBitsToFloat(v[0]));
// b202f0 V_SQRT_F32
v[0]=floatBitsToUint(sqrt(uintBitsToFloat(v[1])));
// b202f4 V_MUL_F32
v[0]=floatBitsToUint(uintBitsToFloat(s[8])*uintBitsToFloat(v[0]));
// b202f8 V_CVT_I32_F32
v[0]=uint(int(uintBitsToFloat(v[0])));
// b202fc V_AND_B32
v[0]=255u&v[0];
// b20304 V_MUL_I32_I24
v[0]=4u*v[0];
// b20308 TBUFFER_LOAD_FORMAT_X
v[0]=floatBitsToUint(noiseTable[(int(v[0])/4)&255]);
// b20310 V_ADD_F32
v[7]=floatBitsToUint(uintBitsToFloat(s[22])+uintBitsToFloat(v[3]));
// b20314 V_ADD_F32
v[1]=floatBitsToUint(uintBitsToFloat(s[22])+uintBitsToFloat(v[2]));
// b20318 IMAGE_SAMPLE
vec3 sampleRGB=sampleBackgroundRamp(uintBitsToFloat(v[4]));v[4]=floatBitsToUint(sampleRGB.r);v[5]=floatBitsToUint(sampleRGB.g);v[6]=floatBitsToUint(sampleRGB.b);
// b20320 V_MOV_B32
v[12]=s[16];
// b20324 V_MAD_F32
v[12]=floatBitsToUint(uintBitsToFloat(s[8])*uintBitsToFloat(v[9])+-uintBitsToFloat(v[12]));
// b2032c V_MOV_B32
v[10]=s[17];
// b20330 V_MUL_F32
v[14]=floatBitsToUint(uintBitsToFloat(v[12])*uintBitsToFloat(v[12]));
// b20334 V_MAD_F32
v[10]=floatBitsToUint(uintBitsToFloat(s[9])*uintBitsToFloat(v[8])+-uintBitsToFloat(v[10]));
// b2033c V_MOV_B32
v[13]=s[18];
// b20340 V_SUB_F32
v[11]=floatBitsToUint(uintBitsToFloat(s[10])-uintBitsToFloat(v[13]));
// b20344 V_MAC_F32
v[14]=floatBitsToUint(uintBitsToFloat(v[14])+uintBitsToFloat(v[10])*uintBitsToFloat(v[10]));
// b20348 V_MAC_F32
v[14]=floatBitsToUint(uintBitsToFloat(v[14])+uintBitsToFloat(v[11])*uintBitsToFloat(v[11]));
// b2034c V_RSQ_F32
v[13]=floatBitsToUint(inversesqrt(uintBitsToFloat(v[14])));
// b20350 V_MUL_F32
v[14]=floatBitsToUint(uintBitsToFloat(s[8])*uintBitsToFloat(v[9]));
// b20354 V_MUL_F32
v[9]=floatBitsToUint(uintBitsToFloat(v[13])*uintBitsToFloat(v[12]));
// b20358 V_MUL_F32
v[12]=floatBitsToUint(uintBitsToFloat(s[9])*uintBitsToFloat(v[8]));
// b2035c V_MUL_F32
v[15]=floatBitsToUint(uintBitsToFloat(v[14])*uintBitsToFloat(v[14]));
// b20360 V_MUL_F32
v[14]=floatBitsToUint(uintBitsToFloat(v[14])*uintBitsToFloat(v[9]));
// b20364 V_MUL_F32
v[8]=floatBitsToUint(uintBitsToFloat(v[13])*uintBitsToFloat(v[10]));
// b20368 V_MUL_F32
v[10]=floatBitsToUint(uintBitsToFloat(v[13])*uintBitsToFloat(v[11]));
// b2036c V_MUL_F32
v[13]=floatBitsToUint(uintBitsToFloat(v[9])*uintBitsToFloat(v[9]));
// b20370 V_MAC_F32
v[15]=floatBitsToUint(uintBitsToFloat(v[15])+uintBitsToFloat(v[12])*uintBitsToFloat(v[12]));
// b20374 V_MAD_F32
v[15]=floatBitsToUint(uintBitsToFloat(s[10])*uintBitsToFloat(s[10])+uintBitsToFloat(v[15]));
// b2037c V_MAC_F32
v[14]=floatBitsToUint(uintBitsToFloat(v[14])+uintBitsToFloat(v[8])*uintBitsToFloat(v[12]));
// b20380 V_MAC_F32
v[10]=floatBitsToUint(uintBitsToFloat(v[10])+uintBitsToFloat(floatBitsToUint(-2.0))*uintBitsToFloat(v[10]));
// b20384 V_MAC_F32
v[13]=floatBitsToUint(uintBitsToFloat(v[13])+uintBitsToFloat(v[8])*uintBitsToFloat(v[8]));
// b20388 V_RSQ_F32
v[11]=floatBitsToUint(inversesqrt(uintBitsToFloat(v[15])));
// b2038c V_MAC_F32
v[14]=floatBitsToUint(uintBitsToFloat(v[14])+uintBitsToFloat(s[10])*uintBitsToFloat(v[10]));
// b20390 V_MAC_F32
v[13]=floatBitsToUint(uintBitsToFloat(v[13])+uintBitsToFloat(v[10])*uintBitsToFloat(v[10]));
// b20394 V_MUL_F32
v[9]=floatBitsToUint(uintBitsToFloat(v[11])*uintBitsToFloat(v[14]));
// b20398 V_RSQ_F32
v[8]=floatBitsToUint(inversesqrt(uintBitsToFloat(v[13])));
// b2039c V_MUL_F32
v[9]=floatBitsToUint(-uintBitsToFloat(v[8])*uintBitsToFloat(v[9]));
// b203a4 V_CVT_F32_I32
v[8]=floatBitsToUint(float(int(10u)));
// b203a8 V_MAX_F32
v[9]=floatBitsToUint(max(uintBitsToFloat(0u),uintBitsToFloat(v[9])));
// b203ac V_MAD_F32
v[8]=floatBitsToUint(uintBitsToFloat(v[8])*uintBitsToFloat(s[15])+uintBitsToFloat(floatBitsToUint(2.0)));
// b203b4 V_LOG_F32
v[9]=floatBitsToUint(log2(uintBitsToFloat(v[9])));
// b203b8 V_EXP_F32
v[8]=floatBitsToUint(exp2(uintBitsToFloat(v[8])));
// b203bc V_MUL_F32
v[8]=floatBitsToUint(uintBitsToFloat(v[8])*uintBitsToFloat(v[9]));
// b203c0 V_EXP_F32
v[8]=floatBitsToUint(exp2(uintBitsToFloat(v[8])));
// b203c4 V_MUL_F32
v[8]=floatBitsToUint(uintBitsToFloat(s[19])*uintBitsToFloat(v[8]));
// b203c8 V_MAX_F32
v[8]=floatBitsToUint(clamp((max(uintBitsToFloat(0u),uintBitsToFloat(v[8]))),0.,1.));
// b203d0 S_WAITCNT
// b203d4 V_MAC_F32
v[7]=floatBitsToUint(uintBitsToFloat(v[7])+uintBitsToFloat(v[2])*uintBitsToFloat(v[0]));
// b203d8 V_MAD_F32
v[0]=floatBitsToUint(uintBitsToFloat(v[0])*uintBitsToFloat(v[3])+uintBitsToFloat(v[1]));
// b203e0 V_CVT_I32_F32
v[1]=uint(int(uintBitsToFloat(v[7])));
// b203e4 V_CVT_I32_F32
v[0]=uint(int(uintBitsToFloat(v[0])));
// b203e8 V_AND_B32
v[1]=255u&v[1];
// b203f0 V_AND_B32
v[0]=255u&v[0];
// b203f8 V_MUL_I32_I24
v[1]=4u*v[1];
// b203fc V_MUL_I32_I24
v[2]=4u*v[0];
// b20400 TBUFFER_LOAD_FORMAT_X
v[0]=floatBitsToUint(noiseTable[(int(v[1])/4)&255]);
// b20408 TBUFFER_LOAD_FORMAT_X
v[3]=floatBitsToUint(noiseTable[(int(v[2])/4)&255]);
// b20410 S_WAITCNT
// b20414 V_MAD_F32
v[2]=floatBitsToUint(uintBitsToFloat(s[12])*uintBitsToFloat(v[8])+uintBitsToFloat(v[4]));
// b2041c V_MAD_F32
v[4]=floatBitsToUint(uintBitsToFloat(s[14])*uintBitsToFloat(v[8])+uintBitsToFloat(v[6]));
// b20424 V_MAC_F32
v[5]=floatBitsToUint(uintBitsToFloat(v[5])+uintBitsToFloat(s[13])*uintBitsToFloat(v[8]));
// b20428 S_WAITCNT
// b2042c V_ADD_F32
v[0]=floatBitsToUint(uintBitsToFloat(v[0])+uintBitsToFloat(v[3]));
// b20430 V_MUL_F32
v[0]=floatBitsToUint(uintBitsToFloat(s[6])*uintBitsToFloat(v[0]));
// b20434 V_MADMK_F32
v[1]=floatBitsToUint(uintBitsToFloat(v[0])*uintBitsToFloat(989888641u)+uintBitsToFloat(v[5]));
// b2043c V_MADMK_F32
v[2]=floatBitsToUint(uintBitsToFloat(v[0])*uintBitsToFloat(989888641u)+uintBitsToFloat(v[2]));
// b20444 V_MADMK_F32
v[0]=floatBitsToUint(uintBitsToFloat(v[0])*uintBitsToFloat(989888641u)+uintBitsToFloat(v[4]));
// b2044c V_MUL_F32
v[1]=floatBitsToUint(uintBitsToFloat(s[23])*uintBitsToFloat(v[1]));
// b20450 V_MUL_F32
v[2]=floatBitsToUint(uintBitsToFloat(s[23])*uintBitsToFloat(v[2]));
// b20454 V_MUL_F32
v[0]=floatBitsToUint(uintBitsToFloat(s[23])*uintBitsToFloat(v[0]));
// b20458 V_CVT_PKRTZ_F16_F32
rg=vec2(halfRTZ(uintBitsToFloat(v[2])),halfRTZ(uintBitsToFloat(v[1])));
// b2045c V_CVT_PKRTZ_F16_F32
ba=vec2(halfRTZ(uintBitsToFloat(v[0])),halfRTZ(uintBitsToFloat(s[23])));
// b20464 S_MOV_B64
// b20468 EXP
// b20470 S_ENDPGM
color=vec4(rg,ba);}