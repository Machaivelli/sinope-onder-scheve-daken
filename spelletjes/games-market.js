// Five different street games. Simulation state stays private; snapshots are copies.
const P = Object.freeze({ink:'#263747',paper:'#f1dca9',light:'#fff0c9',gold:'#e8b64e',teal:'#4c9b95',mint:'#8ecac0',plum:'#785677',clay:'#c96c52',sand:'#c99b62',wood:'#947050',deep:'#65504d',olive:'#7e9656',grass:'#526d54'});
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const cleanDt = dt => Number.isFinite(dt) && dt > 0 ? Math.min(.1,dt) : 0;
const right = keys => keys?.has('ArrowRight') || keys?.has('KeyD');
const left = keys => keys?.has('ArrowLeft') || keys?.has('KeyA');
function rng(seed) { let n=Number.isFinite(seed)?seed>>>0:1; return () => { n=(n+0x6d2b79f5)>>>0; let v=n;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);return ((v^(v>>>14))>>>0)/4294967296; }; }
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}
function line(c,x1,y1,x2,y2,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x1),Math.round(y1));c.lineTo(Math.round(x2),Math.round(y2));c.stroke();}
function text(c,value,x,y,size=14,color=P.ink,align='center'){c.fillStyle=color;c.font=`bold ${size}px ui-monospace,monospace`;c.textAlign=align;c.textBaseline='middle';c.fillText(String(value),Math.round(x),Math.round(y));}
function frame(c){c.imageSmoothingEnabled=false;rect(c,0,0,640,400,P.paper);rect(c,0,0,640,9,P.ink);rect(c,0,391,640,9,P.ink);}
function actor(c,env,id,x,y,options={}){if(typeof env.actor==='function')env.actor(c,id,x,y,{scale:1.35,dir:'down',pose:'idle',...options});else{rect(c,x-8,y-28,16,25,id==='argos'?P.sand:P.teal);rect(c,x-6,y-36,12,11,P.gold);}}
function roof(c,x,y,w,color=P.clay){poly(c,[[x,y+19],[x+15,y],[x+w-17,y],[x+w,y+19]],P.ink);poly(c,[[x+4,y+15],[x+17,y+3],[x+w-18,y+3],[x+w-5,y+15]],color);for(let xx=x+17;xx<x+w-15;xx+=17)line(c,xx,y+5,xx-4,y+15,P.paper,1);}
function building(c,x,y,w,h,color=P.clay){rect(c,x,y+17,w,h,P.sand);rect(c,x+3,y+17,w-6,h-5,P.paper);roof(c,x-6,y,w+12,color);for(let xx=x+15;xx<x+w-15;xx+=42){rect(c,xx,y+35,19,25,P.ink);rect(c,xx+3,y+38,13,19,P.plum);rect(c,xx-3,y+33,3,26,P.teal);rect(c,xx+19,y+33,3,26,P.teal);}}
function loaf(c,x,y,w=27){poly(c,[[x-w/2,y-5],[x-w/2+5,y-12],[x+w/2-5,y-12],[x+w/2,y-5],[x+w/2-2,y],[x-w/2+2,y]],P.ink);poly(c,[[x-w/2+3,y-5],[x-w/2+7,y-10],[x+w/2-6,y-10],[x+w/2-2,y-5],[x+w/2-3,y-2],[x-w/2+3,y-2]],P.gold);for(let xx=x-w/2+8;xx<x+w/2-4;xx+=8)line(c,xx,y-9,xx+3,y-5,P.paper,2);}
function pot(c,x,y,color=P.clay,size=1){poly(c,[[-8,-25],[8,-25],[7,-18],[13,-10],[11,-2],[5,3],[-6,3],[-12,-4],[-12,-11],[-6,-18]].map(([dx,dy])=>[x+dx*size,y+dy*size]),P.ink);poly(c,[[-5,-22],[5,-22],[4,-17],[10,-10],[8,-3],[3,0],[-4,0],[-9,-5],[-9,-11],[-3,-17]].map(([dx,dy])=>[x+dx*size,y+dy*size]),color);line(c,x-8*size,y-9*size,x+9*size,y-9*size,P.gold,Math.max(2,3*size));line(c,x-5*size,y-19*size,x-7*size,y-9*size,P.paper,2);}
function fig(c,x,y,scale=1){poly(c,[[0,-11],[4,-5],[8,0],[6,7],[-4,9],[-8,3],[-6,-3]].map(([dx,dy])=>[x+dx*scale,y+dy*scale]),P.ink);poly(c,[[0,-8],[3,-3],[5,0],[4,5],[-3,6],[-5,2],[-4,-2]].map(([dx,dy])=>[x+dx*scale,y+dy*scale]),P.plum);rect(c,x-2*scale,y-4*scale,2*scale,6*scale,P.paper);line(c,x,y-9*scale,x+3*scale,y-14*scale,P.grass,2);}
function wasp(c,x,y,time){const flap=Math.floor(time*16)%2?3:-2;rect(c,x-11,y-9+flap,10,8,P.mint);rect(c,x+2,y-9-flap,10,8,P.light);rect(c,x-10,y-4,21,10,P.ink);rect(c,x-7,y-4,5,9,P.gold);rect(c,x+2,y-4,5,9,P.gold);rect(c,x+9,y-1,6,3,P.ink);}
function bowl(c,x,y,width=62,color=P.teal){poly(c,[[x-width/2,y-12],[x+width/2,y-12],[x+width/2-7,y-1],[x+width/2-15,y+6],[x-width/2+15,y+6],[x-width/2+7,y-1]],P.ink);poly(c,[[x-width/2+4,y-10],[x+width/2-4,y-10],[x+width/2-11,y-1],[x+width/2-16,y+3],[x-width/2+16,y+3],[x-width/2+10,y-1]],color);line(c,x-width/2+3,y-10,x+width/2-3,y-10,P.paper,2);for(let xx=x-width/2+14;xx<x+width/2-9;xx+=12)rect(c,xx,y-5,4,3,P.gold);}
function hearts(c,lives,x=560,y=33){for(let i=0;i<3;i++)poly(c,[[x+i*23,y+4],[x+i*23-8,y-4],[x+i*23-8,y-10],[x+i*23-2,y-12],[x+i*23+1,y-7],[x+i*23+5,y-12],[x+i*23+10,y-9],[x+i*23+10,y-4]],i<lives?P.clay:'#bbae94');}
function meter(c,value,x,y,w,color=P.teal){rect(c,x,y,w,11,P.ink);rect(c,x+2,y+2,w-4,7,'#baa77b');rect(c,x+2,y+2,Math.round((w-4)*clamp(value,0,1)),7,color);}
function createBase(env,initial){
 const level=clamp(Math.floor(Number(env.level)||1),1,3),s={phase:'playing',time:0,level,seed:Number.isFinite(env.seed)?env.seed:1,...initial};let status='';
 return {s,random:rng(s.seed+level*101),report(title,detail=''){if(s.phase!=='playing')return;const next=title+'|'+detail;if(next!==status){status=next;env.setStatus?.(title,detail);}},sound(name){env.sound?.(name);},end(won,score,title,detail){if(s.phase!=='playing')return;s.phase=won?'won':'lost';if('pointerActive' in s)s.pointerActive=false;if('pointerLean' in s)s.pointerLean=0;if('pointerDuck' in s)s.pointerDuck=false;s.result={won,score:Math.max(0,Math.round(score)),title,detail};env.finish?.({...s.result});},snapshot(){return structuredClone(s);}};
}

