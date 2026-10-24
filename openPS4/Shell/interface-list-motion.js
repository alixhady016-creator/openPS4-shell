// PUI ListPanelBase.defaultScrollCurve and 250ms interruption from current position.
import {sceneEase} from './scene-motion.js';
export function scrollCurve(p){p=Math.max(0,Math.min(1,p));if(p<.232)return p*2.5862072;const q=(p-.232)/.768-1;return .6+.4*(q*q*q+1);}
export function descriptionCurve(p){p=Math.max(0,Math.min(1,p));return p<.5?.5*(1-sceneEase.aerial(1-2*p)):.5+.5*sceneEase.aerial(2*p-1);}
export class ListScalar{
 constructor(value){this.from=this.target=this.value=value;this.start=0;this.curve=scrollCurve;}
 sample(now){const p=Math.max(0,Math.min(1,(now-this.start)/250));return this.value=this.from+(this.target-this.from)*this.curve(p);}
 retarget(target,now,curve=scrollCurve,animate=true){if(target===this.target&&animate)return;this.from=this.sample(now);this.target=target;this.start=now;this.curve=curve;if(!animate)this.from=this.value=target;}
}
