// In-app review tests use the production input/state/render paths.
export async function navigationReview(shell) {
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),checks=[];
  const check=(name,passed,detail)=>checks.push({name,passed,detail});
  shell.select(1);await wait(500);
  const visual=shell.report().footerVisual;
  check('Original footer font and native glyph geometry',visual.ready&&visual.fontSize===30&&visual.gap===40&&visual.geometry[0]?.x===106&&visual.geometry[0]?.iconWidth===64&&visual.geometry[0]?.textX===170&&visual.geometry.every(g=>g.baseline===40&&g.iconHeight===36),visual);

  const before=shell.report();let positions=[];shell.input('ArrowRight');
  for(let i=0;i<12;i++){await wait(16);positions.push(shell.report().tiles);}
  await wait(350);check('Outgoing outline fades on its own shrinking tile',positions.some(ts=>ts[1].focus>0&&ts[1].focus<1&&ts[1].s<330)&&positions.at(-1)[2].focus>0,positions);
  shell.input('ArrowUp');await wait(80);shell.input('ArrowDown');await wait(450);
  let r=shell.report();check('Quick Up then Down settles at game row',r.state.row==='games'&&r.row.y===0&&r.row.opacity===1,r.row);check('Selected tile survives reversal',r.state.selected===2,r.state.selected);
  shell.input('ArrowUp');await wait(400);shell.input('ArrowRight');await wait(65);const ff=shell.report().functionFocus;check('Function focus size and opacity interpolate',ff.some(f=>f.s>.5&&f.s<1&&f.a>.5&&f.a<1),ff);shell.input('Escape');await wait(450);
  r=shell.report();check('Back returns to remembered game',r.state.selected===2&&r.state.row==='games',r.state);
  let count=r.soundCount;for(let i=0;i<12;i++)shell.input(i%2?'ArrowLeft':'ArrowRight',true);await wait(550);
  r=shell.report();check('Rapid cursor sounds are coalesced',r.soundCount-count<=2,r.soundCount-count);check('Title matches last focus',r.title==='Game Library',r.title);
  shell.setLibrary(Array.from({length:16},(_,i)=>({name:'Review fixture '+i,icon:'library',action:'game',id:'review-'+i})));
  shell.input('End');await wait(650);r=shell.report();check('R1/End reaches last item in long row',r.state.selected===r.tileCount-1,r.state.selected);
  shell.input('Home');await wait(650);r=shell.report();check('L1/Home reaches first item',r.state.selected===0,r.state.selected);
  shell.input('Home');await wait(250);r=shell.report();check('First tile omits L1',!r.legend.hints.includes('l1')&&r.legend.hints.includes('r1'),r.legend);
  shell.input('End');await wait(250);r=shell.report();check('Last tile omits R1',!r.legend.hints.includes('r1')&&r.legend.hints.includes('l1'),r.legend);
  shell.setLibrary([]);shell.select(1);await wait(550);
  r=shell.report();check('Middle tile has both endpoint hints',r.legend.hints.includes('l1')&&r.legend.hints.includes('r1'),r.legend);

  check('Live wave advances',shell.report().waveFrames>before.waveFrames,shell.report().waveFrames-before.waveFrames);
  check('No WebGL error',shell.report().glError===0,shell.report().glError);
  check('No JavaScript errors',shell.report().errors.length===0,shell.report().errors);
  await wait(1200);shell.select(2);await wait(30);let firstSound=shell.report();shell.select(3);await wait(30);let nextSound=shell.report();
  check('Repeated navigation does not restart the playing voice',nextSound.soundCount===firstSound.soundCount&&nextSound.effectTime>=firstSound.effectTime,{first:firstSound.effectTime,next:nextSound.effectTime,skipped:nextSound.soundSkipped});
  shell.select(1);await wait(350);check('Footer hides when focus changes',shell.report().legend.a===0,shell.report().legend);
  await wait(3100);check('Footer reveals after three-second idle timer',shell.report().legend.a===1,shell.report().legend);
  await wait(9300);check('Footer hides after nine-second display timer',shell.report().legend.a===0,shell.report().legend);
  await wait(3200);check('Footer stays hidden after auto-hide',shell.report().legend.a===0&&shell.report().legend.phase==='stopped',shell.report().legend);
  shell.input('Unmapped');await wait(3400);check('Input without focus change restarts footer',shell.report().legend.a===1,shell.report().legend);
  const events=shell.report().soundEvents;
  check('Started effects finish their decoded duration',events.length>0&&events.every(e=>e.end!==null&&e.end-e.start>=e.duration-.02),events);
  check('Both row transition effects play',events.some(e=>e.file==='up.wav')&&events.some(e=>e.file==='down.wav'),events.filter(e=>e.file==='up.wav'||e.file==='down.wav'));
  window.reviewCompleted=true;
  return checks;
}
