export const meta = {
  id: 'chaos', title: 'Goede chaos', subtitle: 'Een streek die zichzelf afmaakt',
  description: 'Je zet voorwerpen klaar en laat de buurt het werk doen. Een kruik, een plank en een hond worden samen een kleine kettingreactie.',
  instruction: 'Sleep de plank en de schalen. Tik op de plank om te draaien. Rol de kruik en stuur Argos naar de broodmand.',
};

const C={ink:'#263747',paper:'#f1dca9',gold:'#e8b64e',teal:'#4c9b95',foam:'#8ecac0',plum:'#785677',roof:'#c96c52',sand:'#c99b62',light:'#f8e9c5'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const copy=o=>JSON.parse(JSON.stringify(o));
const HOME={x:114,y:213},POST={x:453,y:205},GATE={x:438,y:205},BREAD={x:563,y:204};

export function createConcept(api) {
  let time=0,selected='plank',drag=null,done=false,finishDelay=null,announcedFinish=false,lastStatus='';
  const plank={x:258,y:264,angle:-Math.PI/4,length:96};
  const bowls={x:347,y:145,fallen:false,hitAt:null};
  const launch={x:78,y:266},pot={...launch,vx:0,vy:0,r:11,rolling:false,turn:0,contact:0};
  const guard={...POST,mode:'watch',target:null,wait:0};
  const dog={...HOME,phase:'idle',point:0,carrying:false,walking:false,dir:'right'};
  const stats={rolls:0,plankHits:0,noise:0,dogCalls:0,waitedAtGate:false,usedPlank:false};
  let rings=[],crumbs=[],bubble=null;
  function status(title,detail){const key=title+'|'+detail;if(lastStatus!==key){lastStatus=key;api.setStatus?.(title,detail);}}
  function say(text,seconds=2.6){bubble={text,until:time+seconds};}
  function sound(name){api.sound?.(name);}
  function gateClear(){return distance(guard,GATE)>73;}
  function resetAttempt(){
    Object.assign(pot,{...launch,vx:0,vy:0,rolling:false,turn:0,contact:0});
    Object.assign(bowls,{fallen:false,hitAt:null});
    Object.assign(guard,{...POST,mode:'watch',target:null,wait:0});
    Object.assign(dog,{...HOME,phase:'idle',point:0,carrying:false,walking:false,dir:'right'});
    rings=[];crumbs=[];bubble=null;finishDelay=null;done=false;announcedFinish=false;drag=null;
    stats.plankHits=0;stats.noise=0;stats.waitedAtGate=false;stats.usedPlank=false;
    status('De opstelling blijft staan.','Schuif iets, probeer nog eens. Er gaat niets verloren.');sound('cloth');
  }
  function endpoints(){const dx=Math.cos(plank.angle)*plank.length/2,dy=Math.sin(plank.angle)*plank.length/2;return [{x:plank.x-dx,y:plank.y-dy},{x:plank.x+dx,y:plank.y+dy}];}
  function nearestOnPlank(p){const[a,b]=endpoints(),dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy),0,1);return {x:a.x+t*dx,y:a.y+t*dy};}
  function rotate(){plank.angle+=Math.PI/8;sound('wood');status('De plank wijst een andere kant op.','De kruik kaatst tegen het hout. Waar komt hij nu uit?');}
  function place(id,p){
    if(id==='plank'){plank.x=clamp(p.x,98,370);plank.y=clamp(p.y,131,296);}
    else if(id==='bowls'){bowls.x=clamp(p.x,70,384);bowls.y=clamp(p.y,130,296);}
    else if(id==='pot'&&!pot.rolling){pot.x=launch.x=clamp(p.x,54,380);pot.y=launch.y=clamp(p.y,128,307);}
  }
  function hitBowls(){
    bowls.fallen=true;bowls.hitAt=time;stats.noise++;stats.usedPlank=stats.plankHits>0;
    const impact={x:bowls.x,y:bowls.y};
    for(let i=0;i<7;i++)crumbs.push({x:impact.x+Math.cos(i*2.3)*12,y:impact.y+Math.sin(i*2.3)*7,angle:i*1.7});
    rings.push({...impact,born:time});pot.vx*=.67;pot.vy*=.67;
    guard.mode='investigate';guard.target={x:Math.max(66,impact.x-24),y:clamp(impact.y+5,131,307)};guard.wait=13;
    say('Mijn schalen! Wie zet die daar?',3);sound('pot');
    status('KLOENG. Philo komt kijken.','Argos kan door zodra Philo echt van de doorgang wegloopt.');
  }
  function physics(dt){
    if(!pot.rolling)return;
    pot.contact=Math.max(0,pot.contact-dt);pot.x+=pot.vx*dt;pot.y+=pot.vy*dt;
    pot.turn+=Math.hypot(pot.vx,pot.vy)*dt/15;
    const damping=Math.exp(-.105*dt);pot.vx*=damping;pot.vy*=damping;
    if(pot.x<38+pot.r){pot.x=38+pot.r;pot.vx=Math.abs(pot.vx)*.6;}
    if(pot.x>607-pot.r){pot.x=607-pot.r;pot.vx=-Math.abs(pot.vx)*.6;}
    if(pot.y<103+pot.r){pot.y=103+pot.r;pot.vy=Math.abs(pot.vy)*.6;}
    if(pot.y>327-pot.r){pot.y=327-pot.r;pot.vy=-Math.abs(pot.vy)*.6;}
    if(pot.x>412-pot.r&&pot.x<441+pot.r&&(pot.y<179+pot.r||pot.y>232-pot.r)){
      if(pot.vx>0){pot.x=412-pot.r;pot.vx=-Math.abs(pot.vx)*.5;}
      else{pot.x=441+pot.r;pot.vx=Math.abs(pot.vx)*.5;}
    }
    const n=nearestOnPlank(pot),dx=pot.x-n.x,dy=pot.y-n.y,d=Math.hypot(dx,dy);
    if(d<pot.r+5&&pot.contact===0){
      const nx=d>.001?dx/d:-Math.sin(plank.angle),ny=d>.001?dy/d:Math.cos(plank.angle),dot=pot.vx*nx+pot.vy*ny;
      if(dot<0){
        pot.vx-=2*dot*nx;pot.vy-=2*dot*ny;pot.x+=nx*(pot.r+5-d+.3);pot.y+=ny*(pot.r+5-d+.3);pot.contact=.1;
        stats.plankHits++;sound('wood');rings.push({x:n.x,y:n.y,born:time,wood:true});
      }
    }
    if(!bowls.fallen&&distance(pot,bowls)<pot.r+20)hitBowls();
    if(Math.hypot(pot.vx,pot.vy)<7){pot.rolling=false;pot.vx=pot.vy=0;if(!bowls.fallen)status('Hij is uitgerold.','Zet terug houdt je opstelling. Of sleep de kruik naar een nieuwe startplek.');}
  }
  function travel(person,target,speed,dt){
    const dx=target.x-person.x,dy=target.y-person.y,d=Math.hypot(dx,dy);
    if(d<.8){person.x=target.x;person.y=target.y;return true;}
    const step=Math.min(d,speed*dt);person.x+=dx/d*step;person.y+=dy/d*step;
    person.dir=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';return step===d;
  }
  function stepDog(dt){
    dog.walking=false;if(dog.phase==='idle'||dog.phase==='delivered')return;
    const outbound=[{x:388,y:205},{x:480,y:205},BREAD],inbound=[{x:478,y:205},{x:387,y:205},HOME];
    const path=dog.phase==='out'?outbound:inbound,target=path[dog.point];
    if(dog.phase==='out'&&dog.point===1&&dog.x<444&&!gateClear()){
      if(!stats.waitedAtGate){stats.waitedAtGate=true;status('Argos wacht bij de doorgang.','Eerst moet Philo van zijn plek. Laat de schalen ergens anders kletteren.');sound('dog');}
      return;
    }
    dog.walking=true;
    if(travel(dog,target,108,dt)){
      dog.point++;
      if(dog.point===path.length){
        if(dog.phase==='out'){
          dog.phase='back';dog.point=0;dog.carrying=true;sound('dog');
          status('Hebbes. Argos brengt de mand.','Eén duwtje. De rest deed Sinope.');
        }else{
          dog.phase='delivered';dog.walking=false;done=true;finishDelay=1.65;pot.rolling=false;pot.vx=pot.vy=0;sound('connect');
          say('Ik heb alleen een kruik aangeraakt.',3.5);
          status('Goede chaos! Brood voor twee.','Jullie kettingreactie maakte de doorgang vrij.');
        }
      }
    }
  }
  function update(dt,keys=new Set()){
    dt=clamp(Number(dt)||0,0,.1);time+=dt;rings=rings.filter(r=>time-r.born<1.1);if(bubble&&bubble.until<time)bubble=null;
    if(finishDelay!==null){finishDelay=Math.max(0,finishDelay-dt);if(finishDelay===0&&!announcedFinish){announcedFinish=true;api.finish?.('Sinope hielp een handje.',stats.usedPlank?'Kruik → plank → schalen → Philo → Argos → brood. Jouw kleine duwtje werd een complete streek.':'Kruik → schalen → Philo → Argos → brood. Je vond een directe route; de plank was helemaal niet nodig.');}return;}
    const dx=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),dy=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));
    if((dx||dy)&&!drag){const item=selected==='plank'?plank:selected==='bowls'?bowls:pot;place(selected,{x:item.x+dx*110*dt,y:item.y+dy*110*dt});}
    const steps=Math.max(1,Math.ceil(dt/(1/120)));for(let i=0;i<steps;i++)physics(dt/steps);
    if(guard.mode==='investigate'){
      if(travel(guard,guard.target,83,dt)){
        guard.wait-=dt;
        if(!gateClear()&&guard.wait<11.8)status('Philo blijft vlak bij de doorgang.','Maak de herrie verder van de poort. Zet terug bewaart je opstelling.');
        if(guard.wait<=0){guard.mode='return';guard.target={...POST};say('Alles bij elkaar. Dat was het dan.',2.3);}
      }
    }else if(guard.mode==='return'&&travel(guard,POST,57,dt)){guard.mode='watch';guard.target=null;}
    stepDog(dt);
  }
  function action(id){
    if(id==='reset'){resetAttempt();return;}
    if(done)return;
    if(id==='roll'){
      if(pot.rolling){status('De kruik rolt nog.','Je mag ondertussen de plank of schalen verschuiven. Zet terug begint meteen opnieuw.');return;}
      if(bowls.fallen){status('De schalen liggen al op straat.','Stuur Argos naar de mand, of zet terug voor een nieuwe kettingreactie.');return;}
      pot.vx=195;pot.vy=0;pot.rolling=true;pot.contact=0;stats.rolls++;sound('pot');
      status('Daar gaat je duwtje…','Kijk waar de kruik raakt. Ook tijdens het rollen mag je iets verschuiven.');
    }else if(id==='dog'){
      if(dog.phase==='idle'){dog.phase='out';dog.point=0;stats.dogCalls++;sound('dog');status('Argos, de broodmand!','Hij loopt naar de poort en wacht als Philo nog in de weg staat.');}
      else if(dog.phase==='out')status('Argos weet waar de mand staat.','Maak de doorgang vrij; hij wacht geduldig.');
    }
  }
  function pointerDown(p){
    if(done)return;let id=null;
    if(!bowls.fallen&&distance(p,bowls)<29)id='bowls';
    else if(!pot.rolling&&distance(p,pot)<26)id='pot';
    else if(distance(p,nearestOnPlank(p))<20)id='plank';
    if(id){selected=id;const o=id==='plank'?plank:id==='bowls'?bowls:pot;drag={id,start:{...p},offset:{x:o.x-p.x,y:o.y-p.y},moved:false};}
    else if(distance(p,dog)<28||distance(p,BREAD)<34)action('dog');
  }
  function pointerMove(p){if(!drag)return;if(distance(p,drag.start)>5)drag.moved=true;if(drag.moved)place(drag.id,{x:p.x+drag.offset.x,y:p.y+drag.offset.y});}
  function pointerUp(p){if(!drag)return;if(p.cancelled){drag=null;return;}pointerMove(p);const old=drag;drag=null;if(old.id==='plank'&&!old.moved)rotate();else if(old.id==='pot'&&!old.moved)action('roll');else sound('wood');}
  function keyDown(code){
    if(code==='Space')action('roll');else if(code==='KeyQ')action('dog');else if(code==='KeyR')action('reset');
    else if(code==='KeyP')selected='plank';else if(code==='KeyS')selected='bowls';else if(code==='KeyK')selected='pot';else if(code==='KeyE')rotate();
  }
  function text(ctx,s,x,y,color=C.ink,size=13,align='left'){ctx.fillStyle=color;ctx.font=`bold ${size}px ui-monospace, monospace`;ctx.textAlign=align;ctx.fillText(s,x,y);}
  function arrow(ctx,a,b,color=C.gold,dashed=false){
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dashed?[5,5]:[]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
    const angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.beginPath();ctx.moveTo(b.x-Math.cos(angle-.55)*8,b.y-Math.sin(angle-.55)*8);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-Math.cos(angle+.55)*8,b.y-Math.sin(angle+.55)*8);ctx.stroke();
  }
  function basket(ctx,x,y,small=false){
    const k=small?0.7:1;ctx.save();ctx.translate(x,y);ctx.scale(k,k);ctx.fillStyle=C.ink;ctx.fillRect(-19,-14,38,17);ctx.fillStyle=C.sand;ctx.fillRect(-17,-12,34,13);
    for(let i=-13;i<16;i+=8){ctx.fillStyle=C.roof;ctx.fillRect(i,-11,2,11);}ctx.fillStyle=C.gold;ctx.fillRect(-14,-21,13,9);ctx.fillRect(0,-24,15,12);ctx.fillStyle=C.paper;ctx.fillRect(-11,-21,2,5);ctx.fillRect(3,-24,2,6);ctx.fillRect(8,-24,2,6);ctx.restore();
  }
  function draw(ctx){
    ctx.clearRect(0,0,640,360);ctx.fillStyle=C.paper;ctx.fillRect(0,0,640,360);
    ctx.fillStyle='#ded0a8';ctx.fillRect(0,87,640,273);ctx.fillStyle='#ead5a3';ctx.fillRect(21,101,598,227);
    for(let i=0;i<22;i++){const x=37+(i*97)%560,y=118+(i*43)%198;ctx.fillStyle=i%2?'#d4bc8d':'#f0dfb5';ctx.fillRect(x,y,18,3);ctx.fillRect(x+18,y-2,5,3);}
    ctx.fillStyle=C.ink;ctx.fillRect(460,55,147,106);ctx.fillStyle=C.sand;ctx.fillRect(466,63,135,88);ctx.fillStyle=C.plum;ctx.fillRect(493,77,83,83);
    ctx.fillStyle=C.roof;ctx.fillRect(450,48,165,15);ctx.fillRect(455,37,153,12);ctx.fillStyle='#e19962';ctx.fillRect(461,40,141,4);ctx.fillStyle=C.gold;ctx.fillRect(486,25,97,13);
    text(ctx,'VOORRAAD',534,35,C.ink,10,'center');
    ctx.fillStyle=C.sand;ctx.fillRect(413,102,21,71);ctx.fillRect(413,235,21,92);ctx.fillStyle=C.paper;ctx.fillRect(413,102,21,6);ctx.fillRect(413,235,21,6);
    for(let y=111;y<329;y+=14)if(y<173||y>238){ctx.fillStyle='#b9956e';ctx.fillRect(415,y,17,2);}
    const clear=gateClear();ctx.fillStyle=clear?'#8ecac066':'#c96c5244';ctx.fillRect(402,174,48,63);
    arrow(ctx,{x:400,y:205},{x:448,y:205},clear?C.teal:C.roof);
    if(!dog.carrying&&dog.phase!=='delivered')basket(ctx,BREAD.x,BREAD.y);
    text(ctx,'Brood voor twee',563,243,C.ink,11,'center');
    if(!pot.rolling&&!done){arrow(ctx,{x:pot.x+17,y:pot.y},{x:pot.x+67,y:pot.y},C.ink,true);text(ctx,'tik: rol',pot.x,pot.y+30,C.ink,10,'center');}
    const [a,b]=endpoints();
    ctx.save();ctx.translate(plank.x,plank.y);ctx.rotate(plank.angle);ctx.fillStyle=C.ink;ctx.fillRect(-50,-7,100,16);ctx.fillStyle=C.sand;ctx.fillRect(-48,-6,96,11);ctx.fillStyle=C.paper;ctx.fillRect(-44,-4,84,2);ctx.fillStyle='#94694b';ctx.fillRect(-41,1,76,2);ctx.fillRect(-27,-3,2,7);ctx.fillRect(25,-3,2,7);ctx.restore();
    if(selected==='plank'&&!done){for(const p of[a,b]){ctx.fillStyle=C.teal;ctx.fillRect(p.x-4,p.y-4,8,8);ctx.fillStyle=C.paper;ctx.fillRect(p.x-1,p.y-1,2,2);}}
    if(!bowls.fallen){
      ctx.fillStyle='#8e77554d';ctx.beginPath();ctx.ellipse(bowls.x,bowls.y+4,25,8,0,0,Math.PI*2);ctx.fill();
      for(let i=0;i<4;i++){ctx.fillStyle=C.ink;ctx.fillRect(bowls.x-20+i*2,bowls.y-5-i*6,40-i*4,5);ctx.fillStyle=i%2?C.foam:C.light;ctx.fillRect(bowls.x-18+i*2,bowls.y-6-i*6,36-i*4,4);}
      text(ctx,'sleep: schalen',bowls.x,bowls.y-34,C.ink,10,'center');
      if(selected==='bowls'){ctx.strokeStyle=C.teal;ctx.lineWidth=2;ctx.strokeRect(bowls.x-26,bowls.y-31,52,41);}
    }else{
      for(const p of crumbs){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle=C.ink;ctx.fillRect(-9,-3,18,6);ctx.fillStyle=C.foam;ctx.fillRect(-8,-3,15,3);ctx.restore();}
      if(time-bowls.hitAt<1.2)text(ctx,'KLOENG!',bowls.x,bowls.y-34,C.plum,18,'center');
    }
    for(const r of rings){const age=(time-r.born)/1.1;ctx.strokeStyle=r.wood?'#c99b6288':'#785677';ctx.globalAlpha=1-age;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(r.x,r.y,12+age*66,6+age*32,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    ctx.save();ctx.translate(pot.x,pot.y);ctx.fillStyle='#26374733';ctx.beginPath();ctx.ellipse(0,9,15,6,0,0,Math.PI*2);ctx.fill();ctx.rotate(pot.turn);ctx.fillStyle=C.ink;ctx.fillRect(-10,-10,20,19);ctx.fillRect(-6,-14,12,4);ctx.fillStyle=C.roof;ctx.fillRect(-8,-8,16,15);ctx.fillStyle='#e59a6d';ctx.fillRect(-6,-9,4,12);ctx.fillStyle=C.sand;ctx.fillRect(-5,-14,10,3);ctx.fillStyle=C.ink;ctx.fillRect(8,-6,7,3);ctx.fillRect(12,-3,3,8);ctx.fillRect(8,3,7,3);ctx.restore();
    if(selected==='pot'&&!pot.rolling){ctx.strokeStyle=C.teal;ctx.lineWidth=2;ctx.strokeRect(pot.x-19,pot.y-19,38,39);}
    const stride=`walk${Math.floor(time*8)%4}`;
    api.actor?.(ctx,'philo',guard.x,guard.y,{pose:guard.target&&distance(guard,guard.target)>1?stride:'idle',dir:guard.dir||'left',scale:1.65});
    api.actor?.(ctx,'hero',74,224,{pose:'idle',dir:'right',scale:1.6});
    api.actor?.(ctx,'argos',dog.x,dog.y,{pose:dog.walking?stride:'idle',dir:dog.dir,scale:1.55});
    if(dog.carrying)basket(ctx,dog.x+(dog.dir==='left'?-20:20),dog.y-12,true);
    if(bubble){const x=done?148:clamp(guard.x,180,475),y=done?249:guard.y-64;ctx.fillStyle=C.light;ctx.fillRect(x-143,y-18,286,28);ctx.fillStyle=C.ink;ctx.fillRect(x-143,y+10,286,2);text(ctx,bubble.text,x,y,C.ink,11,'center');}
    if(done){ctx.fillStyle=C.roof;ctx.fillRect(103,166,4,4);ctx.fillRect(111,166,4,4);ctx.fillRect(105,170,8,4);ctx.fillRect(108,174,3,3);}
    text(ctx,'Jij geeft één duwtje. De stad doet de rest.',23,26,C.ink,13);
    text(ctx,'PLANK: sleep of tik om te draaien',23,47,C.plum,10);
    text(ctx,clear?'DOORGANG VRIJ':'PHILO STAAT OP WACHT',438,92,clear?C.teal:C.plum,10,'center');
    text(ctx,'P plank · S schalen · K kruik · pijlen schuiven · E draaien',320,347,C.ink,10,'center');
  }
  status('Haal samen de broodmand achter Philo.','Sleep plank en schalen. Laat de kruik herrie maken, zodat Argos langs kan.');
  return {
    update,draw,pointerDown,pointerMove,pointerUp,keyDown,action,
    controls:[{id:'roll',label:'Rol de kruik',key:'Space'},{id:'dog',label:'Argos, haal!',key:'KeyQ'},{id:'reset',label:'Zet terug',key:'KeyR'}],
    snapshot:()=>copy({time,selected,plank,bowls,launch,pot,guard,dog,gateClear:gateClear(),done,finishDelay,stats}),
  };
}
