// app06003497: profile base X824/Y38, name X98, alphabetic baseline73.
export async function drawCompactProfile(host,name){
 await document.fonts.load('300 26px PS4Footer');
 const canvas=document.createElement('canvas');canvas.width=344;canvas.height=128;
 canvas.style.width='344px';canvas.style.height='128px';host.replaceChildren(canvas);
 const ctx=canvas.getContext('2d');ctx.font='300 26px PS4Footer';ctx.fillStyle='white';ctx.textBaseline='alphabetic';
 ctx.beginPath();ctx.rect(0,0,344,128);ctx.clip();ctx.fillText(name,0,73);
}
