import {QuickHold,QUICK_HOLD_MS} from './quick-menu-hold.js';
import {QuickMenu} from './quick-menu.js';
import {GameTileFocusMotion} from './game-tile-motion.js';
import {ControllerNotification} from './controller-notification.js';
import {BootPresentation,healthOpacity} from './boot-presentation.js';
import {SharedLoginLogo} from './shared-logo.js';
import {createProfileStore,LocalProfilesInterface} from './local-profiles.js';
import {SettingsInterface} from './interface-settings.js';
import {NotificationsInterface} from './interface-notifications.js';
import {PowerInterface,transitionInnerPage} from './interface-power.js';
import {InterfaceMotion} from './interface-motion.js';
import {LibraryInterface} from './interface-library.js';
import {WaitInterface} from './interface-wait.js';
import {GameGridMotion} from './game-grid.js';
import {ImmediateEffects} from './immediate-effects.js';
import {drawStartLabel} from './start-label.js';
import {drawCompactProfile} from './compact-profile.js';
import {BusyIndicator,createTileLoadingIcon} from './busy-indicator.js';
import {ProfileLabels} from './profile-labels.js';
import {ProfileFocus} from './profile-focus.js';
import {FunctionMotion} from './function-motion.js';
import {FunctionFocus} from './function-focus.js';
import {GameFocus} from './game-focus.js';
import {SceneMotion,sceneEase,transformCSS,sampleHealth,sampleDashboardBoot,prepareDashboardBootPose} from './scene-motion.js';
import {GAME_LAYOUT,gameTileX,aerial,FocusMotion} from './game-motion.js';
import {Wave} from './wave.js';
import {FooterController,footerHints} from './footer.js';
import {FooterPrompts} from './footer-prompts.js';
const $=id=>document.getElementById(id),delay=ms=>new Promise(r=>setTimeout(r,ms));
let quickMenu=null;
const config=await fetch('config.json').then(r=>r.json());
const profileStore=createProfileStore(config.profile||'Player 1');config.profile=profileStore.active().name;
const profileStyle=document.createElement('link');profileStyle.rel='stylesheet';profileStyle.href='local-profiles.css';document.head.append(profileStyle);const quickStyle=document.createElement('link');quickStyle.rel='stylesheet';quickStyle.href='quick-menu.css';document.head.append(quickStyle);const enrollmentStyle=document.createElement('link');enrollmentStyle.rel='stylesheet';enrollmentStyle.href='profile-enrollment-pages.css';document.head.append(enrollmentStyle);
let localProfileLabels=null,localProfilesReturn=null,guestProfile=null;
let profileCards=[];
const activeProfile=()=>guestProfile||profileStore.active();
try{Object.assign(config.wave.screens,JSON.parse(localStorage.getItem('waveScreens-v4-native')||'{}'));}catch{}
const ease={scroll:t=>t<.232?.6*t/.232:.6+.4*(1-((1-t)/.768)**3),cubic:t=>t<.5?4*t*t*t:1-4*(1-t)**3,out:t=>1-(1-t)**3,expo:t=>t===1?1:1-2**(-10*t),inOutExpo:t=>t===0||t===1?t:t<.5?2**(20*t-10)/2:(2-2**(-20*t+10))/2,inExpo:t=>t===0?0:2**(10*t-10),linear:t=>t};
Object.assign(ease,{aerial});
const scenes=new SceneMotion();let dashboardBoot=null,hasEnteredHome=false,bootPresentation=null,healthStarted=null,controllerPopup=null,sharedLogo=null;
const tweens=new Map();
// One animation per channel. Replacement starts from the current rendered values.
function tween(key,obj,to,duration,curve='out',wait=0,done){
  tweens.set(key,{obj,from:Object.fromEntries(Object.keys(to).map(k=>[k,obj[k]])),to,start:performance.now()+wait,duration,curve,done});
}
const bootEvents=[];
const state={screen:'health',row:'games',selected:1,functionIndex:1,profile:1,ready:false,booting:false,titleGeneration:0};
const row={y:0,z:0,opacity:1},outline={x:278,y:236,w:334,h:402,a:1},label={y:0,a:0},functionLayout={open:0},entrance={x:0,scale:1,a:1};
const functions=[['PlayStation Plus','plus'],['Notifications','notifications'],['Friends','friends'],['Communities','communities'],['Events','events'],['Messages','messages'],['Party','party'],['Profile','profile'],['Trophies','trophies'],['Settings','settings'],['Power','power']];
const utilityEntries=[{name:'Game Library',icon:'library',action:'library'},{name:'Internet Browser',icon:'browser',action:'browser'},{name:'Capture Gallery',icon:'gallery',action:'gallery'},{name:'Music',icon:'music',action:'music'}];
let entries=[{name:'PlayStation Store',icon:'store',action:'store'},{name:'What\'s New',icon:'whatsnew',action:'news'},...utilityEntries];
const functionMotion=new FunctionMotion(functions.length,state.functionIndex),functionFocus=functionMotion.values;
let functionEffect;
const busy=new BusyIndicator($('loader'));let tileGeneration=0,contentLoading=false;
const compactFunctions={0:{x:56,visible:true},1:{x:152,visible:true},2:{x:680,visible:true},7:{x:824,visible:true},8:{x:1258,visible:true}};
let gameFocus,profileFocus;
const grid=new GameGridMotion(1,true);let pendingGridFocus=false,tileMotion=null,lastLogicalTitle=1,shortcutTitlePending=false;
let tiles=[],trackStart=0,previousOutline={...outline},wave,suspended=false;
const legend={a:0,y:68};
const footer=new FooterController(legend,(to,duration)=>tween('legend',legend,to,duration,'aerial'));
let currentHints=[];
const footerPrompts=new FooterPrompts($('hints'));
// Decode once; accepted effects replace the current basic-group voice.
let soundBusy=false,soundSkipped=0,soundCount=0,lastSound=-1000;
const audioContext=new AudioContext(),soundBuffers=new Map();
let effectStarted=0;
const audioReady=Promise.all(['move.wav','up.wav','down.wav','login.wav','logout.wav','select.wav','cancel.wav'].map(async file=>{
  const bytes=await fetch('assets/'+file).then(r=>r.arrayBuffer());soundBuffers.set(file,await audioContext.decodeAudioData(bytes));
}));
const loginMusic=new Audio(config.audio.login),mainMusic=new Audio(config.audio.main);
loginMusic.loop=mainMusic.loop=true;loginMusic.volume=mainMusic.volume=0;
const volumes={login:0,main:0};let muted=false;
let activeInterface=null,interfaceName=null,interfaces={},libraryItems=[];
try{const saved=JSON.parse(localStorage.getItem('orbis-audio')||'null');if(saved){config.audio.musicVolume=Math.max(0,Math.min(1,Number(saved.musicVolume)));config.audio.effectVolume=Math.max(0,Math.min(2,Number(saved.effectVolume)));}}catch{}
try{config.notifications=JSON.parse(localStorage.getItem('orbis-notifications')||'{}');}catch{}
const effects=new ImmediateEffects(audioContext,soundBuffers,{volume:()=>config.audio.effectVolume,muted:()=>muted});
function playSound(file='move.wav'){if(effects.play(file)){soundCount=effects.count;effectStarted=audioContext.currentTime;}}
function music(which){
  const target=config.audio.musicVolume;
  tween('music',volumes,{login:which==='login'?target:0,main:which==='main'?target:0},800,'linear');
  (which==='login'?loginMusic:mainMusic).play().catch(()=>{});
}
function host(action,extra={}){window.chrome?.webview?.postMessage({action,...extra});}
const settingsRequests=new Map();let settingsRequestId=0;
function systemAction(id,payload={}){return new Promise(resolve=>{if(!window.chrome?.webview){resolve({ok:false,message:'System service is not connected.'});return;}const requestId=String(++settingsRequestId),timer=setTimeout(()=>{settingsRequests.delete(requestId);resolve({ok:false,message:'The operation timed out.'});},40000);settingsRequests.set(requestId,result=>{clearTimeout(timer);resolve(result);});host('systemAction',{id,payload,requestId});});}

