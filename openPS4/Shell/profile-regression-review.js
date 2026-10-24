export async function profileRegressionReview(shell){
 const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(name,passed,detail)=>checks.push({name,passed,detail}),users=shell.interfaces.localProfiles,store=users.store,original=store.active();
 const second=store.create('Review Second'),third=store.create('Review Third');users.onChange();shell.show('profiles');await wait(650);
 check('Chooser includes New User and every saved user',shell.report().profileChoices.length===store.list().length+1,shell.report().profileChoices);
 const target=shell.report().profileChoices.findIndex(p=>p.id===third.id);while(shell.state.profile<target)shell.input('ArrowRight');while(shell.state.profile>target)shell.input('ArrowLeft');shell.input('Enter');await wait(4500);
 check('Choosing another saved user applies that profile',shell.report().activeUser.id===third.id&&!shell.report().activeUser.guest,shell.report().activeUser);
 check('Profile switch replays the established first Home entrance',shell.report().bootEvents.some(e=>e.event==='prepared'&&e.first===true)&&shell.report().bootEvents.some(e=>e.event==='rowsCompleted')&&!shell.state.booting,shell.report().bootEvents);
 shell.setRow('functions');await wait(650);shell.state.functionIndex=7;shell.input('Enter');await wait(650);
 check('Function Profile opens all-user chooser',shell.state.screen==='profiles'&&shell.report().profileChoices.length===4,shell.report().profileChoices);
 shell.input('ArrowLeft');shell.input('Enter');await wait(4500);check('Function-row profile return also completes Home entrance',shell.report().activeUser.id===second.id&&shell.report().bootEvents.some(e=>e.event==='prepared'&&e.first===true)&&!shell.state.booting,shell.report().activeUser);
 shell.show('profiles');while(shell.state.profile>0)shell.input('ArrowLeft');shell.input('Enter');await wait(700);check('Profile chooser New User opens Create User or Guest menu',shell.report().interfaceName==='localProfiles'&&users.mode==='userType',users.mode);
 const count=store.list().length;await users.items.find(item=>item.label==='Play as a Guest').action();await wait(4500);check('Guest enters Home without creating a persistent user',shell.report().activeUser.guest&&store.list().length===count&&!shell.state.booting,{active:shell.report().activeUser,count:store.list().length});
 store.select(original.id);store.remove(second.id);store.remove(third.id);users.onChange();shell.show('home');
 check('Profile regression flow has no renderer errors',shell.report().errors.length===0,shell.report().errors);return checks;
}
