import {drawSpring} from './shore-water.js';
const C = {ink:'#263747',paper:'#f1dca9',gold:'#e8b64e',teal:'#4c9b95',mint:'#8ecac0',plum:'#785677',clay:'#c96c52',sand:'#c99b62',light:'#fff0c9',shade:'#b6986b',wooddark:'#65504d'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const copy=v=>structuredClone(v);
const rect=(c,x,y,w,h,color)=>{c.fillStyle=C[color]||color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const line=(c,points,color='ink',width=2)=>{c.strokeStyle=C[color]||color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke();};
const text=(c,value,x,y,size=14,color='ink',align='center')=>{c.font=`bold ${size}px ui-monospace,monospace`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=C[color]||color;c.fillText(String(value),x,y);};
function circle(c,x,y,r,color){c.fillStyle=C[color]||color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function seedRandom(seed){let n=(Number(seed)||1)>>>0;return()=>{n=(n+0x6D2B79F5)>>>0;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function floor(c,place='workshop'){
 rect(c,0,0,640,400,'paper');rect(c,0,0,640,55,place==='garden'?'teal':'plum');rect(c,0,51,640,5,'ink');
 for(let x=8;x<640;x+=41){rect(c,x,12,28,3,place==='garden'?'mint':'sand');rect(c,x+8,26,20,2,'paper');}
 for(let y=78;y<392;y+=48)for(let x=(y%96?22:45);x<640;x+=93){line(c,[[x,y],[x+22,y],[x+26,y+5]],'shade',1);}
 rect(c,0,383,640,5,'sand');rect(c,0,388,640,12,'ink');
}
function plaque(c,label,x=320,y=28){const w=Math.min(570,label.length*8+24);rect(c,x-w/2,y-13,w,26,'ink');rect(c,x-w/2+4,y+11,w-8,2,'gold');text(c,label,x,y,13,'light');}
function coin(c,x,y,id,selected=false){circle(c,x+2,y+3,18,'shade');circle(c,x,y,18,'ink');circle(c,x,y,15,'gold');line(c,[[x-7,y-11],[x+7,y-11]],'light',2);text(c,id+1,x,y+1,14);if(selected){c.strokeStyle=C.teal;c.lineWidth=3;c.strokeRect(x-22,y-22,44,44);}}
function base(options){
 const level=clamp(Math.floor(Number(options.level)||1),1,3),rng=seedRandom(options.seed);
 const state={level,phase:'playing',result:null};
 return {state,level,rng,actor:typeof options.actor==='function'?options.actor:()=>{},
 status:(a,b='')=>options.setStatus?.(a,b),sound:name=>options.sound?.(name),
 end(won,title,detail,score=won?100:0){if(state.result)return;state.phase=won?'won':'lost';state.result={won,score,title,detail};options.finish?.({...state.result});},
 live:()=>!state.result};
}
const button=(id,label,key)=>({id,label,...(key?{key}:{})});

const lighter = {
 id:'lichte-munt',title:'De munt die liegt',subtitle:'Een teken vertelt niet alles',
 instruction:'Eén munt is lichter. Sleep evenveel munten op beide schalen en weeg. Kies daarna de verdachte munt en wijs hem aan.',
 controls:[button('left','Op links','KeyL'),button('right','Op rechts','KeyR'),button('table','Terug','KeyB'),button('weigh','Weeg','Space'),button('guess','Deze is lichter','Enter')],
 create(options={}){
  const athens=options.region==='athens';
  const b=base(options),s=b.state,n=[3,6,9][b.level-1],light=Math.floor(b.rng()*n);Object.assign(s,{n,selected:0,trays:Array(n).fill(0),remaining:2,history:[],balance:0,message:'Klik een munt. Sleep hem naar een schaal.'});let drag=null;
  const pos=i=>{const tray=s.trays[i];if(!tray)return{x:80+i*60,y:306};const ids=s.trays.map((v,j)=>v===tray?j:-1).filter(j=>j>=0),k=ids.indexOf(i);return{x:(tray===1?205:435)+(k%3-1)*39,y:174-Math.floor(k/3)*35+(tray===1?s.balance:-s.balance)*8};};
  const updateStatus=()=>b.status(`${s.remaining} weging${s.remaining===1?'':'en'} over`,s.message);
  function weigh(){
   const left=s.trays.filter(t=>t===1).length,right=s.trays.filter(t=>t===2).length;
   if(!s.remaining){s.message='De wegingen zijn op. Wijs de lichte munt aan.';updateStatus();return;}
   if(!left||left!==right){s.message='Leg links en rechts evenveel munten.';updateStatus();b.sound('pot');return;}
   const a=left-(s.trays[light]===1?.2:0),z=right-(s.trays[light]===2?.2:0);s.balance=Math.sign(a-z);s.remaining--;
   const result=s.balance<0?'left':s.balance>0?'right':'equal';s.history.push({left:s.trays.flatMap((t,i)=>t===1?[i]:[]),right:s.trays.flatMap((t,i)=>t===2?[i]:[]),result});
   s.message=result==='equal'?'Even zwaar. De lichte munt lag niet op de schalen.':`${result==='left'?'Links':'Rechts'} is lichter. Daar zit de vreemde munt.`;b.sound('coin');updateStatus();
  }
  function action(id){if(!b.live())return;
   if(['left','right','table'].includes(id)){s.trays[s.selected]={left:1,right:2,table:0}[id];s.balance=0;s.message=`Munt ${s.selected+1} ligt ${id==='table'?'weer op tafel':id==='left'?'links':'rechts'}.`;b.sound('wood');}
   else if(id==='weigh')weigh();
   else if(id==='guess'){const won=s.selected===light;b.end(won,won?'Het teken woog niets.':'Dat was een gewone munt.',won?athens?'Thratta wijst naar haar schaal: hetzelfde teken, toch minder gewicht.':'Damas kijkt nog eens: hetzelfde stadsteken, toch minder koper.':'Neem rustig de tijd voor een nieuwe poging.',won?Math.max(40,100-s.history.length*15):0);}
   else if(id==='next')s.selected=(s.selected+1)%n;else if(id==='prev')s.selected=(s.selected+n-1)%n;
   updateStatus();
  }
  const hit=p=>Array.from({length:n},(_,i)=>i).reverse().find(i=>{const q=pos(i);return Math.hypot(q.x-p.x,q.y-p.y)<23;});
  updateStatus();return {
   action,update(){},keyDown(code){if(code==='ArrowRight')action('next');else if(code==='ArrowLeft')action('prev');else if(/^Digit[1-9]$/.test(code)&&b.live()&&Number(code.slice(5))<=n){s.selected=Number(code.slice(5))-1;updateStatus();}else{const id={KeyL:'left',KeyR:'right',KeyB:'table',Space:'weigh',Enter:'guess'}[code];if(id)action(id);}},
   pointerDown(p){if(!b.live())return;const i=hit(p);if(i===undefined)return;s.selected=i;drag={i,start:{...p},point:{...p}};},
   pointerMove(p){if(drag&&b.live())drag.point={...p};},
   pointerUp(p){if(!drag)return;const d=drag;drag=null;if(!b.live()||p.cancelled)return;if(Math.hypot(p.x-d.start.x,p.y-d.start.y)<7)return;s.trays[d.i]=p.y<238&&p.x>100&&p.x<305?1:p.y<238&&p.x>335&&p.x<540?2:0;s.balance=0;b.sound('wood');updateStatus();},
   snapshot(){return copy(s);},
   draw(c){floor(c);plaque(c,athens?'THRATTA’S WEEGSCHAAL':'DAMAS’ WEEGSCHAAL');rect(c,310,140,20,113,'ink');rect(c,299,249,42,10,'ink');line(c,[[140,110+s.balance*8],[500,110-s.balance*8]],'wooddark',8);line(c,[[140,110+s.balance*8],[500,110-s.balance*8]],'gold',3);
    for(const [x,side]of[[205,1],[435,-1]]){const y=110+s.balance*8*side;line(c,[[x-70,y],[x-55,200+y-110],[x+55,200+y-110],[x+70,y]],'ink',2);rect(c,x-75,195+y-110,150,10,'teal');text(c,x===205?'LINKS':'RECHTS',x,226,11);}
    rect(c,40,331,560,11,'sand');for(let i=0;i<n;i++)if(drag?.i!==i){const p=pos(i);coin(c,p.x,p.y,i,s.selected===i);}if(drag)coin(c,drag.point.x,drag.point.y,drag.i,true);
    for(let i=0;i<2;i++){circle(c,582+i*23,81,7,i<s.remaining?'gold':'shade');}text(c,'Wegingen',591,101,10);b.actor(c,athens?'thratta':'damas',588,251,{dir:'left',scale:1.05});
    text(c,s.history.length?`Laatste proef: ${s.history.at(-1).result==='equal'?'in evenwicht':s.history.at(-1).result==='left'?'links lichter':'rechts lichter'}`:'Gelijke aantallen. Eerlijk vergelijken.',320,365,12);
   }
  };
 }
};

const WATER_PATHS=[[[0,1],[1,1],[1,2],[2,2],[3,2],[3,1],[4,1]],[[0,3],[1,3],[1,2],[1,1],[2,1],[3,1],[3,2],[4,2],[4,3],[4,4],[5,4]],[[0,1],[1,1],[1,2],[1,3],[2,3],[3,3],[3,2],[3,1],[3,0],[4,0],[5,0],[5,1],[5,2],[4,2],[4,3],[4,4],[5,4],[6,4]]];
const DELTAS=[[0,-1],[1,0],[0,1],[-1,0]];
const dirBetween=(a,z)=>DELTAS.findIndex(([dx,dy])=>a[0]+dx===z[0]&&a[1]+dy===z[1]);
const water={
 id:'waterweg',title:'Water voor de vijgen',subtitle:'Een omweg kan eerlijker zijn',instruction:'Draai de buizen met een klik. Leid water van de vis links naar de vijgen rechts. Test zo vaak je wilt.',
 controls:[button('turn','Draai buis','Space'),button('flow','Laat stromen','Enter')],
 create(options={}){
  const athens=options.region==='athens';
  const shore=options.shoreSpring===true&&!athens,b=base(options),s=b.state,cols=[5,6,7][b.level-1],rows=[4,5,5][b.level-1],path=WATER_PATHS[b.level-1],tile=shore?Math.min(76,Math.floor(420/cols),Math.floor(304/rows)):49,ox=(640-cols*tile)/2,oy=shore?57:91;
  const cells=Array.from({length:cols*rows},()=>({ports:b.rng()<.5?[0,2]:[0,1],rotation:Math.floor(b.rng()*4)}));
  path.forEach((p,i)=>{const prev=i?path[i-1]:[-1,p[1]],next=i===path.length-1?[cols,p[1]]:path[i+1];cells[p[1]*cols+p[0]]={ports:[dirBetween(p,prev),dirBetween(p,next)],rotation:1+Math.floor(b.rng()*3)};});
  Object.assign(s,{cols,rows,tile,ox,oy,cells,selected:0,start:[...path[0]],goal:[...path.at(-1)],flow:[],tests:0,flowing:false,leak:null});
  if(shore)Object.assign(s,{selected:path[0][1]*cols+path[0][0],stream:0,filling:false});
  const ports=i=>s.cells[i].ports.map(d=>(d+s.cells[i].rotation)%4);
  function trace(){let x=s.start[0],y=s.start[1],entry=3,visited=new Set(),route=[];for(let count=0;count<cols*rows+1;count++){
   if(x<0||x>=cols||y<0||y>=rows)return{won:x===cols&&y===s.goal[1],route,leak:{x,y}};
   const i=y*cols+x,k=`${i}:${entry}`;if(visited.has(k))return{won:false,route,leak:{x,y}};visited.add(k);const exits=ports(i);route.push(i);
   if(!exits.includes(entry))return{won:false,route,leak:{x,y}};const out=exits.find(d=>d!==entry),[dx,dy]=DELTAS[out];x+=dx;y+=dy;entry=(out+2)%4;
  }return{won:false,route,leak:{x,y}};}
  function complete(){b.end(true,athens||shore?'De openbare bak krijgt weer water.':'Zelfs de kleinste boom krijgt water.','Argos springt door het laatste straaltje.',Math.max(40,120-s.tests*4));}
  function action(id){if(!b.live()||s.filling)return;if(id==='turn'){s.cells[s.selected].rotation=(s.cells[s.selected].rotation+1)%4;s.flow=[];s.flowing=false;s.leak=null;b.sound('wood');b.status('Een kwartslag verder.','De buiseinden moeten elkaar raken.');}else if(id==='flow'){const r=trace();s.tests++;s.flow=r.route;s.leak=r.leak;s.flowing=true;b.sound('water');if(shore)s.stream=options.reducedMotion?r.route.length/6.5:0;if(r.won){if(shore)s.filling=true;else complete();}else b.status('Hier lekt het nog.','Draai een buis en probeer opnieuw.');}}
  b.status(athens?'De openbare waterbak staat droog.':'De vijgen staan droog.','Klik om te draaien. Enter laat het water lopen.');
  return{action,update(dt){if(shore&&s.flowing&&b.live()){s.stream+=Number.isFinite(dt)?clamp(dt,0,.1):0;if(s.filling&&s.stream>s.flow.length/6.5+.42)complete();}},keyDown(code){if(!b.live())return;const dx={ArrowLeft:-1,KeyA:-1,ArrowRight:1,KeyD:1}[code]||0,dy={ArrowUp:-1,KeyW:-1,ArrowDown:1,KeyS:1}[code]||0;if(dx||dy){const x=clamp(s.selected%cols+dx,0,cols-1),y=clamp(Math.floor(s.selected/cols)+dy,0,rows-1);s.selected=y*cols+x;}else if(code==='Space')action('turn');else if(code==='Enter')action('flow');},
   pointerDown(p){if(!b.live())return;const x=Math.floor((p.x-ox)/tile),y=Math.floor((p.y-oy)/tile);if(x>=0&&x<cols&&y>=0&&y<rows){s.selected=y*cols+x;action('turn');}},snapshot(){return copy(s);},
   draw(c){if(shore){drawSpring(c,s,options);return;}floor(c,'garden');plaque(c,athens?'WATER VOOR HET HELE PLEIN':'DE DORSTIGE VIJGENHOF');for(let i=0;i<cells.length;i++){const x=ox+i%cols*tile,y=oy+Math.floor(i/cols)*tile,wet=s.flow.includes(i);rect(c,x+2,y+2,tile-4,tile-4,i===s.selected?'gold':'sand');rect(c,x+5,y+5,tile-10,tile-10,'paper');for(const d of ports(i)){const[dx,dy]=DELTAS[d];line(c,[[x+tile/2,y+tile/2],[x+tile/2+dx*tile/2,y+tile/2+dy*tile/2]],'ink',14);line(c,[[x+tile/2,y+tile/2],[x+tile/2+dx*tile/2,y+tile/2+dy*tile/2]],wet?'teal':'clay',9);}circle(c,x+tile/2,y+tile/2,6,wet?'mint':'sand');}
    const sy=oy+s.start[1]*tile+tile/2,gy=oy+s.goal[1]*tile+tile/2;line(c,[[ox-29,sy],[ox,sy]],'teal',8);text(c,'➜',ox-25,sy-22,20,'teal');line(c,[[ox+cols*tile,gy],[ox+cols*tile+26,gy]],s.result?'teal':'sand',8);
    if(athens){const bx=ox+cols*tile+20;rect(c,bx,gy-8,34,29,'ink');rect(c,bx+4,gy-4,26,20,'sand');rect(c,bx+4,gy+5,26,11,s.result?'teal':'shade');rect(c,bx-3,gy-10,40,6,'paper');}
    else for(const[k,dy]of[[-1,8],[0,-7],[1,8]]){line(c,[[ox+cols*tile+32,gy+20],[ox+cols*tile+32+k*10,gy-5+dy]],'teal',3);circle(c,ox+cols*tile+32+k*10,gy-6+dy,7,s.result?'plum':'shade');}
    if(s.leak&&!s.result){const p=s.flow.at(-1);if(p!==undefined){const x=ox+p%cols*tile+tile/2,y=oy+Math.floor(p/cols)*tile+tile/2;circle(c,x+16,y+14,4,'teal');circle(c,x+22,y+22,3,'mint');}}
    text(c,`${s.result?athens?'Het water komt weer op het plein.':'Ook de verste vijg krijgt water.':s.flowing?'Het water laat zien waar het stokt.':'Een klik draait een buis. Denk rustig na.'}`,320,367,12);
   }
  };
 }
};

const MIRRORS=[
 {source:{x:44,y:126,dx:1,dy:0},target:{x:589,y:280},mirrors:[{x:200,y:126,axis:'x',min:160,max:400,solution:240,slash:false},{x:320,y:280,axis:'x',min:160,max:400,solution:240,slash:false}]},
 {source:{x:44,y:120,dx:1,dy:0},target:{x:100,y:65},mirrors:[{x:200,y:120,axis:'x',min:160,max:400,solution:240,slash:false},{x:320,y:280,axis:'x',min:160,max:400,solution:240,slash:true},{x:100,y:200,axis:'y',min:180,max:320,solution:280,slash:false}]},
 {source:{x:44,y:100,dx:1,dy:0},target:{x:589,y:180},mirrors:[{x:200,y:100,axis:'x',min:160,max:400,solution:240,slash:false},{x:320,y:300,axis:'x',min:160,max:400,solution:240,slash:true},{x:100,y:240,axis:'y',min:220,max:320,solution:300,slash:false},{x:140,y:180,axis:'x',min:80,max:160,solution:100,slash:true}]}
];
const shadow={
 id:'schaduwspel',title:'De schaduw van een ezel',subtitle:'Wat je ziet, is niet het hele dier',instruction:'Schuif de spiegels over hun rails en draai ze. Laat het licht bij het ezelsbord eindigen. Klik een spiegel om hem te kiezen; sleep om te schuiven.',
 controls:[button('previous','Vorige spiegel','KeyQ'),button('back','Schuif terug','ArrowLeft'),button('forward','Schuif verder','ArrowRight'),button('flip','Draai spiegel','Space'),button('shine','Laat zien','Enter')],
 create(options={}){
  const athens=options.region==='athens';
  const b=base(options),s=b.state,layout=copy(MIRRORS[b.level-1]);layout.mirrors.forEach((m,i)=>{m.id=i;delete m.solution;m.slash=b.rng()<.5;});Object.assign(s,layout,{selected:0,segments:[],lit:false,moves:0});let drag=null;
  function ray(){let{x,y,dx,dy}=s.source;const seen=new Set(),segments=[];let lit=false;for(let bounce=0;bounce<16;bounce++){
   const along=p=>dx?Math.abs(p.y-y)<3?(p.x-x)/dx:Infinity:Math.abs(p.x-x)<3?(p.y-y)/dy:Infinity;
   let nearest=null,distance=Infinity;for(const m of s.mirrors){const d=along(m);if(d>3&&d<distance){distance=d;nearest=m;}}
   const goal=along(s.target);if(goal>0&&goal<distance){segments.push({x1:x,y1:y,x2:s.target.x,y2:s.target.y});lit=true;break;}
   const edge=dx?((dx>0?607:33)-x)/dx:((dy>0?354:62)-y)/dy;
   if(!nearest||edge<distance){segments.push({x1:x,y1:y,x2:x+dx*edge,y2:y+dy*edge});break;}
   segments.push({x1:x,y1:y,x2:nearest.x,y2:nearest.y});const visit=`${nearest.id}:${dx}:${dy}`;if(seen.has(visit))break;seen.add(visit);x=nearest.x;y=nearest.y;[dx,dy]=nearest.slash?[-dy,-dx]:[dy,dx];
  }s.segments=segments;s.lit=lit;}
  function status(){b.status(s.lit?'De ezel staat in het licht!':`Spiegel ${s.selected+1} van ${s.mirrors.length}`,s.lit?'Laat het schaduwspel zien.':'Schuif langs de rail. Een kwartslag keert het licht.');}
  function move(amount){const m=s.mirrors[s.selected];m[m.axis]=clamp(m[m.axis]+amount,m.min,m.max);s.moves++;ray();status();}
  function action(id){if(!b.live())return;if(id==='previous')s.selected=(s.selected+s.mirrors.length-1)%s.mirrors.length;else if(id==='next')s.selected=(s.selected+1)%s.mirrors.length;else if(id==='back')move(-20);else if(id==='forward')move(20);else if(id==='flip'){s.mirrors[s.selected].slash=!s.mirrors[s.selected].slash;s.moves++;b.sound('cloth');}else if(id==='shine'){ray();if(s.lit)b.end(true,'Een reus. Met ezelsoren.','Een kleine spiegel maakt iemand indrukwekkend groot.',Math.max(40,130-s.moves*2));else b.status('Het bord staat nog in het donker.','Volg het licht tot waar het verkeerd afbuigt.');return;}ray();status();}
  ray();status();return{action,update(){},keyDown(code){const id={ArrowLeft:'back',ArrowUp:'back',KeyA:'back',KeyW:'back',ArrowRight:'forward',ArrowDown:'forward',KeyD:'forward',KeyS:'forward',KeyQ:'previous',KeyE:'next',Space:'flip',Enter:'shine'}[code];if(id)action(id);},
   pointerDown(p){if(!b.live())return;const i=s.mirrors.findIndex(m=>Math.hypot(m.x-p.x,m.y-p.y)<25);if(i<0)return;s.selected=i;drag={i,original:s.mirrors[i][s.mirrors[i].axis]};status();},
   pointerMove(p){if(!b.live()||!drag)return;const m=s.mirrors[drag.i];m[m.axis]=clamp(m.min+Math.round((p[m.axis]-m.min)/20)*20,m.min,m.max);ray();status();},
   pointerUp(p){if(!drag)return;const d=drag;drag=null;if(!b.live())return;if(p.cancelled){const m=s.mirrors[d.i];m[m.axis]=d.original;}else if(s.mirrors[d.i][s.mirrors[d.i].axis]!==d.original)s.moves++;ray();status();},snapshot(){return copy(s);},
   draw(c){floor(c);plaque(c,athens?'LICHT ONDER DE ZUILENGANG':'THEATER VAN DE GROTE NEUZEN');rect(c,28,61,583,294,'shade');rect(c,32,64,575,287,'plum');
    for(const m of s.mirrors){const x1=m.axis==='x'?m.min:m.x,y1=m.axis==='y'?m.min:m.y,x2=m.axis==='x'?m.max:m.x,y2=m.axis==='y'?m.max:m.y;line(c,[[x1,y1],[x2,y2]],'paper',2);for(let v=m.min;v<=m.max;v+=20)rect(c,m.axis==='x'?v-1:m.x-3,m.axis==='y'?v-1:m.y-3,m.axis==='x'?2:6,m.axis==='y'?2:6,'sand');}
    for(const beam of s.segments){line(c,[[beam.x1,beam.y1],[beam.x2,beam.y2]],'gold',5);line(c,[[beam.x1,beam.y1],[beam.x2,beam.y2]],'light',2);}
    const t=s.target;rect(c,t.x-15,t.y-21,30,42,s.lit?'gold':'paper');rect(c,t.x-7,t.y-9,15,21,'ink');rect(c,t.x-8,t.y-17,5,15,'ink');rect(c,t.x+4,t.y-17,5,15,'ink');rect(c,t.x-4,t.y-1,3,3,'light');rect(c,t.x+4,t.y-1,3,3,'light');
    for(const m of s.mirrors){circle(c,m.x,m.y,18,m.id===s.selected?'gold':'ink');circle(c,m.x,m.y,14,'teal');line(c,m.slash?[[m.x-10,m.y+10],[m.x+10,m.y-10]]:[[m.x-10,m.y-10],[m.x+10,m.y+10]],'light',5);text(c,m.id+1,m.x+20,m.y-20,11,'light');}
    circle(c,s.source.x,s.source.y,9,'clay');circle(c,s.source.x,s.source.y,5,'gold');text(c,'Sleep een spiegel. Spatie draait hem.',320,367,12);
   }
  };
 }
};

const MEMORY_PATHS=[[[0,3],[1,3],[1,2],[2,2],[2,1]],[[0,3],[1,3],[1,2],[0,2],[0,1],[1,1],[2,1]],[[0,3],[1,3],[1,2],[2,2],[2,3],[3,3],[3,2],[3,1],[2,1],[2,0],[3,0],[4,0]]];
const memory={
 id:'tegelpad',title:'Het pad dat verdwijnt',subtitle:'Goed kijken is ook een avontuur',instruction:'Bekijk het oplichtende tegelpad. Loop het daarna uit je hoofd na, één vak tegelijk. Je mag het voorbeeld opnieuw bekijken.',
 controls:[button('up','↑','ArrowUp'),button('left','←','ArrowLeft'),button('down','↓','ArrowDown'),button('right','→','ArrowRight'),button('replay','Nog eens kijken','KeyR')],
 create(options={}){
  const b=base(options),s=b.state,flip=b.rng()<.5,path=MEMORY_PATHS[b.level-1].map(([x,y])=>[flip?4-x:x,y]),tile=56,ox=180,oy=102;
  Object.assign(s,{phase:'observe',cols:5,rows:4,tile,ox,oy,player:[...path[0]],progress:0,length:path.length-1,lives:3,watchTime:0,showIndex:0,replays:0});
  function watch(){s.phase='observe';s.watchTime=0;s.showIndex=0;s.progress=0;s.player=[...path[0]];b.status('Kijk naar de lichtjes.','Straks zijn alleen jouw voeten nog te zien.');}
  function move(dx,dy){if(s.phase!=='playing'||!b.live())return;const next=[s.player[0]+dx,s.player[1]+dy];if(next[0]<0||next[0]>=5||next[1]<0||next[1]>=4)return;
   const expected=path[s.progress+1];if(next[0]!==expected[0]||next[1]!==expected[1]){s.lives--;b.sound('pot');if(!s.lives)b.end(false,'De tegels hebben gewonnen.','Ione laat het pad graag nog eens zien.');else{watch();b.status('Bijna! Kijk nog eens.','Hetzelfde pad, een nieuwe kans.');}return;}
   s.player=next;s.progress++;b.sound('wood');if(s.progress===s.length)b.end(true,'Je voeten weten het nog.','Niet elk spoor hoeft op een kaart te staan.',Math.max(40,100-(3-s.lives)*15-s.replays*3));else b.status(`${s.progress} van ${s.length} stappen`,'Een tegel tegelijk.');
  }
  function action(id){if(!b.live())return;if(id==='replay'){s.replays++;watch();return;}const d={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[id];if(d)move(...d);}
  watch();return{action,update(dt){if(!b.live()||s.phase!=='observe'||!Number.isFinite(dt)||dt<=0)return;s.watchTime+=Math.min(dt,1);s.showIndex=Math.floor(s.watchTime/.72);if(s.showIndex>=path.length+1){s.phase='playing';s.showIndex=-1;b.status('Nu jij.','Loop vanaf het vlaggetje hetzelfde pad.');}},
   keyDown(code){const id={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyR:'replay'}[code];if(id)action(id);},
   pointerDown(p){if(!b.live()||s.phase!=='playing')return;const x=Math.floor((p.x-ox)/tile),y=Math.floor((p.y-oy)/tile),dx=x-s.player[0],dy=y-s.player[1];if(Math.abs(dx)+Math.abs(dy)===1)move(dx,dy);},snapshot(){return copy(s);},
   draw(c){floor(c,'garden');plaque(c,'IONE’S VERDWIJNENDE TEGELPAD');for(let y=0;y<4;y++)for(let x=0;x<5;x++){const current=s.phase==='observe'&&path[s.showIndex]?.[0]===x&&path[s.showIndex]?.[1]===y;rect(c,ox+x*tile+2,oy+y*tile+2,tile-4,tile-4,'ink');rect(c,ox+x*tile+4,oy+y*tile+4,tile-8,tile-8,current?'gold':'sand');rect(c,ox+x*tile+9,oy+y*tile+9,tile-18,tile-18,current?'light':'paper');if(current)circle(c,ox+x*tile+28,oy+y*tile+28,8,'gold');}
    const start=path[0];line(c,[[ox+start[0]*tile+9,oy+start[1]*tile+7],[ox+start[0]*tile+9,oy+start[1]*tile+22]],'teal',2);rect(c,ox+start[0]*tile+10,oy+start[1]*tile+7,11,7,'teal');
    if(s.phase!=='observe')b.actor(c,'hero',ox+s.player[0]*tile+28,oy+s.player[1]*tile+49,{dir:'up',scale:.85});
    for(let i=0;i<3;i++)text(c,i<s.lives?'♥':'·',79+i*25,119,21,i<s.lives?'clay':'shade');b.actor(c,'ione',107,264,{dir:'right',scale:1.1});text(c,s.phase==='observe'?'KIJK':'LOOP',320,77,15,'teal');text(c,`${s.length} stappen · ${s.phase==='observe'?'onthoud de volgorde':`${s.progress} gevonden`}`,320,350,13);text(c,'Ione: “Je mag heus nog eens kijken.”',320,368,11);
   }
  };
 }
};

const GATE_BOARDS=[['#########','#A.....B#','#.a.....#','####G####','#.b...c.#','####H####','#Xd....Y#','#########'],['#########','#A..#..B#','#.#a....#','######G##','#c.....b#','##H######','#X..d..Y#','#########'],['###########','#A.#.....B#','#a...#....#','######G####','#..#....b.#','#c.....#..#','##H########','#X.....d.Y#','###########']];
const gates={
 id:'tweepoorten',title:'Twee poorten, vier voeten',subtitle:'Vrijheid lukt soms met z’n tweeën',instruction:'Loop op een gekleurde plaat om de bijpassende poort open te houden. Wissel tussen Diogenes en Argos. Breng ieder naar zijn eigen uitgang.',
 controls:[button('up','↑','ArrowUp'),button('left','←','ArrowLeft'),button('down','↓','ArrowDown'),button('right','→','ArrowRight'),button('switch','Wissel','Space'),button('reset','Opnieuw neerzetten','KeyR')],
 create(options={}){
  const b=base(options),s=b.state,board=GATE_BOARDS[b.level-1],tile=33,cols=board[0].length,rows=board.length,ox=(640-cols*tile)/2,oy=64,find=ch=>board.flatMap((row,y)=>[...row].flatMap((v,x)=>v===ch?[[x,y]]:[]))[0],initial=[find('A'),find('B')],exits=[find('X'),find('Y')];
  Object.assign(s,{board:[...board],tile,ox,oy,cols,rows,actors:copy(initial),exits,active:0,moves:0});
  const on=([x,y])=>board[y]?.[x]||'#';
  const open=ch=>s.actors.some(p=>(ch==='G'?'ab':'cd').includes(on(p)));
  function status(extra){b.status(s.active===0?'Diogenes loopt.':'Argos loopt.',extra||'Gelijke kleuren horen bij dezelfde poort.');}
  function move(dx,dy){if(!b.live())return;const a=s.actors[s.active],other=s.actors[1-s.active],next=[a[0]+dx,a[1]+dy],cell=on(next);if(cell==='#'||(next[0]===other[0]&&next[1]===other[1])){b.sound('pot');return;}if((cell==='G'||cell==='H')&&!open(cell)){status('Iemand moet op een plaat van deze kleur blijven.');b.sound('pot');return;}
   s.actors[s.active]=next;s.moves++;b.sound('wood');if(s.actors.every((p,i)=>p[0]===exits[i][0]&&p[1]===exits[i][1]))b.end(true,'Niemand bleef achter.','De poorten zijn dicht. Jullie staan allebei aan de goede kant.',Math.max(40,140-s.moves));else status();
  }
  function action(id){if(!b.live())return;if(id==='switch'){s.active=1-s.active;b.sound('dog');status();}else if(id==='reset'){s.actors=copy(initial);s.active=0;s.moves=0;status();}else{const d={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]}[id];if(d)move(...d);}}
  status();return{action,update(){},keyDown(code){const id={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'switch',KeyQ:'switch',KeyR:'reset'}[code];if(id)action(id);},
   pointerDown(p){if(!b.live())return;const x=Math.floor((p.x-ox)/tile),y=Math.floor((p.y-oy)/tile),clicked=s.actors.findIndex(a=>a[0]===x&&a[1]===y);if(clicked>=0){s.active=clicked;status();return;}const dx=x-s.actors[s.active][0],dy=y-s.actors[s.active][1];if(Math.abs(dx)+Math.abs(dy)===1)move(dx,dy);},
   snapshot(){return copy({...s,open:{G:open('G'),H:open('H')}});},
   draw(c){floor(c);plaque(c,'DE POORTWACHTERS HEBBEN PAUZE');for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const ch=board[y][x],px=ox+x*tile,py=oy+y*tile;rect(c,px,py,tile,tile,ch==='#'?'ink':'shade');rect(c,px+2,py+2,tile-4,tile-4,ch==='#'?'plum':'paper');if(ch==='#'){line(c,[[px+4,py+9],[px+24,py+9]],'sand');continue;}if('abcd'.includes(ch)){const col='ab'.includes(ch)?'teal':'plum';circle(c,px+tile/2,py+tile/2,12,col);text(c,'ab'.includes(ch)?'I':'II',px+tile/2,py+tile/2,12,'light');}
     if(ch==='G'||ch==='H'){const color=ch==='G'?'teal':'plum';rect(c,px+1,py+1,4,tile-2,color);rect(c,px+tile-5,py+1,4,tile-2,color);if(!open(ch)&&!s.actors.some(a=>a[0]===x&&a[1]===y))for(let i=8;i<tile-4;i+=7)rect(c,px+i,py+3,3,tile-6,color);text(c,ch==='G'?'I':'II',px+16,py+5,8,'ink');}
     if(ch==='X'||ch==='Y'){rect(c,px+3,py+3,tile-6,tile-6,'gold');text(c,ch==='X'?'D':'A',px+16,py+16,15,'ink');}}
    s.actors.forEach(([x,y],i)=>{const px=ox+x*tile,py=oy+y*tile;if(i===s.active){c.strokeStyle=C.gold;c.lineWidth=3;c.strokeRect(px+1,py+1,tile-2,tile-2);}b.actor(c,i===0?'hero':'argos',px+tile/2,py+tile-1,{dir:'down',scale:i===0?.66:.94});});
    text(c,`${s.active===0?'DIOGENES':'ARGOS'} · ${s.moves} stappen`,320,rows===9?376:352,12,'ink');if(rows<9)text(c,'D = Diogenes’ deur · A = Argos’ deur',320,370,11);
   }
  };
 }
};
export const games=[lighter,water,shadow,memory,gates];
