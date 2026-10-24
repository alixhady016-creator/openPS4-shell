// Cached app.exe 6.00: MenuPanel 06008AF2/AF7/AF9, BasicMenuData 06008980,
// MainMenuPanel 0600902D, AdjustDevicesPanel 06008CD8, CustomMenuPanel 06008F50.
import {sceneEase,transformCSS} from './scene-motion.js';
export const QUICK_NATIVE=Object.freeze({openMs:280,closeMs:280,fastCloseMs:100,z:-400,layoutMs:300,rootX:103,rootWidth:430,mainWidth:555,listY:150,listHeight:796,rowHeight:84,separatorHeight:41,separatorY:20,iconX:10,iconY:10,iconSize:64,labelX:94,labelBaseline:52,labelSize:33,titleX:96,titleBaseline:115,headerLineY:135,footerLineY:971,childInset:22,customWidth:437,itemsWidth:667,sortWidth:603,devicesWidth:1182,powerWidth:1147,inactiveOpacity:.4,background:[3,29,97,250/255]});
export function sampleQuickTransition(from,to,elapsed,duration=280){const p=sceneEase.aerial(elapsed/duration);return {z:from.z+(to.z-from.z)*p,opacity:from.opacity+(to.opacity-from.opacity)*p,done:elapsed>=duration};}
export function applyQuickPose(element,pose){element.style.transformOrigin='0 0';element.style.transform=transformCSS(0,0,pose.z);element.style.opacity=String(pose.opacity);}
// This is the cached 6.00 construction path, not a universal factory configuration.
export const QUICK_CATALOG=Object.freeze([
 {id:'friends',nativeId:22,label:'Friends / Online Friends',defaultVisible:true,condition:'CustomizeFriendsMenu selects Friends22 or OnlineFriends4',control:'local empty state'},
 {id:'power',nativeId:5,label:'Power',defaultVisible:true,control:'Windows-backed existing power actions'},
 {id:'accessibility',nativeId:7,label:'Accessibility',defaultVisible:'user-dependent',control:'not implemented in Quick Menu'},
 {id:'onlineStatus',nativeId:8,label:'Online Status',defaultVisible:true,control:'not implemented; no PSN session'},
 {id:'communities',nativeId:10,label:'My Communities',defaultVisible:false,control:'not implemented'},
 {id:'broadcast',nativeId:11,label:'Broadcast',defaultVisible:false,control:'not implemented'},
 {id:'party',nativeId:12,label:'Party',defaultVisible:false,control:'local empty state'},
 {id:'sharePlay',nativeId:13,label:'Share Play',defaultVisible:false,control:'not implemented'},
 {id:'notifications',nativeId:20,label:'Notifications',defaultVisible:true,condition:'CustomizeNotificationMenu gate true in cached static initializer; runtime gates/saved config may differ',control:'existing Windows notification interface'},
 {id:'music',nativeId:6,label:'Music',defaultVisible:'service-dependent',condition:'inserted after Power when service available',control:'not implemented in Quick Menu'},
 {id:'favoriteGroups',nativeId:9,label:'Favorite Groups',defaultVisible:'unresolved',condition:'resource/footage-backed; not constructed by cached default method',control:'not implemented'}
]);

// LayoutAnimation -> AnimationOption.Default: 300ms EaseOutExpoAerial.
export function animateQuickWidth(surface,width){if(surface._nativeWidthTarget===width)return;surface._nativeWidthTarget=width;const from=parseFloat(getComputedStyle(surface).width)||width;surface._nativeWidthAnimation?.cancel();surface.style.width=width+'px';surface._nativeWidthAnimation=surface.animate(Array.from({length:31},(_,i)=>({offset:i/30,width:(from+(width-from)*sceneEase.aerial(i/30))+'px'})),{duration:QUICK_NATIVE.layoutMs,easing:'linear'});}

export function animateQuickCheck(image,from,to){image.animate(Array.from({length:11},(_,i)=>({offset:i/10,opacity:from+(to-from)*sceneEase.aerial(i/10)})),{duration:100,easing:'linear'});}

// PUI06003144 / 06002FB3 / 06002FBB: native 250ms neighbor/reorder curve.
export function quickMoveCurve(t){t=Math.max(0,Math.min(1,t));if(t===0||t===1)return t;if(t<.232)return 2.586207151412964*t;const q=(t-.23199999332427979)/.7680000066757202-1;return .3999999761581421*(q*q*q+1)+.6000000238418579;}
export function snapshotQuickRows(parent){return new Map([...parent.querySelectorAll('.qmRow')].map(r=>{const m=new DOMMatrixReadOnly(getComputedStyle(r).transform);return [r.dataset.key,{y:r.offsetTop+m.f,scale:m.a}];}));}
export function animateQuickRows(parent,before,{picked=null,insert=true}={}){for(const row of parent.querySelectorAll('.qmRow')){const old=before.get(row.dataset.key),scale=row.dataset.key===picked?1.04:1,fromScale=old?.scale??1,dy=old?old.y-row.offsetTop:0;row.style.transformOrigin='50% 0';row.style.transform=`scale(${scale})`;if(old&&(Math.abs(dy)>.01||Math.abs(scale-fromScale)>.001)){const duration=Math.abs(scale-fromScale)>.001?300:250;row.animate(Array.from({length:31},(_,i)=>{const elapsed=i/30*duration;return {offset:i/30,transform:`translateY(${dy*(1-quickMoveCurve(elapsed/250))}px) scale(${fromScale+(scale-fromScale)*sceneEase.aerial(elapsed/300)})`};}),{duration,easing:'linear'});}if(!old&&insert)row.animate(Array.from({length:31},(_,i)=>({offset:i/30,opacity:sceneEase.aerial(i/30)})),{duration:500,easing:'linear'});}}
