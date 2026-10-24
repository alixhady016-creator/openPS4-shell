// Every accepted UI action creates a fresh attack. The firmware basic group is
// one voice; replacement stops its previous tail instead of suppressing input.
// Sony priority scheduling is deliberately outside this small navigation adapter.
export class ImmediateEffects {
  constructor(context,buffers,{volume=()=>1,muted=()=>false,onEvent=()=>{}}={}){
    this.context=context;this.buffers=buffers;this.volume=volume;this.muted=muted;this.onEvent=onEvent;this.active=null;this.count=0;this.events=[];
  }
  play(file,{accepted=true}={}){
    if(!accepted)return false;
    const buffer=this.buffers.get(file);if(!buffer)return false;
    this.context.resume().catch(()=>{});
    const source=this.context.createBufferSource(),gain=this.context.createGain();
    source.buffer=buffer;gain.gain.value=this.muted()?0:this.volume();source.connect(gain).connect(this.context.destination);
    const prior=this.active;
    const event={file,start:this.context.currentTime,duration:buffer.duration,end:null,replaced:false};
    const voice={source,gain,event};this.active=voice;
    source.onended=()=>{event.end=this.context.currentTime;source.disconnect();gain.disconnect();if(this.active===voice)this.active=null;};
    if(prior){prior.event.replaced=true;prior.source.stop();}
    source.start();this.count++;this.events.push(event);if(this.events.length>100)this.events.shift();this.onEvent(event);return true;
  }
  stop(){const voice=this.active;if(voice){this.active=null;voice.source.stop();}}
}
