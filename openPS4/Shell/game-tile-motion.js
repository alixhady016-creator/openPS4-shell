import {aerial} from './game-motion.js';
const clamp=t=>Math.max(0,Math.min(1,t));
export const tileCurves={linear:clamp,aerial,cubic:t=>(t=clamp(t))<.5?4*t*t*t:1-4*(1-t)**3,expo:t=>(t=clamp(t))===1?1:1-2**(-10*t),inOutExpo:t=>(t=clamp(t))===0||t===1?t:t<.5?2**(20*t-10)/2:(2-2**(-20*t+10))/2};
const roundEven=x=>{const f=Math.floor(x),r=x-f;return r===.5?(f%2===0?f:f+1):Math.round(x);};
const normal={s:200,itemTx:0,focusHeight:200,panelWidth:200,panelY:200,panelHeight:0,panelOpacity:0,labelOpacity:0,arrowOpacity:1};
const focused={s:330,itemTx:-65,focusHeight:400,panelWidth:330,panelY:330,panelHeight:70,panelOpacity:1,labelOpacity:1,arrowOpacity:1};
// Independent PC reconstruction of the recovered callback order. It does not
// execute firmware. game-grid owns scroll; this class owns decorator geometry.
export class GameTileFocusMotion{
 constructor(grid,count,{selected=1,focusedInitially=true}={}){
  this.grid=grid;this.selected=this.logicalIndex=this.widgetIndex=selected;this.count=count;this.items=Array.from({length:count},(_,i)=>({...normal,...(focusedInitially&&i===selected?focused:{})}));this.row={y:0,z:0,opacity:1};this.channels=new Map();this.focusInBlocks=new Map();this.pending=null;this.events=[];this.now=0;
  grid.setGapImmediate(focusedInitially?76:4,focusedInitially?75:4,0);
 }
 record(kind,index,time,details={}){this.events.push({time,kind,index,...details});if(this.events.length>500)this.events.shift();}
 sample(now){this.now=now;for(const[key,a]of this.channels){const p=clamp((now-a.start)/Math.max(1,a.duration));if(now<a.start)continue;const f=a.curve(p);a.object[a.property]=a.from+(a.to-a.from)*f;if(p===1)this.channels.delete(key);}for(const[i,b]of this.focusInBlocks)if(now>=b.end)this.focusInBlocks.delete(i);this.grid.sample(now);}
 to(index,target,now,{duration,delay=0,curve,owner}={}){this.sample(now);const object=index==='row'?this.row:this.items[index];if(!object)return;for(const[property,value]of Object.entries(target)){const key=index+'.'+property;if(duration<=0){object[property]=value;this.channels.delete(key);continue;}this.channels.set(key,{object,property,from:object[property],to:value,start:now+delay,duration,curve:tileCurves[curve],owner});}this.record('geometry',index,now,{owner,duration,delay,curve,targets:{...target}});}
 itemOut(index,now){this.focusInBlocks.delete(index);this.to(index,normal,now,{duration:180,curve:'expo',owner:'item-focus-out'});this.grid.setGapTargets(4,4,now,{duration:180,curve:tileCurves.expo,retainActive:!!this.pending});}
 itemIn(index,now){this.to(index,focused,now,{duration:183,delay:50,curve:'aerial',owner:'item-focus-in'});this.focusInBlocks.set(index,{end:now+233});this.grid.setGapTargets(76,75,now,{duration:183,delay:33,curve:aerial});}
 widgetOut(index,now){if(index<0)return;this.focusInBlocks.delete(index);this.to(index,normal,now,{duration:180,curve:'expo',owner:'widget-focus-out'});this.grid.setGapTargets(4,4,now,{duration:180,curve:tileCurves.inOutExpo});this.widgetIndex=-1;}
 widgetIn(index,now){this.sample(now);const block=this.focusInBlocks.get(index);let duration=340;
  if(block)duration=Math.max(0,block.end-now);
  else{this.to(index,focused,now,{duration:340,delay:40,curve:'cubic',owner:'widget-focus-in'});this.focusInBlocks.set(index,{end:now+380});}
  // app30AF IL001D–002F keeps an already-running incoming gap block.
  // Destination widget activation must not restart the logical focus expansion.
  this.grid.setGapTargets(76,75,now,{duration,curve:tileCurves.cubic,retainActive:!!this.pending});this.widgetIndex=index;this.record('widget-focus-in',index,now,{reusedItemBlock:!!block,gapDuration:duration});
 }
 logical(index,now){if(index===this.logicalIndex)return;const old=this.logicalIndex;this.itemOut(old,now);this.itemIn(index,now);this.logicalIndex=index;this.record('logical-index',index,now,{old});}
 ordinary(index,now=performance.now()){
  if(index===this.logicalIndex)return;this.cancelPending(now);this.sample(now);const old=this.logicalIndex;
  // FocusManager dispatches old/new widget children before the common parent
  // ListPanel updates its logical index (Lx1A2). The item callback wins last.
  this.widgetOut(old,now);this.widgetIn(index,now);this.logical(index,now);
  this.selected=index;this.grid.set(index,true,now,{duration:250,ownGap:false});this.record('ordinary-request',index,now);
 }
 rowChange(open,now=performance.now()){
  this.cancelPending(now);this.sample(now);if(open)this.widgetOut(this.logicalIndex,now);else this.widgetIn(this.logicalIndex,now);
  // AreaManager's IsTopMenuLayerFocused flushes the dirty focus scene first.
  // Its subsequent area block replaces individual geometry-property owners.
  for(let i=0;i<this.count;i++){this.to(i,!open&&i===this.logicalIndex?focused:normal,now,{duration:340,curve:'cubic',owner:'area-change'});this.focusInBlocks.delete(i);}
  this.to('row',{y:open?740:0,z:open?100:0,opacity:open?.5:1},now,{duration:340,curve:'cubic',owner:'area-change'});this.grid.set(this.selected,!open,now,{rowDuration:340,ownGap:false});this.record(open?'row-up':'row-down',this.logicalIndex,now);
 }
 bootStart(index=this.selected,now=performance.now()){
  this.cancelPending(now);this.sample(now);this.selected=this.logicalIndex=index;this.widgetIndex=-1;this.focusInBlocks.clear();for(let i=0;i<this.count;i++)this.to(i,normal,now,{duration:0,curve:'linear',owner:'boot-normal'});this.sample(now);this.grid.set(index,false,now,{immediate:true,ownGap:false});this.grid.setGapImmediate(4,4,now);this.record('boot-dummy-focus',index,now);
 }
 bootFinish(now=performance.now()){this.widgetIn(this.selected,now);this.record('boot-finish-focus',this.selected,now);}
 shortcut(index,now=performance.now()){
  this.cancelPending(now);this.sample(now);const old=this.logicalIndex;this.widgetOut(old,now);this.selected=index;const distance=Math.abs(index-old);this.pending={index,direction:Math.sign(index-old)};this.grid.set(index,true,now,{jump:distance>=8,deferFocus:true,duration:250,ownGap:false});
  const relocated=roundEven(this.grid.scroll/204);
  this.pending={index,direction:Math.sign(index-this.grid.scroll/204)};this.record('shortcut-request',index,now,{relocated,thresholdTravel:distance>=8});
 }
 cancelPending(now=performance.now()){if(this.pending)this.record('cancel-pending-focus',this.pending.index,now);this.pending=null;}
 tick(now=performance.now()){
  this.sample(now);let layout=this.grid.layout(this.items,now);
  if(this.pending){const p=this.pending;
   // User-requested destination-only shortcut: no intermediate logical focus.
   if(layout.focusReady){
    // PUI2D24: SetFocusAt first, then set_FocusIndex, then release input lock.
    this.widgetIn(p.index,now);this.logicalIndex=p.index;this.pending=null;this.record('shortcut-widget-activation',p.index,now);
   }
  }
  for(const item of this.items){item.height=item.focusHeight;item.strip=item.panelOpacity;item.arrowX=Math.floor((item.panelWidth-32)/2);}
  return {items:this.items,row:this.row,grid:layout,selected:this.selected,logicalIndex:this.logicalIndex,widgetIndex:this.widgetIndex,pending:!!this.pending};
 }
}


