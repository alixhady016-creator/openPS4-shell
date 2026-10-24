// Firmware UserSelectScene owns a single root ImageBox_Logo. It is shown plainly
// by LaunchNoDevice / LaunchUserSelectWithDevice; child panel Push/Pop motion
// must not replay on it. Only removing the entire login application moves it.
export class SharedLoginLogo {
  static create(stage){return new SharedLoginLogo(stage);}
  constructor(stage){
    this.root=document.createElement('div');this.root.id='loginLogoRoot';
    this.root.className='screen hidden';
    Object.assign(this.root.style,{pointerEvents:'none',transformOrigin:'0 0'});
    const logo=document.createElement('img');logo.className='brand';
    logo.src='assets/ps4logo.png';logo.alt='PS4';
    Object.assign(logo.style,{left:'108px',top:'54px',width:'500px',height:'110px',objectFit:'contain'});
    this.root.append(logo);stage.append(this.root);this.logo=logo;this.visible=false;
    // Compatibility migration also ensures no duplicate page image is painted
    // if an older HTML document is reused by the host cache.
    stage.querySelectorAll('#welcome > .brand,#profiles > .brand').forEach(el=>el.remove());
  }
  show(){
    if(this.visible&&!this.root.classList.contains('hidden'))return;
    this.visible=true;this.root.classList.remove('hidden');
    this.root.style.opacity='1';this.root.style.transform='none';
  }
  hide(){this.visible=false;this.root.classList.add('hidden');}
  async hideRoot(scenes){
    if(!this.visible)return;
    this.visible=false;await scenes.hideApplication(this.root);
  }
  report(){return {shared:true,visible:this.visible,instances:this.root.parentNode?.querySelectorAll('img.brand').length??0,transform:this.root.style.transform,opacity:this.root.style.opacity};}
}