function createBreadBalance(env={}){
 const b=createBase(env,{angle:.07,angularVelocity:0,distance:0,duration:0,loaves:[-57,-19,19,57].map((x,id)=>({id,x,vx:0,fallen:false,fallY:0})),lost:0,pointerLean:0,pointerActive:false,tapLean:0,tapUntil:0});
 const {s}=b;s.duration=23+(s.level-1)*4;const windSign=b.random()<.5?-1:1;s.angle*=windSign;
 function lean(id){if(s.phase!=='playing')return;if(id==='left'||id==='right'){s.tapLean=id==='left'?-1:1;s.tapUntil=s.time+.24;}}
 function tick(dt,keys){
  s.time+=dt;const held=Number(right(keys))-Number(left(keys));const control=held || (s.pointerActive?s.pointerLean:s.time<s.tapUntil?s.tapLean:0);
  const gust=Math.sin(s.time*.91)*(.3+s.level*.06)+Math.sin(s.time*2.2)*.16+windSign*.12;
  s.angularVelocity+=(control*2.8+gust+s.angle*.92)*dt;s.angularVelocity*=Math.exp(-2.1*dt);s.angle=clamp(s.angle+s.angularVelocity*dt,-.74,.74);
  if(Math.abs(s.angle)>=.74)s.angularVelocity*=.35;
  s.distance=Math.min(1,s.time/s.duration);
  for(const bread of s.loaves){
   if(bread.fallen){bread.fallY+=160*dt;continue;}
   bread.vx+=(Math.sin(s.angle)*(57+s.level*5))*dt;bread.vx*=Math.exp(-.72*dt);bread.x+=bread.vx*dt;
   if(Math.abs(bread.x)>94){bread.fallen=true;s.lost++;b.sound('pot');}
  }
  if(s.lost>=2)b.end(false,(4-s.lost)*20,'Brood op straat.','Bion noemt dit nu een bezorging aan de duiven. Houd de plank vlak met korte tegenbewegingen.');
  else if(s.distance>=1)b.end(true,(4-s.lost)*100+Math.max(0,40-Math.abs(s.angle)*50),'Bezorgd, nog warm!','Bion telt zijn broden. Argos telt de kruimels.');
 }
 function update(dt,keys=new Set()){dt=cleanDt(dt);if(s.phase!=='playing'||!dt)return;for(let t=0;t<dt&&s.phase==='playing';t+=1/120)tick(Math.min(1/120,dt-t),keys);b.report(`${Math.ceil(s.duration-s.time)} s tot de bakker`,`${4-s.lost} broden op de plank · minstens 3 bezorgen`);}
 function draw(c){frame(c);rect(c,0,9,640,144,P.mint);for(let i=-1;i<7;i++){const x=i*132-(s.distance*350)%132;building(c,x,55,118,101,i%2?P.clay:P.plum);}rect(c,0,177,640,215,'#e7c38b');rect(c,0,186,640,3,P.light);for(let i=0;i<12;i++){const x=(i*72-s.distance*800)%720;rect(c,x,349,40,3,P.sand);rect(c,x+23,365,25,2,P.light);}meter(c,s.distance,30,28,210);text(c,'NAAR BION',135,18,10);for(let i=0;i<4;i++){loaf(c,509+i*28,40,23);if(s.loaves[i].fallen)line(c,497+i*28,24,520+i*28,43,P.clay,3);}line(c,247,323,370,323,P.ink,5);line(c,319,260,319,322,P.deep,7);line(c,320,274,290,323,P.wood,5);line(c,320,274,350,323,P.wood,5);for(const wx of [289,351]){poly(c,[[wx-10,324],[wx-13,331],[wx-9,340],[wx+8,340],[wx+12,332],[wx+8,324]],P.ink);rect(c,wx-6,328,12,8,P.gold);rect(c,wx-2,329,4,5,P.deep);}line(c,373,322,407,334,P.gold,2);actor(c,env,'hero',231,343,{dir:'right',pose:s.phase==='playing'?'walk':'idle'});actor(c,env,'argos',422,344,{dir:'right',pose:s.phase==='playing'?'walk':'idle'});c.save();c.translate(320,256);c.rotate(s.angle);rect(c,-107,0,214,10,P.ink);rect(c,-104,1,208,5,P.wood);line(c,-98,0,98,0,P.gold,2);for(const bread of s.loaves)if(!bread.fallen)loaf(c,bread.x,-1,31);c.restore();for(const bread of s.loaves)if(bread.fallen&&bread.fallY<130)loaf(c,320+Math.cos(s.angle)*bread.x,256+Math.sin(s.angle)*bread.x+bread.fallY,28);rect(c,0,358,640,33,P.paper);text(c,'← links tegenwicht',156,376,12);text(c,'rechts tegenwicht →',478,376,12);}
 return {update,draw,action:lean,keyDown(){},pointerDown(p){if(s.phase!=='playing'||!Number.isFinite(p?.x))return;s.pointerActive=true;s.pointerLean=clamp((p.x-320)/160,-1,1);},pointerMove(p){if(s.pointerActive&&s.phase==='playing'&&Number.isFinite(p?.x))s.pointerLean=clamp((p.x-320)/160,-1,1);},pointerUp(){s.pointerActive=false;s.pointerLean=0;},snapshot:b.snapshot};
}

