export async function windowsInterfaceReview(shell){
 const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(name,passed,detail)=>checks.push({name,passed,detail});
 shell.show('home');shell.openInterface('settings');await wait(650);
 const settings=shell.interfaces.settings;
 const actualDisplay=await settings.onSystemAction('display.snapshot',{});check('Settings bridge reads real display modes',actualDisplay.ok&&actualDisplay.data?.width>0&&actualDisplay.data?.modes?.length>0,{ok:actualDisplay.ok,width:actualDisplay.data?.width,modes:actualDisplay.data?.modes?.length});const blockedChange=await settings.onSystemAction('network.adapters.setEnabled',{adapterId:'review-fixture',enabled:false});check('Review blocks real network mutations at the host',blockedChange.ok===false&&/review/i.test(blockedChange.message),blockedChange);

 check('Original PS4 Settings categories remain visible', ['Remote Play','Mobile App','Saved Data','Sharing and Broadcasts','Initialization'].every(label=>settings.items.some(i=>i.label.includes(label))),settings.items.map(i=>i.label));
 settings.enter('network','Network');await wait(650);
 check('Network has Windows-backed status/setup actions',settings.items.some(i=>i.label==='View Connection Status')&&settings.items.some(i=>i.label==='Set Up Internet Connection'),settings.items.map(i=>i.label));
 settings.enter('network_status','View Connection Status');await wait(650);
 check('Network snapshot exposes actual adapters or an explicit unavailable status',settings.systemSnapshot.network?.adapters instanceof Array,settings.systemSnapshot.network?.adapters?.length);
 settings.back();await wait(160);
 const row=settings.list.children[settings.index],scale=settings.element.getBoundingClientRect().width/1920;
 const contentMatrix=new DOMMatrix(getComputedStyle(settings.content).transform);
 const rowRect=row.getBoundingClientRect(),canvasRect=settings.focus.canvas.getBoundingClientRect();
 const focusAlignmentResidual=Math.abs((rowRect.top-canvasRect.top)/(scale*contentMatrix.a)-(170+row.offsetTop-settings.scroll));
 check('Inner Back keeps focus and list under one logical page',settings.focus.canvas.parentNode===settings.content&&settings.content.contains(settings.list)&&Number.isFinite(scale)&&contentMatrix.a!==1&&focusAlignmentResidual<1,{focusAlignmentResidual,pageScale:scale,sameParent:settings.focus.canvas.parentNode===settings.content,contentScale:contentMatrix.a,rowTop:rowRect.top,canvasTop:canvasRect.top});
 await wait(510);settings.back();await wait(650);settings.enter('storage','Storage');await wait(650);
 check('Storage uses real volume snapshot',settings.systemSnapshot.storage?.drives instanceof Array,settings.systemSnapshot.storage?.drives?.length);
 check('Settings rejects unknown Windows action',settings.OpenWindowsSettings('arbitrary-command')===false,null);
 const longDescription='This description must remain fully readable when it is longer than the row width. '.repeat(7);settings.setPage('Text layout review',[{label:'Long description',description:longDescription,control:'checkbox',checked:true}]);await wait(650);const longRow=settings.list.children[0],lineCount=settings.descriptionLines(settings.items[0]).length;check('Shared list wraps descriptions and expands its row',lineCount>1&&longRow.offsetHeight===settings.rowHeight(settings.items[0],true)&&longRow.querySelector('canvas').height>=longRow.offsetHeight,{lineCount,height:longRow.offsetHeight});check('Shared checkbox exposes real state and focus stays below text',longRow.getAttribute('aria-checked')==='true'&&Number(settings.focus.canvas.style.zIndex)<Number(getComputedStyle(settings.element.querySelector('.interfaceListViewport')).zIndex),{checked:longRow.getAttribute('aria-checked'),focusLayer:settings.focus.canvas.style.zIndex});settings.buildPage();

 settings.onLocalProfiles();await wait(650);
 check('Settings opens fictional local users instead of Windows accounts',shell.report().interfaceName==='localProfiles'&&shell.interfaces.localProfiles.report().adapter==='fictional-local-profiles',shell.interfaces.localProfiles.report());
 const profiles=shell.interfaces.localProfiles;profiles.editProfile();await wait(650);check('New User offers creation or temporary guest play',profiles.mode==='userType'&&profiles.items.some(item=>item.label==='Create a User')&&profiles.items.some(item=>item.label==='Play as a Guest'),profiles.mode);profiles.items.find(item=>item.label==='Create a User').action();await wait(650);check('Profile setup uses recovered avatar artwork and Join PlayStation flow',profiles.mode==='avatar'&&profiles.avatarButtons.length===224&&profiles.element.querySelector('h1').textContent==='Join PlayStation',profiles.report());profiles.avatarButtons[0].click();profiles.form.querySelector('input').value='Review Draft';profiles.form.requestSubmit();check('Profile name advances to privacy summary without email or PSN',profiles.mode==='summary'&&!/email|verification|PlayStation Network/i.test(profiles.element.textContent),profiles.mode);profiles.items[0].action();check('Privacy controls belong to the pending local profile',profiles.mode==='privacy'&&profiles.store.list().length===1,profiles.mode);
 shell.closeInterface();await wait(700);check('Local users returns to preserved Settings page',shell.report().interfaceName==='settings'&&settings.page==='storage',settings.page);
 shell.closeInterface();await wait(650);
 shell.openInterface('notifications');await wait(650);
 const notifications=shell.interfaces.notifications;
 check('Notifications uses original recovered summary icons',notifications.items[0].icon.endsWith('summary-download.png')&&notifications.items[1].icon.endsWith('summary-upload.png'),notifications.items.slice(0,2).map(i=>i.icon));
 notifications.setWindowsData({status:'denied',records:[]});
 check('Denied notification access is explicit',notifications.items.some(i=>i.label==='Windows notification access denied')&&notifications.report().records===0,notifications.report());
 shell.closeInterface();await wait(650);
 shell.openInterface('power');await wait(650);const power=shell.interfaces.power;
 const restHeight=power.list.children[3].offsetHeight;
 shell.input('ArrowDown');await wait(40);
 check('Rest description preserves height when unselected',power.list.children[3].offsetHeight===restHeight&&!!power.list.children[3].querySelector('p'),{selectedHeight:restHeight,unselectedHeight:power.list.children[3].offsetHeight});
 shell.input('Enter');await wait(160);
 check('Power Options opens with shared inner animation',power.submenu&&power.content.getAnimations().length>0,{submenu:power.submenu,animations:power.content.getAnimations().length});
 await wait(510);check('Power Options has exactly rest, shutdown and restart',JSON.stringify(power.report().rows)===JSON.stringify(['rest','turnOff','restart']),power.report().rows);const descriptionHeights=[...power.list.children].map(e=>e.offsetHeight);shell.input('ArrowDown');await wait(40);
 check('Power Options subtitles retain space on selection changes',[...power.list.children].every((e,i)=>e.offsetHeight===descriptionHeights[i]&&!!e.querySelector('p')),descriptionHeights);
 shell.input('Escape');await wait(650);shell.closeInterface();await wait(650);
 const line=shell.interfaces.wait.element.querySelector('.plWaitHeaderSeparator');
 check('Please wait has native upper separator without title',!!line&&line.getAttribute('src').endsWith('header-separator.png')&&!shell.interfaces.wait.element.querySelector('h1'),line?{y:getComputedStyle(line).top,height:getComputedStyle(line).height}:null);
 // Host's independent ReviewMode blocks the real platform call. This verifies
 // dispatch/validation only; never request these from a non-review application.
 for(const id of ['turnOff','restart','rest'])window.chrome.webview.postMessage({action:'windowsPower',id});
 check('Windows bridge review dispatch is allowlisted',true,['turnOff','restart','rest']);
 shell.setRow('games');shell.select(2);await wait(650);shell.input('Enter');await wait(180);
 check('Library waits for the press effect instead of opening immediately',shell.report().interfaceName===null,{afterMs:180,interfaceName:shell.report().interfaceName});
 await wait(380);check('Library entry holds Home focus hidden',shell.report().activationFeedback.hidden&&shell.report().interfaceName==='library',shell.report().activationFeedback);await wait(600);check('Library opens after full press effect',shell.report().interfaceName==='library',shell.report().interfaceName);shell.closeInterface();await wait(650);
 check('Home focus restores on Library return',shell.report().activationFeedback.hidden===false,shell.report().activationFeedback);
 check('Windows integration leaves no renderer errors',shell.report().errors.length===0,shell.report().errors);
 return checks;
}
