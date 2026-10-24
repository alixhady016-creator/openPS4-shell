#version 300 es
precision highp float;
uniform sampler2D iconTexture;
uniform sampler2D alphaMap;
uniform float bgAlpha;
uniform float mapRate;
uniform float aaRatio;
in vec2 uv;
out vec4 color;
// Original function_focus_p.sb 0x0508..0x05ac. The settled selected icon
// is 128x128, matching both original textures: this is the LOD<=.2 branch.
void main(){
  vec4 texel=texture(iconTexture,uv);
  float mask=texture(alphaMap,uv).a;
  float delta=mask-mapRate;
  float factor=1.;
  if(mask<mapRate){
    factor=bgAlpha;
    if(delta > -aaRatio)factor=1.+delta/aaRatio*(1.-bgAlpha);
  }
  color=vec4(texel.rgb,texel.a*factor);
}
