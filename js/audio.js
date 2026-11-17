/* COMMIT — procedural sound only (oscillators + filtered noise, created at runtime). No audio files. */
"use strict";
const SND={ctx:null,master:null,noiseBuf:null,wind:null,hum:null,slide:null,on:LS.get("commit.snd")!==false};
function audio(){if(!SND.on)return null;
if(!SND.ctx){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
const c=new AC();SND.ctx=c;
SND.master=c.createGain();SND.master.gain.value=.5;SND.master.connect(c.destination);
const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);
for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;SND.noiseBuf=nb;
const src=c.createBufferSource();src.buffer=nb;src.loop=true;
const bp=c.createBiquadFilter();bp.type="bandpass";bp.frequency.value=280;bp.Q.value=.6;
const wg=c.createGain();wg.gain.value=0;
const lfo=c.createOscillator();lfo.frequency.value=.13;const lg=c.createGain();lg.gain.value=.006;
lfo.connect(lg);lg.connect(wg.gain);
src.connect(bp);bp.connect(wg);wg.connect(SND.master);src.start();lfo.start();
SND.wind={src,bp,wg};}catch(e){SND.ctx=null;return null}}
if(SND.ctx.state==="suspended")SND.ctx.resume().catch(()=>{});
return SND.ctx;}
function tone(f,d,type,vol,f2){const c=audio();if(!c)return;const t=c.currentTime;
const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(1,f2),t+d);
g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
o.connect(g);g.connect(SND.master);o.start(t);o.stop(t+d+.02);}
function noiseHit(d,vol,fq,type){const c=audio();if(!c)return;const t=c.currentTime;
const s=c.createBufferSource();s.buffer=SND.noiseBuf;
const f=c.createBiquadFilter();f.type=type||"lowpass";f.frequency.value=fq;
const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
s.connect(f);f.connect(g);g.connect(SND.master);s.start(t);s.stop(t+d+.02);}
function sfx(n,o){if(!SND.on)return;o=o||{};try{switch(n){
case"aim":tone(660,.05,"sine",.04);break;
case"puff":noiseHit(.08,.05,700);break;
case"launch":noiseHit(.22,.1,900,"bandpass");tone(160,.2,"triangle",.07,440);break;
case"forced":noiseHit(.16,.12,1400,"bandpass");tone(720,.16,"sawtooth",.07,180);break;
case"tick":tone(o.urgent?1180:820,.04,"square",o.urgent?.06:.035);break;
case"land":{const i=o.impact||0;tone(80,.13,"sine",Math.min(.22,.07+i/5000),45);noiseHit(.06,Math.min(.12,.04+i/9000),320);}break;
case"wall":noiseHit(.05,.09,500);tone(130,.06,"square",.04);break;
case"bonk":tone(330,.09,"square",.07,170);break;
case"bounce":{const f=300*(1+(o.chain||0)*.16);tone(f,.16,"sine",.1,f*2.4);noiseHit(.07,.05,1200,"bandpass");}break;
case"crack":noiseHit(.09,.05+(o.stage||0)*.02,420+(o.stage||0)*260,"bandpass");tone(150+(o.stage||0)*60,.06,"square",.03);break;
case"shatter":noiseHit(.34,.16,300);tone(90,.34,"sawtooth",.1,38);tone(520,.12,"square",.05,120);break;
case"reform":tone(420,.18,"sine",.05,880);noiseHit(.1,.03,1600,"bandpass");break;
case"ice":{const i=o.impact||0;tone(900+i/4,.14,"sine",.06,2200+i/3);noiseHit(.09,.045,4200,"highpass");}break;
case"slip":tone(520,.22,"sine",.06,140);noiseHit(.12,.04,2600,"highpass");break;
case"move":{const i=o.impact||0;tone(190,.1,"square",.05,120);tone(760+i/6,.05,"sine",.04);noiseHit(.07,.05,900,"bandpass");}break;
case"reverse":tone(o.dir>0?520:390,.05,"square",.035);break;
case"queue":tone(520,.06,"square",.045,760);noiseHit(.05,.04,2600,"highpass");break;
case"fall":tone(540,.55,"sawtooth",.08,80);break;
case"win":[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.22,"triangle",.09),i*95));break;
case"ui":tone(880,.03,"sine",.035);break;
case"erase":tone(180,.18,"sine",.07,55);break;
case"copy":tone(1046,.07,"sine",.05);break;
case"unlock":[659,880,1319].forEach((f,i)=>setTimeout(()=>tone(f,.16,"triangle",.07),i*80));break;
}}catch(e){}}
function startHum(){const c=audio();if(!c||SND.hum)return;try{
const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=90;g.gain.value=0;
o.connect(g);g.connect(SND.master);o.start();g.gain.setTargetAtTime(.02,c.currentTime,.05);
SND.hum={o,g};}catch(e){}}
function stopHum(){if(!SND.hum)return;const h=SND.hum;SND.hum=null;try{
h.g.gain.setTargetAtTime(0,SND.ctx.currentTime,.03);setTimeout(()=>{try{h.o.stop()}catch(e){}},220);}catch(e){}}
/* quiet slick scrape while sliding on ice */
function startSlide(){const c=audio();if(!c||SND.slide)return;try{
const s=c.createBufferSource();s.buffer=SND.noiseBuf;s.loop=true;
const f=c.createBiquadFilter();f.type="highpass";f.frequency.value=2800;
const g=c.createGain();g.gain.value=0;
s.connect(f);f.connect(g);g.connect(SND.master);s.start();
g.gain.setTargetAtTime(.014,c.currentTime,.08);
SND.slide={s,g};}catch(e){}}
function stopSlide(){if(!SND.slide)return;const h=SND.slide;SND.slide=null;try{
h.g.gain.setTargetAtTime(0,SND.ctx.currentTime,.05);setTimeout(()=>{try{h.s.stop()}catch(e){}},260);}catch(e){}}
function applySoundBtn(){const b=$("bSound");b.classList.toggle("off",!SND.on);
b.setAttribute("aria-pressed",String(SND.on));b.setAttribute("aria-label",SND.on?"Mute sound":"Unmute sound");}
function setSound(on,silent){SND.on=on;LS.set("commit.snd",on);applySoundBtn();
if(SND.ctx){try{if(on){SND.ctx.resume().catch(()=>{});SND.master.gain.setTargetAtTime(.5,SND.ctx.currentTime,.05);}
else SND.master.gain.setTargetAtTime(0,SND.ctx.currentTime,.05);}catch(e){}}
if(on)sfx("ui");if(!silent)toast(on?"SOUND ON":"SOUND OFF");}