// Recovered from PUI.dll 6.00 OrbisBusyIndicatorStyle 06004272..0600427A.
// Atlas is the original firmware 128x32 image_busyindicator_src, four32px crops.
const clamp=t=>Math.max(0,Math.min(1,t));
const aerial=t=>{const u=(1-clamp(t))**2;return 1-.4*u-.1*u*u-.5*u*u*u;};
export function randomBusyPattern(singleLine=true,random=Math.random,winningChance=.1){
  let code=-1;
  if(random()>=winningChance){
    code=Math.floor(random()*65536);
    if((code&13104)===4368||(code&13059)===4353||(code&12339)===4113||(code&819)===273)code=-1;
    if(!singleLine&&(code&13107)===16)code=-1;
  }
  const canonical=singleLine?12546:291;
  if(code<0)code=canonical;
  return {code,winning:code===canonical,glyphs:Array.from({length:4},(_,i)=>(code>>(i*4))&3)};
}
export function busyGlyphPose(seconds,index){
  const local=seconds-.2*index,phase=((local%2.25)+2.25)%2.25;
  let scale,angle,stage;
  if(phase<.9){const q=1-(1-phase*1.1111111640930176)**4;scale=q;angle=Math.PI*(q-1);stage=0;}
  else if(phase<1.35){scale=1;angle=.001;stage=1;}
  else{const q=((phase-1.35)*1.1111111640930176)**4;scale=1-q;angle=Math.PI*q;stage=2;}
  return {scale:local<0?0:scale,angle,stage};
}
export function busyGlyphLayout(index,{width=96,height=96,singleLine=true,wide=false}={}){
  const size=wide?Math.min(width*.4848484992980957,height*2):Math.min(width,height,64);
  const side=size*.5,pitch=size*.53125,offset=(size-side-pitch)/2;
  return {side,x:(width-size)/2+offset+pitch*(singleLine?index-1:index%2),y:(height-size)/2+offset+pitch*(singleLine?.5:Math.floor(index/2))};
}
export class BusyIndicator{
  constructor(element,{singleLine=true,random=Math.random,now=()=>performance.now(),atlas='assets/busy-symbols.png'}={}){
    this.element=element;this.singleLine=singleLine;this.random=random;this.now=now;this.running=false;
    this.items=Array.from({length:4},()=>{const node=document.createElement('i');element.appendChild(node);return node;});
    // Cancel the previous generated CSS animation at its owner.
    for(const child of [...element.children])if(!this.items.includes(child))child.remove();
    element.style.display='block';element.style.width='96px';element.style.height='96px';element.style.left='912px';element.style.top='770px';
    for(const node of this.items)Object.assign(node.style,{position:'absolute',display:'block',animation:'none',backgroundImage:`url('${atlas}')`,backgroundRepeat:'no-repeat',margin:'0',transformOrigin:'50% 50%'});
  }
  start(t=this.now()){
    this.stopTime=undefined;this.running=true;this.startTime=t;this.previousTime=t;this.previousStage=0;this.flash=0;
    this.current=randomBusyPattern(this.singleLine,this.random,1);this.current.winning=false;this.display=[0,0,0,0];return this;
  }
  stop({quick=false}={}){if(quick){this.running=false;this.items.forEach(n=>n.style.opacity=0);}else this.stopTime=this.now();}
  update(t=this.now()){
    if(!this.running)return;
    const seconds=Math.max(0,(t-this.startTime)/1000),dt=Math.max(0,(t-this.previousTime)/1000);this.previousTime=t;
    const first=busyGlyphPose(seconds,0);
    if(first.stage!==this.previousStage){if(first.stage===0)this.current=randomBusyPattern(this.singleLine,this.random);this.previousStage=first.stage;}
    const stopping=this.stopTime!==undefined?1-aerial((t-this.stopTime)/200):1;
    const entrance=aerial((t-this.startTime)/200);let opacity=.75;
    const fourth=busyGlyphPose(seconds,3);
    if(this.current.winning&&fourth.stage===1){this.flash=.45;this.current.winning=false;}
    if(this.flash>0){opacity=.75+.5555555820465088*this.flash;this.flash-=dt;if(this.flash<=0)opacity=.75;}
    this.items.forEach((node,i)=>{
      const p=busyGlyphPose(seconds,i),l=busyGlyphLayout(i,{singleLine:this.singleLine});
      if(p.stage===0)this.display[i]=this.current.glyphs[i];
      Object.assign(node.style,{left:l.x+'px',top:l.y+'px',width:l.side+'px',height:l.side+'px',backgroundSize:`${l.side*4}px ${l.side}px`,backgroundPosition:`${-this.display[i]*l.side}px 0px`,opacity:opacity*entrance*stopping,transform:`rotate(${p.angle}rad) scale(${p.scale})`});
    });
    if(!stopping){this.running=false;this.stopTime=undefined;}
  }
}
// PUI OrbisImageBoxStyle060043D4,43DC: original static64px loading mark;
// it is not the four-symbol BusyIndicator and has no rotation timeline.
export function createTileLoadingIcon(){
  const image=document.createElement('img');image.src='assets/tile-loading.png';image.className='nativeTileLoading';
  Object.assign(image.style,{position:'absolute',width:'64px',height:'64px',left:'calc(50% - 32px)',top:'calc(50% - 32px)',padding:'0',margin:'0',objectFit:'contain',pointerEvents:'none'});return image;
}
