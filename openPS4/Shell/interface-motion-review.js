// Runtime regression against actual page controllers and rendered geometry.
export async function interfaceMotionReview(shell){
 const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
 const check=(name,passed,detail)=>checks.push({name,passed,detail});
 const home=document.getElementById('home');
 shell.show('home');
 for(const name of ['settings','notifications','library','power']){
  shell.openInterface(name);
  const page=shell.interfaces[name],start={hidden:home.classList.contains('hidden'),opacity:Number(home.style.opacity)};
  await wait(140);
  const mid={home:Number(home.style.opacity),page:Number(page.element.style.opacity),homeTransform:home.style.transform,pageTransform:page.element.style.transform};
  check(name+' entry pairs outgoing Home and incoming page',!start.hidden&&start.opacity>.99&&mid.home>0&&mid.home<1&&mid.page>0&&mid.page<1,{start,mid});
  await wait(510);
  const rect=page.element.getBoundingClientRect(),stage=document.getElementById('stage').getBoundingClientRect();
  const residual=Math.max(Math.abs((rect.left-stage.left)/(stage.width/1920)),Math.abs((rect.top-stage.top)/(stage.width/1920)),Math.abs(rect.width/(stage.width/1920)-1920));
  check(name+' settles at unchanged page rectangle',residual<.1,{logicalPixelResidual:residual});
  if(name==='settings'){
   const rows=[...page.list.children];
   for(let i=0;i<12;i++){shell.input('ArrowDown',true);await wait(12);}
   shell.input('ArrowUp',true);await wait(320);
   const row=page.list.children[page.index],visibleTop=row.offsetTop-page.scroll;
   check('Rapid Settings input preserves rows and final focus visibility',rows.every((r,i)=>r===page.list.children[i])&&visibleTop>=-.1&&visibleTop+row.offsetHeight<=740.1,{index:page.index,scroll:page.scroll,visibleTop,height:row.offsetHeight});
   const divider=getComputedStyle(row,'::after');
   check('Settings divider has fixed alpha without CSS pulse',divider.backgroundColor==='rgba(255, 255, 255, 0.2)'&&divider.animationName==='none',{color:divider.backgroundColor,animation:divider.animationName});
  }
  shell.closeInterface();await wait(140);
  const back={home:Number(home.style.opacity),page:Number(page.element.style.opacity)};
  check(name+' Back pairs incoming Home and outgoing page',back.home>0&&back.home<1&&back.page>0&&back.page<1,back);
  await wait(510);
  check(name+' closes without leaving Home displaced',shell.report().interfaceName===null&&!home.classList.contains('hidden')&&(()=>{const m=new DOMMatrix(getComputedStyle(home).transform);return Math.abs(m.a-1)<1e-6&&Math.abs(m.d-1)<1e-6&&Math.abs(m.e)<.01&&Math.abs(m.f)<.01;})(),{name:shell.report().interfaceName,transform:home.style.transform});
 }
 check('Interface fixes preserve runtime health',shell.report().errors.length===0,shell.report().errors);
 return checks;
}
