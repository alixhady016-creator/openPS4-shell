import {aerial} from './game-motion.js';
const clamp=t=>Math.max(0,Math.min(1,t));
export function nativeScrollCurve(t){t=clamp(t);return t<.232?.6*t/.232:.6+.4*(1-((1-t)/.768)**3);}
// PUI06002D87. Upper/lower focus gaps are ADDITIONAL to the 4px line gap.
export function focusOffset(index,fraction,upper=76,lower=75){const whole=Math.trunc(fraction),part=fraction%1;if(index<whole)return -upper;if(index===whole)return -upper*part;if(index===whole+1)return lower*(1-part);return index>=fraction+1?lower:0;}
// PUI06003143/31AA: extension preserves the base curve after an initial segment.
export function scrollPlan(distance,duration=250,limit=2000){const d=Math.abs(distance);if(d<=limit)return {duration,curve:nativeScrollCurve};const extra=(d-limit)/limit*.3866666257381439,rate=extra/(1+extra),valueRate=(d-limit)/d;return {duration:duration*(1+extra),curve:t=>{t=clamp(t);return t<rate?t/rate*valueRate:nativeScrollCurve((t-rate)/(1-rate))*(1-valueRate)+valueRate;}};}
export class GameGridMotion {
 constructor(selected=1,expanded=true){this.selected=selected;this.scroll=selected*204;this.upper=expanded?76:4;this.lower=expanded?75:4;this.expanded=expanded;this.move=null;this.gap=null;this.fade=null;this.opacity=1;}
 sample(now){
  if(this.move){const a=this.move,t=clamp((now-a.start)/a.duration);this.scroll=a.from+(a.to-a.from)*a.curve(t);if(t===1)this.move=null;}
  if(this.gap){const a=this.gap,elapsed=now-a.start;let k,fromU=a.u,fromL=a.l,toU=a.targetU,toL=a.targetL;
   if(a.selection){if(elapsed<33){k=1-2**(-10*clamp(elapsed/180));toU=toL=4;}else{const out=1-2**(-10*33/180);fromU=a.u+(4-a.u)*out;fromL=a.l+(4-a.l)*out;k=aerial((elapsed-33)/183);}}
   else k=a.curve?a.curve(clamp(elapsed/a.duration)):aerial(elapsed/a.duration);
   this.upper=fromU+(toU-fromU)*k;this.lower=fromL+(toL-fromL)*k;if(elapsed>=(a.selection?216:a.duration))this.gap=null;
  }
  if(this.fade!==null){const t=clamp((now-this.fade)/300);this.opacity=.01+.99*t;if(t===1)this.fade=null;}
 }
 // Call once after state.selected/row changes, before the next frame. Retargets
 // from current rendered scroll/gap values, cancelling previous blocks.
 set(selected,expanded,now=performance.now(),{immediate=false,jump=false,deferFocus=jump,ownGap=true,duration=250,rowDuration=340}={}){
  this.sample(now);const changed=selected!==this.selected,modeChanged=expanded!==this.expanded;this.selected=selected;this.expanded=expanded;
  if(immediate){this.scroll=selected*204;this.upper=expanded?76:4;this.lower=expanded?75:4;this.move=this.gap=this.fade=null;this.opacity=1;return;}
  if(changed){if(jump&&Math.abs(selected-this.scroll/204)>=8){this.scroll=(selected-Math.sign(selected-this.scroll/204)*8)*204;this.fade=now;this.opacity=.01;}
   const target=selected*204,plan=scrollPlan(target-this.scroll,duration*(jump?1.5:1),jump?8*.8*204:2000);this.move={from:this.scroll,to:target,start:now,...plan};
  }
  if(ownGap&&(changed||modeChanged))this.gap={u:this.upper,l:this.lower,targetU:expanded?76:4,targetL:expanded?75:4,start:now,duration:rowDuration,selection:changed&&expanded&&!deferFocus,curve:deferFocus?(t=>t===0||t===1?t:t<.5?2**(20*t-10)/2:(2-2**(-20*t+10))/2):null};
  if(ownGap&&changed&&deferFocus){this.gap.targetU=this.gap.targetL=4;this.gap.duration=180;}
 }
 activateFocus(now=performance.now()){this.sample(now);this.gap={u:this.upper,l:this.lower,targetU:76,targetL:75,start:now,duration:183,selection:true};}
 layout(tiles,now=performance.now()){
  this.sample(now);const fraction=this.scroll/204;
  tiles.forEach((tile,i)=>{const localShift=tile.itemTx??(-(tile.s-200)/2);tile.x=353+i*204-this.scroll+focusOffset(i,fraction,this.upper,this.lower)+localShift;tile.a=this.opacity;});
  const targetTop=this.selected*204-this.scroll+focusOffset(this.selected,fraction,this.upper,this.lower);
  const focusReady=targetTop>=-4-this.lower&&targetTop<=4+this.upper;
  return {scroll:this.scroll,fraction,upper:this.upper,lower:this.lower,opacity:this.opacity,scrolling:!!this.move,focusReady,targetTop};
 }
}




// Explicit callback-driven gap channel. Used by GameTileFocusMotion; legacy set()
// remains compatible, but its inferred gap schedule is disabled for this owner.
const legacySample=GameGridMotion.prototype.sample;
function gapValue(a,time){if(!a)return null;const p=clamp((time-a.start)/Math.max(1,a.duration)),f=a.curve(p);return {u:a.u+(a.toU-a.u)*f,l:a.l+(a.toL-a.l)*f};}
GameGridMotion.prototype.sample=function(now){
 if(this.explicitGaps)this.gap=null;
 legacySample.call(this,now);
 if(!this.explicitGaps)return;
 if(this.gapCommand&&now>=this.gapCommand.start){const c=this.gapCommand,at=gapValue(this.explicitGap,c.start);if(at){this.upper=at.u;this.lower=at.l;}this.explicitGap={u:this.upper,l:this.lower,toU:c.u,toL:c.l,start:c.start,duration:c.duration,curve:c.curve};this.gapCommand=null;}
 const v=gapValue(this.explicitGap,now);if(v){this.upper=v.u;this.lower=v.l;}
};
GameGridMotion.prototype.setGapTargets=function(u,l,now,{duration=183,delay=0,curve=aerial,retainActive=false}={}){
 this.sample(now);this.explicitGaps=true;this.gap=null;
 // app3040 clears the incoming timer but retains an existing gap-out block.
 // During rapid shortcut crossings it must continue from its original start.
 const a=this.explicitGap;
 if(retainActive&&a&&a.toU===u&&a.toL===l&&now<a.start+a.duration){this.gapCommand=null;return;}
 this.gapCommand={u,l,start:now+delay,duration,curve};this.sample(now);
};
GameGridMotion.prototype.setGapImmediate=function(u,l,now=performance.now()){
 this.sample(now);this.explicitGaps=true;this.gap=this.explicitGap=this.gapCommand=null;this.upper=u;this.lower=l;
};

