// Firmware 6.00 PUI TransitionVariety / TopMenu StartBootEffect reconstruction.
// Sources: outputs/rea-shell-recovery/profile and prior-traces/BOOT-VISUAL-TRACE.
// These are logical coordinates; no dimensions are fitted to compressed footage.
const clamp=t=>Math.max(0,Math.min(1,t));
const mix=(a,b,t)=>a+(b-a)*t;
export const sceneEase={
  linear:clamp,
  aerial(t){const u=(1-clamp(t))**2;return 1-.4*u-.1*u*u-.5*u*u*u;},
  outCubic:t=>1-(1-clamp(t))**3,
  outExpo:t=>t>=1?1:1-2**(-10*clamp(t)),
  inOutExpo(t){t=clamp(t);return t===0||t===1?t:t<.5?2**(20*t-10)/2:(2-2**(-20*t+10))/2;}
};
export const profileGeometry=Object.freeze({width:260,height:384,avatar:260,band:124,gap:40,pitch:300,y:428,twoLineHeight:420,twoLineY:410,focusMargin:840,nameFont:30,statusFont:26,deviceSize:32,nameBaseline:724,statusBaseline:760,welcomeBaseline:508,promptBaseline:590,returnPromptBaseline:548});

// PUI camera: (960,540,-1000), looking at z=0. Translation is in world
// coordinates BEFORE projection, so scaling about the top-left is incorrect.
export function projectTransform(x=0,y=0,z=0){
  const scale=1000/(1000+z);
  return {x:960+(x-960)*scale,y:540+(y-540)*scale,scale};
}
export function transformCSS(x=0,y=0,z=0){
  const p=projectTransform(x,y,z);return `translate(${p.x}px,${p.y}px) scale(${p.scale})`;
}

// Sampled from StartBootEffect time, after scene/readiness gates. The first
// branch means previous foreground user == -1, not an arbitrary cold-boot flag.
export function sampleDashboardBoot(elapsed,{first=true}={}){
  const t=Math.max(0,elapsed);
  let game,functionRow,open,clock;
  if(first&&t<980){
    const p=clamp(t/360),g=sceneEase.outCubic(p),f=sceneEase.outExpo(p);
    game={x:mix(500,-260,g),y:0,z:600,opacity:g};
    functionRow={x:mix(-300,0,f),y:0,z:600,opacity:g};open=1;clock=false;
  }else{
    const p=sceneEase.inOutExpo((t-(first?980:0))/(first?900:600));
    game={x:mix(first?-260:0,0,p),y:0,z:mix(600,0,p),opacity:1};
    functionRow={x:0,y:0,z:mix(600,0,p),opacity:1};open=1-p;clock=true;
  }
  // Boot opens the horizontal icon distribution, not the lower function scene.
  // app060032D5 sets X only; IconOpen060033C1 preserves serialized Y=38.
  const settle=first?sceneEase.inOutExpo((t-980)/900):sceneEase.inOutExpo(t/600);
  const functionLayout={spread:1-settle,y:38,scale:.5-.125*settle,labels:0};
  return {game,functionRow,functionLayout,open,clock,done:t>=(first?1880:600),duration:first?1880:600};
}

// Apply the sampled parent pose while Home is still hidden. The first visible
// render therefore cannot inherit a previous navigation pose between setup and
// the next animation frame. Child geometry is still owned by its own sampler.
export function prepareDashboardBootPose(gameElement,functionElement,pose){
  gameElement.style.transformOrigin=functionElement.style.transformOrigin='0 0';
  gameElement.style.transform=transformCSS(pose.game.x,pose.game.y,pose.game.z);
  gameElement.style.opacity=String(pose.game.opacity);
  functionElement.style.transform=transformCSS(pose.functionRow.x,pose.functionRow.y,pose.functionRow.z);
  functionElement.style.opacity=String(pose.functionRow.opacity);
  return pose;
}

export function sampleHealth(elapsed){
  return elapsed<500?clamp(elapsed/500):elapsed<2500?1:1-clamp((elapsed-2500)/500);
}

// One owner per scene. Replacing a transition samples the current pose first,
// cancels its completion, and starts from that visible pose (no stale timers).
export class SceneMotion{
  constructor({now=()=>performance.now()}={}){this.now=now;this.pages=new Map();this.boot=null;}
  show(element,{direction='push',animate=true,fallback=false}={}){
    return this.transition(element,true,{direction,animate,fallback});
  }
  hide(element,{direction='push',animate=true}={}){
    return this.transition(element,false,{direction,animate});
  }
  // BackApplicationHiding is a root transition, distinct from page Pop hiding.
  hideApplication(element,{animate=true}={}){
    return this.transition(element,false,{direction:'pop',animate,application:true});
  }
  transition(element,showing,{direction='push',animate=true,fallback=false,application=false}={}){
    this.update(this.now());
    const previous=this.pages.get(element),wasVisible=!element.classList.contains('hidden');
    if(previous){previous.resolve(false);this.pages.delete(element);}
    const initial=previous?.pose??{z:0,opacity:wasVisible?1:0};
    const push=direction==='push',from=showing&&!wasVisible?{z:fallback?0:push?-400:800,opacity:0}:initial;
    const to={z:showing?0:push?800:-400,opacity:showing?1:0};
    element.classList.remove('hidden');element.style.transformOrigin='0 0';
    if(!animate){this.apply(element,to);if(!showing)element.classList.add('hidden');return Promise.resolve(true);}
    return new Promise(resolve=>{
      this.pages.set(element,{from,to,pose:from,showing,start:this.now()+(application||fallback?0:showing?125:75),duration:fallback?200:500,curve:fallback?'linear':'aerial',resolve});
      this.apply(element,from);
    });
  }
  apply(element,pose){element.style.transform=transformCSS(0,0,pose.z);element.style.opacity=pose.opacity;}
  startBoot({first=true,onComplete=()=>{}}={}){
    this.cancelBoot();this.boot={start:this.now(),first,onComplete};return sampleDashboardBoot(0,{first});
  }
  cancelBoot(){
    if(!this.boot)return;
    const {onComplete}=this.boot;this.boot=null;onComplete({cancelled:true});
  }
  cancelPages(){for(const [element,page] of this.pages){page.resolve(false);element.style.opacity='';element.style.transform='';}this.pages.clear();}
  update(t=this.now()){
    for(const [element,page] of this.pages){
      const p=clamp((t-page.start)/page.duration),f=sceneEase[page.curve](p);
      page.pose={z:mix(page.from.z,page.to.z,f),opacity:mix(page.from.opacity,page.to.opacity,f)};this.apply(element,page.pose);
      if(p===1){this.pages.delete(element);if(!page.showing)element.classList.add('hidden');page.resolve(true);}
    }
    if(!this.boot)return null;
    const boot=this.boot,result=sampleDashboardBoot(t-boot.start,{first:boot.first});
    if(result.done){this.boot=null;boot.onComplete({cancelled:false});}
    return result;
  }
  report(){return {pages:this.pages.size,boot:this.boot?{first:this.boot.first,elapsed:this.now()-this.boot.start}:null};}
}