function createFigCatch(env={}){
 const b=createBase(env,{x:320,targetX:320,items:[],caught:0,strikes:0,spawnIn:.35,stun:0,serial:0,pointerActive:false});const {s}=b;
 s.target=8+s.level*3;s.duration=38+s.level*2;s.spawnEvery=1.06-s.level*.12;s.fallSpeed=101+s.level*22;s.basketWidth=72-s.level*5;
 function spawn(){const kind=b.random()<.15+s.level*.045?'wasp':'fig';s.items.push({id:++s.serial,kind,x:65+b.random()*510,y:72,vy:s.fallSpeed*(.85+b.random()*.3),sway:b.random()*Math.PI*2,baseX:0,removed:false});const it=s.items.at(-1);it.baseX=it.x;}
 function update(dt,keys=new Set()){
  dt=cleanDt(dt);if(s.phase!=='playing'||!dt)return;s.time+=dt;s.stun=Math.max(0,s.stun-dt);
  const direction=Number(right(keys))-Number(left(keys));
  if(!s.stun){if(direction){s.x=clamp(s.x+direction*275*dt,35,605);s.targetX=s.x;}else{s.x+=clamp(s.targetX-s.x,-275*dt,275*dt);}}
  s.spawnIn-=dt;while(s.spawnIn<=0){spawn();s.spawnIn+=s.spawnEvery;}
  for(const item of s.items){const before=item.y;item.y+=item.vy*dt;item.x=clamp(item.baseX+Math.sin(s.time*2+item.sway)*(item.kind==='wasp'?17:4),20,620);
   if(before<343&&item.y>=343&&Math.abs(item.x-s.x)<s.basketWidth/2+5){item.removed=true;if(item.kind==='fig'){s.caught++;b.sound('coin');}else{s.strikes++;s.stun=.42;b.sound('hurt');}}
   if(item.y>420)item.removed=true;
  }
  s.items=s.items.filter(item=>!item.removed);
  if(s.strikes>=3)b.end(false,s.caught*10,'Wesp in de mand!','De vijgen zijn niet de enige zoetekauwen. Laat de gestreepte brommers voorbijvallen.');
  else if(s.caught>=s.target)b.end(true,s.caught*20+Math.ceil(s.duration-s.time),'Een mand vol zomer.','Genoeg om te delen. Zelfs als Argos het woord “genoeg” niet kent.');
  else if(s.time>=s.duration)b.end(false,s.caught*10,'Nog niet helemaal vol.','Schuif de mand onder de paarse vijgen. De schaduw laat zien waar ze vallen.');
  b.report(`${s.caught} / ${s.target} vijgen`,`${Math.max(0,Math.ceil(s.duration-s.time))} s · ontwijk de wespen`);
 }
 function target(x){if(s.phase==='playing'&&Number.isFinite(x))s.targetX=clamp(x,35,605);}
 function draw(c){frame(c);rect(c,0,9,640,186,P.mint);rect(c,0,166,640,226,'#e5c38a');for(const x of [25,586]){poly(c,[[x,262],[x+10,100],[x+35,67],[x+44,80],[x+24,139],[x+23,262]],P.deep);for(let n=0;n<4;n++){const yy=50+n*23;poly(c,[[x-53,yy+48],[x-72,yy+20],[x-26,yy-12],[x+12,yy-17],[x+73,yy+5],[x+83,yy+36],[x+39,yy+62]],n%2?P.olive:P.grass);}for(const [dx,dy]of[[-26,64],[21,99],[54,69],[-42,132]])fig(c,x+dx,dy,.8);}line(c,72,81,555,81,P.deep,3);for(let i=0;i<9;i++)rect(c,91+i*54,75,7,13,P.gold);text(c,`${s.caught}/${s.target}`,320,35,22);hearts(c,3-s.strikes,553,36);for(const item of s.items){rect(c,item.x-8,361,16,3,item.kind==='fig'?P.plum:P.sand);if(item.kind==='fig')fig(c,item.x,item.y);else wasp(c,item.x,item.y,s.time);}actor(c,env,'argos',s.x+44,365,{dir:'up',pose:s.phase==='playing'?'walk':'idle'});actor(c,env,'hero',s.x,366,{dir:'up',pose:Math.abs(s.targetX-s.x)>3?'walk':'idle'});rect(c,s.x-s.basketWidth/2-2,341,s.basketWidth+4,22,P.ink);rect(c,s.x-s.basketWidth/2+1,344,s.basketWidth-2,15,s.stun?P.clay:P.wood);for(let xx=s.x-s.basketWidth/2+6;xx<s.x+s.basketWidth/2;xx+=10)line(c,xx,345,xx+2,357,P.gold,2);line(c,s.x-s.basketWidth/2-3,341,s.x+s.basketWidth/2+3,341,P.paper,3);text(c,'Sleep de mand · laat wespen vallen',320,377,12);}
 return {update,draw,action(id){if(id==='left')target(s.targetX-72);if(id==='right')target(s.targetX+72);},keyDown(){},pointerDown(p){if(s.phase!=='playing'||!Number.isFinite(p?.x))return;s.pointerActive=true;target(p.x);},pointerMove(p){if(s.pointerActive)target(p?.x);},pointerUp(){s.pointerActive=false;},snapshot:b.snapshot};
}

