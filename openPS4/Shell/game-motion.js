// Recovered from dashboard 6.00 layout and PUI 06000CB8, 06001E43–46.
export const GAME_LAYOUT=Object.freeze({y:209,normal:200,focused:330,pitch:204,focusedX:288,normalX:353,startHeight:70,padding:2,focusIn:183,focusDelay:50,gapDelay:33,focusOut:180,showDelay:51,fadeOut:500,repeatFadeOut:250,titleIn:320,titleOut:100});
export function aerial(t){t=Math.max(0,Math.min(1,t));const u=(1-t)**2;return 1-.4*u-.1*u*u-.5*u*u*u;}
export function gameTileX(index,selected,expanded=true){
 const delta=index-selected;if(!expanded)return 353+delta*204;
 return delta===0?288:delta<0?353+delta*204-76:353+delta*204+75;
}
export function idleTarget(seconds){
 const p=((seconds%4.249999997019768)+4.249999997019768)%4.249999997019768;
 let inside=0,outside=0,secondary=-5,alpha=.8;
 if(p>=2.5&&p<3.45){const k=2**(10*((p-2.5)/.95)-10);inside=10*k;outside=5*k;alpha=.8-.3*k;if(p>=3.25){const z=p-3.25;secondary=5*(2*z-z*z)-5;}}
 else if(p>=3.45){const z=p-3.25;outside=5*(2*z-z*z)-5;}
 return {inside,outside,secondary,alpha,thickness:5,smooth:p<2.5};
}
export function bandUniforms(s){const edge=(i,o,h)=>{const outer=16+h+o,inner=16+i;return [(outer+inner)/2,(outer-inner)/2];};return [...edge(s.inside,s.outside,s.thickness),...edge(0,s.secondary,5)];}
export class FocusMotion {
 constructor(now=0){this.value={inside:0,outside:0,secondary:-5,alpha:.8,thickness:5};this.mode='hidden';this.started=now;this.last=now;this.repeat=false;}
 show(now){if(this.mode==='press'){this.value.inside=0;this.value.outside=-5;this.value.thickness=5;}this.mode='idle';this.started=now;this.last=now-1000/30;this.value.alpha=2;this.step(now);}
 hide(now,repeat=false){this.mode='hide';this.started=now;this.last=now;this.value.alpha=.5;this.repeat=repeat;}
 press(now){this.mode='press';this.started=now;this.last=now;}
 step(now){const elapsed=Math.max(0,(now-this.started)/1000),dt=Math.max(0,(now-this.last)/1000);this.last=now;
 if(this.mode==='hidden')return 0;
 let target=idleTarget(elapsed),weight=target.smooth?1-.9**(50*dt):1;
 if(this.mode==='hide'){target={inside:0,outside:0,secondary:-5,alpha:.5,thickness:0};weight=1-.9**(50*dt);}
 if(this.mode==='press'){if(elapsed>=.5){this.show(now);return 1;}target={inside:10,outside:5,secondary:-5,alpha:.8,thickness:5};weight=elapsed<.15?Math.min(1,dt/Math.max(.000001,.15-(elapsed-dt))):1;}
 for(const k of ['inside','outside','secondary','alpha','thickness'])this.value[k]+=(target[k]-this.value[k])*weight;
 if(this.mode==='hide'){const a=Math.max(0,1-elapsed/(this.repeat?.25:.5));if(!a)this.mode='hidden';return a;}
 return elapsed<.051?0:1;
 }
}


