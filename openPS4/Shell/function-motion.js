// Firmware 6.00 app.exe 060033C6/33C7/33CB/33CC and layout_system_area_scene2.
const clamp=t=>Math.max(0,Math.min(1,t));
const cubic=t=>t<.5?4*t*t*t:1-4*(1-t)**3;
const out=t=>1-(1-t)**3;
export const FUNCTION_LAYOUT=Object.freeze({panelSize:128,expandedY:668,expandedFirstX:106,expandedSpan:1580,compactY:38,compactScale:.375,labelY:140,labelSize:26});
export function functionSweep(elapsed,{delay=2.5,duration=2.5,interval=5,minAlpha=0}={}){
  const q=clamp((Math.max(elapsed-delay,0)%interval)/duration);
  const quint=q<.5?16*q**5:1-16*(1-q)**5;
  const expo=q===0||q===1?q:q<.5?2**(20*q-10)/2:(2-2**(-20*q+10))/2;
  return {bgAlpha:1-quint*(1-minAlpha),mapRate:1-expo,aaRatio:.05};
}
export class FunctionMotion{
  constructor(count,selected=1){
    this.selected=selected;this.open=false;this.channels=new Map();
    this.values=Array.from({length:count},(_,i)=>({s:i===selected?1:.5,a:i===selected?1:.5,label:i===selected?1:0}));
  }
  tick(now=performance.now()){
    for(const [i,c] of this.channels){const t=clamp((now-c.start)/c.duration),k=c.curve(t),v=this.values[i];for(const key of ['s','a','label'])v[key]=c.from[key]+(c.to[key]-c.from[key])*k;if(t===1)this.channels.delete(i);}
    return this.values;
  }
  select(index,now=performance.now(),force=false){
    index=Math.max(0,Math.min(this.values.length-1,index));this.tick(now);
    if(index===this.selected&&!force)return;
    const previous=this.selected;this.selected=index;
    this.values.forEach((v,i)=>{if(!force&&i!==previous&&i!==index)return;const focused=i===index;this.channels.set(i,{start:now,duration:focused?250:200,curve:focused?out:cubic,from:{...v},to:{s:focused?1:.5,a:focused?1:.5,label:focused?1:0}});});
  }
  // `compact` is the saved runtime layout after IconDispList adjustments. Passing
  // it explicitly avoids treating the serialized defaults as universal positions.
  layout(index,open,compact,{texturedTheme=false,entranceAlpha=1}={}){
    const o=clamp(open),v=this.values[index],c=compact[index]??{x:680,visible:false};
    return {x:c.x+(106+1580*index/Math.max(1,this.values.length-1)-c.x)*o,
      y:38+630*o,scale:.375+(v.s-.375)*o,
      opacity:((c.visible?1:0)*(1-o)+(texturedTheme?1:v.a)*o)*entranceAlpha,
      labelOpacity:v.label*o,labelScale:.375+(v.s-.375)*o,labelY:64+76*(.375+(v.s-.375)*o),pointerEvents:o>.5?'auto':'none'};
  }
}


