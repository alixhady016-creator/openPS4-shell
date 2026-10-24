// Recovered PUI 06002464-77; dashboard 06002F90 and 0600300C.
// Positions are offsets from the 136px footer's shown top (1080 - 136).
export class FooterController {
  constructor(visual, animate, now=()=>performance.now()) {
    this.visual=visual;this.animate=animate;this.now=now;
    this.mode='hidden';this.active=false;this.suspended=false;this.phase='stopped';
    this.showAt=Infinity;this.hideAt=Infinity;
  }
  configure(mode,active=true) {
    this.mode=mode;this.active=active;this.interrupt();
  }
  move(shown) {
    this.animate({a:shown?1:0,y:shown?0:68},shown?300:200);
  }
  interrupt() {
    this.showAt=this.hideAt=Infinity;
    if(this.suspended||!this.active||this.mode==='hidden') {
      this.phase='stopped';this.move(false);return;
    }
    if(this.mode==='manual') {this.phase='shown';this.move(true);return;}
    this.phase='waiting';this.move(false);this.showAt=this.now()+3000;
  }
  suspend(value) {
    if(this.suspended===value)return;
    this.suspended=value;this.interrupt();
  }
  update(t,firstCycle=false) {
    if(this.suspended||!this.active||this.mode!=='auto')return;
    if(t>=this.showAt) {
      this.showAt=Infinity;this.hideAt=t+9000;this.phase='shown';this.move(true);
    }
    // Native WaitKeyNavigationAnimationTimer does not cut off its first cycle.
    if(t>this.hideAt&&!firstCycle) {
      this.hideAt=Infinity;this.phase='stopped';this.move(false);
    }
  }
  report() {return {mode:this.mode,active:this.active,suspended:this.suspended,
    phase:this.phase,showAt:this.showAt,hideAt:this.hideAt};}
}

export function footerHints({screen,row,index,count,entry={},enterButton='cross'}) {
  const backButton=enterButton==='circle'?'cross':'circle';
  if(screen==='profiles')return [
    {key:'enter',icon:enterButton,text:'Enter'},{key:'back',icon:backButton,text:'Cancel'},
    {key:'options',icon:'options',text:'Options Menu'}];
  if(screen==='home'&&row==='functions')return [
    {key:'enter',icon:enterButton,text:'Enter'},{key:'back',icon:backButton,text:'Back'}];
  if(screen!=='home')return [];
  const result=[];
  // Local content lacks the PS4 app database. Explicit capability flags win;
  // fallback preserves this port's current local tile actions (not PSN state).
  if(entry.canEnter??entry.action!=='news')result.push({key:'enter',icon:enterButton,text:'Enter'});
  if(index>=1)result.push({key:'l1',icon:'L1',text:'To the Left End'});
  if(index<count-1)result.push({key:'r1',icon:'R1',text:'To the Right End'});
  if(entry.canOptions??entry.action!=='news')result.push({key:'options',icon:'options',text:'Options Menu'});
  return result;
}
