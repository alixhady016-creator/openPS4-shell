// Firmware 6.00 layout_system_area_scene2 plus app06003281/3497/349D/E.
// All coordinates are logical 1920x1080. Baselines are not CSS box tops.
export const SHELL_TEXT=Object.freeze({
 functionCaption:Object.freeze({size:26,weight:0,x:-43,y:140,width:214,height:30,align:'center',verticalAlign:'middle',pivotX:64,pivotY:64}),
 compactProfile:Object.freeze({size:26,weight:2,x:98,baseline:73,maxWidth:344,opacity:.9}),
 clock:Object.freeze({size:33,weight:2,x:1600,y:71,width:224,baseline:43,right:1824,screenBaseline:114,opacity:.9,align:'right'}),
 notificationCount:Object.freeze({size:22,weight:3,x:96,y:18,width:48,height:24,baseline:36,textAlpha:.75}),
 gameTitle:Object.freeze({size:60,weight:2,x:638,y:545,width:994,height:60,liveWidth:645,verticalAlign:"middle"}),
 healthWarning:Object.freeze({size:40,weight:2,y:0,height:1080,maxWidth:1440,align:"left",verticalAlign:"middle"})
});
// `open` is the already-eased, interruptible SystemAreaPanel 340ms track.
// PUI Opacity writes in AnimationBlock are captured animation endpoints.
export function compactProfileText(open,pose){
 const q=Math.max(0,Math.min(1,open));
 return {x:pose.x+98,baseline:pose.y+73,opacity:.9*(1-q),maxWidth:344,size:26};
}


