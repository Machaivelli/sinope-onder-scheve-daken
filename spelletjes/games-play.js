const P = Object.freeze({ink:'#263747',paper:'#f1dca9',gold:'#e8b64e',teal:'#4c9b95',foam:'#8ecac0',plum:'#785677',clay:'#c96c52',sand:'#c99b62',light:'#fff0cb',stone:'#b9b299'});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const copy=s=>structuredClone(s);
const levelOf=n=>clamp(Math.floor(Number(n)||1),1,3);
function randomOf(seed){let n=Number.isFinite(seed)?seed>>>0:1;return()=>{n=(n+0x6D2B79F5)>>>0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function base(api,state){
 let ended=false,last='';
 return {api,state,active:()=>!ended,dt:n=>Number.isFinite(n)?clamp(n,0,.06):0,
  tell(title,detail=''){const message=title+'|'+detail;if(message!==last){last=message;api.setStatus?.(title,detail);}},
  sound(name){api.sound?.(name);},
  end(won,title,detail=''){if(ended)return;ended=true;state.phase=won?'won':'lost';state.won=won;api.setStatus?.(title,detail);api.finish?.({won,score:Math.max(0,Math.round(state.score||0)),title,detail});},
 };
}
function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function line(c,points,col,width=2){c.strokeStyle=col;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(Math.round(p.x),Math.round(p.y)):c.moveTo(Math.round(p.x),Math.round(p.y)));c.stroke();}
function disc(c,x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(Math.round(x),Math.round(y),r,0,Math.PI*2);c.fill();}
function text(c,t,x,y,size=14,col=P.ink,align='center'){c.fillStyle=col;c.font=`bold ${size}px ui-monospace,monospace`;c.textAlign=align;c.textBaseline='middle';c.fillText(String(t),Math.round(x),Math.round(y));}
function diamond(c,x,y,r,col){c.fillStyle=col;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.fill();}
function sprite(api,c,id,x,y,options={}){if(api.actor)api.actor(c,id,x,y,{scale:id==='argos'?1.2:1.1,dir:'down',pose:'idle',...options});else{rect(c,x-7,y-25,14,23,id==='argos'?P.sand:P.teal);rect(c,x-5,y-32,10,9,P.paper);}}
function court(c,title,accent=P.teal){rect(c,0,0,640,400,P.paper);rect(c,0,0,640,55,P.ink);text(c,title,320,27,18,P.light);rect(c,18,66,604,316,P.sand);rect(c,24,72,592,304,'#e7cb97');for(let x=28;x<615;x+=36){rect(c,x,76,22,3,P.paper);rect(c,x+8,365,22,3,P.paper);}rect(c,18,66,604,4,accent);}
function badge(c,label,x,y,color=P.teal){const w=Math.max(58,label.length*7+16);rect(c,x-w/2,y-13,w,26,P.ink);rect(c,x-w/2+2,y-11,w-4,22,color);text(c,label,x,y,12,P.light);}
function meter(c,x,y,w,value,col=P.teal){rect(c,x,y,w,10,P.ink);rect(c,x+2,y+2,w-4,6,P.paper);rect(c,x+2,y+2,(w-4)*clamp(value,0,1),6,col);}
function vector(keys){return{x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),y:Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))};}
function move(a,target,speed,dt){const dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);a.walking=d>2;if(d<.1)return;const amount=Math.min(d,speed*dt);a.x+=dx/d*amount;a.y+=dy/d*amount;a.dir=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';}

