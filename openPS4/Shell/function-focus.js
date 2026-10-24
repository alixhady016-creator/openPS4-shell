import {functionSweep} from './function-motion.js';
// One canvas follows the selected icon. The image stays visible until both
// firmware textures have decoded and the original 2.5-second delay has elapsed.
export class FunctionFocus{
  constructor(container){this.container=container;this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=128;Object.assign(this.canvas.style,{position:'absolute',width:'128px',height:'128px',left:'0',top:'0',pointerEvents:'none',display:'none'});this.ready=false;this.generation=0;this.frames=0;this.error=null;}
  async init(){try{
    const gl=this.gl=this.canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false});if(!gl)throw Error('Function focus WebGL2 unavailable');
    const frag=await fetch('function-focus.frag').then(r=>r.text());
    const compile=(kind,source)=>{const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const p=this.program=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,'#version 300 es\nprecision highp float;out vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0.,1.);}'));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);this.loc={};for(const n of ['bgAlpha','mapRate','aaRatio'])this.loc[n]=gl.getUniformLocation(p,n);
    gl.uniform1i(gl.getUniformLocation(p,'iconTexture'),0);gl.uniform1i(gl.getUniformLocation(p,'alphaMap'),1);this.ready=true;
  }catch(e){this.error=String(e);}}
  async select(element,key,now=performance.now()){
    if(element===this.element)return;const generation=++this.generation;
    if(this.element)this.element.querySelector('img').style.visibility='';this.canvas.style.display='none';this.loaded=false;this.element=element;this.key=key;
    if(!element||key==='profile')return; // Dynamic avatar minification path remains separate.
    try{const base=new Image(),map=new Image();base.src=`assets/function-icon-${key}.png`;map.src=`assets/function-map-${key}.png`;await Promise.all([base.decode(),map.decode()]);if(generation!==this.generation||!this.ready)return;
      if(base.naturalWidth!==128||base.naturalHeight!==128||map.naturalWidth!==128||map.naturalHeight!==128)throw Error('Function focus requires original 128px textures');
      const gl=this.gl;[base,map].forEach((image,i)=>{gl.activeTexture(gl.TEXTURE0+i);if(this.textures?.[i])gl.deleteTexture(this.textures[i]);const t=gl.createTexture();(this.textures??=[])[i]=t;gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);});
      element.append(this.canvas);this.start=performance.now();this.loaded=true;
    }catch(e){if(generation===this.generation)this.error=String(e);}
  }
  draw(now=performance.now(),open=1,scale=1){
    const active=this.ready&&this.loaded&&open>=.999&&scale>=.999;
    if(!active){this.canvas.style.display='none';if(this.element)this.element.querySelector('img').style.visibility='';return;}
    const elapsed=(now-this.start)/1000;
    if(elapsed<2.5)return;
    const gl=this.gl,u=functionSweep(elapsed);gl.useProgram(this.program);for(const n of ['bgAlpha','mapRate','aaRatio'])gl.uniform1f(this.loc[n],u[n]);gl.viewport(0,0,128,128);gl.drawArrays(gl.TRIANGLES,0,3);this.element.querySelector('img').style.visibility='hidden';this.canvas.style.display='';this.frames++;
  }
  report(){return {ready:this.ready,loaded:this.loaded,key:this.key,frames:this.frames,error:this.error};}
}