const homeInterfaceMotion=new InterfaceMotion();
let interfaceTransitionUntil=0;
function restoreHomeInterface(){
  activationFocusHidden=false;
  interfaceTransitionUntil=performance.now()+575;
  homeInterfaceMotion.show($('home'),{direction:'pop'});
  setTreatment(state.row==='functions'?'functions':'home');resetLegend();
}
function closeInterface(){return activeInterface?.close();}
function interfaceClosed(controller){
  if(activeInterface!==controller)return;
  activeInterface=null;interfaceName=null;resetLegend();
}
function openInterface(name){
  if(state.screen!=='home'||state.booting||!interfaces[name]||activeInterface===interfaces[name])return;
  const previous=activeInterface;
  activeInterface=interfaces[name];interfaceName=name;
  if(previous)previous.close();
  else homeInterfaceMotion.hide($('home'),{direction:'push'});
  interfaceTransitionUntil=performance.now()+575;
  $('footer').classList.add('hidden');activeInterface.open();
}
async function powerAction(action){
  if(action==='switchUser'){const previous=activeInterface;activeInterface=null;interfaceName=null;previous?.close();show('profiles');music('login');return;}
  if(action==='logout'){
    const previous=activeInterface;activeInterface=null;previous?.close();activeInterface=interfaces.wait;interfaceName='wait';
    await interfaces.wait.run(async()=>{controllerPopup?.hide();},{minimumMs:2000,message:'Please wait...'});
    activeInterface=null;interfaceName=null;hasEnteredHome=false;state.ready=false;state.row='games';show('welcome');music('login');return;
  }
  if(['restart','rest','turnOff'].includes(action)){host('windowsPower',{id:action});}
}
function initInterfaces(){
 const common={host:$('stage'),profile:activeProfile(),sound:file=>playSound(file.includes('.')?file:file+'.wav')};
 interfaces.localProfiles=new LocalProfilesInterface({...common,store:profileStore,pleaseWait:async(owner,next)=>{const previous=activeInterface,previousName=interfaceName;await owner.motion.hide(owner.element,{direction:'push'});activeInterface=interfaces.wait;interfaceName='wait';try{await interfaces.wait.run(()=>Promise.resolve(),{minimumMs:2000});}finally{activeInterface=previous;interfaceName=previousName;owner.suppressTransition=true;try{await next();}finally{owner.suppressTransition=false;}if(owner.active){owner.element.hidden=false;owner.opening=true;if(owner.focus)owner.focus.canvas.style.opacity='0';await owner.motion.show(owner.element);owner.opening=false;if(owner.focus)owner.focus.canvas.style.opacity='1';}}},onLogin:async profile=>{activeInterface=null;interfaceName=null;guestProfile=null;refreshLocalProfile();const index=profileCards.findIndex(b=>b.dataset.profileId===profile.id);state.profile=Math.max(1,index);await bootHome({direct:true});},onChange:()=>{guestProfile=null;refreshLocalProfile();},onGuest:profile=>{const previous=activeInterface;activeInterface=null;interfaceName=null;previous?.close();guestProfile=profile;refreshLocalProfile();state.profile=1;bootHome({guest:true,direct:true});},onClose:()=>interfaceClosed(interfaces.localProfiles)});
 const closeProfiles=interfaces.localProfiles.close.bind(interfaces.localProfiles);interfaces.localProfiles.close=()=>{if(interfaces.localProfiles.completing){localProfilesReturn=null;return closeProfiles();}if(activeInterface!==interfaces.localProfiles)return closeProfiles();const destination=localProfilesReturn;localProfilesReturn=null;if(destination?.settings){const settings=interfaces.settings;activeInterface=settings;interfaceName='settings';return transferSettingsPage(interfaces.localProfiles,settings,()=>{Object.assign(settings,destination.settings);if(settings.page==='root')settings.showRoot();else settings.buildPage(destination.index);},true);}else{activeInterface=null;interfaceName=null;scenes.show($('profiles'),{direction:'pop'});sharedLogo?.show();renderProfileChoices(true);resetLegend();}return closeProfiles();};
 interfaces.wait=new WaitInterface({host:$('stage')});
 interfaces.settings=new SettingsInterface({...common,onClose:()=>interfaceClosed(interfaces.settings),config,onLocalProfiles:kind=>openLocalProfiles(kind==='button_create_user',['id_account_info','id_privacy_settings'].includes(kind)?{kind:kind==='id_privacy_settings'?'privacy':'account',profile:activeProfile()}:null),onSystemAction:systemAction,onWindowsSettings:id=>host('windowsSettings',{id}),onConfig:()=>{
   localStorage.setItem('orbis-audio',JSON.stringify(config.audio));localStorage.setItem('orbis-notifications',JSON.stringify(config.notifications||{}));music(state.screen==='home'?'main':'login');
 }});
 interfaces.notifications=new NotificationsInterface({...common,onClose:()=>interfaceClosed(interfaces.notifications),onSettings:()=>openInterface('settings'),onRefresh:()=>{host('notificationRefresh');},onWindowsSettings:()=>host('windowsSettings',{id:'notificationaccess'}),pleaseWait:async(task,options)=>{
   const previous=activeInterface,previousName=interfaceName;activeInterface=interfaces.wait;interfaceName='wait';
   try{return await interfaces.wait.run(()=>task,options);}finally{activeInterface=previous;interfaceName=previousName;}
 }});
 interfaces.power=new PowerInterface({...common,onClose:()=>interfaceClosed(interfaces.power),onAction:powerAction});
 interfaces.library=new LibraryInterface({...common,onClose:()=>interfaceClosed(interfaces.library),items:libraryItems,onLaunch:item=>{host('game',{id:item.id});}});
 quickMenu=new QuickMenu({getNotifications:()=>interfaces.notifications.notificationRows(),host:$('stage'),profile:activeProfile(),sound:key=>playSound(key.includes('.')?key:key+'.wav'),config:{volume:Math.round((config.audio.effectVolume||0)*50)},onAction:(id,payload)=>{if(id==='volume'){config.audio.effectVolume=payload.value/50;localStorage.setItem('orbis-audio',JSON.stringify(config.audio));}else if(id==='notifications'){openInterface('notifications');if(payload?.page&&payload.page!=='notifications')interfaces.notifications.showTasks(payload.page);}else if(id==='soundSettings')host('windowsSettings',{id:'sound'});else powerAction(id);}});

 for(const page of [interfaces.settings,interfaces.notifications,interfaces.power,interfaces.library]){
  const close=page.close.bind(page);
  page.close=()=>{if(activeInterface===page&&!page.closing&&(page.active!==false))restoreHomeInterface();return close();};
 }

}
function refreshLocalProfile(){
 const profile=activeProfile();config.profile=profile.name;
 $('profileName').textContent=profile.name;$('profileBadge').textContent=profile.name;$('footerUser').textContent=profile.name;
 $('localUser').querySelector('img').src=profile.avatar;document.querySelector('.footerProfile img').src=profile.avatar;
 const functionImage=$('functions').children[7]?.querySelector('img');if(functionImage)functionImage.src=profile.avatar;
 renderProfileChoices();drawCompactProfile($('profileBadge'),profile.name);
 for(const page of Object.values(interfaces)){page.setProfile?.(profile);const badge=page.element?.querySelector('.plFooterBadge');if(badge){badge.querySelector('img').src=profile.avatar;badge.querySelector('span').textContent=profile.name;}}
 if(controllerPopup){controllerPopup.profileName=profile.name;const image=new Image();image.onload=()=>{if(activeProfile().avatar===profile.avatar)controllerPopup.avatar=image;};image.src=profile.avatar;}
}
function transferSettingsPage(from,to,prepare,backwards=false){
 to.active=false;to.ensureChrome();prepare();to.element.hidden=false;to.element.classList.remove('hidden');to.element.style.opacity='1';to.element.style.transform='none';to.closing=false;to.opening=true;to.lifecycleEpoch=(to.lifecycleEpoch||0)+1;
 const animation=transitionInnerPage(from.content,()=>{from.active=false;from.element.hidden=true;to.active=true;},{backwards,incomingContent:to.content,snapshotHost:to.element});
 return animation.finished.catch(()=>{}).then(()=>{to.opening=false;if(from===interfaces.localProfiles)from.clearCustom();});
}
function openLocalProfiles(create=false,view=null){
 if(!interfaces.localProfiles||state.booting)return;
 const previous=activeInterface;
 localProfilesReturn=state.screen==='profiles'?{chooser:true}:{settings:{page:interfaces.settings.page,pageTitle:interfaces.settings.pageTitle,history:[...interfaces.settings.history],rootIndex:interfaces.settings.rootIndex},index:interfaces.settings.index};
 activeInterface=interfaces.localProfiles;interfaceName='localProfiles';if(previous!==interfaces.settings)previous?.close();
 if(state.screen==='profiles'){scenes.hideApplication($('profiles'));sharedLogo?.hide();}
 $('footer').classList.add('hidden');interfaces.localProfiles.returnAfterCreate=create;if(previous===interfaces.settings){transferSettingsPage(previous,interfaces.localProfiles,()=>interfaces.localProfiles.prepareEntry(create,view));}else interfaces.localProfiles.open(create,view);
}
function dialog(title,text){$('dialog').querySelector('h2').textContent=title;$('dialog').querySelector('p').textContent=text;$('dialog').classList.remove('hidden');resetLegend();}
// LiveAreaScene: a nonempty location starts after 1s; display/location-ready
// stops with a 200ms fade. Boot and tile artwork never own this timer.
function setContentLoading(loading){
 contentLoading=loading;
 if(loading){$('loader').classList.remove('hidden');busy.start(performance.now()+1000);}
 else if(busy.running)busy.stop();
}
window.addEventListener('shell-content-loading',()=>setContentLoading(true));
window.addEventListener('shell-content-ready',()=>setContentLoading(false));
function closeDialog(){playSound('cancel.wav');$('dialog').classList.add('hidden');resetLegend();}
$('dialog').querySelector('button').onclick=closeDialog;
function renderTiles(){
  $('tiles').replaceChildren();
  tiles=entries.map((entry,i)=>{
    const el=document.createElement('div');el.className='tile '+(entry.icon==='store'?'store':entry.icon==='whatsnew'?'':'utility');
    const source=entry.iconUrl||'assets/'+entry.icon+'.png'+(entry.icon==='store'?'?native=NPXS20979-v1':'');const img=document.createElement('img');img.alt=entry.name;img.dataset.asset=entry.icon;img.style.visibility='hidden';el.append(img);const loading=createTileLoadingIcon();el.append(loading);
    const border=document.createElement('div');border.className='tileOutline';const strip=document.createElement('div');strip.className='tileStart';strip.innerHTML=entry.action==='news'?'<img src="assets/down.png" alt="Open">':'Start';el.append(strip,border);if(entry.action!=='news')drawStartLabel(strip,330);const material=document.createElement('div');material.className='tileStartMaterial';strip.prepend(material);
    el.onclick=()=>{if(state.row==='functions')setRow('games');if(state.selected===i)activate();else select(i);};
    $('tiles').append(el);return {el,image:img,loading,source,loaded:false,failed:false,x:gameTileX(i,state.selected),s:i===state.selected?330:200,a:1,focus:i===state.selected?1:0,strip:i===state.selected?1:0};
  });tileMotion=new GameTileFocusMotion(grid,tiles.length,{selected:state.selected,focusedInitially:state.row==='games'&&!state.booting});layoutTiles(0);if(state.screen==='home')loadTileArtwork();
}
functions.forEach(([name,icon],i)=>{
  const el=document.createElement('div');el.className='function';el.innerHTML=`<img src="assets/${icon==='profile'?'profile':'function-icon-'+icon}.png" alt="${name}"><span class="functionCaption">${name}</span>`;
  el.onclick=()=>{if(state.row!=='functions')setRow('functions');if(state.functionIndex!==i){state.functionIndex=i;playSound();updateFunctions();}};
  el.style.pointerEvents='auto';$('functions').append(el);if(icon==='profile')el.append($('profileBadge'));
});
// Each image owns its load completion. Scene movement never awaits artwork.
async function loadTileArtwork(){
 const generation=++tileGeneration;
 for(const tile of tiles){
  tile.loaded=false;tile.failed=false;tile.image.style.visibility='hidden';tile.loading.style.display='';
  const image=new Image();image.src=tile.source;
  image.decode().then(()=>{
   if(generation!==tileGeneration||!tile.el.isConnected)return;
   tile.image.src=tile.source;tile.image.decode().then(()=>{if(generation!==tileGeneration)return;tile.loaded=true;tile.image.style.visibility='';tile.loading.style.display='none';}).catch(()=>{tile.failed=true;});
  }).catch(()=>{tile.failed=true;});
 }
}
function layoutTiles(duration=config.timing.scroll){
 if(duration===0){tileMotion?.bootStart(state.selected,performance.now());if(!state.booting)tileMotion?.bootFinish(performance.now());}
}
function changeTitle(index=state.selected){
  const generation=++state.titleGeneration;
  tween('title',label,{y:-20,a:0},config.timing.titleOut,'inExpo',0,()=>{
    if(generation!==state.titleGeneration)return;
    $('title').textContent=entries[index].name;label.y=36;label.a=0;
    tween('title',label,{y:0,a:1},config.timing.titleIn,'out');
  });
}
function select(index,{shortcut=false}={}){
  if(tileMotion?.pending)return;
  index=Math.max(0,Math.min(entries.length-1,index));if(index===state.selected||state.booting)return;
  const distance=Math.abs(index-state.selected),oldIndex=state.selected,rapid=performance.now()-trackStart<120;
  previousOutline={...outline};trackStart=performance.now();
  state.selected=index;const now=performance.now();shortcutTitlePending=shortcut||distance>1;if(shortcutTitlePending){tileMotion.shortcut(index,now);++state.titleGeneration;tween('title',label,{y:-20,a:0},100,'inExpo');}else{tileMotion.ordinary(index,now);changeTitle(index);}resetLegend();playSound();
}
function updateFunctions(){
 functionMotion.select(state.functionIndex,performance.now());
 if(state.row==='functions')functionEffect?.select($('functions').children[state.functionIndex],functions[state.functionIndex][1]);
 $('functionLabel').textContent=functions[state.functionIndex][0];resetLegend();
}