const krukjacht={
 id:'krukjacht',title:'Krukjacht',subtitle:'Een zetel maakt nog geen koning.',
 instruction:'Dans zolang de trommel klinkt. Bij STIL! blijven drie krukjes over. Loop of klik naar een vrije kruk; dichtbij zitten doe je met spatie. Haal het aantal krukken op de teller.',
 controls:[{id:'left',label:'Links',key:'ArrowLeft'},{id:'right',label:'Rechts',key:'ArrowRight'},{id:'sit',label:'Zitten!',key:'Space'}],
 create(api={}){
  const level=levelOf(api.level),rng=randomOf(api.seed),s={id:'krukjacht',level,phase:'music',time:0,round:0,rounds:level===1?4:5,needed:level===1?3:4,score:0,roundTime:0,musicDuration:0,hero:{x:320,y:323,dir:'up',walking:false,target:null},rivals:[],chairs:[],message:'',flash:0};
  const b=base(api,s);let lastBeat=-1;
  function nextRound(){
   s.round++;s.phase='music';s.roundTime=0;s.musicDuration=3+rng()*1.2;s.hero.target=null;s.hero.x=320;s.hero.y=323;lastBeat=-1;
   const rotation=(s.round-1)*.41;
   s.chairs=Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5-Math.PI/2+rotation;return{id:i,x:320+Math.cos(a)*91,y:227+Math.sin(a)*76,active:true,leaving:false,owner:null};});
   const removed=[Math.floor(rng()*5)];let second=Math.floor(rng()*4);if(second>=removed[0])second++;removed.push(second);for(const i of removed)s.chairs[i].leaving=true;
   s.rivals=['bion','nera','ione'].map((id,i)=>{const angle=i*Math.PI*2/3+.2;return{id,angle,x:320+Math.cos(angle)*132,y:227+Math.sin(angle)*101,target:null,seated:false,dir:'down',walking:true};});
   b.tell(`Ronde ${s.round} · de trommel speelt`,`Nog ${Math.max(0,s.needed-s.score)} keer een vrije kruk vinden. WASD of klik om te lopen.`);
  }
  function resolve(won){s.phase='between';s.roundTime=0;s.flash=won?1:-1;if(won)s.score++;b.sound(won?'connect':'pot');b.tell(won?'Die stoel is even van jou!':'Bion zit. Erg tevreden ook.',`${s.score} van ${s.needed} rondes gewonnen.`);}
  function sit(){if(!b.active()||s.phase!=='scramble')return;const seat=s.chairs.filter(ch=>ch.active&&!ch.owner&&distance(ch,s.hero)<25).sort((a,z)=>distance(a,s.hero)-distance(z,s.hero))[0];if(seat){seat.owner='hero';s.hero.x=seat.x;s.hero.y=seat.y;s.hero.walking=false;resolve(true);}}
  function action(id){if(!b.active())return;if(id==='sit')sit();else if(id==='left'||id==='right'){s.hero.target={x:clamp(s.hero.x+(id==='left'?-52:52),46,594),y:s.hero.y};}}
  nextRound();
  return {
   update(delta,keys=new Set()){
    if(!b.active())return;const dt=b.dt(delta);if(!dt)return;s.time+=dt;s.roundTime+=dt;
    if(s.phase==='between'){if(s.roundTime>1.15){if(s.round>=s.rounds)b.end(s.score>=s.needed,s.score>=s.needed?'Krukkenkampioen!':'Nog geen vaste zetel.',s.score>=s.needed?'Argos kiest gewoon de vloer. Die is altijd vrij.':'De twee trillende krukjes verdwijnen. Houd de andere alvast in de gaten.');else nextRound();}return;}
    const input=vector(keys);if(input.x||input.y){const d=Math.hypot(input.x,input.y);s.hero.target=null;move(s.hero,{x:s.hero.x+input.x/d*100,y:s.hero.y+input.y/d*100},178,dt);}else if(s.hero.target)move(s.hero,s.hero.target,178,dt);else s.hero.walking=false;
    s.hero.x=clamp(s.hero.x,47,593);s.hero.y=clamp(s.hero.y,105,351);
    if(s.phase==='music'){
     const beat=Math.floor(s.roundTime*2.5);if(beat!==lastBeat){lastBeat=beat;b.sound('wood');}
     for(const rival of s.rivals){rival.angle+=dt*(.9+level*.13);rival.x=320+Math.cos(rival.angle)*132;rival.y=227+Math.sin(rival.angle)*101;rival.dir=Math.cos(rival.angle)>0?'left':'right';}
     if(s.musicDuration-s.roundTime<.8)b.tell('De trommel houdt zijn adem in…','Twee krukken trillen. Die worden zo weggetrokken.');
     if(s.roundTime>=s.musicDuration){s.phase='scramble';s.roundTime=0;for(const ch of s.chairs)ch.active=!ch.leaving;for(const rival of s.rivals)rival.target=null;b.sound('wood');b.tell('STIL! Zoek een vrije kruk!','Klik een kruk of loop erheen. Spatie zet je neer.');}
    }else if(s.phase==='scramble'){
     const delay=[.9,.64,.42][level-1];
     if(s.roundTime>delay)for(const rival of s.rivals){if(rival.seated)continue;const free=s.chairs.filter(ch=>ch.active&&!ch.owner);if(!free.length)break;if(!rival.target||s.chairs[rival.target.id].owner)rival.target=free.sort((a,z)=>distance(a,rival)-distance(z,rival))[0];move(rival,rival.target,105+level*12,dt);if(distance(rival,rival.target)<13){rival.target.owner=rival.id;rival.seated=true;rival.walking=false;}}
     if(s.hero.target&&s.chairs.some(ch=>ch.active&&!ch.owner&&distance(ch,s.hero.target)<12&&distance(ch,s.hero)<20))sit();
     if(s.phase==='scramble'&&(s.chairs.filter(ch=>ch.active).every(ch=>ch.owner)||s.roundTime>4.5))resolve(false);
    }
   },
   action,keyDown(code){if(code==='Space')action('sit');},
   pointerDown(p){if(!b.active()||!finitePoint(p)||s.phase==='between')return;s.hero.target={x:clamp(p.x,47,593),y:clamp(p.y,105,351)};},
   draw(c){court(c,'DE KRUK IS TE KLEIN VOOR VIER MENINGEN',P.plum);for(let a=0;a<Math.PI*2;a+=.2)rect(c,320+Math.cos(a)*148,229+Math.sin(a)*114,3,2,P.light);
    for(const ch of s.chairs){if(!ch.active){rect(c,ch.x-8,ch.y+2,16,3,P.sand);continue;}const wobble=s.phase==='music'&&s.musicDuration-s.roundTime<.8&&ch.leaving?Math.round(Math.sin(s.time*35)*3):0;rect(c,ch.x-10+wobble,ch.y-9,20,10,P.ink);rect(c,ch.x-8+wobble,ch.y-8,16,5,ch.owner==='hero'?P.teal:ch.owner?P.plum:P.gold);rect(c,ch.x-8,ch.y,4,12,P.sand);rect(c,ch.x+4,ch.y,4,12,P.sand);}
    const actors=[...s.rivals,s.hero].sort((a,z)=>a.y-z.y);for(const a of actors)sprite(api,c,a===s.hero?'hero':a.id,a.x,a.y,{dir:a.dir,pose:a.walking?'walk':'idle'});
    sprite(api,c,'argos',560,341);rect(c,69,94,29,27,P.ink);rect(c,71,97,25,21,P.plum);rect(c,70,94,27,5,P.gold);rect(c,72,120,4,12,P.sand);rect(c,92,120,4,12,P.sand);line(c,[{x:72,y:102},{x:93,y:115},{x:94,y:102},{x:73,y:115}],P.gold,1);line(c,[{x:65,y:83},{x:85,y:s.phase==='music'?92+Math.sin(s.time*16)*3:86}],P.ink,3);text(c,s.phase==='scramble'?'STIL!':s.phase==='between'?s.flash>0?'ZIT!':'TE LAAT':'♪  ♪',320,92,18,s.phase==='scramble'?P.clay:P.plum);badge(c,`${s.score} / ${s.needed} krukken`,320,350,s.flash>0?P.teal:P.plum);
   },snapshot:()=>copy(s),
  };
 },
};

