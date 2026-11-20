export const meta = {
  id: 'rules', title: 'Leef je woorden', subtitle: 'Maak zijn grote woorden letterlijk waar.',
  description: 'Bion verzint regels om de weg te versperren. Verander de wereld waarop zijn woorden slaan — en laat hem zelf de uitweg bewijzen.',
  instruction: 'Tik op de grond om te lopen. Sleep voorwerpen aan hun witte greep. Q laat Argos helpen.'
};

const P={ink:'#263747',paper:'#f1dca9',gold:'#e8b64e',teal:'#4c9b95',foam:'#8ecac0',plum:'#785677',roof:'#c96c52',sand:'#c99b62',light:'#f8e9c5'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const copyPoint=p=>({x:p.x,y:p.y});
function toward(a,b,speed,dt){const d=distance(a,b);if(d<.6){a.walking=false;return true;}const k=Math.min(1,speed*dt/d);a.x+=(b.x-a.x)*k;a.y+=(b.y-a.y)*k;a.dir=b.x<a.x?'left':'right';a.walking=true;return d<speed*dt+1;}
function label(ctx,text,x,y,{color=P.ink,size=13,align='center',font='sans-serif'}={}){ctx.fillStyle=color;ctx.font=`bold ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(text,x,y);}
function line(ctx,a,b,color,width=2){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function pill(ctx,text,x,y,w=180,color=P.paper){ctx.fillStyle=P.ink;ctx.fillRect(x-w/2-2,y-14,w+4,28);ctx.fillStyle=color;ctx.fillRect(x-w/2,y-12,w,24);label(ctx,text,x,y,{size:12});}

export function createConcept(api) {
  const hero={x:392,y:254,elevation:0,dir:'right',walking:false,target:null};
  const dog={x:357,y:275,elevation:0,dir:'right',walking:false,mode:'follow'};
  const bion={x:492,y:229,elevation:0,dir:'left',walking:false};
  const ring={x:492,y:229,r:51};
  const base={id:'base',x:297,y:263,w:72,h:20};
  const top={id:'top',x:185,y:264,w:66,h:20};
  let stage=1,clock=0,drag=null,pointer=null,gripped=false,stacked=false,proved=false,proofTime=0,ended=false;
  let climbing=null,transition=0,bubble='',bubbleTime=0,lastStatus='',blockedAt=-20,ringMoved=false;
  let highlighted=null;
  function controls(){return [
    {id:'argos',label:stage===1?(gripped||dog.mode==='grip'?'Argos, los!':'Argos, pak vast!'):'Argos, erbij!',key:'Q'},
    ...(stage===2?[{id:'climb',label:hero.elevation?'Stap van de krat':'Stap op de krat',key:'E'}]:[]),
    {id:'gate',label:'Samen naar de poort',key:'Spatie'}
  ];}
  function status(title,detail){const key=title+'|'+detail;if(key!==lastStatus){lastStatus=key;api.setStatus(title,detail);}}
  function say(text,time=3){bubble=text;bubbleTime=time;}
  function handle(){return {x:ring.x-58,y:ring.y+22};}
  function dogHandle(){return {x:ring.x+12,y:ring.y+51};}
  function gateOpen(){return stage===1?bion.x<397:proved;}
  function platform(){return {x:base.x,y:base.y,elevation:stacked?42:20};}
  function sound(name){api.sound?.(name);}
  function pointToGoal(){
    if(stage===1&&gateOpen()){dog.mode='follow';gripped=false;drag=null;}
    hero.elevation=0;dog.elevation=0;climbing=null;hero.target={x:586,y:244};
    if(gateOpen())status('Samen erlangs','De poort is vrij. Argos komt met je mee.');
    else if(stage===1)status('Bion houdt de doorgang','Zijn kring houdt hem op zijn plek. De witte grijplap is los.');
    else status('Bion staat nog boven je','Een krat kun je verschuiven. Twee kratten passen op elkaar.');
  }
  function nextStage(){
    stage=2;transition=1.5;drag=null;gripped=false;dog.mode='follow';hero.target=null;climbing=null;hero.elevation=dog.elevation=0;
    Object.assign(hero,{x:166,y:257,dir:'right',walking:false});Object.assign(dog,{x:128,y:267,walking:false});
    Object.assign(bion,{x:506,y:239,elevation:28,dir:'left',walking:false});
    say('Dan verzin ik een betere regel!',2.6);sound('cloth');
    status('Zijn tweede grote woord','“Alleen wie bóven mij staat, mag voorbij.” Sleep een krat; E laat je erop stappen.');
  }
  function finish(){if(ended)return;ended=true;hero.walking=dog.walking=false;sound('connect');api.finish('“Dat bedoelde ik niet.”','“Je zei: bóven.” Bion geeft de weg vrij. Diogenes en Argos gaan samen verder.');}
  function tryClimb(){
    if(stage!==2){status('Eerst zijn kring','Laat Argos vasthouden en sleep de witte grijplap.');return;}
    if(hero.elevation){hero.elevation=0;dog.elevation=0;climbing=null;hero.y=clamp(base.y+11,190,286);sound('wood');return;}
    climbing=true;hero.target={x:base.x-13,y:base.y};
    status('Even hoger kijken','Diogenes stapt op de krat. Roep Argos om naast je te komen.');
  }
  function action(id){
    if(ended||transition>0)return;
    if(id==='gate'){pointToGoal();return;}
    if(id==='climb'){tryClimb();return;}
    if(id==='argos'){
      sound('dog');
      if(stage===1){
        if(gripped||dog.mode==='grip'){gripped=false;dog.mode='follow';status('Argos volgt je','Samen erlangs zodra Bion zijn plek heeft verlaten.');}
        else{dog.mode='grip';status('Argos pakt de andere kant','Sleep straks de witte grijplap. Bion heeft beloofd in zijn kring te blijven.');}
      }else{dog.mode='join';status('Argos komt erbij','Laat hem naast Diogenes op de krat staan.');}
    }
  }
  function hitBox(p,o){return Math.abs(p.x-o.x)<o.w/2+12&&p.y>o.y-o.h-18&&p.y<o.y+14;}
  function pointerDown(p){
    if(ended||transition>0)return;pointer=copyPoint(p);
    if(stage===1&&distance(p,handle())<40){
      drag={kind:'ring',offset:{x:p.x-ring.x,y:p.y-ring.y}};hero.target=null;climbing=null;
      if(!gripped)status('Twee handen en vier poten','Laat Argos de andere kant vasthouden. Dan kun jij de kring trekken.');
      return;
    }
    if(stage===2){
      const pick=hitBox(p,top)?top:hitBox(p,base)?base:null;
      if(pick){
        drag={kind:'crate',id:pick.id,offset:{x:p.x-pick.x,y:p.y-pick.y}};
        if(pick===top&&stacked){stacked=false;top.y=base.y;}
        hero.elevation=dog.elevation=0;climbing=null;hero.target=null;sound('wood');return;
      }
    }
    if(p.x>538){pointToGoal();return;}
    hero.elevation=dog.elevation=0;climbing=null;hero.target={x:clamp(p.x,65,591),y:clamp(p.y,191,288)};
  }
  function pointerMove(p){pointer=copyPoint(p);highlighted=null;if(stage===1&&distance(p,handle())<40)highlighted='ring';if(stage===2){if(hitBox(p,top))highlighted='top';else if(hitBox(p,base))highlighted='base';}}
  function pointerUp(p={}){
    if(p.cancelled){drag=null;return;}
    if(drag?.kind==='crate'&&drag.id==='top'&&distance(top,base)<43){
      stacked=true;top.x=base.x;top.y=base.y-22;sound('wood');status('Dat staat een stuk hoger','Stap erop en laat Argos naast je komen.');
    }
    drag=null;
  }
  function keyDown(code){if(code==='KeyQ')action('argos');if(code==='KeyE')action('climb');if(code==='Space')action('gate');}
  function moveHero(dt,keys){
    let dx=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
    let dy=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));
    if((dx||dy)&&!drag){hero.target=null;climbing=null;hero.elevation=0;dog.elevation=0;const n=Math.hypot(dx,dy);hero.x+=dx/n*114*dt;hero.y+=dy/n*114*dt;hero.walking=true;hero.dir=dx<0?'left':dx>0?'right':hero.dir;}
    else if(hero.target&&!drag){if(toward(hero,hero.target,125,dt)){hero.target=null;if(climbing){hero.x=base.x-13;hero.y=base.y;hero.elevation=platform().elevation;climbing=null;sound('wood');if(!stacked)say('Mijn kruk staat hoger.',2.3);}}}
    else if(!drag)hero.walking=false;
    hero.x=clamp(hero.x,65,596);hero.y=clamp(hero.y,191,288);
    if(!gateOpen()&&hero.x>468){
      hero.x=468;
      if(clock-blockedAt>2.5){blockedAt=clock;say(stage===1?'Ik wijk geen stap uit mijn kring.':'Alleen wie bóven mij staat.',2);sound('cloth');}
    }
  }
  function update(dt,keys=new Set()){
    dt=clamp(Number(dt)||0,0,.05);if(ended)return;clock+=dt;bubbleTime=Math.max(0,bubbleTime-dt);transition=Math.max(0,transition-dt);
    if(transition>0)return;
    if(drag?.kind==='ring'&&pointer){
      const h=handle();
      if(distance(hero,h)>10)toward(hero,h,190,dt);
      else if(gripped){
        const target={x:clamp(pointer.x-drag.offset.x,239,492),y:clamp(pointer.y-drag.offset.y,211,233)};
        toward(ring,target,108,dt);hero.x=ring.x-58;hero.y=ring.y+22;hero.walking=true;
        if(!ringMoved&&ring.x<469){ringMoved=true;say('Mijn woord is mijn woord!',2.8);sound('wood');}
      }
    }else if(drag?.kind==='crate'&&pointer){
      const o=drag.id==='base'?base:top;
      const target={x:clamp(pointer.x-drag.offset.x,142,394),y:clamp(pointer.y-drag.offset.y,242,277)};
      toward(o,target,230,dt);hero.x=o.x-43;hero.y=o.y+5;hero.dir='right';hero.walking=true;
      if(o===base&&stacked){top.x=base.x;top.y=base.y-22;}
    }
    moveHero(dt,keys);
    if(stage===1){
      toward(bion,{x:ring.x,y:ring.y},98,dt);bion.dir='left';
      if(dog.mode==='grip'){
        if(toward(dog,dogHandle(),190,dt)){gripped=true;dog.walking=false;}
        if(gripped){dog.x=ring.x+12;dog.y=ring.y+51;}
      }else{
        const goal={x:hero.x-27,y:hero.y+10};if(distance(dog,goal)>22)toward(dog,goal,151,dt);else dog.walking=false;
      }
      if(gateOpen()&&!drag&&hero.x<500&&ringMoved)status('Zijn kring staat niet meer in de weg','Ga samen naar de poort. Argos laat vanzelf los wanneer je vertrekt.');
      if(gateOpen()&&hero.x>550&&dog.x>521)nextStage();
    }else{
      const goal=hero.elevation?{x:base.x+17,y:base.y}:{x:hero.x-25,y:hero.y+11};
      if(distance(dog,goal)>7)toward(dog,goal,161,dt);else dog.walking=false;
      dog.elevation=dog.mode==='join'&&hero.elevation&&distance(dog,goal)<15?hero.elevation:0;
      if(!proved&&hero.elevation>28&&dog.elevation>28&&distance(hero,dog)<46){
        proofTime+=dt;if(proofTime>.65){proved=true;say('Dat bedoelde ik niet.',4);sound('connect');status('Je staat letterlijk boven hem','Bion heeft niets meer te zeggen. Ga samen door de poort.');}
      }else if(!proved)proofTime=0;
      if(proved){toward(bion,{x:442,y:212},67,dt);bion.elevation=Math.max(0,bion.elevation-dt*45);}
      if(proved&&hero.x>557&&dog.x>535)finish();
    }
  }

  function drawGate(ctx){
    for(const y of [142,303]){
      ctx.fillStyle=P.ink;ctx.fillRect(493,y,16,54);ctx.fillStyle=P.sand;ctx.fillRect(496,y,10,50);
      ctx.fillStyle=P.paper;ctx.fillRect(496,y,10,5);
    }
    ctx.fillStyle=P.ink;ctx.fillRect(487,145,26,9);ctx.fillStyle=P.roof;ctx.fillRect(490,142,21,7);
    ctx.fillStyle=gateOpen()?P.foam:P.plum;ctx.globalAlpha=.35;ctx.fillRect(484,197,27,81);ctx.globalAlpha=1;
    const x=576,y=237;ctx.fillStyle=gateOpen()?P.teal:P.sand;ctx.beginPath();ctx.moveTo(x+14,y);ctx.lineTo(x-1,y-11);ctx.lineTo(x-1,y-5);ctx.lineTo(x-16,y-5);ctx.lineTo(x-16,y+5);ctx.lineTo(x-1,y+5);ctx.lineTo(x-1,y+11);ctx.closePath();ctx.fill();label(ctx,'VERDER',x,267,{size:11,color:gateOpen()?P.teal:P.ink});
  }
  function drawCrate(ctx,o,active){
    const y=o.y-o.h;ctx.fillStyle=P.ink;ctx.fillRect(o.x-o.w/2-2,y-2,o.w+4,o.h+7);ctx.fillStyle=P.sand;ctx.fillRect(o.x-o.w/2,y,o.w,o.h+3);ctx.fillStyle=P.gold;ctx.fillRect(o.x-o.w/2,y,o.w,4);
    line(ctx,{x:o.x-o.w/2+6,y:y+6},{x:o.x+o.w/2-6,y:y+o.h-2},P.ink,3);line(ctx,{x:o.x+o.w/2-6,y:y+6},{x:o.x-o.w/2+6,y:y+o.h-2},P.ink,3);
    ctx.fillStyle=P.light;ctx.fillRect(o.x-7,y-2,14,7);ctx.fillStyle=P.ink;ctx.fillRect(o.x-3,y,6,2);
    if(active){ctx.strokeStyle=P.foam;ctx.lineWidth=3;ctx.strokeRect(o.x-o.w/2-5,y-5,o.w+10,o.h+14);}
  }
  function drawRing(ctx){
    ctx.save();ctx.translate(Math.round(ring.x),Math.round(ring.y));
    ctx.strokeStyle=P.ink;ctx.lineWidth=9;ctx.beginPath();ctx.ellipse(0,10,55,34,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=P.gold;ctx.lineWidth=5;ctx.stroke();
    ctx.strokeStyle=P.light;ctx.lineWidth=1;ctx.stroke();ctx.restore();
    const h=handle();line(ctx,h,{x:ring.x-40,y:ring.y+30},P.ink,7);line(ctx,h,{x:ring.x-40,y:ring.y+30},P.gold,4);
    ctx.fillStyle=P.ink;ctx.fillRect(h.x-11,h.y-6,21,14);ctx.fillStyle=highlighted==='ring'||drag?.kind==='ring'?P.foam:P.light;ctx.fillRect(h.x-8,h.y-5,15,10);ctx.fillStyle=P.ink;ctx.fillRect(h.x-4,h.y-1,7,2);
    if(!ringMoved){label(ctx,'SLEEP',h.x-11,h.y+23,{size:10,color:P.ink});line(ctx,{x:h.x-31,y:h.y+10},{x:h.x-13,y:h.y+10},P.ink,2);}
    if(dog.mode==='grip'){line(ctx,{x:ring.x+12,y:ring.y+41},{x:dog.x+4,y:dog.y-8},gripped?P.teal:P.gold,3);}
  }
  function actor(ctx,id,a,scale=2){
    ctx.fillStyle='rgba(38,55,71,.16)';ctx.beginPath();ctx.ellipse(a.x,a.y+2,id==='argos'?19:18,5,0,0,Math.PI*2);ctx.fill();
    api.actor(ctx,id,Math.round(a.x),Math.round(a.y-a.elevation),{pose:a.walking?'walk':'idle',dir:a.dir||'right',scale});
  }
  function draw(ctx){
    ctx.fillStyle=P.paper;ctx.fillRect(0,0,640,360);
    ctx.fillStyle='#e6c890';ctx.fillRect(0,130,640,230);ctx.fillStyle='#ecd6a6';ctx.fillRect(0,189,640,91);
    ctx.fillStyle=P.ink;ctx.fillRect(23,116,104,57);ctx.fillStyle=P.roof;ctx.fillRect(20,99,113,30);ctx.fillStyle=P.plum;ctx.fillRect(28,127,93,28);ctx.fillStyle=P.gold;ctx.fillRect(20,124,113,5);
    label(ctx,'BIONS BROOD',76,114,{size:10,color:P.light});
    for(const p of [[43,207],[100,315],[215,183],[351,310],[436,172],[607,324]]){ctx.fillStyle=P.sand;ctx.fillRect(p[0],p[1],16,2);ctx.fillStyle=P.light;ctx.fillRect(p[0]+3,p[1]-2,11,1);}
    ctx.fillStyle=P.foam;ctx.fillRect(0,338,640,22);ctx.fillStyle=P.teal;ctx.fillRect(0,345,640,4);
    drawGate(ctx);
    label(ctx,stage===1?'ZIJN EERSTE GROTE WOORD':'ZIJN TWEEDE GROTE WOORD',320,27,{color:P.plum,size:11});
    const words=stage===1?'“Ik wijk geen stap uit mijn kring!”':'“Alleen wie bóven mij staat, mag voorbij.”';
    label(ctx,words,320,53,{size:19});
    label(ctx,stage===1?'Jullie willen verder. Bion wil zijn woord houden.':'Nu kijkt hij opeens op iedereen neer.',320,78,{size:12,color:P.plum});
    if(stage===1)drawRing(ctx);
    else{
      ctx.fillStyle=P.ink;ctx.fillRect(482,213,48,9);ctx.fillRect(487,222,5,20);ctx.fillRect(521,222,5,20);ctx.fillStyle=P.gold;ctx.fillRect(483,210,46,6);ctx.fillStyle=P.roof;ctx.fillRect(487,207,38,5);
      if(drag?.kind==='crate'&&drag.id==='top'&&distance(top,base)<55){ctx.fillStyle='rgba(76,155,149,.28)';ctx.fillRect(base.x-base.w/2-4,base.y-46,base.w+8,52);}
      drawCrate(ctx,base,highlighted==='base'||drag?.id==='base');drawCrate(ctx,top,highlighted==='top'||drag?.id==='top');
    }
    const actors=[['bion',bion],['hero',hero],['argos',dog]].sort((a,b)=>a[1].y-b[1].y);
    for(const [id,a]of actors)actor(ctx,id,a);
    if(stage===1&&dog.mode==='grip'&&!gripped)pill(ctx,'Argos loopt erheen',dog.x,Math.max(158,dog.y-60),132,P.light);
    if(bubbleTime>0){const x=clamp(bion.x,120,520);pill(ctx,bubble,x,Math.max(129,bion.y-bion.elevation-77),Math.max(150,Math.min(264,bubble.length*6.9)),P.light);}
    if(stage===2&&hero.elevation){label(ctx,proved?'LETTERLIJK BOVEN HEM':stacked?'EN ARGOS?':'NOG NIET BOVEN HEM',base.x,base.y+29,{size:10,color:proved?P.teal:P.plum});}
    ctx.fillStyle=P.ink;ctx.fillRect(0,350,640,10);
    if(transition>0){ctx.fillStyle='rgba(241,220,169,.9)';ctx.fillRect(0,0,640,360);label(ctx,'Bion slikt zijn eerste grote woord in.',320,167,{size:20});label(ctx,'Maar hij is nog niet uitgepraat.',320,197,{size:14,color:P.plum});}
  }
  function snapshot(){return {id:'rules',stage,clock,ended,proved,proofTime,gripped,stacked,transition,gateOpen:gateOpen(),hero:{...hero,target:hero.target?{...hero.target}:null},dog:{...dog},bion:{...bion},ring:{...ring},handle:handle(),base:{...base},top:{...top},drag:drag?{...drag,offset:{...drag.offset}}:null};}
  status('Bion houdt zijn woord','Kom samen aan de andere kant. Bion blijft in zijn kring.');
  return {get controls(){return controls();},update,draw,pointerDown,pointerMove,pointerUp,keyDown,action,snapshot};
}
