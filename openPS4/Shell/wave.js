// Native BeginBootupSequence0x9A9C0->0x97300 and update0x9913A.
// Continuous diagnostic limit; production below retains per-frame float32 order.
export function sampleNativeBoot(milliseconds){
  const wait=Math.min(1,Math.max(0,milliseconds)*.0003000000142492354);
  const remaining=Math.max(0,1-Math.max(0,milliseconds-.20000000298023224/.0003000000142492354)*.00020000000949949026);
  const q=Math.max(0,Math.min(1,2*(1-remaining)));
  return {wait,remaining,waveOpacity:q*q*(3-2*q)};
}

// Live local WebGL renderer. Recovered mesh, poses, ramps and shader arithmetic.
// Screen treatment is applied only in the final pass; UI never owns wave state.
export class Wave {
  constructor(canvas, config) { this.canvas=canvas;this.config=config;this.treatment={...config.screens.welcome};this.phase=config.phase;this.frames=0; }
  async init(){
    const gl=this.gl=this.canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});
    if(!gl)throw Error('WebGL 2 is unavailable. Enable hardware acceleration in WebView2.');
    const [meta,bin,bank,bankBin,frag,bgFrag]=await Promise.all([fetch('assets/wave.json').then(r=>r.json()),fetch('assets/wave.bin').then(r=>r.arrayBuffer()),fetch('assets/native-palettes.json').then(r=>r.json()),fetch('assets/native-palettes.bin').then(r=>r.arrayBuffer()),fetch('wave.frag').then(r=>r.text()),fetch('background.frag').then(r=>r.text())]);
    this.meta=meta;this.data={};for(const [k,v] of Object.entries(meta.arrays))this.data[k]=new Float32Array(bin,v.offset,v.count);
    this.linearFloat=gl.getExtension('OES_texture_float_linear');this.paletteBank=bank;
    this.palettes={};for(const [id,record] of Object.entries(bank.records)){const p={backgroundParameters:new Float32Array(record.backgroundParameters)};for(const key of ['ramps','uniforms','backgroundRamp']){const r=record[key];p[key]=new Float32Array(bankBin,r.offset,r.count);}this.palettes[id]=p;}
    this.currentPalette=this.targetPalette=1;this.paletteData=this.palettes[1];
    this.rampTex=this.texture(4320,6,this.paletteData.ramps);this.bgTex=this.texture(2160,1,this.paletteData.backgroundRamp);this.bonesTex=this.texture(4,96,new Float32Array(1536));
    this.waveProgram=this.program(`#version 300 es
precision highp float; precision highp int;
layout(location=0) in vec3 pos;layout(location=1) in vec3 norm;layout(location=2) in vec2 uv;
layout(location=3) in vec4 volume;layout(location=4) in vec2 alphaMaterial;
layout(location=5) in vec4 j0;layout(location=6) in vec4 j1;layout(location=7) in vec3 j2;
layout(location=8) in vec4 w0;layout(location=9) in vec4 w1;layout(location=10) in vec3 w2;
uniform sampler2D bones;uniform mat4 view;uniform float aspect;
out vec4 A0;out vec4 A1;out vec4 A2;out vec4 A3;
mat4 bone(float n){int i=int(n);return mat4(texelFetch(bones,ivec2(0,i),0),texelFetch(bones,ivec2(1,i),0),texelFetch(bones,ivec2(2,i),0),texelFetch(bones,ivec2(3,i),0));}
void main(){mat4 m=bone(j0.x)*w0.x+bone(j0.y)*w0.y+bone(j0.z)*w0.z+bone(j0.w)*w0.w+bone(j1.x)*w1.x+bone(j1.y)*w1.y+bone(j1.z)*w1.z+bone(j1.w)*w1.w+bone(j2.x)*w2.x+bone(j2.y)*w2.y+bone(j2.z)*w2.z;
A0=view*m*vec4(pos,1);A1=vec4(mat3(view)*mat3(m)*norm,alphaMaterial.y);A2=volume;A3=vec4(uv,alphaMaterial.x,0);
float f=1./tan(.7853989005088806/2.);gl_Position=vec4(A0.x*f,A0.y*f*aspect,-(100.1/99.9)*A0.z-(20./99.9),-A0.z);}`,frag);
    this.bgProgram=this.program(this.quadVertex(),bgFrag);
    this.finalProgram=this.program(this.quadVertex(),`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D scene;uniform vec2 resolution;uniform vec4 treatment;
float halfRTZ(float x){uint h=packHalf2x16(vec2(x,0.))&65535u;float y=unpackHalf2x16(h).x;if(!isnan(x)&&!isinf(x)&&abs(y)>abs(x))h-=1u;return unpackHalf2x16(h).x;}
vec3 get(vec2 p){return texture(scene,p).rgb;}float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){vec2 px=1./resolution;float nw=lum(get(uv+vec2(-.5,.5)*px)),ne=lum(get(uv+vec2(.5,.5)*px)),sw=lum(get(uv+vec2(-.5,-.5)*px)),se=lum(get(uv+vec2(.5,-.5)*px)),mid=lum(get(uv));vec2 d=vec2(sw+se-nw-ne,ne+se-nw-sw);float reduce=max((nw+ne+sw+se)*.03125,.007813);d=clamp(d/(min(abs(d.x),abs(d.y))+reduce),-8.,8.)*px;vec3 a=.5*(get(uv-d/6.)+get(uv+d/6.));vec3 b=.5*a+.25*(get(uv-d*.5)+get(uv+d*.5));float lo=min(mid,min(min(nw,ne),min(sw,se))),hi=max(mid,max(max(nw,ne),max(sw,se)));vec3 c=lum(b)>=lo&&lum(b)<hi?b:a;
// Neutral defaults preserve the native result; optional user tuning is separate.
c=vec3(halfRTZ(c.r),halfRTZ(c.g),halfRTZ(c.b));c=mix(vec3(lum(c)),c,treatment.x)*treatment.y;color=vec4(clamp(c,0.,1.)*treatment.w,1.);}`);
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
    const d=this.data;const attr=(loc,a,n)=>{gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,0,0);};
    attr(0,d.positions,3);attr(1,d.normals,3);attr(2,d.uv,2);attr(3,d.volume,4);
    const am=new Float32Array(d.alpha.length*2);d.alpha.forEach((v,i)=>am.set([v,d.material[i]],i*2));attr(4,am,2);
    for(let part=0;part<3;part++){const count=part===2?3:4;for(const [name,loc] of [['joints',5],['weights',8]]){const a=new Float32Array(d.alpha.length*count);for(let i=0;i<d.alpha.length;i++)for(let j=0;j<count;j++)a[i*count+j]=d[name][i*11+part*4+j];attr(loc+part,a,count);}}
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(d.indices),gl.STATIC_DRAW);gl.bindVertexArray(null);
    this.ready=true;this.resize();this.last=performance.now();this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
  }
  program(v,f){const gl=this.gl;f=f.replace('void main(){','uint popcount(uint x){uint n=0u;for(int i=0;i<32;i++){n+=x&1u;x>>=1;}return n;}\nvoid main(){');const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
  quadVertex(){return `#version 300 es
precision highp float;out vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0,1);}`;}
  texture(w,h,data){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,w,h,0,gl.RGBA,gl.FLOAT,data);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,w>4&&this.linearFloat?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  bind(p,name,t,unit){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(gl.getUniformLocation(p,name),unit);}
  resize(){const gl=this.gl;const w=Math.min(this.config.renderWidth,Math.round(this.canvas.clientWidth*devicePixelRatio)),h=Math.max(1,Math.round(w*this.canvas.clientHeight/this.canvas.clientWidth));if(w===this.canvas.width&&h===this.canvas.height&&this.fbo)return;this.canvas.width=w;this.canvas.height=h;if(this.fbo){gl.deleteFramebuffer(this.fbo);gl.deleteTexture(this.target);gl.deleteRenderbuffer(this.depth);}this.target=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.target);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,this.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);this.fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.target,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.depth);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Wave framebuffer incomplete');}
  startBoot({now=performance.now()}={}){
    this.nativeBoot={last:now,wait:0,remaining:1,opacity:0};
  }
  updateNativeBoot(now=performance.now()){
    const boot=this.nativeBoot;if(!boot)return 1;
    const q=Math.max(0,Math.min(1,Math.fround(2*Math.fround(1-boot.remaining))));
    // Mask is sampled before advancing the native clocks this frame.
    boot.opacity=Math.fround(Math.fround(q*q)*Math.fround(3-Math.fround(2*q)));
    const dt=Math.fround(Math.max(0,now-boot.last));boot.last=now;
    boot.wait=Math.min(1,Math.fround(boot.wait+Math.fround(dt*Math.fround(.0003))));
    if(boot.wait>Math.fround(.2))boot.remaining=Math.max(0,Math.fround(boot.remaining+Math.fround(dt*Math.fround(-.0002))));
    return boot.opacity;
  }
  setPalette(id,duration=this.config.paletteTransitionMilliseconds??2000){
    id=Number(id);if(!this.ready||id===this.targetPalette||!this.palettes[id])return;
    this.updatePalette(performance.now());const from={};for(const key of ['ramps','uniforms','backgroundRamp','backgroundParameters'])from[key]=new Float32Array(this.paletteData[key]);
    this.paletteTransition={from,to:this.palettes[id],start:performance.now(),duration};this.targetPalette=id;
    this.paletteData={};for(const key of Object.keys(from))this.paletteData[key]=new Float32Array(from[key].length);
  }
  updatePalette(now){
    const t=this.paletteTransition;if(!t)return;const progress=t.duration<=0?1:Math.min(1,Math.max(0,(now-t.start)/t.duration));
    for(const key of Object.keys(t.from)){const dst=this.paletteData[key],a=t.from[key],b=t.to[key];for(let i=0;i<dst.length;i++)dst[i]=a[i]*(1-progress)+b[i]*progress;}
    const gl=this.gl;for(const [tex,w,h,key] of [[this.rampTex,4320,6,'ramps'],[this.bgTex,2160,1,'backgroundRamp']]){gl.bindTexture(gl.TEXTURE_2D,tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,w,h,gl.RGBA,gl.FLOAT,this.paletteData[key]);}
    if(progress===1){this.currentPalette=this.targetPalette;this.paletteData=t.to;this.paletteTransition=null;}
  }
  backgroundUniforms(w,h,opacity=1,counter=this.frames%256){
    const p=this.paletteData.backgroundParameters,u=new Float32Array(32),width=2*Math.abs(p[20])*Math.tan(p[21]*Math.PI/360),height=-width*h/w;
    u.set([1/w,1/h,p[24]/255/(opacity||1),0,width,height,p[20],w/width,p[12]*p[25],p[13]*p[25],p[14]*p[25],p[22],p[16],p[17],p[18],p[23],p[16]*-2*Math.abs(p[20]/(p[18]+p[20])),p[17]*-2*Math.abs(p[20]/(p[18]+p[20])),counter,opacity]);u[31]=h;return u;
  }
  pose(a,index,count,t){const frame=(t*30),i=Math.floor(frame),f=frame-i;let q=new Float64Array(12);const start=(i*count+index)*12,next=((i+1)*count+index)*12;let sign=0;for(let j=0;j<4;j++)sign+=a[start+j]*a[next+j];for(let j=0;j<12;j++)q[j]=a[start+j]*(1-f)+a[next+j]*f*(j<4&&sign<0?-1:1);let n=Math.hypot(...q.slice(0,4));let [x,y,z,w]=q.slice(0,4).map(v=>v/n);return [ (1-2*(y*y+z*z))*q[8],2*(x*y-z*w)*q[9],2*(x*z+y*w)*q[10],q[4],2*(x*y+z*w)*q[8],(1-2*(x*x+z*z))*q[9],2*(y*z-x*w)*q[10],q[5],2*(x*z-y*w)*q[8],2*(y*z+x*w)*q[9],(1-2*(x*x+y*y))*q[10],q[6],0,0,0,1];}
  transpose(a){return new Float32Array([a[0],a[4],a[8],a[12],a[1],a[5],a[9],a[13],a[2],a[6],a[10],a[14],a[3],a[7],a[11],a[15]]);}
  draw(){this.resize();this.updatePalette(performance.now());const gl=this.gl,d=this.data,w=this.canvas.width,h=this.canvas.height,t=this.phase;const bones=new Float32Array(1536);for(let b=0;b<96;b++){const m=this.pose(d.poses,b,96,t%this.meta.meshDuration),a=d.inverse.subarray(b*16,b*16+16),r=new Float64Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)r[i*4+j]+=m[i*4+k]*a[k*4+j];bones.set(this.transpose(r),b*16);}gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.bonesTex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,4,96,gl.RGBA,gl.FLOAT,bones);
    const c=this.pose(d.camera,0,1,t%this.meta.cameraDuration),view=[-c[0],-c[4],-c[8],0,c[1],c[5],c[9],0,-c[2],-c[6],-c[10],0,0,0,0,1];for(let i=0;i<3;i++)view[i*4+3]=-(view[i*4]*c[3]+view[i*4+1]*c[7]+view[i*4+2]*c[11]);const u=new Float32Array(this.paletteData.uniforms),L=this.meta.light;for(let i=0;i<3;i++)u[i]=view[i*4]*L[0]+view[i*4+1]*L[1]+view[i*4+2]*L[2]+view[i*4+3];u[4]=this.frames%256;u[3]*=this.updateNativeBoot();
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.viewport(0,0,w,h);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.depthMask(true);gl.colorMask(true,true,true,true);gl.clear(gl.DEPTH_BUFFER_BIT);gl.bindVertexArray(null);gl.useProgram(this.bgProgram);this.bind(this.bgProgram,'ramp',this.bgTex,0);gl.uniform4fv(gl.getUniformLocation(this.bgProgram,'U[0]'),this.backgroundUniforms(w,h));gl.uniform1fv(gl.getUniformLocation(this.bgProgram,'noiseTable[0]'),this.paletteBank.backgroundNoiseTable);gl.drawArrays(gl.TRIANGLES,0,3);
    const p=this.waveProgram;gl.useProgram(p);gl.bindVertexArray(this.vao);this.bind(p,'bones',this.bonesTex,0);this.bind(p,'ramps',this.rampTex,1);gl.uniformMatrix4fv(gl.getUniformLocation(p,'view'),false,this.transpose(view));gl.uniform1f(gl.getUniformLocation(p,'aspect'),w/h);gl.uniform2f(gl.getUniformLocation(p,'resolution'),w,h);gl.uniform4fv(gl.getUniformLocation(p,'U[0]'),u);gl.uniform1fv(gl.getUniformLocation(p,'noiseTable[0]'),d.noise);gl.disable(gl.CULL_FACE);gl.frontFace(gl.CW);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.colorMask(false,false,false,false);gl.drawElements(gl.TRIANGLES,d.indices.length,gl.UNSIGNED_SHORT,0);gl.colorMask(true,true,true,true);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);for(const func of [gl.NOTEQUAL,gl.EQUAL]){gl.depthFunc(func);gl.drawElements(gl.TRIANGLES,d.indices.length,gl.UNSIGNED_SHORT,0);}
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindVertexArray(null);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(this.finalProgram);this.bind(this.finalProgram,'scene',this.target,0);gl.uniform2f(gl.getUniformLocation(this.finalProgram,'resolution'),w,h);const s=this.treatment;gl.uniform4f(gl.getUniformLocation(this.finalProgram,'treatment'),s.saturation,s.brightness,0,s.opacity);gl.drawArrays(gl.TRIANGLES,0,3);this.frames++;
  }
  loop(now){if(this.stopped)return;const dt=Math.min((now-this.last)/1000,.1);this.last=now;if(!this.paused&&!document.hidden){this.phase+=dt*this.config.speed;if(!this.lastDraw||now-this.lastDraw>=1000/60-1){this.draw();this.lastDraw=now;}}requestAnimationFrame(this.loop);}
}
