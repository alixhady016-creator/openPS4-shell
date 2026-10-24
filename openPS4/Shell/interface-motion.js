import {SceneMotion} from './scene-motion.js';

// PUI outer application transitions, shared by Home and all application pages.
// Boot/page movement remains owned by SceneMotion, with its original timings.
export class InterfaceMotion extends SceneMotion {
 transition(element,showing,options={}){
  if(element.hidden){element.hidden=false;element.classList.add('hidden');}
  const result=super.transition(element,showing,{direction:showing?'push':'pop',...options});
  const page=this.pages.get(element);
  if(page)page.start=this.now()+(showing?75:0);
  if(!this.running&&this.pages.size){
   this.running=true;
   const frame=t=>{this.update(t);if(this.pages.size)requestAnimationFrame(frame);else this.running=false;};
   requestAnimationFrame(frame);
  }
  return result;
 }
}
