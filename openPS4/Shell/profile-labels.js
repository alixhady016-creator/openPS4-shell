// Label_Name font/weight/baseline from layout_user_account_item and
// UserItem2.SetUserPanelPositionAndSize 0600BE89. Canvas uses an alphabetic
// baseline rather than a browser line-height approximation. Font rasterization
// remains Chromium's; this does not claim native PS4 glyph raster equivalence.
let fontsReady;
async function loadFonts(){
  if(!fontsReady)fontsReady=(async()=>{
    const medium=new FontFace('PS4ProfileMedium','url(assets/PS4System-Medium.otf)');
    const light=new FontFace('PS4ProfileLight','url(assets/PS4Footer-Light.otf)');
    const loaded=await Promise.all([medium.load(),light.load()]);loaded.forEach(font=>document.fonts.add(font));
  })();
  return fontsReady;
}
export class ProfileLabels{
  static async create(button,options={}){await loadFonts();return new ProfileLabels(button,options);}
  constructor(button,{name='',newUser=false,status='',plus=false}={}){
    this.name=name;this.newUser=newUser;this.status=status;this.plus=plus;
    this.canvas=document.createElement('canvas');this.canvas.width=260;this.canvas.height=384;
    this.canvas.className='firmwareProfileLabels';this.canvas.setAttribute('aria-hidden','true');
    Object.assign(this.canvas.style,{position:'absolute',left:'0',top:'0',width:'260px',height:'384px',pointerEvents:'none'});
    const span=button.querySelector('span');if(span)span.style.visibility='hidden';
    button.append(this.canvas);this.draw();
  }
  setName(name){this.name=name;this.draw();}
  setStatus(status){this.status=status;this.draw();}
  draw(){
    const ctx=this.canvas.getContext('2d');ctx.clearRect(0,0,260,384);ctx.save();
    ctx.beginPath();ctx.rect(20,260,this.plus?186:220,124);ctx.clip();ctx.textBaseline='alphabetic';
    ctx.font='30px PS4ProfileMedium';ctx.fillStyle='white';ctx.textAlign=this.newUser?'center':'left';
    let name=this.name,width=this.plus?186:220;
    // The original label has text trimming enabled; only clip/truncate overflow,
    // never horizontally stretch glyphs to fit the label rectangle.
    if(ctx.measureText(name).width>width){while(name&&ctx.measureText(name+'…').width>width)name=name.slice(0,-1);name+='…';}
    ctx.fillText(name,this.newUser?130:20,296);
    if(!this.newUser&&this.status){ctx.font='26px PS4ProfileLight';ctx.fillStyle='rgba(255,255,255,.68)';ctx.textAlign='left';ctx.fillText(this.status,20,332);}
    ctx.restore();
  }
}
