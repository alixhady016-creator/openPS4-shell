export async function sequenceReview(shell){
 const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(name,passed,detail)=>checks.push({name,passed,detail});
 const timeline=shell.report().bootEvents,at=name=>timeline.find(e=>e.event===name)?.at;
 check('Preview pauses one second before row entrance',at('rowsStarted')-at('popupRequested')>=990&&at('rowsStarted')-at('popupRequested')<1500,timeline);
 check('Initial pop-up follows profile hide',at('popupRequested')>=at('profilesHidden')&&at('profilesHidden')>at('accepted'),timeline);
 check('Audio uses requested approximately nine dB baseline gain',shell.config.audio.musicVolume===.9&&shell.config.audio.effectVolume===1.12,shell.config.audio);
 check('Clock uses loaded extracted SST face',shell.report().clockFont,shell.report().clockFont);
 check('Welcome uses plain PS text',!document.querySelector('#welcome .psbutton')&&document.querySelector('#welcome .welcomeText').textContent.includes('Press the PS button'),document.querySelector('#welcome .welcomeText').textContent);
 check('Controller heading uses original icon and full wording',document.querySelector('#profiles .connected img').complete&&document.querySelector('#profiles .connected').textContent.includes('DUALSHOCK 4 wireless controller connected.'),shell.report().bootText);
 shell.setRow('games');shell.select(1);await wait(650);shell.setRow('functions');await wait(170);let r=shell.report(),tile=r.tiles[1];
 check('Row size and parent movement share the area block',Math.abs((330-tile.s)/130-r.row.y/740)<.025&&tile.s>220&&tile.s<310,{tile,row:r.row});
 await wait(300);r=shell.report();check('Collapsed Start has zero geometry',r.tiles[1].panelHeight===0&&r.tiles[1].focusHeight===200,r.tiles[1]);
 shell.setRow('games');await wait(170);r=shell.report();tile=r.tiles[1];check('Return focus fills space with row movement',Math.abs((tile.s-200)/130-(1-r.row.y/740))<.025&&tile.panelHeight>0&&tile.panelHeight<70,{tile,row:r.row});await wait(350);
 const items=Array.from({length:21},(_,i)=>({name:'Sequence '+i,icon:'gallery',action:'game',id:'review'+i}));shell.setLibrary(items);shell.select(1);await wait(600);shell.input('End');await wait(1200);r=shell.report();const crossed=r.tileSequence.events.filter(e=>e.kind==='logical-index').map(e=>e.index);
 check('Shortcut visits intermediate logical focus',new Set(crossed).size>=3&&r.tileSequence.widgetIndex===r.state.selected&&!r.tileSequence.pending,{crossed,sequence:r.tileSequence});
 shell.setLibrary([]);shell.select(1);await wait(650);await shell.controllerPopup.showControllerConnected({battery:{level:2,charging:false,source:'review'}});await wait(450);let popup=shell.controllerPopup.report();check('Controller pop-up has battery-ready provider state',popup.pose.visible&&popup.pose.x===0&&popup.battery.level===2&&popup.battery.known,popup);
 check('Controller pop-up uses recovered geometry',popup.geometry.height===154&&popup.geometry.controller.x===154&&popup.geometry.battery.x===194,popup.geometry);
 shell.controllerPopup.hide();check('Notification cancellation clears its surface',!shell.controllerPopup.report().pose.visible,shell.controllerPopup.report());
 return checks;
}
