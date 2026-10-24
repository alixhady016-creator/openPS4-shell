// Presentation constants from firmware6.00 LoginMgr RCO and managed layout.
// Text uses the extracted SST Light face and alphabetic baselines. Chromium
// rasterization is retained; these are not claimed as PS4 rasterizer pixels.
export const BOOT_TEXT=Object.freeze({health:'See important health and safety warnings in the Settings menu.',welcome:'Welcome Back to PlayStation',prompt:'Press the PS button to use the controller.',connected:'DUALSHOCK 4 wireless controller connected.',who:'Who is using this controller?'});
export function healthOpacity(ms){const t=Math.max(0,ms),c=p=>p<.5?4*p*p*p:1-(-2*p+2)**3/2;return t<500?c(t/500):t<2500?1:1-c(Math.min(1,(t-2500)/500));}
export class BootPresentation{
  static async create(){
    const face=new FontFace('PS4BootLight','url(assets/PS4Footer-Light.otf)',{weight:'300'});
    await face.load();document.fonts.add(face);
    const icon=new Image();icon.src='assets/controller-heading.png';await icon.decode();return new BootPresentation(icon);
  }
  constructor(icon){
    this.icon=icon;this.welcomeSeen=false;this.canvases={};
    this.health=this.make(document.querySelector('#health p'),'health',1080);
    this.welcome=this.make(document.querySelector('#welcome .welcomeText'),'welcome',1080);
    this.profiles=this.make(document.querySelector('#profiles .profileHeading'),'profiles',400);
    // Baseline canvas replaces browser line-height positioning, retaining text
    // in the DOM for accessibility and keeping the original scene opacity owner.
    document.querySelector('#health p').style.fontSize='0';
    document.querySelectorAll('#welcome .welcomeText h1,#welcome .welcomeText p,#profiles .profileHeading>div').forEach(el=>el.style.visibility='hidden');
    Object.assign(document.querySelector('#profiles .profileHeading').style,{left:'0',top:'0',width:'1920px',height:'400px'});
    this.draw();
  }
  make(parent,key,height){const canvas=document.createElement('canvas');canvas.width=3840;canvas.height=height*2;canvas.className='firmwareBootText';canvas.setAttribute('aria-hidden','true');canvas.style.width='1920px';canvas.style.height=height+'px';parent.append(canvas);this.canvases[key]=canvas;return canvas;}
  context(key){const c=this.canvases[key].getContext('2d');c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,1920,this.canvases[key].height/2);c.fillStyle='white';c.textBaseline='alphabetic';return c;}
  font(c,size){c.font=`300 ${size}px PS4BootLight, sans-serif`;}
  setWelcomeShown(shown){this.welcomeSeen=!!shown;this.drawWelcome();}
  drawWelcome(){const c=this.context('welcome');c.textAlign='center';if(!this.welcomeSeen){this.font(c,40);c.fillText(BOOT_TEXT.welcome,960,508);}this.font(c,33);c.fillText(BOOT_TEXT.prompt,960,this.welcomeSeen?548:590);}
  draw(){
    let c=this.context('health');this.font(c,40);c.textAlign='center';
    // PUI06002733 centers Font.Height, then06002732 adds integer Font.Ascent.
    // Use the loaded font's browser linebox, not an assumed OS/2 typo ascent.
    const hm=c.measureText(BOOT_TEXT.health),ha=hm.fontBoundingBoxAscent??43.08,hd=hm.fontBoundingBoxDescent??9.2;
    const healthBaseline=Math.trunc((1080-ha-hd)/2+ha);
    c.fillText(BOOT_TEXT.health,960,healthBaseline);
    this.drawWelcome();c=this.context('profiles');this.font(c,33);c.textAlign='left';
    const width=c.measureText(BOOT_TEXT.connected).width,iconSize=40,gap=10,left=(1920-width-iconSize-gap)/2;
    const fm=c.measureText(BOOT_TEXT.connected),ascent=fm.fontBoundingBoxAscent??35.541,descent=fm.fontBoundingBoxDescent??7.59;
    const groupHeight=ascent+descent+48,panelY=160+(250-groupHeight)/2,baseline=Math.trunc(panelY+ascent);
    c.drawImage(this.icon,left,baseline-iconSize/2-12,iconSize,iconSize);
    c.fillText(BOOT_TEXT.connected,left+iconSize+gap,baseline);c.fillText(BOOT_TEXT.who,left,baseline+48);
    this.geometry={profileHeading:{x:left,y:panelY,baseline,nextBaseline:baseline+48,width:width+50},welcome:{baseline:508,promptBaseline:this.welcomeSeen?548:590},health:{baseline:healthBaseline,size:40,fontAscent:ha,fontDescent:hd}};
  }
  report(){return {geometry:this.geometry,font:document.fonts.check('300 40px PS4BootLight'),fontFamily:'PS4BootLight',welcomeSeen:this.welcomeSeen};}
}
