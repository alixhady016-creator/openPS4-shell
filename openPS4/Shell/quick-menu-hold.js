// Adapter hold threshold; native threshold has not yet been established.
export const QUICK_HOLD_MS=600;
export class QuickHold {
 constructor(){this.release();}
 press(now){if(this.started===null){this.started=now;this.fired=false;}}
 update(now){if(this.started===null||this.fired||now-this.started<QUICK_HOLD_MS)return false;this.fired=true;return true;}
 release(){this.started=null;this.fired=false;}
}