const hondenvlag={
 id:'hondenvlag',title:'Hondenvlag',subtitle:'Vinden is makkelijk. Thuiskomen is de kunst.',
 instruction:'Haal de vlaggen en breng ze naar het blauwe thuishonk. E kiest Diogenes, Q kiest Argos; stuur die met WASD of een klik. Argos’ blaf lokt bewakers weg. Drie tikken is af.',
 controls:[{id:'hero',label:'Stuur Diogenes',key:'KeyE'},{id:'argos',label:'Stuur Argos',key:'KeyQ'},{id:'bark',label:'Blaf!',key:'Space'}],
 create(api={}){
  const level=levelOf(api.level),s={id:'hondenvlag',level,phase:'playing',time:0,remaining:60,score:0,goal:level+2,tags:0,selected:'hero',carrying:false,barkCooldown:0,barkFlash:0,invulnerable:0,hero:{x:79,y:317,target:null,dir:'right',walking:false},dog:{x:112,y:328,target:null,dir:'right',walking:false},flag:{x:549,y:117},guards:[],home:{x:78,y:317}};
  const rng=randomOf(api.seed),b=base(api,s),walls=[{x:298,y:149,w:14,h:102},{x:298,y:73,w:14,h:27},{x:298,y:332,w:14,h:37}];
  if(level>1)walls.push({x:433,y:211,w:62,h:17});if(level>2)walls.push({x:416,y:96,w:17,h:68});
  const flagSpots=[{x:550,y:119},{x:552,y:322},{x:379,y:119},{x:531,y:180},{x:389,y:319}];
  s.guards=Array.from({length:level===3?3:2},(_,i)=>({id:i,cast:i%2?'bion':'philo',x:392+i*61,y:148+i*72,baseX:392+i*61,offset:rng()*6,dir:'down',walking:false,lure:0,lureTarget:null}));
  function blocked(x,y,a){if(x<44||x>596||y<90||y>353)return true;return walls.some(r=>{if(a===s.dog&&r.x===298)return false;return x>r.x-10&&x<r.x+r.w+10&&y>r.y-8&&y<r.y+r.h+8;});}
  function walk(a,target,speed,dt){const before={x:a.x,y:a.y};const dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);if(d<2){a.walking=false;return;}const q=Math.min(d,speed*dt),nx=a.x+dx/d*q,ny=a.y+dy/d*q;if(!blocked(nx,a.y,a))a.x=nx;if(!blocked(a.x,ny,a))a.y=ny;a.walking=distance(a,before)>.1;a.dir=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';}
  function action(id){if(!b.active())return;if(id==='hero'||id==='argos'){s.selected=id;b.tell(id==='hero'?'Diogenes volgt jouw klik.':'Argos volgt jouw klik.',id==='hero'?'De openingen zitten boven en onder in het hek.':'Argos past door het hek. Laat hem een bewaker weglokken.');}else if(id==='bark'&&s.barkCooldown<=0){s.barkCooldown=5;s.barkFlash=.6;b.sound('dog');for(const g of s.guards)if(distance(g,s.dog)<173){g.lure=3.3;g.lureTarget={x:s.dog.x,y:s.dog.y};}b.tell('WAF. Een uitstekend argument.','Bewakers die Argos horen, kijken even niet naar jouw vlag.');}}
  b.tell(`Breng ${s.goal} vlaggen thuis`,'Klik om te lopen. E kiest Diogenes, Q kiest Argos, spatie laat hem blaffen.');
  return{
   update(delta,keys=new Set()){
    if(!b.active())return;const dt=b.dt(delta);if(!dt)return;s.time+=dt;s.remaining=Math.max(0,s.remaining-dt);s.invulnerable=Math.max(0,s.invulnerable-dt);s.barkCooldown=Math.max(0,s.barkCooldown-dt);s.barkFlash=Math.max(0,s.barkFlash-dt);
    const input=vector(keys),selected=s.selected==='hero'?s.hero:s.dog;
    for(const a of [s.hero,s.dog]){
     if(a===selected&&(input.x||input.y)){a.target=null;walk(a,{x:a.x+input.x*100,y:a.y+input.y*100},a===s.hero?164:182,dt);}
     else if(a.target)walk(a,a.target,a===s.hero?164:182,dt);
     else if(a===s.dog&&s.selected==='hero')walk(a,{x:s.hero.x+23,y:s.hero.y+13},175,dt);
     else a.walking=false;
    }
    for(const g of s.guards){g.lure=Math.max(0,g.lure-dt);let target;
     if(g.lure>0&&g.lureTarget)target=g.lureTarget;
     else if(s.invulnerable<=0&&s.hero.x>310&&distance(g,s.hero)<99+level*11)target=s.hero;
     else target={x:g.baseX+Math.sin(s.time*.7+g.offset)*29,y:224+Math.sin(s.time*.5+g.offset)*96};
     walk(g,target,g.lure>0?120:101+level*10,dt);
     if(g.lure<=0&&s.invulnerable<=0&&distance(g,s.hero)<19){s.tags++;s.carrying=false;s.hero.x=79;s.hero.y=317;s.hero.target=null;s.invulnerable=2;Object.assign(s.flag,flagSpots[s.score%flagSpots.length]);b.sound('pot');b.tell('Getikt! De vlag ligt weer klaar.',`${3-s.tags} kansen. Argos kan die bewaker weglokken.`);}
    }
    if(!s.carrying&&distance(s.hero,s.flag)<22){s.carrying=true;b.sound('cloth');b.tell('Vlag mee! Terug naar blauw.','Het thuishonk ligt linksonder. Argos kan je terugweg vrijmaken.');}
    if(s.carrying&&distance(s.hero,s.home)<30){s.carrying=false;s.score++;b.sound('connect');Object.assign(s.flag,flagSpots[s.score%flagSpots.length]);b.tell(`${s.score} / ${s.goal} vlaggen thuis`,'De volgende vlag ligt aan de overkant.');}
    if(s.score>=s.goal)b.end(true,'Samen is de vlag groter.','Argos begrijpt het eigendomsrecht vooral als een leuk stuk stof.');else if(s.tags>=3||s.remaining<=0)b.end(false,'De vlag wacht nog even.','Stuur Argos vooruit en blaf. Terwijl de bewakers kijken, sluip jij langs.');
   },action,keyDown(code){if(code==='Space')action('bark');if(code==='KeyQ')action('argos');if(code==='KeyE')action('hero');},
   pointerDown(p){if(!b.active()||!finitePoint(p))return;(s.selected==='hero'?s.hero:s.dog).target={x:clamp(p.x,44,596),y:clamp(p.y,90,353)};},
   draw(c){court(c,'HONDENVLAG · TERUG NAAR BLAUW',P.teal);rect(c,46,284,65,64,P.teal);rect(c,53,291,51,50,P.foam);text(c,'THUIS',79,320,10);for(const r of walls){rect(c,r.x,r.y,r.w,r.h,P.ink);rect(c,r.x+3,r.y+2,r.w-6,r.h-4,P.sand);for(let y=r.y+5;y<r.y+r.h;y+=13)rect(c,r.x,y,r.w,3,P.paper);}text(c,'↑ doorgang ↑',304,117,9,P.plum);text(c,'↓ doorgang ↓',304,300,9,P.plum);
    if(!s.carrying){rect(c,s.flag.x-2,s.flag.y-26,4,33,P.ink);rect(c,s.flag.x+2,s.flag.y-27,24,16,P.gold);rect(c,s.flag.x+5,s.flag.y-25,5,12,P.clay);}
    for(const g of s.guards){if(g.lure>0){text(c,'?',g.x,g.y-45,20,P.plum);line(c,[g,g.lureTarget],P.plum,1);}else{c.save();c.globalAlpha=.12;disc(c,g.x,g.y,99+level*11,P.plum);c.restore();}}
    const all=[...s.guards,s.hero,s.dog].sort((a,z)=>a.y-z.y);for(const a of all){sprite(api,c,a===s.hero?'hero':a===s.dog?'argos':a.cast,a.x,a.y,{dir:a.dir,pose:a.walking?'walk':'idle',alpha:a===s.hero&&s.invulnerable>0?.7:1});}
    const selected=s.selected==='hero'?s.hero:s.dog;rect(c,selected.x-11,selected.y+4,22,3,P.gold);if(s.carrying){rect(c,s.hero.x+13,s.hero.y-33,3,27,P.ink);rect(c,s.hero.x+15,s.hero.y-33,19,12,P.gold);}
    if(s.barkFlash>0){text(c,'WAF!',s.dog.x,s.dog.y-40,15,P.teal);}badge(c,`${s.score}/${s.goal} vlaggen · ${3-s.tags} kansen`,252,91);badge(c,`${Math.ceil(s.remaining)}s`,70,91,P.plum);meter(c,480,354,112,1-s.barkCooldown/5,P.teal);
   },snapshot:()=>({...copy(s),walls:copy(walls)}),
  };
 },
};

