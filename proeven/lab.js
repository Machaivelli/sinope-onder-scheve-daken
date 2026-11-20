import * as rope from './rope.js';
import * as rules from './rules.js';
import * as chaos from './chaos.js';
import {Soundscape} from './sound.js';

const modules=[rope,rules,chaos],$=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d'),keys=new Set(),audio=new Soundscape(),assets={},completed=new Set();
let current=null,instance=null,started=false,paused=true,finished=false,serial=0,lastTime=0,dragging=false,activePointer=null,previews=[],result=null,controlSignature='',animationTime=0;
ctx.imageSmoothingEnabled=false;
const imageLoad=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Een pixelvel kon niet laden.'));im.src=src;});
const idleAudio=()=>audio.setPaused(!current||paused);
function actor(c,id,x,y,options={}){
 const {pose='idle',dir='down',scale=2,flip=false,alpha=1}=options;
 const dog=id==='argos'||id==='dog',sheet=assets[dog?'argos':'cast'];if(!sheet)return;
 const name=id==='player'?'hero':id==='guard'?'philo':id;
 let frame=dog?`${dir}-${pose}`:`${name}/${dir}-${pose}`;
 if(pose.startsWith('walk')){const n=pose==='walk'?Math.floor(animationTime*8)%4:pose.match(/\d/)?.[0]||0;frame=dog?`${dir}-walk-${n}`:`${name}/${dir}-walk${n}`;}
 const f=(sheet.frames[frame]||sheet.frames[dog?pose:`${name}/${pose}`]||sheet.frames[dog?`${dir}-idle`:`${name}/${dir}-idle`]||sheet.frames[dog?'down-idle':'hero/down-idle'])?.frame;
 if(!f)return;c.save();c.imageSmoothingEnabled=false;c.globalAlpha=alpha;c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);c.drawImage(sheet.image,f.x,f.y,f.w,f.h,Math.round(-f.w*scale/2),Math.round((-f.h+(dog?3:4))*scale),Math.round(f.w*scale),Math.round(f.h*scale));c.restore();
}
function syncActions(){for(const b of $('actions').querySelectorAll('button'))b.disabled=!started||paused||finished||b.dataset.unavailable==='true';}
function renderControls(){
 const controls=instance?.controls||[],signature=JSON.stringify(controls);if(signature===controlSignature)return;controlSignature=signature;
 $('actions').replaceChildren();for(const control of controls){const b=document.createElement('button');b.type='button';b.dataset.action=control.id;b.dataset.unavailable=String(Boolean(control.disabled));if(control.key){const k=document.createElement('kbd');k.textContent=control.key==='Space'?'spatie':control.key.replace(/^Key|^Digit/,'');b.append(k);}b.append(document.createTextNode(control.label));b.addEventListener('click',()=>{if(started&&!paused&&!finished&&!b.disabled){audio.unlock();instance.action?.(control.id);$('playfield').focus({preventScroll:true});}});$('actions').append(b);}syncActions();
}
function overlay(mode){
 $('overlay').hidden=false;$('compare').hidden=mode!=='won';
 $('overlay-kicker').textContent=mode==='intro'?`PROEF ${modules.indexOf(current)+1} VAN 3`:mode==='won'?'EEN STREEK RIJKER':'EVEN UITBLAZEN';
 $('overlay-title').textContent=mode==='intro'?current.meta.title:mode==='won'?result.title:'Argos wacht op je.';
 $('overlay-copy').textContent=mode==='intro'?current.meta.instruction:mode==='won'?result.detail:'Je kunt straks op precies dezelfde plek verder.';
 $('begin').textContent=mode==='intro'?'Probeer deze streek':mode==='won'?'Nog eens proberen':'Verder spelen';
 $('overlay').dataset.mode=mode;syncActions();idleAudio();queueMicrotask(()=>$('begin').focus({preventScroll:true}));
}
function clearInput(){keys.clear();dragging=false;activePointer=null;instance?.pointerUp?.({x:-1000,y:-1000,cancelled:true});}
function makeInstance(){
 serial++;animationTime=0;const token=serial;result=null;finished=false;started=false;paused=true;keys.clear();
 instance=current.createConcept({actor,setStatus(title,detail=''){if(token!==serial)return;$('status-title').textContent=title;$('status-detail').textContent=detail;},finish(title,detail=''){if(token!==serial||finished)return;finished=true;result={title,detail};completed.add(current.meta.id);clearInput();overlay('won');},sound(name){if(token===serial&&started&&!paused)audio.play(name);}});
 controlSignature='';renderControls();
 $('instruction').textContent=current.meta.instruction;overlay('intro');instance.draw(ctx);
}
function select(id){
 const module=modules.find(m=>m.meta.id===id);if(!module)return;clearInput();current=module;$('gallery').hidden=true;$('workshop').hidden=false;
 $('concept-title').textContent=module.meta.title;$('concept-kicker').textContent=`PROEF ${modules.indexOf(module)+1} · ${module.meta.subtitle}`;$('concept-pitch').textContent=module.meta.description;
 makeInstance();history.replaceState(null,'',`#${id}`);window.scrollTo({top:0,behavior:'instant'});
}
function gallery(){clearInput();serial++;current=null;instance=null;started=false;paused=true;finished=false;result=null;$('gallery').hidden=false;$('workshop').hidden=true;idleAudio();history.replaceState(null,'',location.pathname);for(const card of $('concepts').children)card.querySelector('.done-badge').hidden=!completed.has(card.dataset.concept);$('concepts').querySelector('button')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
function resume(){if(!current)return;if(finished){makeInstance();return;}started=true;paused=false;$('overlay').hidden=true;clearInput();audio.unlock();idleAudio();syncActions();$('playfield').focus({preventScroll:true});}
function pause(){if(!current||!started||finished||paused)return;clearInput();paused=true;overlay('pause');}
$('begin').addEventListener('click',resume);$('compare').addEventListener('click',gallery);$('back').addEventListener('click',gallery);$('reset').addEventListener('click',()=>{if(current){clearInput();makeInstance();}});$('pause').addEventListener('click',()=>{if(paused&&started&&!finished)resume();else pause();});
$('sound').addEventListener('click',()=>{audio.toggle();$('sound').textContent=audio.enabled?'♪':'♩';$('sound').setAttribute('aria-pressed',String(audio.enabled));$('sound').setAttribute('aria-label',audio.enabled?'Geluid uitschakelen':'Geluid inschakelen');});
$('sound').setAttribute('aria-pressed',String(audio.enabled));$('sound').textContent=audio.enabled?'♪':'♩';
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*640/r.width,y:(e.clientY-r.top)*360/r.height};}
canvas.addEventListener('pointerdown',e=>{if(paused||finished||!started||activePointer!==null||e.button>0)return;e.preventDefault();audio.unlock();activePointer=e.pointerId;dragging=true;canvas.setPointerCapture(e.pointerId);$('playfield').focus({preventScroll:true});instance.pointerDown?.(point(e));});
canvas.addEventListener('pointermove',e=>{if(!paused&&!finished&&(activePointer===null||activePointer===e.pointerId))instance?.pointerMove?.(point(e));});
function release(e){if(e.pointerId!==activePointer)return;dragging=false;activePointer=null;instance?.pointerUp?.(e.type==='pointercancel'?{...point(e),cancelled:true}:point(e));if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
window.addEventListener('keydown',e=>{
 if(!current)return;
 if(e.code==='Escape'){e.preventDefault();if(!e.repeat){if(paused&&started&&!finished)resume();else pause();}return;}
 if(!$('overlay').hidden){if(e.code==='Tab'){const buttons=[...$('overlay').querySelectorAll('button')].filter(b=>!b.hidden),i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}return;}
 if(e.target.closest?.('button,a,input,select,textarea')&&['Enter','Space'].includes(e.code))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyR','KeyP','KeyK','Tab','Digit1','Digit2','Digit3'].includes(e.code)){
  if(e.code==='Tab')return;e.preventDefault();if(!started||paused||finished)return;keys.add(e.code);if(!e.repeat)instance.keyDown?.(e.code);
 }
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function frame(time){const dt=Math.min(.04,Math.max(0,(time-lastTime)/1000));lastTime=time;try{if(instance){if(started&&!paused&&!finished){animationTime+=dt;instance.update?.(dt,keys);audio.update(time/1000);}renderControls();ctx.imageSmoothingEnabled=false;instance.draw(ctx);}}catch(error){showError(error);pause();}requestAnimationFrame(frame);}
function showError(error){$('error').hidden=false;$('error').textContent='Deze proef kon niet verder: '+error.message;console.error(error);}
async function start(){
 for(const name of ['cast','argos']){const [image,data]=await Promise.all([imageLoad(`../assets/${name}.png`),fetch(`../assets/${name}.json`).then(r=>{if(!r.ok)throw Error('Een pixelvel ontbreekt.');return r.json();})]);assets[name]={image,frames:data.frames};}
 $('concepts').replaceChildren();for(const [i,module] of modules.entries()){
  const card=document.createElement('article');card.className='concept-card';card.dataset.concept=module.meta.id;
  const preview=document.createElement('div');preview.className='preview';const mini=document.createElement('canvas');mini.width=640;mini.height=360;mini.setAttribute('aria-hidden','true');preview.append(mini);const number=document.createElement('span');number.className='concept-number';number.textContent=String(i+1);preview.append(number);
  const copy=document.createElement('div');copy.className='concept-copy';const sub=document.createElement('span');sub.className='concept-subtitle';sub.textContent=module.meta.subtitle;const h=document.createElement('h2');h.textContent=module.meta.title;const p=document.createElement('p');p.textContent=module.meta.description;const b=document.createElement('button');b.className='primary';b.textContent='Probeer '+module.meta.title;b.addEventListener('click',()=>select(module.meta.id));const done=document.createElement('span');done.className='done-badge';done.textContent='✓ Gespeeld';done.hidden=true;copy.append(sub,h,p,b,done);card.append(preview,copy);$('concepts').append(card);
  const instance=module.createConcept({actor,setStatus(){},finish(){},sound(){}});instance.draw(mini.getContext('2d'));previews.push(instance);
 }
 requestAnimationFrame(frame);const id=location.hash.slice(1);if(modules.some(m=>m.meta.id===id))select(id);
}
window.__sinopeProeven={get ready(){return !!previews.length;},get active(){return current?.meta.id||null;},get paused(){return paused;},get started(){return started;},get result(){return result?{...result}:null;},snapshot(){return instance?structuredClone(instance.snapshot?.()??{}):null;}};
start().catch(showError);