function setRow(which){
  if(state.screen!=='home'||state.booting||tileMotion?.pending||state.row===which)return;
  state.row=which;const open=which==='functions';gameFocus?.select(open?-1:state.selected);if(!open)functionEffect?.select(null);
  tileMotion.rowChange(open,performance.now());
  tween('function-layout',functionLayout,{open:open?1:0},config.timing.row,'cubic');
  tween('outline-alpha',outline,{a:open?0:1},200,'linear');
  setTreatment(open?'functions':'home');playSound(open?'up.wav':'down.wav');updateFunctions();
}
function resetLegend(){
  currentHints=footerHints({screen:state.screen,row:state.row,index:state.selected,
    count:entries.length,entry:entries[state.selected],enterButton:config.footer?.enterButton||'cross'});
  footerPrompts.draw(currentHints);$('footer').dataset.screen=state.screen;
  $('footer').classList.toggle('hidden',!!activeInterface||!['profiles','home'].includes(state.screen));
  const active=currentHints.length>0&&!activeInterface&&!state.booting&&$('dialog').classList.contains('hidden')&&$('tuner').classList.contains('hidden');
  footer.configure(state.screen==='home'?'auto':state.screen==='profiles'?'manual':'hidden',active);
}
function setTreatment(screen){if(wave){const target=config.wave.screens[screen]||config.wave.screens.home;wave.setPalette(target.palette??(screen==='home'||screen==='functions'?2:1),screen==='home'||screen==='functions'?625:2000);const treatment=Object.fromEntries(['saturation','brightness','opacity'].map(k=>[k,target[k]]));tween('background',wave.treatment,treatment,config.timing.background,'cubic');}}
function show(screen){
  const old=state.screen;state.screen=screen;if(screen==='welcome')bootPresentation?.setWelcomeShown(old==='profiles');
  if(['welcome','profiles'].includes(screen))sharedLogo?.show();else sharedLogo?.hide();
  const page=id=>['welcome','profiles'].includes(id),direction=old==='profiles'&&screen==='welcome'?'pop':'push';
  for(const id of ['health','welcome','profiles','home']){
    if(id===screen){if(page(id))scenes.show($(id),{direction});else{$(id).classList.remove('hidden');$(id).style.opacity='';$(id).style.transform='';}}
    else if(id===old&&page(id)&&page(screen))scenes.hide($(id),{direction});
    else $(id).classList.add('hidden');
  }
  $('footer').classList.toggle('hidden',!['profiles','home'].includes(screen));
  if(screen==='profiles')renderProfileChoices(true);
  setTreatment(screen);resetLegend();
}
function renderProfileChoices(selectActive=false){
 const container=document.querySelector('#profiles .profiles'),users=profileStore.list(),existing=new Map([...container.querySelectorAll('button[data-profile-id]')].map(button=>[button.dataset.profileId,button]));
 const first=$('localUser');profileCards=[$('newUser')];
 users.forEach((profile,index)=>{let button=index===0?first:existing.get(profile.id);if(!button){button=document.createElement('button');button.innerHTML='<img alt=""><span></span>';container.append(button);}button.dataset.profileId=profile.id;button.querySelector('img').src=profile.avatar;button.querySelector('span').textContent=profile.name;button.setAttribute('aria-label',profile.name);if(button===first&&localProfileLabels)button._profileLabels=localProfileLabels;if(button._profileLabels)button._profileLabels.setName(profile.name);else if(!button._labelsLoading){button._labelsLoading=true;ProfileLabels.create(button,{name:profile.name}).then(labels=>{button._profileLabels=labels;const current=profileStore.list().find(p=>p.id===button.dataset.profileId);if(current)labels.setName(current.name);});}button.onclick=()=>{profileSelect(index+1);bootHome();};profileCards.push(button);container.append(button);});
 for(const button of [...container.querySelectorAll('button[data-profile-id]')])if(!profileCards.includes(button))button.remove();
 if(selectActive){const index=users.findIndex(p=>p.id===activeProfile().id);state.profile=index<0?1:index+1;}
 profileSelect(state.profile,true);
}
function profileSelect(i,silent=false){const next=Math.max(0,Math.min(Math.max(0,profileCards.length-1),i));if(next!==state.profile&&!silent)playSound('move.wav');state.profile=next;const scroll=Math.max(0,next*300+540+260-1780);document.querySelector('#profiles .profiles').style.transform=`translateX(${-scroll}px)`;profileFocus?.layout(profileCards.map((_,index)=>540+index*300-scroll));profileFocus?.select(next);profileCards.forEach((button,index)=>button.classList.toggle('selected',index===next));}
async function bootHome({guest=false,direct=false}={}){
  if(state.booting)return;
  if(state.profile===0&&!guest){playSound('up.wav');openLocalProfiles(true);return;}
  if(!guest){const id=profileCards[state.profile]?.dataset.profileId;if(id){profileStore.select(id);guestProfile=null;refreshLocalProfile();}}
  state.booting=true;tweens.delete('function-layout');tweens.delete('outline-alpha');playSound('up.wav');bootEvents.length=0;bootEvents.push({event:'accepted',at:performance.now()});profileFocus?.press();resetLegend();
  if(!direct)await Promise.all([scenes.hideApplication($('profiles')),sharedLogo?.hideRoot(scenes)]);else{$('profiles').classList.add('hidden');sharedLogo?.hide();}
  bootEvents.push({event:'profilesHidden',at:performance.now()});setTreatment('home');
  if(config.notifications?.popups!==false)await controllerPopup?.showControllerConnected({profileName:activeProfile().name,avatarUrl:activeProfile().avatar});bootEvents.push({event:'popupRequested',at:performance.now()});
  // User-requested preview readiness pause, not a recovered firmware timer.
  await delay(config.timing.homeReadyDelay??0);
  dashboardBoot=sampleDashboardBoot(0,{first:true});prepareDashboardBootPose($('games'),$('functions'),dashboardBoot);
  bootEvents.push({event:'prepared',first:true,at:performance.now(),gameOpacity:$('games').style.opacity,functionOpacity:$('functions').style.opacity,gameTransform:$('games').style.transform});
  bootEvents.push({event:'rowsStarted',at:performance.now()});show('home');loadTileArtwork();state.row='games';row.y=row.z=0;row.opacity=1;Object.assign(tileMotion.row,{y:0,z:0,opacity:1});
  label.a=0;outline.a=0;layoutTiles(0);tileMotion.to('row',{y:0,z:0,opacity:1},performance.now(),{duration:0,curve:'linear',owner:'profile-boot'});
  playSound('login.wav');music('main');
  dashboardBoot=scenes.startBoot({first:true,onComplete:({cancelled})=>{
    bootEvents.push({event:'rowsCompleted',at:performance.now()});dashboardBoot=null;state.booting=false;hasEnteredHome=true;state.ready=!cancelled;
    functionLayout.open=0;outline.a=1;
    tileMotion.bootFinish(performance.now());gameFocus?.select(state.selected);changeTitle();resetLegend();if(!cancelled)host('ready');
  }});
}
let activationPending=false,activationStarted=0,activationFocusHidden=false;
// Preview policy: allow the full recovered 500ms press effect before Library entry.
// Native launch handlers dispatch directly; this is not a recovered I/O delay.
async function activate(){
  if(state.booting||activationPending)return;
  if(state.row==='games')gameFocus?.press();playSound('select.wav');
  if(state.row==='functions'){
    const key=functions[state.functionIndex][1];
    if(['settings','power','notifications'].includes(key)){openInterface(key);return;}
    if(key==='profile'){show('profiles');music('login');return;}
    dialog(functions[state.functionIndex][0],'This screen is a local shell recreation. PlayStation Network services are not connected.');return;
  }
  const entry=entries[state.selected];
  if(entry.action==='library'){
    activationPending=true;activationStarted=performance.now();
    try{await delay(500);activationFocusHidden=true;if(state.screen==='home'&&!state.booting)openInterface('library');}
    finally{activationPending=false;}
  }
  else if(['browser','gallery','music','game'].includes(entry.action))host(entry.action,{id:entry.id});
  else dialog(entry.name,entry.action==='store'?'PlayStation Store artwork is shown locally. Purchases and PlayStation Network sign-in are not implemented.':'Your recently used games and applications appear here. Open Game Library to manage your openPS4 games.');
}
function input(key,repeat=false){
  if(['PS','Meta','OS','QuickMenu'].includes(key)&&state.screen==='home'&&!state.booting&&quickMenu){
   if(quickMenu.isOpen)quickMenu.close();else if(!suspended&&!document.hidden&&$('error').classList.contains('hidden')&&$('dialog').classList.contains('hidden')&&$('tuner').classList.contains('hidden')&&!activationPending&&performance.now()>=interfaceTransitionUntil&&!activeInterface?.opening&&!activeInterface?.closing&&!activeInterface?.waiting&&interfaceName!=='wait'&&activeInterface?.content?._pageTransition?.playState!=='running'){quickMenu.profile=activeProfile();quickMenu.open();}return;
  }
  if(quickMenu?.isOpen){quickMenu.key(key);return;}if(quickMenu?.closing)return;
  if(!$('error').classList.contains('hidden'))return;
  if(state.screen==='home'&&!state.booting)footer.interrupt();
  if(key==='F11'){host('fullscreen');return;}if(key==='F2'){toggleTuner();return;}if(key==='F10'){host('legacy');return;}if(key==='m'||key==='M'){muted=!muted;return;}
  if(!$('tuner').classList.contains('hidden')){if(key==='Escape')toggleTuner();return;}
  if(!$('dialog').classList.contains('hidden')){if(['Enter','Escape','Backspace'].includes(key))closeDialog();return;}
  if(activationPending||performance.now()<interfaceTransitionUntil)return;
  if(activeInterface){activeInterface.key(key,repeat);return;}
  if(state.screen==='welcome'){if(['Enter',' ','PS'].includes(key)){playSound('up.wav');music('login');show('profiles');}return;}
  if(state.screen==='profiles'){
    if(['Options','o','O'].includes(key)){dialog('Options Menu','Choose a user to continue. User management is available in Login Settings.');return;}
    if(key==='ArrowLeft')profileSelect(state.profile-1);if(key==='ArrowRight')profileSelect(state.profile+1);if(key==='Enter')bootHome();if(['Escape','Backspace'].includes(key))show('welcome');return;
  }
  if(state.screen!=='home'||state.booting)return;
  if(key==='Options'||key==='o'||key==='O'){if(state.row==='games')openInterface('library');return;}
  if(key==='ArrowDown'&&state.row==='games'&&entries[state.selected].action==='news'){activate();return;}
  if(key==='ArrowUp'&&!repeat)setRow('functions');
  else if(['ArrowDown','Escape','Backspace'].includes(key)&&!repeat)setRow('games');
  else if(key==='Enter')activate();
  else if(['Home','End','L1','R1'].includes(key)&&state.row==='games')select(['Home','L1'].includes(key)?0:entries.length-1,{shortcut:true});
  else if(['ArrowLeft','ArrowRight'].includes(key)){
    const d=key==='ArrowLeft'?-1:1;
    if(state.row==='games')select(state.selected+d);else{const next=Math.max(0,Math.min(functions.length-1,state.functionIndex+d));if(next!==state.functionIndex){state.functionIndex=next;playSound();updateFunctions();}}
  }
}
window.addEventListener('touchstart',()=>{if(!window.reviewRunning)footer.interrupt();},{passive:true});
window.addEventListener('pointerdown',()=>{if(!window.reviewRunning&&state.screen==='home')footer.interrupt();},{passive:true});
document.addEventListener('visibilitychange',()=>footer.suspend(document.hidden||suspended));
const keyboardQuickHold=new QuickHold();let keyboardQuickTimer=0;
function releaseKeyboardQuick(){clearTimeout(keyboardQuickTimer);keyboardQuickHold.release();}
window.addEventListener('keydown',e=>{if(window.reviewRunning)return;if(['Meta','OS'].includes(e.key)){e.preventDefault();if(keyboardQuickHold.started===null){keyboardQuickHold.press(performance.now());keyboardQuickTimer=setTimeout(()=>{if(document.hasFocus()&&!document.hidden&&!suspended&&keyboardQuickHold.update(performance.now()))input('QuickMenu');},QUICK_HOLD_MS+1);}return;}if(e.target instanceof HTMLInputElement)return;e.preventDefault();input(e.key,e.repeat);});
window.addEventListener('keyup',e=>{if(['Meta','OS'].includes(e.key)){e.preventDefault();releaseKeyboardQuick();}});
window.addEventListener('blur',releaseKeyboardQuick);

