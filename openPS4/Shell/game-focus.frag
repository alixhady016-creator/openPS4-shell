// Firmware PUI LineFocusWidget nonrounded shader, focus_frame_2_p.sb.
// This stock-theme path uses no edge fade, white vertices and transparent glow.
precision highp float;
uniform vec2 size;
uniform vec4 bands;
uniform float lineAlpha;
uniform float opacity;
varying vec2 pixel;
float knot(float p,float n){return p<32.0?p/64.0:p>n-32.0?0.5+(p-(n-32.0))/64.0:0.5;}
float sharp(float d,float m,float h){return clamp(min(0.5,h)+h-abs(d-m),0.0,1.0);}
void main(){
 if(pixel.x>=32.0&&pixel.x<size.x-32.0&&pixel.y>=32.0&&pixel.y<size.y-32.0)discard;
 vec2 uv=vec2(knot(pixel.x,size.x),knot(pixel.y,size.y));
 vec2 delta=64.0*abs(uv-0.5);float d=max(delta.x,delta.y);
 float cover=max(sharp(d,bands.x,bands.y),sharp(d,bands.z,bands.w));
 float a=cover*lineAlpha*opacity;
 // Original V_CVT_PKRTZ_F16_F32 export: round positive alpha toward zero.
 float stepSize=exp2(max(-24.0,floor(log2(max(a,exp2(-24.0))))-10.0));
 a=floor(a/stepSize)*stepSize;
 gl_FragColor=vec4(1.0,1.0,1.0,a);
}


