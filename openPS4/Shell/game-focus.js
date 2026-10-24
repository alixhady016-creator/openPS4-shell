import {FocusMotion,bandUniforms} from './game-motion.js';
const vertex=`attribute vec2 corner;uniform vec4 rect;uniform vec2 resolution;varying vec2 pixel;void main(){pixel=corner*rect.zw;vec2 p=rect.xy+pixel;gl_Position=vec4(p.x/resolution.x*2.0-1.0,1.0-p.y/resolution.y*2.0,0.0,1.0);}`;
// One transparent surface for all outgoing/current frames; the surface inherits
// the game's parent camera transform. No CSS box shadow or texture approximation.
export class GameFocus {
 static async create(parent){const source=await fetch('game-focus.frag').then(r=>r.text());return new GameFocus(parent,source);}
 constructor(parent,source){
  this.canvas=document.createElement('canvas');this.canvas.width=1920;this.canvas.height=1080;this.canvas.className='firmwareGameFocus';Object.assign(this.canvas.style,{position:'absolute',inset:'0',width:'1920px',height:'1080px',pointerEvents:'none',zIndex:'3'});parent.append(this.canvas);
  const gl=this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:false});if(!gl)throw Error('Game focus requires WebGL');
  const compile=(kind,text)=>{const s=gl.createShader(kind);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,source));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  this.uniforms=Object.fromEntries(['rect','resolution','size','bands','lineAlpha','opacity'].map(k=>[k,gl.getUniformLocation(this.program,k)]));
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(this.program,'corner');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);gl.uniform2f(this.uniforms.resolution,1920,1080);
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);this.motions=new Map();this.selected=-1;
 }
 select(index,now=performance.now(),repeat=false){if(index===this.selected)return;this.motions.get(this.selected)?.hide(now,repeat);this.selected=index;if(index>=0){let motion=this.motions.get(index);if(!motion)this.motions.set(index,motion=new FocusMotion(now));motion.show(now);}}
 press(now=performance.now()){this.motions.get(this.selected)?.press(now);}
 draw(tiles,now=performance.now(),opacity=1){const gl=this.gl,u=this.uniforms;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);
  for(const [index,motion] of this.motions){const tile=tiles[index];if(!tile)continue;const a=motion.step(now)*opacity*(tile.a??1);if(a<=0)continue;const margin=16+(tile.padding??2),w=tile.s+2*margin,h=(tile.height??(tile.s+70*tile.strip))+2*margin;gl.uniform4f(u.rect,tile.x-margin,(tile.y??209)-margin,w,h);gl.uniform2f(u.size,w,h);gl.uniform4fv(u.bands,bandUniforms(motion.value));gl.uniform1f(u.lineAlpha,motion.value.alpha);gl.uniform1f(u.opacity,a);gl.drawArrays(gl.TRIANGLES,0,6);}
 }
}



