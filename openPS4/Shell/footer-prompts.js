// Original PUI layout: 06004362, 060043B9/BB, 060043C1, 06000E3D.
export class FooterPrompts {
  constructor(host) {
    this.canvas=document.createElement('canvas');this.canvas.width=1920;this.canvas.height=136;
    this.canvas.setAttribute('aria-label','Controller prompts');host.replaceChildren(this.canvas);
    this.ctx=this.canvas.getContext('2d');this.images={};this.hints=[];this.geometry=[];this.ready=false;
    this.loaded=Promise.all([document.fonts.load('300 30px PS4Footer'),...['L1','R1','cross','circle','options','separator'].map(async name=>{
      const img=new Image();img.src=`assets/prompt-${name}.png`;await img.decode();this.images[name]=img;
    })]).then(()=>{this.ready=true;this.draw(this.hints);});
  }
  draw(hints) {
    this.hints=hints;if(!this.ready)return;
    const c=this.ctx;c.clearRect(0,0,1920,136);
    // The RCO has one transparent margin row above/below the 2px separator.
    const separator=this.images.separator;c.drawImage(separator,0,1,50,2,0,1,1920,2);
    c.font='300 30px PS4Footer';c.textBaseline='alphabetic';c.fillStyle='#fff';
    let x=106;this.geometry=[];
    for(const hint of hints) {
      const image=this.images[hint.icon],y=40-image.naturalHeight+6;
      c.drawImage(image,x,y);const textX=x+image.naturalWidth;
      c.fillText(hint.text,textX,40);const textWidth=Math.ceil(c.measureText(hint.text).width)+6;
      this.geometry.push({key:hint.key,x,iconWidth:image.naturalWidth,iconHeight:image.naturalHeight,iconY:y,textX,textWidth,baseline:40});
      // PUI 06001B02/06001BA2 reserves 2 + 3 + 1 pixels for themed shadow.
      x=textX+textWidth+40;
    }
    this.canvas.setAttribute('aria-label',hints.map(h=>h.icon+' '+h.text).join('; '));
  }
  report(){return {ready:this.ready,font:'SST-Light',fontSize:30,gap:40,textShadowMarginRight:6,geometry:this.geometry};}
}
