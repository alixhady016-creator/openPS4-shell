// Firmware reference probes run only from the existing --shell-test harness.
export async function nativeWaveReview(shell){
  const golden=await fetch('assets/native-validation.json').then(r=>r.json()),w=shell.wave;
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{alpha:false,antialias:false});
  if(!gl||!gl.getExtension('EXT_color_buffer_float'))throw Error('Float framebuffer unavailable for firmware arithmetic checks.');
  const renderer=gl.getExtension('WEBGL_debug_renderer_info');
  const compile=(type,src)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=(frag)=>{let p=gl.createProgram();const vs=`#version 300 es
precision highp float;void main(){vec2 q=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(q*2.-1.,0,1);}`;
    gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;};
  const texture=(width,height,array,unit)=>{let t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,width,height,0,gl.RGBA,gl.FLOAT,array);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.NEAREST);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);return t;};
  const target=(width,height)=>{canvas.width=width;canvas.height=height;let tex=texture(width,height,new Float32Array(width*height*4),7),fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Float test target incomplete');gl.viewport(0,0,width,height);return {tex,fbo};};
  const loc=(p,name)=>gl.getUniformLocation(p,name),sampler=(p,name,unit)=>gl.uniform1i(loc(p,name),unit);
  const measure=(actual,expected)=>{let max=0,sum=0,over=0,nonfinite=0,rawMax=0,rawChannelsOver8BitStep=0;for(let i=0;i<actual.length;i++){const ref=Math.min(1,Math.max(0,expected[i])),raw=Math.abs(actual[i]-ref),alphaIndex=i-i%4+3;const d=i%4<3?Math.abs(actual[i]*actual[alphaIndex]-ref*expected[alphaIndex]):raw;if(!Number.isFinite(d)){nonfinite++;continue;}rawMax=Math.max(rawMax,raw);if(raw>1/255)rawChannelsOver8BitStep++;max=Math.max(max,d);sum+=d;if(d>1/255)over++;}return {comparison:'source-alpha color contribution and export alpha',maxAbsoluteError:max,rawMaxAbsoluteError:rawMax,rawChannelsOver8BitStep,meanAbsoluteError:sum/actual.length,channelsOver8BitStep:over,nonfinite,passed:over===0&&nonfinite===0};};
  let frag=await fetch('wave.frag').then(r=>r.text());
  frag=frag.replace('in vec4 A0; in vec4 A1; in vec4 A2; in vec4 A3;','uniform sampler2D fixtures;vec4 A0,A1,A2,A3,XYF;');
  frag=frag.replace('void main(){',`uint popcount(uint x){uint n=0u;for(int i=0;i<32;i++){n+=x&1u;x>>=1;}return n;}
void main(){int index=int(gl_FragCoord.x);A0=texelFetch(fixtures,ivec2(index,0),0);A1=texelFetch(fixtures,ivec2(index,1),0);A2=texelFetch(fixtures,ivec2(index,2),0);A3=texelFetch(fixtures,ivec2(index,3),0);XYF=texelFetch(fixtures,ivec2(index,4),0);`);
  frag=frag.replace('gl_FragCoord.x);v[3]=floatBitsToUint(resolution.y-gl_FragCoord.y)','XYF.x);v[3]=floatBitsToUint(XYF.y)').replace('gl_FrontFacing?1u:0u','XYF.z>0.?1u:0u');
  const pixelProgram=program(frag),backgroundProgram=program(await fetch('background.frag').then(r=>r.text()));
  const n=golden.attrs.length,fixture=new Float32Array(n*5*4);
  for(let i=0;i<n;i++){for(let row=0;row<4;row++)fixture.set(golden.attrs[i][row],(row*n+i)*4);fixture.set([...golden.xy[i],golden.front[i],0],(4*n+i)*4);}
  texture(n,5,fixture,2);const results=[];
  for(const entry of golden.palettes){
    const pal=w.palettes[entry.palette],f=target(n,1);texture(4320,6,pal.ramps,0);gl.useProgram(pixelProgram);sampler(pixelProgram,'ramps',0);sampler(pixelProgram,'fixtures',2);
    gl.uniform4fv(loc(pixelProgram,'U[0]'),new Float32Array(entry.uniforms.flat()));gl.uniform1fv(loc(pixelProgram,'noiseTable[0]'),w.data.noise);gl.uniform2f(loc(pixelProgram,'resolution'),1920,1080);
    gl.drawArrays(gl.TRIANGLES,0,3);const pixels=new Float32Array(n*4);gl.readPixels(0,0,n,1,gl.RGBA,gl.FLOAT,pixels);
    results.push({kind:'wave-arithmetic',palette:entry.palette,fixtures:n,...measure(pixels,entry.expected.flat())});gl.deleteFramebuffer(f.fbo);gl.deleteTexture(f.tex);
    const bg=target(128,72);texture(2160,1,pal.backgroundRamp,0);gl.useProgram(backgroundProgram);sampler(backgroundProgram,'ramp',0);
    const oldData=w.paletteData;w.paletteData=pal;gl.uniform4fv(loc(backgroundProgram,'U[0]'),w.backgroundUniforms(128,72,1,0));w.paletteData=oldData;
    gl.uniform1fv(loc(backgroundProgram,'noiseTable[0]'),w.paletteBank.backgroundNoiseTable);gl.drawArrays(gl.TRIANGLES,0,3);const bp=new Float32Array(128*72*4);gl.readPixels(0,0,128,72,gl.RGBA,gl.FLOAT,bp);
    const expected=entry.backgroundExpected.flat(2),flipped=[];for(let y=71;y>=0;y--)flipped.push(...expected.slice(y*128*4,(y+1)*128*4));
    results.push({kind:'background-arithmetic',palette:entry.palette,pixels:128*72,...measure(bp,flipped)});gl.deleteFramebuffer(bg.fbo);gl.deleteTexture(bg.tex);
  }
  const error=gl.getError();if(error!==gl.NO_ERROR)throw Error('Probe WebGL error '+error);
  const prior={phase:w.phase,paused:w.paused,width:w.config.renderWidth,treatment:{...w.treatment},palette:w.targetPalette};
  w.paused=true;w.config.renderWidth=1920;w.treatment={saturation:1,brightness:1,opacity:1};
  for(const palette of [1,2]){w.setPalette(palette);if(w.paletteTransition)w.paletteTransition.start-=2001;for(const phase of [35,70,105]){w.phase=phase;w.draw();window.chrome.webview.postMessage({action:'waveCapture',name:`native-palette-${palette}-phase-${phase}.png`,png:w.canvas.toDataURL()});}}
  w.setPalette(1);if(w.paletteTransition)w.paletteTransition.start-=2001;w.draw();w.setPalette(2);w.paletteTransition.start-=1000;w.draw();
  const midExpected=(w.palettes[1].uniforms[34]+w.palettes[2].uniforms[34])*.5;
  results.push({kind:'palette-transition',observed:w.paletteData.uniforms[34],midpoint:midExpected,passed:Math.abs(w.paletteData.uniforms[34]-midExpected)<.015});
  w.setPalette(prior.palette);if(w.paletteTransition)w.paletteTransition.start-=2001;w.draw();w.phase=prior.phase;w.config.renderWidth=prior.width;w.treatment=prior.treatment;w.paused=prior.paused;
  return {passed:results.every(r=>r.passed),sourceElfSha256:golden.sourceElfSha256,renderer:renderer?gl.getParameter(renderer.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),randomPhaseFitting:false,results};
}