const knikkerbaan={
 id:'knikkerbaan',title:'Knikkerbaan',subtitle:'De kortste weg maakt soms een bocht.',
 instruction:'Rol je knikker door de gouden poorten op volgorde en eindig in de kom. Klik om te richten, kies zachter of harder, dan Rol! Je kunt de knikker ook naar achteren slepen en loslaten.',
 controls:[{id:'left',label:'Richt links',key:'ArrowLeft'},{id:'right',label:'Richt rechts',key:'ArrowRight'},{id:'less',label:'Zachter',key:'ArrowDown'},{id:'more',label:'Harder',key:'ArrowUp'},{id:'strike',label:'Rol!',key:'Space'}],
 create(api={}){
  const level=levelOf(api.level),s={id:'knikkerbaan',level,phase:'playing',time:0,score:0,strokes:0,maxStrokes:level===1?12:level===2?11:10,gate:0,ball:{x:72,y:314,vx:0,vy:0},angle:-.2,power:180,drag:null,checkpoint:{x:72,y:314},gates:[{x:180,y:282},{x:320,y:184},{x:467,y:282},{x:561,y:178}],cup:{x:561,y:178},hazards:[]};
  const b=base(api,s),walls=[{x:241,y:78,w:13,h:131},{x:365,y:253,w:13,h:111}];
  if(level>1)walls.push({x:476,y:80,w:13,h:92},{x:241,y:209,w:13,h:53});
  if(level>2)walls.push({x:102,y:162,w:91,h:12},{x:365,y:181,w:13,h:72});
  s.hazards=level===1?[{x:541,y:91,r:20}]:[{x:541,y:91,r:24},{x:438,y:196,r:21+(level-2)*5}];
  const radius=level===1?27:level===2?24:21;
  function still(){return Math.hypot(s.ball.vx,s.ball.vy)<7;}
  function strike(){if(!b.active()||!still()||s.strokes>=s.maxStrokes)return;s.strokes++;s.ball.vx=Math.cos(s.angle)*s.power;s.ball.vy=Math.sin(s.angle)*s.power;s.drag=null;b.sound('wood');}
  function action(id){if(!b.active()||!still())return;if(id==='left')s.angle-=Math.PI/36;else if(id==='right')s.angle+=Math.PI/36;else if(id==='less')s.power=clamp(s.power-22,50,425);else if(id==='more')s.power=clamp(s.power+22,50,425);else if(id==='strike')strike();}
  b.tell('Vier poorten, één kleine knikker.','Klik om te richten. Kies je kracht met zachter/harder, of sleep de knikker naar achteren.');
  return{
   update(delta){if(!b.active())return;const dt=b.dt(delta);if(!dt)return;s.time+=dt;
    // Small physical slices prevent a fast knikker from skipping a rail or gate.
    let left=dt;while(left>1e-7){const q=Math.min(left,1/180);left-=q;const a=s.ball,old={x:a.x,y:a.y};a.x+=a.vx*q;a.y+=a.vy*q;const drag=Math.exp(-1.65*q);a.vx*=drag;a.vy*=drag;
     if(a.x<42||a.x>598){a.x=clamp(a.x,42,598);a.vx*=-.74;}if(a.y<84||a.y>356){a.y=clamp(a.y,84,356);a.vy*=-.74;}
     for(const r of walls)if(a.x>r.x-7&&a.x<r.x+r.w+7&&a.y>r.y-7&&a.y<r.y+r.h+7){if(old.x<=r.x-7||old.x>=r.x+r.w+7){a.x=old.x;a.vx*=-.76;}else{a.y=old.y;a.vy*=-.76;}}
     if(s.gate<s.gates.length&&distance(a,s.gates[s.gate])<radius){s.checkpoint={x:s.gates[s.gate].x,y:s.gates[s.gate].y};s.gate++;s.score=s.gate;b.sound('coin');b.tell(`${s.gate} / 4 poorten geraakt`,s.gate===4?'Laat de knikker tot rust komen in de laatste kom.':'De volgende gouden poort wacht.');}
     if(s.hazards.some(h=>distance(a,h)<h.r+4)){a.x=s.checkpoint.x;a.y=s.checkpoint.y;a.vx=0;a.vy=0;b.sound('water');b.tell('Plons. Terug naar je laatste poort.','Je eerdere poorten blijven geldig. Richt opnieuw.');}
    }
    if(Math.hypot(s.ball.vx,s.ball.vy)<7){s.ball.vx=0;s.ball.vy=0;}
    if(s.gate===4&&distance(s.ball,s.cup)<31&&Math.hypot(s.ball.vx,s.ball.vy)<40)b.end(true,'Vier poorten, geen rechte lijn.',`${s.strokes} rollen. Diogenes noemt de omweg voortaan een methode.`);
    else if(still()&&s.strokes>=s.maxStrokes)b.end(false,'De kom ligt nog een bocht verder.','Richt een zachte rol op de volgende poort. De zijwanden kaatsen terug.');
   },action,keyDown(code){const keys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'less',ArrowUp:'more',Space:'strike'};if(keys[code])action(keys[code]);},
   pointerDown(p){if(!b.active()||!still()||!finitePoint(p))return;if(distance(p,s.ball)<24)s.drag={x:p.x,y:p.y};else s.angle=Math.atan2(p.y-s.ball.y,p.x-s.ball.x);},
   pointerMove(p){if(!b.active()||!s.drag||!finitePoint(p))return;s.drag={x:p.x,y:p.y};s.angle=Math.atan2(s.ball.y-p.y,s.ball.x-p.x);s.power=clamp(distance(p,s.ball)*2.1,50,425);},
   pointerUp(p){if(!b.active()||!s.drag)return;const cancelled=!!p?.cancelled;if(!cancelled&&finitePoint(p)){s.drag={x:p.x,y:p.y};s.angle=Math.atan2(s.ball.y-p.y,s.ball.x-p.x);s.power=clamp(distance(p,s.ball)*2.1,50,425);}const pulled=distance(s.ball,s.drag)>9;s.drag=null;if(!cancelled&&pulled)strike();},
   draw(c){court(c,'DE BAAN VAN DE OMWEG',P.gold);for(const h of s.hazards){disc(c,h.x,h.y,h.r+3,P.ink);disc(c,h.x,h.y,h.r,P.teal);line(c,[{x:h.x-10,y:h.y},{x:h.x+10,y:h.y}],P.foam,2);}for(const r of walls){rect(c,r.x,r.y,r.w,r.h,P.ink);rect(c,r.x+2,r.y+2,r.w-4,r.h-4,P.clay);}
    s.gates.forEach((g,i)=>{disc(c,g.x,g.y,radius+3,i<s.gate?P.teal:i===s.gate?P.gold:P.sand);disc(c,g.x,g.y,radius,P.paper);text(c,i+1,g.x,g.y,14,i===s.gate?P.ink:P.sand);rect(c,g.x-radius-5,g.y-10,5,23,P.ink);rect(c,g.x+radius,g.y-10,5,23,P.ink);});
    if(s.gate>=3){disc(c,s.cup.x,s.cup.y,14,P.ink);disc(c,s.cup.x-2,s.cup.y-2,10,P.plum);}if(still()&&b.active()){const length=s.power/1.65;line(c,[s.ball,{x:s.ball.x+Math.cos(s.angle)*Math.min(length,180),y:s.ball.y+Math.sin(s.angle)*Math.min(length,180)}],P.teal,2);if(s.drag)line(c,[s.ball,s.drag],P.clay,2);}
    disc(c,s.ball.x+2,s.ball.y+3,8,P.sand);disc(c,s.ball.x,s.ball.y,7,P.ink);disc(c,s.ball.x,s.ball.y,5,P.foam);rect(c,s.ball.x-2,s.ball.y-3,3,2,P.light);badge(c,`${s.gate}/4 poorten · ${s.maxStrokes-s.strokes} rollen`,320,91);meter(c,246,354,148,s.power/425,P.gold);text(c,'zacht',216,359,10);text(c,'hard',421,359,10);
   },snapshot:()=>({...copy(s),walls:copy(walls),radius}),
  };
 },
};

