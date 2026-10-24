const clamp=t=>Math.max(0,Math.min(1,t));
export const notificationEase=t=>t>=1?1:t<=0?0:1-2**(-10*t);
export function notificationPose(elapsed,width){
  if(elapsed<0||elapsed>=3800)return {x:0,y:130,opacity:0,visible:false};
  if(elapsed<400){const p=notificationEase(elapsed/400);return{x:-width*(1-p),y:130,opacity:p,visible:true};}
  if(elapsed<3400)return{x:0,y:130,opacity:1,visible:true};
  return{x:0,y:130,opacity:1-(elapsed-3400)/400,visible:true};
}
export function notificationGeometry(nameWidth,batteryKnown=true){
  // Inner is FitToChildren. DeviceParam at x52 has40px controller +56px battery.
  const innerWidth=Math.max(52+Math.ceil(Math.min(507,nameWidth)),52+(batteryKnown?96:40));
  return{width:144+innerWidth,height:154,headerWidth:126+innerWidth,innerX:102,avatar:{x:102,y:18,w:32,h:32},name:{x:154,baseline:45},controller:{x:154,y:76,w:40,h:40},battery:{x:194,y:78,w:56,h:36}};
}
export function normalizeBattery(value){
  if(value==null)return{level:3,charging:false,source:'preview',known:false};
  const n=typeof value==='number'?{level:value}:value;
  return{level:Number.isFinite(n.level)?Math.max(0,Math.min(3,Math.round(n.level))):3,charging:!!n.charging,source:n.source||'provider',known:Number.isFinite(n.level),noCharge:!!n.noCharge};
}
function clippedName(c,text){if(c.measureText(text).width<=507)return text;let t=text;while(t&&c.measureText(t+'…').width>507)t=t.slice(0,-1);return t+'…';}
function image(url){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Notification asset failed: '+url));i.src=url;});}
function ninePatch(c,im,x,y,w,h){
  const xs=[0,102,im.width-32,im.width],ys=[0,18,im.height-34,im.height],dx=[x,x+102,x+w-32,x+w],dy=[y,y+18,y+h-34,y+h];
  for(let j=0;j<3;j++)for(let i=0;i<3;i++)c.drawImage(im,xs[i],ys[j],xs[i+1]-xs[i],ys[j+1]-ys[j],dx[i],dy[j],dx[i+1]-dx[i],dy[j+1]-dy[j]);
}
function coloredIcon(im,color){const v=document.createElement('canvas');v.width=im.width;v.height=im.height;const c=v.getContext('2d');c.drawImage(im,0,0);c.globalCompositeOperation='source-in';c.fillStyle=color;c.fillRect(0,0,v.width,v.height);return v;}
export class ControllerNotification {
  static async create(parent,options={}){
    const font=new FontFace('PS4NotificationLight','url(assets/PS4Footer-Light.otf)',{weight:'300'});document.fonts.add(await font.load());
    const names=['tex_bg_notification','tex_bg_notification_bk','tex_device_controller',...Array.from({length:4},(_,i)=>'tex_device_battery_'+i),'tex_device_battery_nocharge'];
    const loaded=await Promise.all(names.map(n=>image('assets/notification/'+n+'.png')));
    const popup=new ControllerNotification(parent,options,Object.fromEntries(names.map((n,i)=>[n,loaded[i]])));
    if(options.avatarUrl)popup.avatar=await image(options.avatarUrl).catch(()=>null);
    return popup;
  }
  constructor(parent,options,assets){
    this.options=options;this.assets=assets;this.profileName=options.profileName||'';this.battery=normalizeBattery(null);this.started=-Infinity;this.generation=0;
    this.canvas=document.createElement('canvas');this.canvas.width=1920;this.canvas.height=1080;Object.assign(this.canvas.style,{position:'absolute',left:'0',top:'0',width:'1920px',height:'1080px',pointerEvents:'none',zIndex:'100'});this.canvas.setAttribute('aria-label','Controller connection notification');parent.append(this.canvas);this.c=this.canvas.getContext('2d');this.icons={};
    for(const mode of ['black','white'])for(const name of Object.keys(assets))if(!name.includes('bg_notification'))this.icons[mode+name]=coloredIcon(assets[name],mode);
    this.tick=now=>{this.render(now-this.started);if(now-this.started<3800)this.raf=requestAnimationFrame(this.tick);};
  }
  async showControllerConnected(update={}){
    const generation=++this.generation;
    if(update.profileName!=null)this.profileName=update.profileName;
    if(update.avatarUrl)this.avatar=await image(update.avatarUrl).catch(()=>null);
    let snapshot=update.battery;
    if(snapshot===undefined&&this.options.batteryProvider){try{snapshot=await this.options.batteryProvider();}catch{snapshot=null;}}
    if(generation!==this.generation)return false;
    this.battery=normalizeBattery(snapshot);this.started=performance.now();cancelAnimationFrame(this.raf);this.tick(this.started);return true;
  }
  render(elapsed){
    const c=this.c;c.clearRect(0,0,1920,1080);c.font='300 30px PS4NotificationLight';this.geometry=notificationGeometry(c.measureText(this.profileName).width,true);const g=this.geometry,p=notificationPose(elapsed,g.width);this.pose=p;if(!p.visible)return;
    c.save();c.translate(p.x,p.y);c.globalAlpha=p.opacity;const dark=this.options.colorMode==='dark';ninePatch(c,this.assets[dark?'tex_bg_notification_bk':'tex_bg_notification'],0,0,g.width,g.height);
    if(!dark){c.fillStyle='rgb(120,120,120)';c.fillRect(0,4,g.headerWidth,58);}c.fillStyle='rgb(0,120,200)';c.fillRect(0,60,g.headerWidth-(dark?2:0),2);
    if(this.avatar)c.drawImage(this.avatar,102,18,32,32);c.fillStyle='rgba(255,255,255,.9)';c.textBaseline='alphabetic';c.fillText(clippedName(c,this.profileName),154,45);
    const mode=dark?'white':'black';c.globalAlpha=p.opacity*.9;c.drawImage(this.icons[mode+'tex_device_controller'],154,76,40,40);
    let level=this.battery.level;
    if(this.battery.charging)level=[0,0,1,1,2,2,3,3][Math.floor(Math.max(0,elapsed)/250)%8];
    const hidden=!this.battery.charging&&level===0&&(Math.floor(Math.max(0,elapsed)/250)%2===1);
    if(!hidden)c.drawImage(this.icons[mode+(this.battery.noCharge?'tex_device_battery_nocharge':'tex_device_battery_'+level)],194,78,56,36);
    c.restore();
  }
  report(){return{profileName:this.profileName,battery:{...this.battery},geometry:this.geometry,pose:this.pose,timing:{enter:400,hold:3000,exit:400},originalAssets:true};}
  hide(){this.generation++;cancelAnimationFrame(this.raf);this.started=-Infinity;this.render(3800);}
  dispose(){this.hide();this.canvas.remove();}
}