$('newUser').onclick=()=>{profileSelect(0);bootHome();};$('localUser').onclick=()=>{profileSelect(1);bootHome();};$('welcome').onclick=()=>input('Enter');
function toggleTuner(){
  const closed=$('tuner').classList.toggle('hidden');resetLegend();
  if(!closed){const screen=state.row==='functions'?'functions':state.screen,settings=config.wave.screens[screen]||config.wave.screens.home;
    for(const name of ['saturation','brightness']){$(name).value=settings[name];$(name).oninput=()=>{settings[name]=Number($(name).value);setTreatment(screen);};}
  }
}
$('closeSettings').onclick=toggleTuner;
$('saveSettings').onclick=()=>{localStorage.setItem('waveScreens-v4-native',JSON.stringify(config.wave.screens));host('saveWave',{screens:config.wave.screens});toggleTuner();};
function size(){const scale=Math.min(innerWidth/1920,innerHeight/1080);$('viewport').style.width=1920*scale+'px';$('viewport').style.height=1080*scale+'px';$('viewport').style.left=(innerWidth-1920*scale)/2+'px';$('viewport').style.top=(innerHeight-1080*scale)/2+'px';$('stage').style.transform=`scale(${scale})`;}
window.addEventListener('resize',size);size();renderTiles();updateFunctions();
$('profileName').textContent=config.profile;$('profileBadge').textContent=config.profile;$('footerUser').textContent=config.profile;
let gpPrev=[],gpRepeat=0,gpNeedsSync=true;const controllerQuickHold=new QuickHold();
function gamepad(t){
  if(suspended||document.hidden||!document.hasFocus()||window.reviewRunning){gpNeedsSync=true;gpPrev=[];controllerQuickHold.release();return;}const p=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);if(!p){gpNeedsSync=true;gpPrev=[];controllerQuickHold.release();return;}if(gpNeedsSync){gpPrev=p.buttons.map(b=>b.pressed);controllerQuickHold.release();gpNeedsSync=false;return;}
  const map={0:'Enter',1:'Escape',4:'Home',5:'End',9:'Options',12:'ArrowUp',13:'ArrowDown',14:'ArrowLeft',15:'ArrowRight',16:'PS'};
  for(const [i,key] of Object.entries(map)){const pressed=p.buttons[i]?.pressed;if(key==='PS'){if(!pressed)controllerQuickHold.release();else if(!gpPrev[i]){if(state.screen==='home')controllerQuickHold.press(t);else input(key);}if(controllerQuickHold.update(t))input('QuickMenu');gpPrev[i]=pressed;continue;}if(pressed&&!gpPrev[i]){input(key);gpRepeat=t+350;}else if(pressed&&(['ArrowLeft','ArrowRight'].includes(key)||(quickMenu?.isOpen&&['ArrowUp','ArrowDown'].includes(key)))&&t>gpRepeat){input(key,true);gpRepeat=t+95;}gpPrev[i]=pressed;}
}
let clockText='';
const clockCanvas=document.createElement('canvas');clockCanvas.width=448;clockCanvas.height=128;clockCanvas.style.width='224px';clockCanvas.style.height='64px';$('clock').replaceChildren(clockCanvas);
function drawClock(){const text=new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});if(text===clockText)return;clockText=text;const c=clockCanvas.getContext('2d');c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,224,64);c.font='300 33px PS4System';c.fillStyle='white';c.textAlign='right';c.textBaseline='alphabetic';c.fillText(text,224,43);}
function frame(t){
  if(healthStarted!==null&&state.screen==='health')$('health').querySelector('p').style.opacity=healthOpacity(t-healthStarted);
  const bootPose=scenes.update(t);if(bootPose){dashboardBoot=bootPose;functionLayout.open=bootPose.open;}
  for(const [key,a] of tweens){
    if(t<a.start)continue;const p=Math.min(1,(t-a.start)/Math.max(1,a.duration)),f=ease[a.curve](p);
    for(const k in a.to)a.obj[k]=a.from[k]+(a.to[k]-a.from[k])*f;
    if(p===1){tweens.delete(key);a.done?.();}
  }
  const tilePose=tileMotion?.tick(t);
  if(tilePose){Object.assign(row,tilePose.row);tilePose.items.forEach((v,i)=>Object.assign(tiles[i],v));gameFocus?.select(tilePose.widgetIndex,t);if(shortcutTitlePending&&!tilePose.grid.scrolling){shortcutTitlePending=false;changeTitle(tilePose.logicalIndex);}lastLogicalTitle=tilePose.logicalIndex;}
  tiles.forEach(tile=>{tile.el.style.left=tile.x+'px';tile.el.style.width=tile.el.style.height=tile.s+'px';tile.el.style.opacity=tile.a;
    const border=tile.el.querySelector('.tileOutline'),strip=tile.el.querySelector('.tileStart');
    border.style.opacity=tile.focus*outline.a;border.style.height=(tile.focusHeight+4)+'px';
    Object.assign(strip.style,{top:tile.panelY+'px',height:tile.panelHeight+'px',width:tile.panelWidth+'px',opacity:1,overflow:'visible'});
    strip.querySelector('.tileStartMaterial').style.opacity=tile.panelOpacity;const arrow=strip.querySelector('img');if(arrow){arrow.style.left=tile.arrowX+'px';arrow.style.opacity=tile.panelOpacity*tile.arrowOpacity;}else{drawStartLabel(strip,tile.panelWidth);strip.querySelector('canvas').style.opacity=tile.panelOpacity*tile.labelOpacity;}
    tile.el.style.setProperty('--tile-size',tile.s+'px');
  });
  gameFocus?.draw(tiles,t,activationFocusHidden||(activationPending&&t-activationStarted>=500)?0:1);profileFocus?.draw(t);
  const selected=tiles[state.selected];outline.x=selected.x-2;outline.w=selected.s+4;outline.h=selected.s+74;
  $('title').style.transform=`translateY(${label.y}px)`;$('title').style.opacity=label.a*(1-functionLayout.open);
  const bp=state.booting?dashboardBoot:null;
  $('games').style.transform=transformCSS(bp?.game.x??0,row.y+(bp?.game.y??0),row.z+(bp?.game.z??0));$('games').style.opacity=row.opacity*(bp?.game.opacity??1);
  $('functions').style.opacity='1';$('functions').style.transformOrigin='0 0';$('functions').style.transform=transformCSS(bp?.functionRow.x??0,0,bp?.functionRow.z??0);
  functionMotion.tick(t);
  [...$('functions').children].forEach((el,i)=>{
    const pose=functionMotion.layout(i,functionLayout.open,compactFunctions,{entranceAlpha:bp?.functionRow.opacity??1});
    if(bp?.functionLayout){const b=bp.functionLayout,c=compactFunctions[i]??{x:680,visible:false};pose.x=c.x+((100+1592*i/(functions.length-1))-c.x)*b.spread;pose.y=b.y;pose.scale=b.scale;pose.labelOpacity=0;pose.opacity=((c.visible?1:0)*(1-b.spread)+.5*b.spread)*(bp.functionRow.opacity??1);}
    el.style.left=pose.x+'px';el.style.top=pose.y+'px';el.style.transform='none';
    el.querySelector('img').style.transform=`scale(${pose.scale})`;
    const caption=el.querySelector('.functionCaption');caption.style.opacity=pose.labelOpacity;caption.style.top=pose.labelY+'px';caption.style.transform=`translateX(-50%) scale(${pose.labelScale})`;caption.style.transformOrigin='50% 0';
    el.style.opacity=pose.opacity;el.style.pointerEvents=pose.pointerEvents;
  });
  functionEffect?.draw(t,functionLayout.open,functionFocus[state.functionIndex].s);
  $('functionLabel').style.opacity=0;
  footer.update(t);
  $('footer').style.opacity=state.booting?0:legend.a;$('footer').style.transform=`translateY(${legend.y}px)`;
  $('functionLabel').style.left=(106+state.functionIndex*1580/(functions.length-1)+64-960)+'px';
  $('clock').style.visibility=bp&&!bp.clock?'hidden':'visible';
  for(const page of [interfaces.settings,interfaces.notifications,interfaces.localProfiles])page?.update?.(t);busy.update(t);if(!busy.running&&!contentLoading)$('loader').classList.add('hidden');
  drawClock();$('profileBadge').style.opacity=state.booting?0:.9*(1-functionLayout.open);
  loginMusic.volume=muted?0:volumes.login;mainMusic.volume=muted?0:volumes.main;
  if(!tweens.has('music')){if(volumes.login===0)loginMusic.pause();if(volumes.main===0)mainMusic.pause();}
  gamepad(t);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.shellErrors=[];window.addEventListener('error',e=>window.shellErrors.push(e.message));window.addEventListener('unhandledrejection',e=>window.shellErrors.push(String(e.reason)));
window.shell={get quickMenu(){return quickMenu;},get controllerPopup(){return controllerPopup;},get interfaces(){return interfaces;},openInterface,closeInterface,get sharedLogo(){return sharedLogo;},setContentLoading,input,setRow,select,state,show,bootHome,config,get wave(){return wave;},
  setLibrary(items){libraryItems=items;interfaces.library?.setItems?.(items);gameFocus?.select(-1);entries=entries.slice(0,2).concat(items,utilityEntries);state.selected=Math.min(state.selected,entries.length-1);renderTiles();if(state.screen==='home'&&state.row==='games'&&!state.booting)gameFocus?.select(state.selected);resetLegend();},
  report(){return {quickMenu:quickMenu?.report(),sharedLogo:sharedLogo?.report(),interfaceName,activationFeedback:{pending:activationPending,hidden:activationFocusHidden},interfaceTransition:{until:interfaceTransitionUntil,home:homeInterfaceMotion.report()},interfaces:Object.fromEntries(Object.entries(interfaces).map(([key,value])=>[key,value.report()])),bootEvents:bootEvents.map(e=>({...e})),notification:controllerPopup?.report(),tileSequence:tileMotion?{logicalIndex:tileMotion.logicalIndex,widgetIndex:tileMotion.widgetIndex,pending:!!tileMotion.pending,events:tileMotion.events.slice(-30),grid:{upper:grid.upper,lower:grid.lower,scroll:grid.scroll}}:null,bootText:bootPresentation?.report(),clockFont:document.fonts.check('300 33px PS4System'),state:{...state},waveBoot:wave?.nativeBoot?{...wave.nativeBoot}:null,waveFrames:wave?.frames,wavePhase:wave?.phase,glError:wave?.gl?.getError(),focusGlError:gameFocus?.gl?.getError(),tileCount:tiles.length,tiles:tiles.map(t=>({x:t.x,s:t.s,focus:t.focus,strip:t.strip,panelY:t.panelY,panelHeight:t.panelHeight,panelOpacity:t.panelOpacity,focusHeight:t.focusHeight,loaded:t.loaded,failed:t.failed})),functionFocus:functionFocus.map(f=>({...f})),outline:{...outline},row:{...row},title:$('title').textContent,soundCount,soundBusy:!!effects.active,soundSkipped,effectTime:audioContext.currentTime-effectStarted,soundEvents:effects.events.map(e=>({...e})),footerVisual:footerPrompts.report(),legend:{...legend,...footer.report(),hints:currentHints.map(h=>h.key)},audio:{loginReady:loginMusic.readyState,mainReady:mainMusic.readyState,mainSource:mainMusic.currentSrc,loginPlaying:!loginMusic.paused,mainPlaying:!mainMusic.paused},profileChoices:profileCards.map(button=>({id:button.dataset.profileId||'new',name:button.getAttribute('aria-label')||'New User'})),activeUser:{id:activeProfile().id,guest:!!guestProfile},profileFocus:profileFocus?.report(),functionEffect:functionEffect?.report(),busy:{running:busy.running,pattern:busy.current?.code},sceneMotion:scenes.report(),dashboardBoot,gameProjection:transformCSS(0,row.y,row.z),tweens:tweens.size,errors:window.shellErrors};}
};
window.chrome?.webview?.addEventListener('message',e=>{
  if(e.data.library)window.shell.setLibrary(e.data.library);
  if(e.data.settingsResult){const reply=e.data.settingsResult;settingsRequests.get(reply.requestId)?.(reply.result);settingsRequests.delete(reply.requestId);}
  if(e.data.windowsSystem)interfaces.settings?.SetSystemData(e.data.windowsSystem);
  if(e.data.windowsNotifications){interfaces.notifications?.setWindowsData(e.data.windowsNotifications);quickMenu?.refreshNotifications();}
  if('suspended' in e.data){suspended=e.data.suspended;footer.suspend(suspended||document.hidden);wave.paused=suspended;if(suspended){loginMusic.pause();mainMusic.pause();/* Let already-started effects finish their tails. */}else music(state.screen==='home'?'main':'login');}
});
try{
  await document.fonts.load('300 33px PS4System');clockText='';bootPresentation=await BootPresentation.create();sharedLogo=await SharedLoginLogo.create($('stage'));controllerPopup=await ControllerNotification.create($('stage'),{profileName:config.profile,avatarUrl:activeProfile().avatar});
  await drawCompactProfile($('profileBadge'),config.profile);
  [,localProfileLabels]=await Promise.all([ProfileLabels.create($('newUser'),{name:'New User',newUser:true}),ProfileLabels.create($('localUser'),{name:config.profile})]);refreshLocalProfile();
  profileFocus=await ProfileFocus.create($('profiles'));renderProfileChoices(true);
  functionEffect=new FunctionFocus($('functions'));await functionEffect.init();
  wave=new Wave($('wave'),config.wave);[,,gameFocus]=await Promise.all([wave.init(),audioReady,GameFocus.create($('games'))]);wave.treatment={...config.wave.screens.health,brightness:1};wave.setPalette(0,0);wave.setPalette(1,2000);wave.startBoot();
  initInterfaces();healthStarted=performance.now();
  host('loaded');await delay(3000);show('welcome');music('login');
}catch(e){$('error').textContent='The live background could not start.\n'+e.message;$('error').classList.remove('hidden');host('error',{message:String(e)});}



