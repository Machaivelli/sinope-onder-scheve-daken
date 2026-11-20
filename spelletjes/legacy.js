import {createMatch,setPlan,startRun,commandPartner,pulse,stepMatch,triangleDiscs,RULES} from '../kringspel/model.js';
import {drawMatch} from '../kringspel/render.js';
import {createKnotLesson,pointLesson,stepKnotLesson,drawKnotLesson,drawKnotScores} from './knot-lesson.js';
import {createBreadGame,beginBreadGame,breadAction,moveBasket,stepBreadGame} from './bread-model.js';
import {createMintGame,beginMintGame,strikeMint,stepMintGame} from './mint-model.js';
import {createConcept as createRopeConcept,meta as ropeMeta} from '../proeven/rope.js';

const P={ink:'#263747',paper:'#f1dca9',light:'#fff0c9',gold:'#e8b64e',teal:'#4c9b95',foam:'#8ecac0',plum:'#785677',clay:'#c96c52',sand:'#c99b62',wood:'#947050',deep:'#65504d'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const levelOf=env=>clamp(Math.floor(Number(env.level)||1),1,3);
const safeDt=dt=>Number.isFinite(dt)&&dt>0?Math.min(.1,dt):0;
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function poly(c,pts,color){c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}
function line(c,points,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke();}
function text(c,value,x,y,size=13,color=P.ink,align='center'){c.fillStyle=color;c.font=`bold ${size}px ui-monospace,monospace`;c.textAlign=align;c.textBaseline='middle';c.fillText(String(value),Math.round(x),Math.round(y));}
function actor(env,c,id,x,y,options={}){if(env.actor)env.actor(c,id,x,y,{scale:1.6,dir:'down',pose:'idle',...options});else{rect(c,x-9,y-30,18,27,P.teal);rect(c,x-7,y-42,14,14,P.sand);}}
function loaf(c,x,y,size=1){poly(c,[[-16,-5],[-12,-11],[-5,-14],[10,-12],[17,-5],[14,4],[-13,4]].map(([a,b])=>[x+a*size,y+b*size]),P.ink);poly(c,[[-13,-4],[-9,-10],[-3,-11],[8,-9],[13,-4],[11,1],[-11,1]].map(([a,b])=>[x+a*size,y+b*size]),P.gold);for(const dx of[-6,1,8])line(c,[[x+(dx-2)*size,y-8*size],[x+dx*size,y-3*size]],P.light,2);}
function coin(c,x,y,color=P.gold,size=1){poly(c,[[-9,-5],[-5,-10],[6,-10],[11,-4],[11,5],[5,10],[-5,10],[-10,4]].map(([a,b])=>[x+a*size,y+b*size]),P.ink);poly(c,[[-7,-4],[-4,-8],[5,-8],[8,-3],[8,4],[4,7],[-4,7],[-8,3]].map(([a,b])=>[x+a*size,y+b*size]),color);line(c,[[x-5*size,y-4*size],[x+3*size,y-4*size],[x+5*size,y]],P.light,2);}
function framed(c){c.imageSmoothingEnabled=false;rect(c,0,0,640,400,P.paper);rect(c,0,0,640,7,P.ink);rect(c,0,393,640,7,P.ink);}
function reporter(env){let previous='',finished=false;return{get finished(){return finished;},status(title,detail=''){const key=title+'|'+detail;if(key!==previous){previous=key;env.setStatus?.(title,detail);}},end(result){if(finished)return;finished=true;env.finish?.(result);},sound(cue){env.sound?.(cue);}};}

function createCircle(env={}){
 const level=levelOf(env),r=reporter(env),state=createMatch({seed:Number.isFinite(env.seed)?env.seed:1,opponent:['bion','nera','philo'][level-1]});
 if(env.region==='athens'){
  const residents=[{name:'Myrrine & Demeas',casts:['myrrine','demeas']},{name:'Thratta & Lyra',casts:['thratta','lyra']},{name:'Nikion & Metrodoros',casts:['nikion','metrodoros']}][level-1];
  state.teams[1].name=residents.name;state.teams[1].casts=[...residents.casts];
 }
 let draft=[...state.teams[0].plan],suggestion=[...draft],lastRun=state.run,lastEvent=0,animation=0,dragging=false,dragOffset={x:0,y:0},heroTarget=null,hoverPin=null;
 const digit=id=>String(Number(id.slice(1))+1);
 const valid=()=>triangleDiscs(state,draft).length;
 function status(){const our=state.teams[0],their=state.teams[1];
  if(state.phase==='planning')r.status(`${our.score} – ${their.score} · kies je kring`,valid()?`${draft.map(digit).join(' · ')}: ${valid()} ${valid()===1?'schijf':'schijven'}. Argos gaat naar ${digit(our.partnerTarget)}. Druk op Speel de ronde.`:draft.length===3?'Deze kring omsluit geen schijf. Kies drie andere palen.':`Kies ${3-draft.length} extra paal${draft.length===2?'':'en'} rond minstens één schijf.`);
  else if(state.phase==='playing')r.status(`${our.score} – ${their.score} · ${Math.ceil(state.remaining)} seconden`,their.closeProgress>0?'Ze sluiten! Neem een paarse paal over.':our.closeProgress>0?'Houd je drie knopen vast tot de kring sluit!':`${our.plan.filter(id=>state.pins.find(p=>p.id===id).owner===0).length}/3 knopen · tik een paal voor Argos · sleep Diogenes`);
  else if(state.phase==='resolve')r.status(state.resolution.label,`Jij +${state.resolution.deltas[0]} · zij +${state.resolution.deltas[1]}`);
 }
 function select(id){if(r.finished)return;if(state.phase==='planning'){draft=draft.includes(id)?draft.filter(p=>p!==id):draft.length<3?[...draft,id]:[id];if(valid())setPlan(state,draft);r.sound('wood');status();}else if(state.phase==='playing'){commandPartner(state,id);r.sound('dog');}}
 function action(id){if(r.finished)return;
  if(id==='start'&&state.phase==='planning'&&valid()){setPlan(state,draft);startRun(state);heroTarget=null;dragging=false;r.sound('choose');}
  else if(id==='clear'&&state.phase==='planning'){draft=[];status();}
  else if(id==='suggest'&&state.phase==='planning'){draft=[...suggestion];setPlan(state,draft);status();}
  else if(id==='seek'&&env.shoreCircle&&state.phase==='playing'){
   const team=state.teams[0],open=state.pins.filter(pin=>team.plan.includes(pin.id)&&pin.owner!==0),hand=handPost(),dog=team.actors[1];
   const target=open.filter(pin=>pin!==hand).sort((one,two)=>Math.hypot(one.x-dog.x,one.y-dog.y)-Math.hypot(two.x-dog.x,two.y-dog.y))[0]||open[0];if(target)select(target.id);
  }
  else if(id==='pulse'&&state.phase==='playing'&&pulse(state))r.sound('cloth');
 }
 function handPost(){
  const team=state.teams[0],hero=team.actors[0],open=state.pins.filter(pin=>team.plan.includes(pin.id)&&pin.owner!==0);
  return open.filter(pin=>pin.id!==team.partnerTarget).sort((one,two)=>Math.hypot(one.x-hero.x,one.y-hero.y)-Math.hypot(two.x-hero.x,two.y-hero.y))[0];
 }
 function hit(p){if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return null;return state.pins.find(pin=>Math.hypot(pin.x-p.x,pin.y-p.y)<35||(p.x>=pin.x+8&&p.x<=pin.x+40&&p.y>=pin.y-33&&p.y<=pin.y-2))?.id??null;}
 function pointerDown(p){if(r.finished||!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return;const h=state.teams[0].actors[0];if(state.phase==='playing'&&Math.abs(p.x-h.x)<19&&p.y>h.y-60&&p.y<h.y-12){dragging=true;dragOffset={x:h.x-p.x,y:h.y-p.y};heroTarget={x:h.x,y:h.y};return;}const id=hit(p);if(id){select(id);return;}if(state.phase==='playing'){dragging=false;heroTarget={x:clamp(p.x,36,604),y:clamp(p.y,68,378)};}}
 function pointerMove(p){if(r.finished||!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return;hoverPin=hit(p);if(dragging&&state.phase==='playing')heroTarget={x:clamp(p.x+dragOffset.x,36,604),y:clamp(p.y+dragOffset.y,68,378)};}
 function pointerUp(p={}){if(r.finished)return;if(p.cancelled){dragging=false;heroTarget=null;return;}if(dragging)pointerMove(p);dragging=false;}
 function update(dt,keys=new Set()){
  dt=safeDt(dt);if(r.finished||!dt)return;
  let x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),y=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  if(x||y)heroTarget=null;else if(heroTarget&&state.phase==='playing'){const h=state.teams[0].actors[0],d=Math.hypot(heroTarget.x-h.x,heroTarget.y-h.y);if(d<3)heroTarget=null;else{x=(heroTarget.x-h.x)/Math.max(d,136*dt);y=(heroTarget.y-h.y)/Math.max(d,136*dt);}}
  if(state.phase==='playing')animation+=dt;stepMatch(state,dt,{x,y});
  for(const e of state.events)if(e.id>lastEvent){if(e.type==='claim')r.sound(e.team===0?'wood':'pot');if(e.type==='score')r.sound('connect');if(e.type==='pulse')r.sound('cloth');lastEvent=e.id;}
  if(lastRun!==state.run){lastRun=state.run;draft=[...state.teams[0].plan];suggestion=[...draft];heroTarget=null;dragging=false;}
  if(state.phase==='finished'){const won=state.result.winner===0;r.end({won,score:state.teams[0].score*100+Math.max(0,5-state.teams[1].score)*20,title:won?'Die kring is van ons!':state.result.winner==='draw'?'Een gelijkspel op het plein.':'Nog één potje, zegt Argos.',detail:`${state.teams[0].score} – ${state.teams[1].score} tegen ${state.teams[1].name}. ${won?'Argos eist zijn deel van de roem.':'Een andere route geeft een nieuwe kans.'}`});}
  status();
 }
 status();
 if(env.shoreLesson){
  const lesson=createKnotLesson(),baseline=normalCircle();let practicing=true;
  function report(){r.status(lesson.heroTied&&lesson.dogTied?'De kring sluit!':'Bions oefenkring',lesson.heroTied&&lesson.dogTied?'Nu voor het echt.':lesson.sent?'Loop zelf naar de paal bij de hand.':'Tik op het pootje voor Argos. Loop of tik zelf naar de hand.');}
  const practiceControls=()=>lesson.heroTied&&lesson.dogTied?[{id:'start',label:'Speel de ronde',key:'Enter'}]:[{id:'seek',label:'Stuur Argos',key:'KeyF'},{id:'skip',label:'Naar het gewone plein'}];
  const practiceAct=id=>{if(id==='seek')lesson.sent=true;if(id==='skip'||id==='start'&&lesson.heroTied&&lesson.dogTied){practicing=false;env.lessonDone?.();if(id==='start')action('start');status();}else report();};
  report();
  return {update(dt,keys){if(!practicing)return baseline.update(dt,keys);for(const cue of stepKnotLesson(lesson,dt,keys))r.sound(cue);report();},draw(ctx){if(practicing)drawKnotLesson(ctx,lesson,env);else baseline.draw(ctx);},action(id){if(practicing)practiceAct(id);else baseline.action(id);},keyDown(code){if(!practicing)return baseline.keyDown(code);if(code==='KeyF')practiceAct('seek');if(code==='Enter')practiceAct('start');},pointerDown(point){if(!practicing)return baseline.pointerDown(point);pointLesson(lesson,point);lesson.drag=!lesson.sent||Math.abs(point.x-476)>50;},pointerMove(point){if(!practicing)return baseline.pointerMove(point);if(lesson.drag)pointLesson(lesson,point,true);},pointerUp(point){if(!practicing)return baseline.pointerUp(point);lesson.drag=false;},get controls(){return practicing?practiceControls():baseline.controls;},snapshot(){return practicing?structuredClone({...state,level,phase:'lesson',lesson}):baseline.snapshot();}};
 }
 return normalCircle();
 function normalCircle(){
  return {update,action,pointerDown,pointerMove,pointerUp,
   draw(ctx){
    const view=state.phase==='planning'?{...state,teams:[{...state.teams[0],plan:draft},state.teams[1]]}:state;
    drawMatch(ctx,view,{actor:env.actor,time:animation,hoverPin,region:env.region,reducedMotion:env.reducedMotion,backdrop:env.shoreCircle?env.yard:null,sign:env.shoreCircle?env.sign:null});
    if(env.shoreCircle)drawKnotScores(ctx,state,env,195,5,250,RULES.scoreLimit,RULES.runDuration);
    if(env.shoreCircle&&state.phase==='playing'){const post=handPost();if(post){rect(ctx,post.x-14,post.y-61,29,23,P.ink);env.sign?.(ctx,'hand',post.x-13,post.y-61,27);}}
    if(heroTarget&&state.phase==='playing'){line(ctx,[[heroTarget.x-5,heroTarget.y],[heroTarget.x+5,heroTarget.y]],P.teal,2);line(ctx,[[heroTarget.x,heroTarget.y-5],[heroTarget.x,heroTarget.y+5]],P.teal,2);}
   },
   keyDown(code){if(r.finished)return;if(/^Digit[1-9]$/.test(code))select(`p${Number(code.slice(5))-1}`);if(code==='Enter')action('start');if(code==='Space')action('pulse');if(code==='KeyF')action('seek');if(env.shoreCircle&&code==='KeyX')action('clear');if(env.shoreCircle&&code==='KeyV')action('suggest');},
   get controls(){
    if(state.phase==='planning')return [{id:'clear',label:'Zelf kiezen',...(env.shoreCircle?{key:'KeyX'}:{})},{id:'suggest',label:'Voorstel',...(env.shoreCircle?{key:'KeyV'}:{})},{id:'start',label:'Speel de ronde',key:'Enter',disabled:!valid()}];
    const controls=[{id:'pulse',label:state.teams[0].pulseCooldown>0?`Ruimte over ${state.teams[0].pulseCooldown.toFixed(1)} s`:'Maak ruimte!',key:'Space',disabled:state.phase!=='playing'||state.teams[0].pulseCooldown>0}];
    if(env.shoreCircle)controls.unshift({id:'seek',label:'Stuur Argos',key:'KeyF',disabled:state.phase!=='playing'});return controls;
   },snapshot(){return structuredClone({...state,level,draft,heroTarget});}};
 }
}

function createBakery(env={}){
 const level=levelOf(env),r=reporter(env),s=createBreadGame(),speed=[1,1.12,1.24][level-1];s.target=[10,14,18][level-1];s.goalLabel=`${s.target} broden`;beginBreadGame(s);let seenEvent=0,drag=false;
 function status(){r.status(`${s.caught} / ${s.target} broden · ${Math.max(0,Math.ceil((s.duration-s.time)/speed))} s`,s.dogCooldown>0?`Mand: ${s.lives} kansen · Argos rust ${Math.ceil(s.dogCooldown/speed)} s`:'Mand heel houden · spatie laat Argos naar lage broden duiken');}
 function settle(){if(r.finished)return;if(['won','lost'].includes(s.phase)){r.end({won:s.phase==='won',score:s.score,title:s.phase==='won'?'Iedereen krijgt een korst.':'Brood genoeg voor de duiven.',detail:s.phase==='won'?`${s.caught} broden gered. Bion zet een extra mand buiten, zonder prijskaartje.`:`${s.caught} van ${s.target} broden. Laat de zwarte kolen tussen de manden vallen.`});}}
 function action(id){if(r.finished)return;if(/^lane[0-2]$/.test(id))moveBasket(s,Number(id.at(-1)));else breadAction(s,id);status();settle();}
 function place(p){if(r.finished||!Number.isFinite(p?.x))return;moveBasket(s,clamp(Math.floor((p.x-50)/180),0,2));status();}
 status();
 return {update(dt){dt=safeDt(dt);if(r.finished||!dt)return;stepBreadGame(s,dt*speed);if(s.lastEvent?.id>seenEvent){seenEvent=s.lastEvent.id;if(s.lastEvent.type==='catch')r.sound('bread-catch');if(s.lastEvent.type==='hit')r.sound('bread-hit');if(s.lastEvent.type==='dog')r.sound('dog-dash');}status();settle();},action,keyDown(code){if(code==='ArrowLeft'||code==='KeyA')action('left');if(code==='ArrowRight'||code==='KeyD')action('right');if(code==='Space')action('dog');if(/^Digit[1-3]$/.test(code))action(`lane${Number(code.slice(5))-1}`);},pointerDown(p){if(r.finished)return;drag=true;place(p);},pointerMove(p){if(drag)place(p);},pointerUp(){drag=false;},get controls(){return [{id:'lane0',label:'Mand links',key:'1'},{id:'lane1',label:'Mand midden',key:'2'},{id:'lane2',label:'Mand rechts',key:'3'},{id:'dog',label:s.dogCooldown>0?`Argos rust ${Math.ceil(s.dogCooldown/speed)} s`:'Argos, pak!',key:'Space',disabled:s.dogCooldown>0}];},draw(c){framed(c);rect(c,0,7,640,151,P.sand);rect(c,0,159,640,234,'#e7c48e');for(let x=12;x<640;x+=100){rect(c,x,25,85,70,P.ink);rect(c,x+4,28,77,59,P.plum);rect(c,x-3,21,90,9,P.clay);}poly(c,[[6,86],[627,86],[640,121],[0,121]],P.ink);for(let i=0;i<10;i++)poly(c,[[i*64+8,89],[i*64+61,89],[i*64+66,116],[i*64,116]],i%2?P.clay:P.gold);rect(c,0,117,640,10,P.clay);rect(c,31,128,578,10,P.wood);actor(env,c,'bion',320,164,{dir:'down',scale:1.25});rect(c,0,143,640,20,P.wood);rect(c,0,141,640,4,P.gold);for(const x of[80,157,233,407,483,557])loaf(c,x,147,.75);text(c,`${s.caught} / ${s.target} BRODEN`,139,25,15,P.light);text(c,`${Math.max(0,Math.ceil((24-s.time)/speed))} s`,570,27,15,P.light);
   for(let lane=0;lane<3;lane++){const x=140+lane*180;line(c,[[x-67,173],[x-78,339]],'#dab47e',2);rect(c,x-68,350,136,4,P.sand);text(c,lane+1,x,376,16,P.ink);if(lane===s.lane){poly(c,[[x-61,346],[x-51,335],[x+51,335],[x+61,346]],P.teal);}}
   for(const o of s.objects){const x=140+o.lane*180,p=o.progress,y=142+p*200-Math.sin(p*Math.PI)*40;rect(c,x-11,343,22,4,o.kind==='bread'?P.sand:P.deep);if(o.kind==='bread')loaf(c,x,y,.78);else{poly(c,[[x-10,y-9],[x+6,y-12],[x+12,y],[x+5,y+8],[x-9,y+5]],P.ink);rect(c,x-5,y-6,7,6,P.deep);rect(c,x+5,y-4,3,2,P.clay);}}
   const bx=140+s.lane*180;actor(env,c,'hero',bx,353,{dir:'up',scale:1.3});rect(c,bx-38,312,76,27,P.ink);rect(c,bx-35,316,70,19,P.wood);for(let x=bx-27;x<bx+33;x+=12)line(c,[[x,318],[x+3,331]],P.gold,2);rect(c,bx-38,312,76,4,P.light);actor(env,c,'argos',s.dogActive>0?140+(Math.floor(s.time*10)%3)*180:bx+65,s.dogActive>0?274:357,{dir:s.dogActive>0?'up':'left',pose:s.dogActive>0?'walk':'idle',scale:1.3});for(let i=0;i<4;i++){rect(c,499+i*27,57,19,15,i<s.lives?P.gold:P.deep);rect(c,503+i*27,61,11,3,P.light);}text(c,'kolen? andere baan!',320,184,11,P.deep);
  },snapshot(){return structuredClone({...s,level,speed});}};
}

function createMint(env={}){
 const level=levelOf(env),r=reporter(env),s=createMintGame(),speed=[1,1.12,1.24][level-1],width=[1,.86,.72][level-1];let zone=null,seen=0;
 function scaleZone(){if(s.zone!==zone){zone=s.zone;s.zone.width*=width;s.zone.perfectWidth*=width;}}
 scaleZone();beginMintGame(s);
 function status(){r.status(`${s.good} / 5 goede oefenmunten`,`${s.maxAttempts-s.attempts} slagen over · groen is goed, goud is precies`);}
 function settle(){if(r.finished)return;if(['won','lost'].includes(s.phase))r.end({won:s.phase==='won',score:s.score,title:s.phase==='won'?'Vijf keer vertrouwen.':'Koper kan opnieuw beginnen.',detail:s.phase==='won'?`${s.perfect} precies in het midden. Damas legt de oefenmunten apart: echt loon blijft in zijn eigen bak.`:'Damas smelt de proefplaatjes om. Neem de tijd: de wijzer komt altijd terug.'});}
 function action(id){if(r.finished||id!=='strike')return;scaleZone();const before=s.serial;strikeMint(s);if(s.serial!==before){seen=s.serial;r.sound(`mint-${s.lastEvent?.grade||'good'}`);}status();settle();}
 status();
 return {update(dt){dt=safeDt(dt);if(r.finished||!dt)return;stepMintGame(s,dt*speed);scaleZone();status();settle();},action,keyDown(code){if(code==='Space'||code==='Enter')action('strike');},pointerDown(){action('strike');},pointerMove(){},pointerUp(){},get controls(){return [{id:'strike',label:s.cooldown>0?'Nieuwe proefmunt…':'Slaan!',key:'Space',disabled:s.cooldown>0}];},draw(c){framed(c);rect(c,0,7,640,196,P.sand);rect(c,0,7,640,14,P.deep);for(let x=28;x<640;x+=91){rect(c,x,22,67,82,P.paper);rect(c,x+6,32,54,61,P.ink);rect(c,x+11,36,44,52,P.plum);line(c,[[x+28,36],[x+28,86]],P.gold,3);}rect(c,0,201,640,192,'#ddba84');rect(c,222,113,194,17,P.deep);rect(c,234,87,11,26,P.wood);rect(c,283,81,12,32,P.wood);rect(c,342,94,13,19,P.wood);rect(c,390,86,12,27,P.wood);text(c,'ALLEEN OEFENPLAATJES',320,144,12,P.ink);actor(env,c,'damas',504,247,{dir:'left',scale:1.65});actor(env,c,'hero',135,272,{dir:'right',scale:1.7});rect(c,179,236,290,46,P.ink);rect(c,183,238,282,24,P.wood);rect(c,192,277,13,20,P.deep);rect(c,444,277,12,20,P.deep);poly(c,[[272,223],[306,205],[356,209],[373,224],[350,238],[293,238]],P.deep);poly(c,[[275,221],[307,208],[354,212],[367,223],[349,232],[295,232]],P.ink);coin(c,323,220,P.gold,1.1);
   const strike=s.cooldown>0?clamp(s.cooldown/.5,0,1):0;const hy=168+Math.sin((1-strike)*Math.PI)*42*(strike>0?1:0);line(c,[[277,200],[315,hy]],P.wood,9);rect(c,304,hy-10,42,18,P.ink);rect(c,307,hy-8,34,11,P.sand);if(strike>.25){line(c,[[352,206],[368,195]],s.lastEvent?.grade==='miss'?P.clay:P.light,3);line(c,[[355,225],[373,230]],P.gold,3);}
   rect(c,22,17,596,44,P.paper);rect(c,22,61,596,3,P.deep);for(let i=0;i<8;i++){const x=212+i*31,grade=s.collected[i];coin(c,x,39,grade==='miss'?P.deep:grade==='perfect'?P.gold:grade==='good'?P.teal:'#bba682',.75);if(grade==='miss')line(c,[[x-7,32],[x+7,46]],P.clay,2);}text(c,`${s.good} / 5`,80,38,20,P.ink);text(c,`${s.maxAttempts-s.attempts} OVER`,566,39,14,P.ink);
   const x=77,y=321,w=486;rect(c,x-4,y-4,w+8,30,P.ink);rect(c,x,y,w,22,'#bc9770');rect(c,x+(s.zone.center-s.zone.width/2)*w,y,s.zone.width*w,22,P.teal);rect(c,x+(s.zone.center-s.zone.perfectWidth/2)*w,y,s.zone.perfectWidth*w,22,P.gold);rect(c,x,y,w,3,P.light);const cx=x+s.cursor*w;poly(c,[[cx-8,y-16],[cx+8,y-16],[cx,y-5]],P.ink);rect(c,cx-2,y-3,4,31,P.light);text(c,s.cooldown>0?(s.lastEvent?.strikeLabel||'Nieuwe proefmunt'):'Wacht op groen. Spatie of tik om te slaan.',320,375,12,P.ink);
  },snapshot(){return structuredClone({...s,level,speed,zoneScale:width});}};
}

function createRope(env={}){
 const level=levelOf(env),r=reporter(env),limit=[Infinity,140,100][level-1];let elapsed=0,lastTitle='',lastDetail='';
 const raw=createRopeConcept({...env,setStatus(title,detail){lastTitle=title;lastDetail=detail;r.status(title,detail);},finish(title,detail){r.end({won:true,score:Math.round(300+(Number.isFinite(limit)?Math.max(0,limit-elapsed):100)),title,detail});}});
 const active=method=>(...args)=>{if(!r.finished)return raw[method]?.(...args);};
 return {height:360,update(dt,keys=new Set()){dt=safeDt(dt);if(r.finished||!dt)return;elapsed+=dt;raw.update(dt,keys);if(r.finished)return;if(elapsed>=limit)r.end({won:false,score:raw.snapshot().stage*100,title:'Bion sluit de bakkerij.',detail:'Het touw kan het wel. Zet Argos achter de handgreep, roep hem terug en trek samen opzij.'});else r.status(lastTitle,Number.isFinite(limit)?`${lastDetail} · ${Math.ceil(limit-elapsed)} s` :lastDetail);},draw:c=>raw.draw(c),action:active('action'),keyDown:active('keyDown'),pointerDown:active('pointerDown'),pointerMove:active('pointerMove'),pointerUp:active('pointerUp'),get controls(){return raw.controls;},snapshot(){return {...raw.snapshot(),level,elapsed,limit:Number.isFinite(limit)?limit:null,finished:r.finished};}};
}

export const games=[
 {id:'kringspel',title:'Kringspel',subtitle:'Een plein. Twee duo’s. Eén brutale kring.',instruction:'Kies drie palen rond schijven en start de ronde. Loop met WASD of sleep Diogenes; tik een paal voor Argos. Houd je drie palen twee seconden vast. Spatie duwt tegenstanders opzij. Eerst vijf punten wint.',controls:[{id:'start',label:'Speel de ronde',key:'Enter'}],create:createCircle},
 {id:'bread',title:'Brood & spelen',subtitle:'De beste korst is een gedeelde korst.',instruction:'Vang het gevraagde aantal broden en houd je mand heel tot de bel. Kies een baan met links/rechts, 1–3 of een tik. Laat zwarte kolen vallen; spatie laat Argos lage broden redden.',controls:[{id:'lane0',label:'Mand links',key:'1'},{id:'lane1',label:'Mand midden',key:'2'},{id:'lane2',label:'Mand rechts',key:'3'},{id:'dog',label:'Argos, pak!',key:'Space'}],create:createBakery},
 {id:'mint',title:'Muntslag',subtitle:'Een kleine afdruk. Een grote belofte.',instruction:'Sla vijf goede oefenmunten in acht pogingen. Wacht tot de wijzer in de groene zone staat en druk spatie of tik. In het goud sla je precies. De wijzer komt steeds terug; haast hoeft niet.',controls:[{id:'strike',label:'Slaan!',key:'Space'}],create:createMint},
 {id:'rope',title:ropeMeta.title,subtitle:ropeMeta.subtitle,instruction:'Twee rondes tegen Bions plank. Stuur Argos achter de gouden handgreep. Roep hem met Q terug en trek samen opzij. Loop met WASD of sleep Diogenes. E maakt het touw los. Later krijg je een tijdslimiet.',height:360,controls:[{id:'call',label:'Argos, hier!',key:'KeyQ'},{id:'loosen',label:'Touw losmaken',key:'KeyE'}],create:createRope},
];