const windvlieger={
 id:'windvlieger',title:'Windvlieger',subtitle:'Niet alles wat je vasthoudt, moet strak.',
 instruction:'Stuur je vlieger door de windringen. Klik op de gewenste hoogte of gebruik omhoog en omlaag. Loopt de lijnspanning op? Vier de lijn met spatie en laat een windstoot voorbijgaan.',
 controls:[{id:'up',label:'Hoger',key:'ArrowUp'},{id:'down',label:'Lager',key:'ArrowDown'},{id:'slack',label:'Lijn vieren',key:'Space'}],
 create(api={}){
  const level=levelOf(api.level),rng=randomOf(api.seed),count=level+6,radius=[35,30,26][level-1];
  const s={id:'windvlieger',level,phase:'playing',time:0,travel:0,score:0,count,needed:count-2,index:0,kite:{x:145,y:217,vy:0},targetY:217,tension:0,slack:0,cooldown:0,snaps:0,wind:0,rings:Array.from({length:count},(_,i)=>({x:340+i*179,y:[112,286,193][i%3]+rng()*20-10,passed:false,missed:false})),gustOffset:rng()*5};
  const b=base(api,s);let steering=false;
  function action(id){if(!b.active())return;if(id==='up')s.targetY=clamp(s.targetY-34,82,319);else if(id==='down')s.targetY=clamp(s.targetY+34,82,319);else if(id==='slack'&&s.cooldown<=0){s.slack=1.25;s.cooldown=3.4;b.sound('cloth');}}
  b.tell(`Pak ${s.needed} van de ${count} windringen`,'De volgende ring bepaalt je hoogte. Een soepele lijn overleeft een windstoot.');
  return{
   update(delta,keys=new Set()){
    if(!b.active())return;const dt=b.dt(delta);if(!dt)return;s.time+=dt;s.travel+=dt*(48+level*5);s.slack=Math.max(0,s.slack-dt);s.cooldown=Math.max(0,s.cooldown-dt);
    const up=keys.has('ArrowUp')||keys.has('KeyW'),down=keys.has('ArrowDown')||keys.has('KeyS');s.targetY=clamp(s.targetY+(Number(down)-Number(up))*dt*170,82,319);
    s.wind=Math.sin(s.time*1.24+s.gustOffset)*(19+level*14)+Math.sin(s.time*.37)*9;
    const force=s.slack>0?s.wind*.13+13:s.wind;
    s.kite.vy+=(s.targetY-s.kite.y)*dt*12+s.wind*dt*(s.slack>0?.18:.55);s.kite.vy*=Math.exp(-6.4*dt);s.kite.y=clamp(s.kite.y+(s.kite.vy+force*.16)*dt,77,331);
    s.tension=clamp(s.tension+dt*(s.slack>0?-.92:Math.abs(s.wind)>31?.21+(level-1)*.025:-.2),0,1);
    if(s.tension>=1){s.snaps++;s.tension=.25;s.kite.y=clamp(s.kite.y+36,77,331);s.kite.vy=0;b.sound('pot');b.tell('Een knoop schiet los!','Vier de lijn voordat de spanning helemaal vol is.');}
    const ring=s.rings[s.index];
    if(ring&&ring.x-s.travel<=s.kite.x){if(Math.abs(ring.y-s.kite.y)<=radius){ring.passed=true;s.score++;b.sound('connect');}else{ring.missed=true;b.sound('cloth');}s.index++;b.tell(`${s.score} / ${s.needed} ringen`,`${s.count-s.index} ringen komen nog. ${ring.passed?'Midden door de wind.':'Volgende ring, nieuwe kans.'}`);}
    if(s.snaps>=3)b.end(false,'Zelfs een vlieger wil wat ruimte.','Gebruik Lijn vieren wanneer de spanningsbalk oploopt.');
    else if(s.index===s.count)b.end(s.score>=s.needed,s.score>=s.needed?'De wind hield zich niet aan de regels.':'De wind won dit rondje.',s.score>=s.needed?'Gelukkig hoefde jij hem niet te verslaan. Alleen te leren kennen.':'Kijk naar de volgende ring en stuur je vlieger alvast naar die hoogte.');
   },action,keyDown(code){if(code==='Space')action('slack');},
   pointerDown(p){if(b.active()&&finitePoint(p)){steering=true;s.targetY=clamp(p.y,82,319);}},pointerMove(p){if(b.active()&&steering&&finitePoint(p))s.targetY=clamp(p.y,82,319);},pointerUp(){steering=false;},
   draw(c){rect(c,0,0,640,400,P.foam);rect(c,0,0,640,54,P.ink);text(c,'DE WIND LEEST GEEN HANDLEIDING',320,27,17,P.light);rect(c,0,332,640,68,P.teal);for(let x=-100;x<720;x+=140){const cx=((x-s.travel*.23+900)%840)-80;rect(c,cx,97,71,12,P.light);rect(c,cx+14,87,34,16,P.light);rect(c,cx+17,351,55,3,P.foam);}for(let x=0;x<640;x+=38)rect(c,x,384,27,3,P.foam);
    for(const ring of s.rings){const x=ring.x-s.travel;if(x<-50||x>690)continue;c.strokeStyle=ring.passed?P.teal:ring.missed?P.clay:P.gold;c.lineWidth=5;c.beginPath();c.arc(x,ring.y,radius,0,Math.PI*2);c.stroke();rect(c,x-2,ring.y-radius-6,4,7,P.light);}
    const anchor={x:56,y:356};line(c,[anchor,{x:100,y:300+(s.slack>0?20:0)},s.kite],s.tension>.75?P.clay:P.ink,2);diamond(c,s.kite.x,s.kite.y,20,P.ink);diamond(c,s.kite.x,s.kite.y,17,P.gold);line(c,[{x:s.kite.x,y:s.kite.y-16},{x:s.kite.x,y:s.kite.y+17}],P.clay,2);line(c,[{x:s.kite.x-15,y:s.kite.y},{x:s.kite.x+15,y:s.kite.y}],P.teal,2);for(let i=0;i<4;i++)diamond(c,s.kite.x+Math.sin(s.time*5+i)*5,s.kite.y+25+i*9,3,i%2?P.plum:P.clay);
    sprite(api,c,'hero',56,378,{dir:'up'});sprite(api,c,'argos',89,384);badge(c,`${s.score}/${s.needed} ringen`,515,79);text(c,'lijnspanning',499,348,10,P.light);meter(c,445,360,115,s.tension,s.tension>.75?P.clay:P.plum);text(c,s.slack>0?'LIJN LOS':s.wind>10?'wind ↓':s.wind< -10?'wind ↑':'adempauze',499,385,12,P.light);
   },snapshot:()=>({...copy(s),radius}),
  };
 },
};

