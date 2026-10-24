import {sampleDashboardBoot,projectTransform} from './scene-motion.js';
import {footerHints} from './footer.js';
import {busyGlyphPose,randomBusyPattern} from './busy-indicator.js';
export async function correctionReview(shell){
 const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
 const check=(name,passed,detail)=>checks.push({name,passed,detail});
 const boot=sampleDashboardBoot(600),p=projectTransform(0,0,600);
 check('Boot function icons retain serialized top38',boot.functionLayout.y===38&&Math.abs(p.y+(38+64)*p.scale-266.25)<.001,boot);
 check('Boot icon spread is not lower function screen',boot.functionLayout.scale===.5&&boot.functionLayout.labels===0,boot.functionLayout);
 const hints=footerHints({screen:'profiles'});
 check('Login prompts include Cancel and Options Menu',hints.map(x=>x.key).join(',')==='enter,back,options'&&hints[1].text==='Cancel',hints);
 check('Sony loading glyphs rotate as well as scale',busyGlyphPose(.3,0).angle!==0&&busyGlyphPose(.3,0).scale>0&&busyGlyphPose(.3,0).scale<1,busyGlyphPose(.3,0));
 check('Original canonical symbol pattern',randomBusyPattern(true,()=>0).code===12546,randomBusyPattern(true,()=>0));
 shell.setRow('games');shell.select(1);await wait(500);
 let tiles=document.querySelectorAll('.tile');
 check('Whats New down strip has same material as Start',getComputedStyle(tiles[1].querySelector('.tileStartMaterial')).backgroundColor==='rgba(63, 127, 223, 0.298)',getComputedStyle(tiles[1].querySelector('.tileStartMaterial')).backgroundColor);
 check('Artwork decoding settles independently',shell.report().tiles.every(t=>t.loaded&&!t.failed),shell.report().tiles);
 check('No synthetic font weight',getComputedStyle(document.body).fontSynthesis==='none',getComputedStyle(document.body).fontSynthesis);
 shell.setRow('functions');await wait(100);check('Profile name fades during row opening',Number(document.getElementById('profileBadge').style.opacity)>0&&Number(document.getElementById('profileBadge').style.opacity)<.9,document.getElementById('profileBadge').style.opacity);await wait(400);
 for(let i=0;i<15;i++){shell.input('ArrowRight',true);await wait(45);}
 for(let i=0;i<15;i++){shell.input('ArrowLeft',true);await wait(45);}
 await wait(270);let r=shell.report();const beforeEdge=r.soundCount;shell.input('ArrowLeft');check('Blocked function edge is silent',shell.report().soundCount===beforeEdge,shell.report().soundCount);shell.input('ArrowRight');shell.input('ArrowRight');check('Each accepted movement restarts sound',shell.report().soundCount===beforeEdge+2,shell.report().soundEvents.slice(-2));await wait(400);r=shell.report();
 check('Held arrows leave only selected caption visible',r.functionFocus.every((f,i)=>i===r.state.functionIndex?f.label===1:f.label===0),r.functionFocus);
 const active=document.querySelectorAll('.function')[r.state.functionIndex].querySelector('.functionCaption');
 check('Captions use recovered Roman weight',getComputedStyle(active).fontWeight==='400',getComputedStyle(active).fontWeight);
 check('Profile name follows profile base',document.getElementById('profileBadge').parentElement===document.querySelectorAll('.function')[7],document.getElementById('profileBadge').parentElement.className);
 check('Profile name settles hidden after opening',document.getElementById('profileBadge').style.opacity==='0',document.getElementById('profileBadge').style.opacity);
 check('Local shaders report no errors',r.errors.length===0&&!r.functionEffect.error,r.errors);
 shell.setContentLoading(true);await wait(1250);
 check('Live-area loading owns delayed original indicator',shell.report().busy.running&&!document.getElementById('loader').classList.contains('hidden'),shell.report().busy);
 shell.setContentLoading(false);await wait(250);
 check('Display-ready fades loading indicator independently',!shell.report().busy.running&&document.getElementById('loader').classList.contains('hidden'),shell.report().busy);
 return checks;
}
