import {GameFocus} from './game-focus.js';
import {profileGeometry as geometry} from './scene-motion.js';

// UserItem2 inherits ListPanelItem's Rectangle focus (PUI 060031BA).
// FocusRenderManager maps Rectangle to LineFocusWidget (06001DDF/1DE0).
// No profile-specific FocusCustomSettings override occurs in UserItem2 or its
// layout. Unlike the game item's explicit padding2, default profile padding0
// leaves the nominal focus rectangle at the exact 260x384 item bounds.
export class ProfileFocus {
  static async create(parent){return new ProfileFocus(await GameFocus.create(parent));}
  constructor(renderer){this.renderer=renderer;this.items=[];this.visible=false;}
  // Positions are list layout coordinates in the parent 1920x1080 scene.
  layout(xs,{y=geometry.y,height=geometry.height}={}){
    this.items=xs.map(x=>({x,y,s:geometry.width,height,strip:0,padding:0}));
  }
  select(index,now=performance.now(),repeat=false){this.renderer.select(index,now,repeat);this.visible=index>=0;}
  press(now=performance.now()){this.renderer.press(now);}
  draw(now=performance.now(),opacity=1){this.renderer.draw(this.items,now,opacity);}
  report(){return {selected:this.renderer.selected,items:this.items.map(item=>({...item})),visible:this.visible};}
}
