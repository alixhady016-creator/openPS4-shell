// app0600314A: centered SST Light SizeSmall30, baseline44 in70px StartArea.
let fontReady=false;
document.fonts.load('300 30px PS4System').then(()=>{fontReady=true;});
export function drawStartLabel(strip,width){
 let canvas=strip.querySelector('canvas');
 if(!canvas){strip.textContent='';canvas=document.createElement('canvas');canvas.height=70;canvas.setAttribute('aria-label','Start');Object.assign(canvas.style,{position:'absolute',left:'0',top:'0',height:'70px',width:'100%'});strip.append(canvas);}
 const w=Math.max(1,Math.round(width));if(canvas.width===w&&canvas.dataset.drawn&&canvas.dataset.fontReady===String(fontReady))return;
 canvas.width=w;const ctx=canvas.getContext('2d');ctx.font='300 30px PS4System';ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText('Start',width/2,44);canvas.dataset.drawn='1';canvas.dataset.fontReady=String(fontReady);
}