const poseNames=['Blij','Brutaal','Verwonderd','Twijfel'];
const poseIds=['joy','bold','wonder','doubt'];
function mask(c,id,x,y,scale=1,lit=false){
 const color=[P.gold,P.clay,P.foam,P.plum][id];rect(c,x-19*scale,y-25*scale,38*scale,45*scale,P.ink);rect(c,x-16*scale,y-23*scale,32*scale,40*scale,lit?P.light:color);rect(c,x-10*scale,y-10*scale,5*scale,5*scale,P.ink);rect(c,x+5*scale,y-10*scale,5*scale,5*scale,P.ink);
 if(id===0){line(c,[{x:x-9*scale,y:y+4*scale},{x:x-4*scale,y:y+9*scale},{x:x+5*scale,y:y+9*scale},{x:x+10*scale,y:y+3*scale}],P.ink,2*scale);}else if(id===1){line(c,[{x:x-12*scale,y:y-17*scale},{x:x-3*scale,y:y-13*scale}],P.ink,2*scale);rect(c,x-8*scale,y+5*scale,19*scale,3*scale,P.ink);}else if(id===2){rect(c,x-4*scale,y+3*scale,8*scale,10*scale,P.ink);}else{line(c,[{x:x-9*scale,y:y+9*scale},{x:x+7*scale,y:y+5*scale}],P.ink,2*scale);line(c,[{x:x+3*scale,y:y-17*scale},{x:x+12*scale,y:y-21*scale}],P.ink,2*scale);}
}
const maskerspel={
 id:'maskerspel',title:'Maskerspel',subtitle:'Ze klappen. Maar voor wie?',
 instruction:'Kijk naar de maskers van de toneelmeester. Herhaal ze daarna op de trommelslag: kies het juiste gezicht wanneer de bewegende stip in het gouden vak komt. 1–4 of tik de maskers.',
 controls:poseIds.map((id,i)=>({id,label:`${i+1} · ${poseNames[i]}`,key:`Digit${i+1}`})),
 create(api={}){
  const level=levelOf(api.level),rng=randomOf(api.seed),s={id:'maskerspel',level,phase:'watch',time:0,phaseTime:0,round:0,rounds:3,length:level+2,score:0,mistakes:0,sequence:[],index:0,showIndex:0,beatTime:0,answered:false,lastPose:null,lastGrade:null,flash:0};
  const b=base(api,s),watchBeat=[.8,.72,.64][level-1],beat=[1.02,.96,.9][level-1],window=[.3,.25,.21][level-1],total=s.rounds*s.length,needed=Math.ceil(total*.72);let beatSound=false,lastShow=-1;
  function nextRound(){s.round++;s.phase='watch';s.phaseTime=0;s.index=0;s.showIndex=0;s.beatTime=0;s.answered=false;s.lastPose=null;s.lastGrade=null;lastShow=-1;beatSound=false;s.sequence=Array.from({length:s.length},()=>Math.floor(rng()*4));b.tell(`Bedrijf ${s.round} · eerst kijken`,`${s.length} maskers. Bewaar ze even in je hoofd.`);}
  function result(ok,pose){if(s.answered||s.phase!=='perform')return;s.answered=true;s.lastPose=pose;s.lastGrade=ok?'raak':'mis';s.flash=.4;if(ok){s.score++;b.sound('connect');}else{s.mistakes++;b.sound('wood');}}
  function action(id){if(!b.active()||s.phase!=='perform'||s.answered)return;const pose=poseIds.indexOf(id);if(pose<0)return;result(pose===s.sequence[s.index]&&Math.abs(s.beatTime-beat*.6)<=window,pose);}
  nextRound();
  return{
   update(delta){if(!b.active())return;const dt=b.dt(delta);if(!dt)return;s.time+=dt;s.phaseTime+=dt;s.flash=Math.max(0,s.flash-dt);
    if(s.phase==='watch'){s.showIndex=Math.floor(s.phaseTime/watchBeat);if(s.showIndex<s.sequence.length&&s.showIndex!==lastShow){lastShow=s.showIndex;b.sound('choose');}if(s.showIndex>=s.sequence.length){s.phase='ready';s.phaseTime=0;b.tell('Nu jij. De trommel telt je in.','Kies het juiste masker zodra de stip in goud staat.');}}
    else if(s.phase==='ready'&&s.phaseTime>=.8){s.phase='perform';s.phaseTime=0;s.beatTime=0;s.index=0;s.answered=false;}
    else if(s.phase==='perform'){s.beatTime+=dt;if(!beatSound&&s.beatTime>=beat*.6){beatSound=true;b.sound('wood');}if(s.beatTime>=beat){if(!s.answered)result(false,null);s.index++;if(s.index>=s.sequence.length){s.phase='between';s.phaseTime=0;b.tell(`${s.score} goede maskers`,'De toneelmeester buigt. Argos denkt dat hij een koekje laat vallen.');}else{s.beatTime-=beat;s.answered=false;s.lastPose=null;s.lastGrade=null;beatSound=false;}}}
    else if(s.phase==='between'&&s.phaseTime>=1.15){if(s.round>=s.rounds)b.end(s.score>=needed,s.score>=needed?'Het plein klapt voor je masker.':'De maskers liepen door elkaar.',s.score>=needed?'Diogenes buigt. Daarna kijkt hij even zonder masker terug.':'Kijk eerst. Kies daarna pas op de trommelslag. De stip laat zien wanneer.');else nextRound();}
   },action,keyDown(code){if(/^Digit[1-4]$/.test(code))action(poseIds[Number(code.slice(-1))-1]);},
   pointerDown(p){if(!b.active()||!finitePoint(p))return;for(let i=0;i<4;i++)if(Math.abs(p.x-(128+i*128))<47&&p.y>275&&p.y<388)action(poseIds[i]);},
   draw(c){court(c,'HET THEATER VAN DE GROTE NEUZEN',P.plum);rect(c,37,78,566,173,P.ink);rect(c,42,81,556,165,P.plum);for(let x=42;x<598;x+=31){rect(c,x,81,12,165,'#674862');}rect(c,66,239,508,15,P.sand);rect(c,57,255,526,8,P.ink);
    if(s.phase==='watch'&&s.sequence[s.showIndex]!==undefined){mask(c,s.sequence[s.showIndex],320,157,2);text(c,poseNames[s.sequence[s.showIndex]],320,220,14,P.light);}else{sprite(api,c,'hero',320,229,{scale:2});if(s.lastPose!==null)mask(c,s.lastPose,320,164,1.2,s.lastGrade==='raak');text(c,s.phase==='ready'?'één… twee…':s.phase==='between'?'BUIG!':s.phase==='perform'?'JIJ BENT AAN DE BEURT':'APPLAUS?',320,103,13,P.light);}
    for(let i=0;i<s.length;i++){disc(c,280+i*22,275,5,s.phase==='watch'?i===s.showIndex?P.gold:P.sand:i<s.index?P.teal:i===s.index?P.gold:P.sand);}
    for(let i=0;i<4;i++){mask(c,i,128+i*128,331,1,s.flash>0&&s.lastPose===i);text(c,`${i+1} ${poseNames[i]}`,128+i*128,371,10);}
    if(s.phase==='perform'){rect(c,139,263,362,13,P.ink);const start=(beat*.6-window)/beat,end=(beat*.6+window)/beat;rect(c,141+start*358,265,(end-start)*358,9,P.gold);disc(c,141+clamp(s.beatTime/beat,0,1)*358,269,5,s.answered?s.lastGrade==='raak'?P.teal:P.clay:P.light);}
    badge(c,`${s.score}/${needed} raak`,538,94,P.teal);text(c,`BEDRIJF ${s.round}`,104,94,10,P.light);
   },snapshot:()=>({...copy(s),watchBeat,beat,window,needed,total}),
  };
 },
};

export const games=Object.freeze([krukjacht,hondenvlag,knikkerbaan,windvlieger,maskerspel]);
