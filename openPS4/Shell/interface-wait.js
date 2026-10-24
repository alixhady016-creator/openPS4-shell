import {InterfaceMotion} from './interface-power.js';
import {FooterPrompts} from './footer-prompts.js';
import {BusyIndicator} from './busy-indicator.js';
import {SceneMotion} from './scene-motion.js';
export class WaitInterface {
 constructor({host,onComplete=()=>{}}={}){Object.assign(this,{host,onComplete});this.motion=new InterfaceMotion();this.element=document.createElement('section');this.element.className='plPage plWait hidden';this.element.innerHTML='<img class="plWaitHeaderSeparator" src="assets/interface-settings/header-separator.png" alt=""><div class="plWaitGroup"><div class="plWaitBusy"></div><span>Please wait...</span></div><footer></footer>';host.append(this.element);this.footer=new FooterPrompts(this.element.querySelector('footer'));this.footer.draw([]);this.busy=new BusyIndicator(this.element.querySelector('.plWaitBusy'),{singleLine:false});this.active=false;this.generation=0;this.frame=()=>{const t=performance.now();this.motion.update(t);this.busy.update(t);if(this.active)requestAnimationFrame(this.frame);};}
 async open(message='Please wait...'){this.active=true;this.element.querySelector('span').textContent=message;this.busy.start();requestAnimationFrame(this.frame);await this.motion.show(this.element);this.shownAt=performance.now();}
 async run(task=()=>Promise.resolve(),{minimumMs=2000,message='Please wait...'}={}){const generation=++this.generation;await this.open(message);let result,error;await Promise.all([Promise.resolve().then(task).then(v=>result=v,e=>error=e),new Promise(r=>setTimeout(r,Math.max(2000,minimumMs)))]);if(generation!==this.generation)return;await this.close();if(error)throw error;this.onComplete(result);return result;}
 async close(){await this.motion.hide(this.element,{direction:'pop'});this.active=false;this.busy.stop({quick:true});}
 key(){return this.active;}
 report(){return {active:this.active,shownAt:this.shownAt,minimumMs:2000,backDismiss:false,userBadge:false,busy:{size:96,gap:20,singleLine:false}};}
}