function createPotChain(env={}){
 const b=createBase(env,{angle:-Math.PI/2,ball:null,pots:[],shards:[],shots:0,roundShots:0,hits:0,totalHits:0,round:1,roundCount:3,rackWait:0,pointerActive:false});const {s}=b;
 s.target=3+s.level;s.maxShots=5+s.level;s.duration=60;s.origin={x:320,y:344};s.bumpers=s.level>=2?[{x:320,y:213,r:22}]:[];
 const patterns=[[[154,128],[316,96],[487,136],[249,215]],[[130,138],[253,103],[412,107],[514,171],[195,251]],[[115,138],[235,95],[405,96],[535,142],[191,232],[447,230]]];
 function fillRack(){s.pots=patterns[s.level-1].map(([x,y],id)=>({id,x:(s.round%2?x:640-x)+Math.round((b.random()-.5)*18),y:y+Math.round((b.random()-.5)*14),r:17,hit:false}));s.hits=0;s.roundShots=0;}
 fillRack();
 function aim(x,y){if(s.phase!=='playing'||s.ball||s.rackWait>0||!Number.isFinite(x)||!Number.isFinite(y))return;s.angle=clamp(Math.atan2(y-s.origin.y,x-s.origin.x),-Math.PI+.16,-.16);}
 function fire(){if(s.phase!=='playing'||s.ball||s.rackWait>0||s.roundShots>=s.maxShots)return;s.shots++;s.roundShots++;s.ball={x:s.origin.x,y:s.origin.y,vx:Math.cos(s.angle)*278,vy:Math.sin(s.angle)*278,life:0,bounces:0,hitIds:[]};b.sound('pot');}
 function tick(dt,keys){
  s.time+=dt;
  if(s.rackWait>0){s.rackWait=Math.max(0,s.rackWait-dt);if(!s.rackWait){s.round++;fillRack();}}
  if(!s.ball&&!s.rackWait){s.angle=clamp(s.angle+(Number(right(keys))-Number(left(keys)))*1.35*dt,-Math.PI+.16,-.16);}
  if(s.ball){const a=s.ball;a.life+=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;
   if(a.x<38){a.x=38;a.vx=Math.abs(a.vx);a.bounces++;b.sound('wood');}if(a.x>602){a.x=602;a.vx=-Math.abs(a.vx);a.bounces++;b.sound('wood');}if(a.y<66){a.y=66;a.vy=Math.abs(a.vy);a.bounces++;b.sound('wood');}
   for(const bumper of s.bumpers){const dx=a.x-bumper.x,dy=a.y-bumper.y,d=Math.hypot(dx,dy);if(d<bumper.r+8){const nx=d?dx/d:0,ny=d?dy/d:-1,v=a.vx*nx+a.vy*ny;if(v<0){a.vx-=2*v*nx;a.vy-=2*v*ny;a.x=bumper.x+nx*(bumper.r+8.1);a.y=bumper.y+ny*(bumper.r+8.1);a.bounces++;b.sound('wood');}}}
   for(const target of s.pots)if(!target.hit&&Math.hypot(a.x-target.x,a.y-target.y)<target.r+8){target.hit=true;s.hits++;s.totalHits++;a.hitIds.push(target.id);for(let i=0;i<6;i++)s.shards.push({x:target.x,y:target.y,dx:Math.cos(i*Math.PI/3)*30,dy:Math.sin(i*Math.PI/3)*30,life:.6});b.sound('pot');}
   if(a.y>373||a.life>4.3||a.bounces>4)s.ball=null;
  }
  for(const p of s.shards){p.x+=p.dx*dt;p.y+=p.dy*dt;p.dy+=65*dt;p.life-=dt;}s.shards=s.shards.filter(p=>p.life>0);
  if(s.time>=s.duration&&s.round===s.roundCount&&s.hits>=s.target)s.ball=null;
  if(s.hits>=s.target&&!s.ball&&!s.rackWait){if(s.round===s.roundCount)b.end(true,s.totalHits*100+(s.maxShots*s.roundCount-s.shots)*25,'Kettingreactie!','Drie rekken oefenkruiken aan scherven. Damas hoopt dat je zo precies blijft kijken.');else{s.rackWait=1.2;b.sound('connect');}}
  else if((s.roundShots>=s.maxShots&&!s.ball&&s.hits<s.target)||s.time>=s.duration)b.end(false,s.totalHits*50,'Nog een paar overeind.','Richt op een kruik. Via de zijwanden kan dezelfde bal er meer raken.');
 }
 function update(dt,keys=new Set()){dt=cleanDt(dt);if(s.phase!=='playing'||!dt)return;for(let t=0;t<dt&&s.phase==='playing';t+=1/120)tick(Math.min(1/120,dt-t),keys);b.report(`Rek ${s.round}/${s.roundCount} · ${s.hits}/${s.target} kruiken`,s.rackWait?'Het volgende rek komt eraan…':`${s.maxShots-s.roundShots} worpen over · ${s.ball?'de bal rolt':'richt, dan rol'}`);}
 function draw(c){frame(c);rect(c,22,47,596,328,P.deep);rect(c,33,58,574,306,'#e3c392');for(let xx=40;xx<610;xx+=32){rect(c,xx,48,23,7,P.wood);rect(c,xx,365,23,7,P.wood);}for(let yy=63;yy<360;yy+=29){rect(c,24,yy,7,20,P.wood);rect(c,610,yy,7,20,P.wood);}text(c,`REK ${s.round}/3 · ${s.hits}/${s.target}`,141,29,14);text(c,`${s.maxShots-s.roundShots} WORPEN`,521,29,14);for(const bumper of s.bumpers){poly(c,[[bumper.x-22,bumper.y-13],[bumper.x-13,bumper.y-23],[bumper.x+14,bumper.y-22],[bumper.x+23,bumper.y-11],[bumper.x+22,bumper.y+14],[bumper.x+11,bumper.y+23],[bumper.x-15,bumper.y+21],[bumper.x-23,bumper.y+9]],P.ink);rect(c,bumper.x-15,bumper.y-14,31,29,'#b9b299');line(c,bumper.x-12,bumper.y-12,bumper.x+13,bumper.y-12,P.light,3);}
  for(const target of s.pots){if(!target.hit){rect(c,target.x-23,target.y+12,46,3,P.teal);pot(c,target.x,target.y+10,P.clay,1.3);rect(c,target.x-4,target.y-6,8,7,P.mint);}else{rect(c,target.x-11,target.y+10,8,4,P.clay);rect(c,target.x+6,target.y+7,5,5,P.gold);}}
  for(const shard of s.shards)rect(c,shard.x,shard.y,5,5,P.clay);
  if(!s.ball&&!s.rackWait&&s.phase==='playing'){for(let t=17;t<98;t+=15)rect(c,s.origin.x+Math.cos(s.angle)*t-2,s.origin.y+Math.sin(s.angle)*t-2,4,4,P.teal);}
  if(s.rackWait){rect(c,227,183,186,35,P.paper);text(c,'VOLGEND REK…',320,201,15);}
  const a=s.ball??s.origin;poly(c,[[a.x-4,a.y-8],[a.x+4,a.y-8],[a.x+8,a.y-4],[a.x+8,a.y+4],[a.x+4,a.y+8],[a.x-4,a.y+8],[a.x-8,a.y+4],[a.x-8,a.y-4]],P.ink);rect(c,a.x-5,a.y-5,10,10,P.gold);rect(c,a.x-3,a.y-5,3,4,P.paper);text(c,'Mik met je vinger · spatie / rollen',320,381,12);
 }
 return {update,draw,action(id){if(id==='roll')fire();if(s.phase==='playing'&&!s.ball){if(id==='left')s.angle=clamp(s.angle-.12,-Math.PI+.16,-.16);if(id==='right')s.angle=clamp(s.angle+.12,-Math.PI+.16,-.16);}},keyDown(code){if(code==='Space'||code==='Enter')fire();},pointerDown(p){if(s.phase!=='playing'||!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return;s.pointerActive=true;aim(p.x,p.y);},pointerMove(p){if(s.pointerActive)aim(p?.x,p?.y);},pointerUp(){s.pointerActive=false;},snapshot:b.snapshot};
}

function createBowlStack(env={}){
 const athens=env.region==='athens';
 const b=createBase(env,{stack:[],moving:null,falling:null,spawnDelay:0,misses:0,settle:0,serial:0});const {s}=b;s.target=7+s.level;s.duration=56;s.speed=86+s.level*29;s.bowlWidth=67-s.level*3;s.base={x:320,y:345,width:146-s.level*8};
 function spawn(){const fromLeft=s.serial%2===0;s.moving={x:fromLeft?65:575,y:79,vx:(fromLeft?1:-1)*s.speed};s.serial++;}
 spawn();
 function drop(){if(s.phase!=='playing'||!s.moving||s.falling||s.settle)return;s.falling={x:s.moving.x,y:s.moving.y,vx:s.moving.vx*.1,vy:0};s.moving=null;b.sound('cloth');}
 function update(dt){
  dt=cleanDt(dt);if(s.phase!=='playing'||!dt)return;
  for(let t=0;t<dt&&s.phase==='playing';t+=1/120){const h=Math.min(1/120,dt-t);s.time+=h;
   if(s.moving){s.moving.x+=s.moving.vx*h;if(s.moving.x<58){s.moving.x=58;s.moving.vx=Math.abs(s.moving.vx);}if(s.moving.x>582){s.moving.x=582;s.moving.vx=-Math.abs(s.moving.vx);}}
   if(s.spawnDelay>0){s.spawnDelay-=h;if(s.spawnDelay<=0&&!s.moving&&!s.falling&&s.stack.length<s.target)spawn();}
   if(s.falling){const a=s.falling,prev=s.stack.at(-1),surfaceY=prev?prev.y-18:s.base.y-7,supportX=prev?prev.x:s.base.x,supportW=prev?s.bowlWidth:s.base.width;
    a.vy+=780*h;a.y+=a.vy*h;a.x+=a.vx*h;
    if(a.y>=surfaceY){const overlap=Math.min(a.x+s.bowlWidth/2,supportX+supportW/2)-Math.max(a.x-s.bowlWidth/2,supportX-supportW/2);
     const center=(s.stack.reduce((v,it)=>v+it.x,0)+a.x)/(s.stack.length+1);
     if(overlap>=s.bowlWidth*.56&&Math.abs(center-s.base.x)<s.base.width/2-12){s.stack.push({x:a.x,y:surfaceY});b.sound('wood');if(s.stack.length>=s.target)s.settle=2.6;else s.spawnDelay=.3;}
     else{s.misses++;s.spawnDelay=.65;b.sound('pot');}
     s.falling=null;
    }
   }
   if(s.settle>0){s.settle=Math.max(0,s.settle-h);if(!s.settle)b.end(true,s.stack.length*100+(2-s.misses)*50,'Een toren zonder titel.',`${athens?'Myrrine':'Melia'} noemt hem “recht genoeg”. Hij blijft gewoon staan.`);}
   if(s.misses>=2)b.end(false,s.stack.length*50,'Die stond er nét naast.','Laat los boven de bovenste schaal. Een beetje overlap is genoeg; haast maakt scherven.');
   else if(s.time>=s.duration)b.end(false,s.stack.length*50,'De oven gaat dicht.','Je hebt nog niet alle schalen op hun plek. Kijk naar het midden van de vorige schaal.');
  }
  b.report(s.settle?'Houdt hij het…?':`${s.stack.length} / ${s.target} schalen`,s.settle?`${Math.ceil(s.settle)} seconden blijven staan`:`${2-s.misses} missers over · loslaten boven de stapel`);
 }
 function draw(c){frame(c);rect(c,0,9,640,105,P.plum);for(let xx=17;xx<640;xx+=54){rect(c,xx,19,37,4,'#a47d94');rect(c,xx+9,27,19,3,P.gold);}rect(c,34,121,105,203,P.sand);rect(c,43,129,87,188,P.deep);for(let yy=166;yy<300;yy+=47){rect(c,47,yy,79,5,P.wood);bowl(c,83,yy-7,57,yy%2?P.teal:P.plum);}rect(c,518,166,101,167,P.clay);poly(c,[[523,245],[537,215],[580,215],[601,241],[601,325],[523,325]],P.ink);poly(c,[[532,314],[540,268],[551,301],[563,255],[576,303],[590,270],[595,318]],P.gold);rect(c,0,346,640,45,P.sand);rect(c,s.base.x-s.base.width/2-5,s.base.y-2,s.base.width+10,12,P.ink);rect(c,s.base.x-s.base.width/2,s.base.y,s.base.width,7,P.wood);for(const [i,a]of s.stack.entries())bowl(c,a.x,a.y,s.bowlWidth,i%2?P.plum:P.teal);
  line(c,29,52,611,52,P.ink,4);line(c,29,49,611,49,P.gold,2);const top=s.stack.at(-1);if(s.moving){rect(c,s.moving.x-6,46,12,11,P.ink);rect(c,s.moving.x-3,48,6,6,P.gold);line(c,s.moving.x,55,s.moving.x,66,P.sand,2);line(c,s.moving.x,103,s.moving.x,top?top.y-29:326,'#c5b28a',1);bowl(c,s.moving.x,s.moving.y,s.bowlWidth,P.teal);}if(s.falling)bowl(c,s.falling.x,s.falling.y,s.bowlWidth,P.teal);
  text(c,`${s.stack.length}/${s.target}`,320,34,21,P.paper);text(c,`${Math.max(0,2-s.misses)} MISsERS OVER`.toUpperCase(),495,374,11);text(c,'SPATIE / tik = loslaten',170,374,12);actor(c,env,athens?'myrrine':'melia',156,347,{dir:'right',scale:1.3});if(s.settle){rect(c,241,54,158,27,P.paper);text(c,'BLIJF STAAN…',320,68,12);}}
 return {update,draw,action(id){if(id==='drop')drop();},keyDown(code){if(code==='Space'||code==='Enter')drop();},pointerDown(){drop();},pointerMove(){},pointerUp(){},snapshot:b.snapshot};
}

function createAwningRun(env={}){
 const b=createBase(env,{distance:0,y:320,vy:0,grounded:true,duckUntil:0,ducking:false,pointerDuck:false,lives:3,invulnerable:0,falling:0,obstacles:[],passed:0,jumps:0});const {s}=b;
 s.speed=110+s.level*24;s.length=2800+(s.level-1)*650;s.heroX=126;s.jumpVelocity=-412;s.gravity=1060;s.gapWidth=43+s.level*10;
 const count=8+(s.level-1)*3;for(let i=0;i<count;i++)s.obstacles.push({id:i,type:i%2?'cloth':'gap',x:460+i*(s.length-700)/count+Math.round((b.random()-.5)*20),width:i%2?66+s.level*8:s.gapWidth,hit:false,passed:false});
 function jump(){if(s.phase!=='playing'||!s.grounded||s.falling)return;s.vy=s.jumpVelocity;s.grounded=false;s.jumps++;b.sound('cloth');}
 function duck(){if(s.phase==='playing')s.duckUntil=s.time+1.25;}
 function hit(obstacle){if(s.invulnerable>0||obstacle.hit)return;obstacle.hit=true;s.lives--;s.invulnerable=1.05;b.sound('hurt');if(obstacle.type==='gap'){s.falling=.48;s.vy=0;s.grounded=false;}if(s.lives<=0)b.end(false,Math.floor(s.distance/10),'De luifels winnen vandaag.','Spring over de gaten; duik onder het wasgoed. De losse rode draden waarschuwen je.');}
 function tick(dt,keys){s.time+=dt;s.distance+=s.speed*dt;s.invulnerable=Math.max(0,s.invulnerable-dt);s.ducking=Boolean(keys?.has('ArrowDown')||keys?.has('KeyS')||s.pointerDuck||s.time<s.duckUntil);
  if(s.falling>0){s.falling=Math.max(0,s.falling-dt);s.y+=125*dt;if(!s.falling){s.y=320;s.vy=0;s.grounded=true;}}
  else if(!s.grounded){s.vy+=s.gravity*dt;s.y+=s.vy*dt;if(s.y>=320){s.y=320;s.vy=0;s.grounded=true;}}
  const worldX=s.distance+s.heroX;
  for(const obstacle of s.obstacles){const within=worldX+9>obstacle.x&&worldX-9<obstacle.x+obstacle.width;
   if(within&&!s.falling){if(obstacle.type==='gap'&&s.y>314)hit(obstacle);else if(obstacle.type==='cloth'&&s.y-(s.ducking?20:46)<293&&s.y>201)hit(obstacle);}
   if(!obstacle.passed&&worldX>obstacle.x+obstacle.width+11){obstacle.passed=true;s.passed++;}
  }
  if(s.distance>=s.length)b.end(true,Math.round(s.distance/10)+s.lives*80,'Boven de drukte uit.','Ione weet nu wie haar dakroute kan bijhouden. Beneden denkt Bion dat de wind zijn was heeft gepakt.');
 }
 function update(dt,keys=new Set()){dt=cleanDt(dt);if(s.phase!=='playing'||!dt)return;for(let t=0;t<dt&&s.phase==='playing';t+=1/120)tick(Math.min(1/120,dt-t),keys);b.report(`${Math.min(100,Math.floor(s.distance/s.length*100))}% van de dakroute`,'Gat: springen · wasgoed: duiken');}
 function draw(c){frame(c);rect(c,0,9,640,277,P.mint);rect(c,0,133,640,90,P.teal);for(let xx=-180;xx<760;xx+=157){const x=xx-(s.distance*.22)%157;building(c,x,163,143,131,Math.floor(xx/157)%2?P.plum:P.clay);}rect(c,0,320,640,72,P.sand);rect(c,0,319,640,9,P.ink);rect(c,0,314,640,7,P.gold);for(let xx=-80;xx<720;xx+=41){const x=xx-s.distance%41;line(c,x,326,x-13,342,P.clay,3);line(c,x-13,342,x+27,342,P.paper,2);}for(const obstacle of s.obstacles){const x=obstacle.x-s.distance;if(x>690||x+obstacle.width<-30)continue;if(obstacle.type==='gap'){rect(c,x,313,obstacle.width,79,P.ink);rect(c,x+3,326,obstacle.width-6,65,P.plum);line(c,x-13,309,x-3,309,P.clay,3);line(c,x+obstacle.width+3,309,x+obstacle.width+13,309,P.clay,3);}else{line(c,x-10,185,x+obstacle.width+10,185,P.deep,3);for(let i=0;i<3;i++){const bx=x+i*obstacle.width/3;poly(c,[[bx,185],[bx+obstacle.width/3-2,185],[bx+obstacle.width/3-1,284],[bx+obstacle.width/6,293],[bx+1,283]],i%2?P.plum:P.paper);line(c,bx+5,194,bx+5,280,i%2?P.gold:P.clay,2);}}}
  if(s.invulnerable===0||Math.floor(s.time*12)%2===0){if(s.ducking&&s.grounded){c.save();c.translate(0,s.y);c.scale(1,.58);actor(c,env,'hero',s.heroX,0,{dir:'right',pose:'walk',scale:1.3});c.restore();}else actor(c,env,'hero',s.heroX,s.y,{dir:'right',pose:s.grounded?'walk':'idle',scale:1.3});}actor(c,env,'argos',s.heroX-47,Math.min(321,s.y+8),{dir:'right',pose:'walk',scale:1.2});meter(c,s.distance/s.length,29,28,221);hearts(c,s.lives,550,36);rect(c,0,358,640,33,P.paper);text(c,'SPATIE / tik boven = spring',176,371,12);text(c,'↓ / tik onder = duik',470,371,12);
  const next=s.obstacles.find(o=>!o.passed&&o.x+o.width>s.distance+s.heroX);if(next&&next.x-s.distance-s.heroX<330){rect(c,264,43,111,27,P.paper);text(c,next.type==='gap'?'↑ SPRING':'↓ DUIK',320,57,13);}}
 return {update,draw,action(id){if(id==='jump')jump();if(id==='duck')duck();},keyDown(code){if(code==='Space'||code==='ArrowUp'||code==='KeyW')jump();if(code==='ArrowDown'||code==='KeyS')duck();},pointerDown(p){if(s.phase!=='playing'||!Number.isFinite(p?.y))return;if(p.y>=305){s.pointerDuck=true;duck();}else jump();},pointerMove(){},pointerUp(){s.pointerDuck=false;},snapshot:b.snapshot};
}

export const games = Object.freeze([
 {id:'broodbalans',title:'Brood op de plank',subtitle:'Wie houdt het dagelijks brood recht?',instruction:'Breng minstens drie van de vier broden naar Bion. Geef links of rechts tegenwicht met korte bewegingen. Houd op een telefoon de linker- of rechterhelft van het veld vast.',controls:[{id:'left',label:'Links tegenwicht',key:'ArrowLeft'},{id:'right',label:'Rechts tegenwicht',key:'ArrowRight'}],create:createBreadBalance},
 {id:'vijgenvangst',title:'Vijgen voor iedereen',subtitle:'Een boom vraagt geen toegangsgeld.',instruction:'Vang de paarse vijgen, laat de gestreepte wespen vallen. Loop met links/rechts of sleep de mand. Drie wespen is genoeg gezoem.',controls:[{id:'left',label:'Mand links',key:'ArrowLeft'},{id:'right',label:'Mand rechts',key:'ArrowRight'}],create:createFigCatch},
 {id:'kruikenketting',title:'Kruikenketting',subtitle:'Eén klein duwtje kan ver komen.',instruction:'Maak drie rekken oefenkruiken leeg. Richt met links/rechts of je vinger, rol met spatie. De zijwanden kaatsen de bal terug; elk rek geeft nieuwe worpen.',controls:[{id:'left',label:'Mik links',key:'ArrowLeft'},{id:'right',label:'Mik rechts',key:'ArrowRight'},{id:'roll',label:'Rollen!',key:'Space'}],create:createPotChain},
 {id:'schaalstapelen',title:'De hoogste schalen',subtitle:'Een titel helpt niet tegen zwaartekracht.',instruction:'Laat de bewegende schaal los boven de stapel. Spatie of een tik laat hem vallen. De bovenste schaal bepaalt waar de volgende kan staan; je mag één keer missen.',controls:[{id:'drop',label:'Loslaten',key:'Space'}],create:createBowlStack},
 {id:'luifelvlucht',title:'Over de luifels',subtitle:'Van boven lijken de grenzen kleiner.',instruction:'Volg Iones route over de markt. Spring over gaten met spatie; duik onder wasgoed met omlaag. Op een telefoon: tik boven om te springen, onder om te duiken.',controls:[{id:'jump',label:'Springen',key:'Space'},{id:'duck',label:'Duiken',key:'ArrowDown'}],create:createAwningRun},
]);
