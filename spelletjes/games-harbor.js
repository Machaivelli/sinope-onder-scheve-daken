// Five small harbour games. All simulation lives here; the common shell owns
// pausing, retrying, music, the instruction card and the surrounding buttons.
const P = {ink:'#263747',paper:'#f1dca9',gold:'#e8b64e',teal:'#4c9b95',mint:'#8ecac0',plum:'#785677',clay:'#c96c52',sand:'#c99b62',white:'#fff0c9',darkSea:'#35767f',wood:'#947050'};
const TAU = Math.PI * 2;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const levelOf = n => clamp(Math.floor(Number(n)||1),1,3);
function rng(seed) { let n=Number(seed)>>>0; return () => {n=(n+0x6D2B79F5)>>>0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}; }
function rect(c,x,y,w,h,color) {c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function line(c,points,color,width=2) {c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.stroke();}
function polygon(c,points,color) {c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.closePath();c.fill();}
function circle(c,x,y,r,color) {c.fillStyle=color;c.beginPath();c.arc(Math.round(x),Math.round(y),r,0,TAU);c.fill();}
function text(c,value,x,y,size=13,color=P.ink,align='center') {c.fillStyle=color;c.font=`700 ${size}px ui-monospace,monospace`;c.textAlign=align;c.textBaseline='middle';c.fillText(String(value),Math.round(x),Math.round(y));}
function panel(c,x,y,w,h,color=P.paper) {rect(c,x+3,y+4,w,h,P.ink);rect(c,x,y,w,h,P.ink);rect(c,x+2,y+2,w-4,h-4,color);}
function meter(c,x,y,w,value,color=P.teal) {rect(c,x,y,w,10,P.ink);rect(c,x+2,y+2,w-4,6,'#b9ae87');rect(c,x+2,y+2,(w-4)*clamp(value,0,1),6,color);}
function sea(c,t=0) {rect(c,0,0,640,400,P.teal);rect(c,0,0,640,55,P.darkSea);for(let y=73;y<390;y+=35)for(let x=-10;x<650;x+=70){const ox=Math.floor(Math.sin(t*.7+y*.03)*5);rect(c,x+ox+(y%3)*11,y,27,2,P.mint);rect(c,x+ox+38,y+14,13,2,'#6cb1a5');}}
function dock(c,x,y,w,h) {rect(c,x+5,y+5,w,h,P.darkSea);rect(c,x,y,w,h,P.ink);rect(c,x+2,y+2,w-4,h-4,P.wood);for(let yy=y+4;yy<y+h-3;yy+=12){rect(c,x+3,yy,w-6,2,P.sand);rect(c,x+10,yy+5,2,2,P.ink);rect(c,x+w-13,yy+5,2,2,P.ink);}}
function fish(c,x,y,color=P.gold,dir=1) {c.save();c.translate(Math.round(x),Math.round(y));c.scale(dir,1);polygon(c,[[-13,0],[-7,-6],[8,-5],[13,0],[7,6],[-7,6]],P.ink);polygon(c,[[-10,0],[-5,-4],[7,-3],[10,0],[6,4],[-5,4]],color);polygon(c,[[-11,0],[-20,-7],[-20,7]],color);rect(c,6,-2,2,2,P.ink);c.restore();}
function crab(c,x,y) {rect(c,x-9,y-5,18,11,P.clay);rect(c,x-6,y-8,3,4,P.white);rect(c,x+3,y-8,3,4,P.white);line(c,[[x-8,y],[x-15,y-8],[x-17,y-3]],P.clay,3);line(c,[[x+8,y],[x+15,y-8],[x+17,y-3]],P.clay,3);for(const k of [-1,1])for(const off of [-2,3])line(c,[[x+k*6,y+off],[x+k*14,y+off+5]],P.ink,2);}
function crate(c,x,y,size=28,color=P.sand) {rect(c,x-size/2,y-size/2,size,size,P.ink);rect(c,x-size/2+2,y-size/2+2,size-4,size-4,color);line(c,[[x-size/2+5,y-size/2+5],[x+size/2-5,y+size/2-5]],P.wood,3);line(c,[[x+size/2-5,y-size/2+5],[x-size/2+5,y+size/2-5]],P.wood,3);}
function boat(c,x,y,angle=0,color=P.clay) {c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);polygon(c,[[0,-25],[15,-6],[13,21],[0,27],[-13,21],[-15,-6]],P.ink);polygon(c,[[0,-20],[11,-4],[9,18],[0,22],[-9,18],[-11,-4]],color);rect(c,-9,-1,18,4,P.paper);rect(c,-8,12,16,4,P.paper);c.restore();}
function base(options) {
  const level=levelOf(options?.level),random=rng(options?.seed??1);
  const state={level,time:0,ended:false,result:null,score:0};
  const finish=result=>{if(state.ended)return;state.ended=true;state.result={...result};state.score=Number(result.score)||0;options?.finish?.({...result});};
  const say=(a,b='')=>options?.setStatus?.(a,b);
  const sound=id=>options?.sound?.(id);
  const actor=(c,id,x,y,more={})=>options?.actor?.(c,id,x,y,{pose:'idle',dir:'down',scale:1.2,...more});
  const run=(dt,fn)=>{if(state.ended||!Number.isFinite(dt)||dt<=0)return;let left=Math.min(dt,.25);while(left>1e-8&&!state.ended){const step=Math.min(left,1/60);state.time+=step;fn(step);left-=step;}};
  const snapshot=()=>structuredClone(state);
  return {state,level,random,finish,say,sound,actor,run,snapshot};
}

function createVaargeul(options={}) {
  const b=base(options),{state:s,level,random,finish,say,sound,actor,run,snapshot}=b;
  const phase=random()*TAU;
  const centre=z=>320+Math.sin(z*.0048+phase)*72+Math.sin(z*.0102+phase)*20;
  Object.assign(s,{x:centre(0),progress:0,length:1520,speed:55+level*3,helm:0,hull:5,passed:0,required:5+level,gap:58-level*6,wallCooldown:0,flash:0,
    gates:Array.from({length:8},(_,i)=>({id:i,z:170+i*165,x:centre(170+i*165),done:false,passed:false})),
    rocks:Array.from({length:8},(_,i)=>({z:245+i*154,x:centre(245+i*154)+(i%2?1:-1)*(78+random()*18),hit:false}))});
  function action(id){if(s.ended)return;if(id==='left')s.helm=-1;else if(id==='right')s.helm=1;else if(id==='straight')s.helm=0;}
  function damage(){if(s.wallCooldown>0)return;s.hull--;s.wallCooldown=1.1;s.flash=.3;sound('pot');if(s.hull<=0)finish({won:false,score:s.passed*10,title:'De boot vraagt om een pauze.',detail:'Stuur naar de opening tussen de twee boeien. Een rechte lijn is hier zelden de kortste.'});}
  function update(dt,keys=new Set()) {run(dt,d=>{
    s.wallCooldown=Math.max(0,s.wallCooldown-d);s.flash=Math.max(0,s.flash-d);
    const keySteer=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
    const steer=keySteer||(keys.has('ArrowDown')||keys.has('KeyS')?0:s.helm);
    s.x+=steer*145*d+Math.sin(s.time*.9+phase)*(12+level*5)*d;
    s.progress+=s.speed*d;
    const half=136-level*7,mid=centre(s.progress);
    if(Math.abs(s.x-mid)>half-14){damage();s.x=clamp(s.x,mid-half+14,mid+half-14);}
    for(const rock of s.rocks)if(!rock.hit&&Math.abs(rock.z-s.progress)<17&&Math.abs(rock.x-s.x)<28){rock.hit=true;damage();}
    for(const gate of s.gates)if(!gate.done&&s.progress>=gate.z){gate.done=true;gate.passed=Math.abs(s.x-gate.x)<s.gap-10;if(gate.passed){s.passed++;sound('water');}else{damage();}}
    if(s.progress>=s.length&&!s.ended)finish({won:s.passed>=s.required,score:s.passed*15+s.hull*4,title:s.passed>=s.required?'Alle vracht droog!':'Een paar boeien gemist.',detail:s.passed>=s.required?'Myron noemt je kapitein. Argos vindt de titel eetbaar klinken.':`Vaar door minstens ${s.required} openingen. Je mag rustig bijsturen.`});
    say(`${s.passed} / ${s.required} openingen`,`${s.hull} planken heel · ${Math.max(0,Math.ceil((s.length-s.progress)/s.speed))} seconden tot de steiger`);
  });}
  function draw(c){
    sea(c,s.time);const half=136-level*7;
    for(let y=55;y<401;y+=7){const z=s.progress+(306-y)/.58,mid=centre(z);rect(c,0,y,mid-half,8,P.sand);rect(c,mid+half,y,640-(mid+half),8,P.sand);rect(c,mid-half,y,4,8,P.paper);rect(c,mid+half-4,y,4,8,P.paper);}
    for(const rock of s.rocks){const y=306-(rock.z-s.progress)*.58;if(y<65||y>370)continue;polygon(c,[[rock.x-17,y+9],[rock.x-20,y-1],[rock.x-8,y-14],[rock.x+10,y-10],[rock.x+20,y+6]],P.ink);polygon(c,[[rock.x-14,y+4],[rock.x-12,y-4],[rock.x-4,y-11],[rock.x+9,y-7],[rock.x+14,y+3]],'#a4a895');}
    for(const gate of s.gates){const y=306-(gate.z-s.progress)*.58;if(y<60||y>365)continue;for(const sign of [-1,1]){const x=gate.x+sign*s.gap;rect(c,x-7,y-5,14,12,P.ink);rect(c,x-5,y-3,10,8,gate.passed?P.mint:P.gold);line(c,[[x,y-6],[x,y-26]],P.ink,2);polygon(c,[[x,y-27],[x+sign*13,y-22],[x,y-18]],P.clay);}if(!gate.done)line(c,[[gate.x-s.gap+14,y],[gate.x+s.gap-14,y]],'#b4e1c477',2);}
    if(!s.flash||Math.floor(s.time*20)%2===0)boat(c,s.x,306,s.helm*.1);
    actor(c,'hero',s.x,322,{scale:.55,dir:'up'});actor(c,'argos',s.x,296,{scale:.58,dir:'up'});
    panel(c,17,14,606,39);text(c,'DE VAARGEUL',37,34,12,P.ink,'left');meter(c,189,29,238,s.progress/s.length);for(let i=0;i<5;i++)rect(c,462+i*25,25,16,16,i<s.hull?P.clay:'#b6a685');text(c,`${s.passed}/${s.required}`,602,34,12);
    if(s.helm){panel(c,23,349,119,32);text(c,s.helm<0?'← LINKS':'RECHTS →',82,366,11);}
  }
  say('Stuur tussen de boeien.','Met links/rechts geef je roer. Rechtdoor zet het roer terug.');
  return {update,draw,action,keyDown(code){if(code==='KeyS'||code==='ArrowDown')action('straight');},pointerDown(p){if(s.ended||!Number.isFinite(p.x))return;s.helm=p.x<s.x-20?-1:p.x>s.x+20?1:0;},snapshot};
}

function createTouwtrek(options={}) {
  const {state:s,level,finish,say,sound,actor,run,snapshot}=base(options);
  Object.assign(s,{period:1.85-level*.15,window:.19-level*.03,beat:0,tug:0,target:150,tension:15,cooldown:0,pulls:0,good:0,flash:0,message:'Wacht op de gouden knoop.',remaining:38});
  function action(id){
    if(s.ended||s.cooldown>0)return;
    if(id==='rest'){s.tension=Math.max(0,s.tension-33);s.tug-=4;s.cooldown=.32;s.message='Even meegeven…';s.flash=.4;sound('cloth');return;}
    if(id!=='pull')return;
    const timing=Math.abs(s.beat-.73),perfect=timing<s.window*.55,good=timing<s.window;
    s.pulls++;s.cooldown=.48;s.flash=.55;
    if(good){s.good++;s.tug+=perfect?16:11;s.tension+=perfect?24:29;s.message=perfect?'SAMEN!':'Goed getrokken!';sound('wood');}
    else {s.tug-=8;s.tension+=28;s.message='Uit de pas!';sound('pot');}
    if(s.tension>=100)finish({won:false,score:s.good*7,title:'Het touw geeft het op.',detail:'Trek op de gouden knoop. Geef tussendoor mee wanneer het touw rood wordt.'});
    else if(s.tug>=s.target)finish({won:true,score:s.good*10+Math.round(100-s.tension),title:'Samen zijn jullie zwaar genoeg.',detail:'Myron inspecteert Argos. “Vier poten. Dat had ik moeten tellen.”'});
  }
  function update(dt){run(dt,d=>{s.remaining-=d;s.beat=(s.time%s.period)/s.period;s.cooldown=Math.max(0,s.cooldown-d);s.flash=Math.max(0,s.flash-d);s.tension=Math.max(0,s.tension-(7-level*.5)*d);s.tug=Math.max(-55,s.tug-(1.5+level*.3)*d);if(s.remaining<=0||s.tug<=-54)finish({won:false,score:s.good*7,title:'Myron houdt zijn steiger.',detail:'Zoek het ritme: trek op goud en geef mee voordat het touw te strak staat.'});say(s.message,`Touwspanning ${Math.round(s.tension)}% · ${Math.max(0,Math.ceil(s.remaining))} seconden`);});}
  function draw(c){
    sea(c,s.time);dock(c,0,122,640,196);rect(c,0,118,640,5,P.paper);rect(c,0,313,640,6,P.paper);
    const centre=320-s.tug*.78,flex=Math.sin(s.time*3)*2;
    for(let y=166;y<300;y+=35)line(c,[[0,y],[640,y]],'#b7895d',1);
    line(c,[[97,237],[centre,246+flex],[550,237]],P.ink,6);line(c,[[97,236],[centre,245+flex],[550,236]],s.tension>75?P.clay:P.gold,3);
    rect(c,318,136,4,171,'#eee0b0');polygon(c,[[centre-8,236],[centre+8,236],[centre+7,255],[centre,250],[centre-7,256]],P.clay);
    actor(c,'hero',112-s.tug*.15,244,{dir:'right',pose:s.flash?'walk':'idle'});actor(c,'argos',161-s.tug*.15,261,{dir:'right'});actor(c,'myron',526-s.tug*.15,244,{dir:'left'});actor(c,'ione',568-s.tug*.15,266,{dir:'left'});
    panel(c,100,17,440,79);text(c,'TREK OP DE GOUDEN KNOOP',320,35,12);
    rect(c,137,53,366,23,P.ink);rect(c,140,56,360,17,'#bca681');rect(c,140+360*(.73-s.window),56,720*s.window,17,P.gold);rect(c,140+360*(.73-s.window*.55),56,720*s.window*.55,17,P.mint);rect(c,137+s.beat*360,49,6,31,P.paper);
    panel(c,48,335,544,48);text(c,'SPANNING',70,359,11,P.ink,'left');meter(c,160,352,220,s.tension/100,s.tension>75?P.clay:P.teal);text(c,`${Math.round(clamp(s.tug/s.target,0,1)*100)}% OVERWICHT`,488,359,11);
    if(s.flash){panel(c,220,273,200,32,s.message==='Uit de pas!'?'#eab08a':P.paper);text(c,s.message,320,290,13);}
  }
  say('Trek samen op goud.','Geef mee als de spanning oploopt. Snel klikken helpt niet.');
  return {update,draw,action,keyDown(code){if(code==='Space')action('pull');if(code==='KeyS'||code==='ArrowDown')action('rest');},snapshot};
}

function createNetten(options={}) {
  const {state:s,level,random,finish,say,sound,actor,run,snapshot}=base(options);
  const rows=[132,207,282];
  Object.assign(s,{aimX:320,lane:1,remaining:50,required:8+level*3,caught:0,mistakes:0,cooldown:0,net:null,flash:0,message:'Mik vóór een zwemmende vis.',serial:0,spawn:0,swimmers:[]});
  function spawn(initial=false){const lane=Math.floor(random()*3),dir=random()<.5?1:-1;const bad=random()<(level===1?.18:.2+level*.025);s.swimmers.push({id:++s.serial,x:initial?115+random()*410:dir===1?-25:665,y:rows[lane]+(random()-.5)*16,lane,dir,speed:32+level*11+random()*18,bad});}
  for(let i=0;i<8;i++)spawn(true);
  function action(id){
    if(s.ended)return;
    if(id==='upper')s.lane=0;else if(id==='middle')s.lane=1;else if(id==='lower')s.lane=2;else if(id==='left')s.aimX=clamp(s.aimX-35,65,575);else if(id==='right')s.aimX=clamp(s.aimX+35,65,575);
    else if(id==='cast'&&!s.net&&s.cooldown<=0){s.net={x:s.aimX,y:rows[s.lane],age:0};s.cooldown=1.75;s.message='Het net is onderweg…';sound('cloth');}
  }
  function update(dt,keys=new Set()){run(dt,d=>{
    s.remaining-=d;s.cooldown=Math.max(0,s.cooldown-d);s.flash=Math.max(0,s.flash-d);s.spawn-=d;
    s.aimX=clamp(s.aimX+(Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA')))*190*d,65,575);
    if(s.spawn<=0){spawn();s.spawn=.7-level*.06;}
    for(const swimmer of s.swimmers)swimmer.x+=swimmer.dir*swimmer.speed*d;
    s.swimmers=s.swimmers.filter(f=>f.x>-50&&f.x<690);
    if(s.net){s.net.age+=d;if(s.net.age>=.57){const net=s.net,hits=s.swimmers.filter(f=>Math.hypot(f.x-net.x,(f.y-net.y)*1.2)<(f.bad?32:35));
      if(hits.some(f=>f.bad)){s.mistakes++;s.message='Een krab! Die wil terug.';sound('pot');}
      else if(hits.length){s.caught+=hits.length;s.message=hits.length>1?'Een school tegelijk!':'Verse vis, geen haast.';sound('water');}
      else {s.message='Alleen water. Mik iets verder vooruit.';sound('cloth');}
      const ids=new Set(hits.map(f=>f.id));s.swimmers=s.swimmers.filter(f=>!ids.has(f.id));s.net=null;s.flash=.7;
    }}
    if(s.caught>=s.required)finish({won:true,score:s.caught*15+Math.ceil(s.remaining),title:'Nera knikt. Heel even.',detail:'“Je keek eindelijk waar de vis héén ging.” Argos keek vooral naar de mand.'});
    else if(s.mistakes>=4||s.remaining<=0)finish({won:false,score:s.caught*10,title:s.mistakes>=4?'De krabben sluiten het loket.':'Het tij wacht op niemand.',detail:'Tik op het water om te mikken. Het net landt pas een halve seconde later; werp vóór de vis.'});
    say(`${s.caught} / ${s.required} vissen`,`${s.message} · ${Math.max(0,Math.ceil(s.remaining))} s`);
  });}
  function draw(c){
    sea(c,s.time);for(const y of rows){line(c,[[26,y+25],[615,y+25]],'#8ecac077',1);}
    dock(c,0,340,640,60);actor(c,'nera',83,355,{dir:'up'});actor(c,'hero',319,361,{dir:'up'});actor(c,'argos',369,372,{dir:'up'});crate(c,540,364,34);
    for(const swimmer of s.swimmers){if(swimmer.bad)crab(c,swimmer.x,swimmer.y);else fish(c,swimmer.x,swimmer.y,swimmer.lane===1?P.paper:P.gold,swimmer.dir);}
    const y=rows[s.lane];c.strokeStyle=P.paper;c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.ellipse(s.aimX,y,34,27,0,0,TAU);c.stroke();c.setLineDash([]);line(c,[[s.aimX-42,y],[s.aimX-34,y]],P.gold,3);line(c,[[s.aimX+34,y],[s.aimX+42,y]],P.gold,3);
    if(s.net){const t=s.net.age/.57,nx=320+(s.net.x-320)*t,ny=340+(s.net.y-340)*t-Math.sin(t*Math.PI)*85;line(c,[[320,340],[nx,ny]],P.paper,1);c.strokeStyle=P.paper;c.lineWidth=3;c.beginPath();c.ellipse(nx,ny,10+24*t,7+20*t,0,0,TAU);c.stroke();for(const off of [-10,0,10])line(c,[[nx-20*t,ny+off*t],[nx+20*t,ny+off*t]],P.paper,1);}
    panel(c,18,13,604,44);text(c,`VIS ${s.caught}/${s.required}`,41,35,15,P.ink,'left');text(c,`${Math.max(0,Math.ceil(s.remaining))} s`,572,35,15);for(let i=0;i<4;i++){if(i<s.mistakes)crab(c,348+i*28,36);else circle(c,348+i*28,36,4,'#b7a682');}
    if(s.flash){panel(c,155,304,330,30);text(c,s.message,320,320,11);}
  }
  function pointerDown(p){if(s.ended||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;s.aimX=clamp(p.x,65,575);s.lane=rows.reduce((best,y,i)=>Math.abs(p.y-y)<Math.abs(p.y-rows[best])?i:best,0);}
  say('Vang vissen. Laat krabben zwemmen.','Tik op het water om te mikken; werp vóór de vis.');
  return {update,draw,action,pointerDown,keyDown(code){if(s.ended)return;if(code==='Space')action('cast');else if(code==='Digit1')action('upper');else if(code==='Digit2')action('middle');else if(code==='Digit3')action('lower');else if(code==='ArrowUp'||code==='KeyW')s.lane=Math.max(0,s.lane-1);else if(code==='ArrowDown'||code==='KeyS')s.lane=Math.min(2,s.lane+1);},snapshot};
}

const CARGO_BOARDS=[
  {player:[1,2],crates:[[3,2],[3,3]],goals:[[6,2],[6,3]],walls:[[4,1],[4,4]]},
  {player:[1,1],crates:[[4,1],[3,3],[4,4]],goals:[[6,1],[6,3],[6,4]],walls:[[4,2],[5,2],[2,4]]},
  {player:[1,1],crates:[[4,1],[4,2],[4,4],[2,2]],goals:[[6,1],[6,2],[6,4],[2,4]],walls:[[3,3],[4,3],[5,3]]},
];
function createLastdrager(options={}) {
  const {state:s,level,random,finish,say,sound,actor,run,snapshot}=base(options);
  const layout=CARGO_BOARDS[level-1],mirror=random()>.5;
  const pos=p=>({x:mirror?8-p[0]:p[0],y:p[1]});
  const walls=[];for(let x=0;x<9;x++){walls.push({x,y:0},{x,y:6});}for(let y=1;y<6;y++){walls.push({x:0,y},{x:8,y});}walls.push(...layout.walls.map(pos));
  Object.assign(s,{cols:9,rows:7,player:pos(layout.player),crates:layout.crates.map(pos),goals:layout.goals.map(pos),walls,remaining:65,moves:0,undo:[],repeat:0,started:false,message:'Duw de kisten op de gouden meerplaatsen.'});
  const at=(list,x,y)=>list.find(p=>p.x===x&&p.y===y);
  function move(dx,dy){
    if(s.ended)return;const x=s.player.x+dx,y=s.player.y+dy;if(at(s.walls,x,y))return;
    const box=at(s.crates,x,y);if(box&&(at(s.walls,x+dx,y+dy)||at(s.crates,x+dx,y+dy)))return;
    s.undo.push({player:{...s.player},crates:s.crates.map(p=>({...p})),moves:s.moves});if(s.undo.length>90)s.undo.shift();
    s.player={x,y};if(box){box.x+=dx;box.y+=dy;sound('wood');}s.moves++;s.started=true;s.repeat=.17;
    if(s.goals.every(g=>at(s.crates,g.x,g.y)))finish({won:true,score:Math.max(20,150-s.moves)+Math.ceil(s.remaining),title:'Precies genoeg plaats.',detail:'Myron keek naar sterkere armen. Argos keek naar de lege ruimte ertussen.'});
  }
  function action(id){if(s.ended)return;if(id==='left')move(-1,0);else if(id==='right')move(1,0);else if(id==='up')move(0,-1);else if(id==='down')move(0,1);else if(id==='undo'&&s.undo.length){const past=s.undo.pop();s.player=past.player;s.crates=past.crates;s.moves=past.moves;sound('cloth');}}
  function update(dt,keys=new Set()){run(dt,d=>{s.repeat=Math.max(0,s.repeat-d);if(s.started)s.remaining-=d;if(s.repeat<=0){const dir=keys.has('ArrowLeft')||keys.has('KeyA')?'left':keys.has('ArrowRight')||keys.has('KeyD')?'right':keys.has('ArrowUp')||keys.has('KeyW')?'up':keys.has('ArrowDown')||keys.has('KeyS')?'down':null;if(dir)action(dir);}
    if(s.remaining<=0)finish({won:false,score:s.goals.filter(g=>at(s.crates,g.x,g.y)).length*25,title:'De boot vaart zo!',detail:'Kijk eerst achter de kist. Met Terug kun je een onhandige duw ongedaan maken.'});
    say(`${s.goals.filter(g=>at(s.crates,g.x,g.y)).length} / ${s.goals.length} kisten aan boord`,`${s.moves} stappen · ${s.started?Math.max(0,Math.ceil(s.remaining))+' s':'De tijd begint bij je eerste stap.'}`);
  });}
  function draw(c){
    sea(c,s.time);const size=43,ox=126,oy=78;dock(c,38,279,88,74);dock(c,511,124,106,84);dock(c,121,73,398,309);
    for(let y=0;y<7;y++)for(let x=0;x<9;x++){const px=ox+x*size,py=oy+y*size;if(at(s.walls,x,y)){rect(c,px+1,py+1,size-2,size-2,P.ink);rect(c,px+3,py+3,size-6,size-7,(y===0||y===6)?P.wood:'#a69478');line(c,[[px+5,py+9],[px+size-6,py+9]],P.paper,1);}else{rect(c,px+1,py+1,size-2,size-2,'#cda46f');line(c,[[px+2,py+size-6],[px+size-3,py+size-6]],P.wood,1);}}
    for(const goal of s.goals){const x=ox+goal.x*size+size/2,y=oy+goal.y*size+size/2;circle(c,x,y,15,P.gold);circle(c,x,y,11,P.wood);text(c,'◎',x,y+1,22,P.gold);}
    for(const box of s.crates){const x=ox+box.x*size+size/2,y=oy+box.y*size+size/2;crate(c,x,y,29,at(s.goals,box.x,box.y)?P.mint:P.paper);}
    actor(c,'hero',ox+s.player.x*size+size/2,oy+s.player.y*size+size/2+12,{scale:.82});actor(c,'argos',79,325,{dir:'right'});actor(c,'myron',568,170,{dir:'left'});
    panel(c,17,14,606,41);text(c,'LASTDRAGER',39,35,13,P.ink,'left');text(c,`${s.moves} stappen`,318,35,12);text(c,s.started?`${Math.max(0,Math.ceil(s.remaining))} s`:'KIJK EERST',590,35,12,P.ink,'right');
  }
  function keyDown(code){if(s.ended)return;const id={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyZ:'undo'}[code];if(id)action(id);}
  function pointerDown(p){if(s.ended||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;const x=Math.floor((p.x-126)/43),y=Math.floor((p.y-78)/43),dx=x-s.player.x,dy=y-s.player.y;if(Math.abs(dx)+Math.abs(dy)===1)move(dx,dy);}
  say('Duw de kisten op goud.','Je kunt duwen, niet trekken. Terug maakt één stap ongedaan.');
  return {update,draw,action,keyDown,pointerDown,snapshot};
}

function createReddingslijn(options={}) {
  const {state:s,level,random,finish,say,sound,actor,run,snapshot}=base(options);
  const origin={x:78,y:298},gravity=220;
  const phases=Array.from({length:8},()=>random()*TAU),centres=Array.from({length:8},(_,i)=>285+random()*180+(i%2?10:0));
  Object.assign(s,{origin,gravity,angle:43,power:245,remaining:60,shots:9+level*2,required:4+level,rescued:0,flight:null,reel:0,flash:0,message:'Een mand is geen zeevaarder.',target:{x:centres[0],y:298},radius:29-level*3,targetAmplitude:level===1?0:22+level*9,targetRate:.65+level*.13,aimX:0});
  const rad=()=>s.angle*Math.PI/180;
  const landing=()=>origin.x+s.power*s.power*Math.sin(2*rad())/gravity;
  const targetAt=(t,index=s.rescued)=>centres[index]+Math.sin(t*s.targetRate+phases[index])*s.targetAmplitude;
  s.target.x=targetAt(0);s.aimX=landing();
  function fire(){if(s.ended||s.flight||s.reel>0||s.shots<=0)return;s.shots--;s.flight={x:origin.x,y:origin.y,vx:Math.cos(rad())*s.power,vy:-Math.sin(rad())*s.power,age:0,trail:[]};s.message='Daar gaat-ie!';sound('cloth');}
  function action(id){if(s.ended)return;if(id==='throw'){fire();return;}if(s.flight||s.reel>0)return;if(id==='higher')s.angle=clamp(s.angle+5,20,70);else if(id==='lower')s.angle=clamp(s.angle-5,20,70);else if(id==='more')s.power=clamp(s.power+12,155,350);else if(id==='less')s.power=clamp(s.power-12,155,350);s.aimX=landing();}
  function update(dt){run(dt,d=>{
    s.remaining-=d;s.flash=Math.max(0,s.flash-d);s.target.x=targetAt(s.time);
    if(s.reel>0){s.reel-=d;if(s.reel<=0){s.rescued++;if(s.rescued>=s.required){finish({won:true,score:s.rescued*30+s.shots*4,title:'Alles weer aan wal.',detail:'Ione telt haar manden. Argos telt zichzelf alvast mee als redder.'});return;}s.target.x=targetAt(s.time);s.message='Daar drijft nog een mand!';}}
    if(s.flight){const f=s.flight;f.age+=d;f.x+=f.vx*d;f.y+=f.vy*d+gravity*d*d/2;f.vy+=gravity*d;if(Math.floor(f.age*15)!==Math.floor((f.age-d)*15)){f.trail.push({x:f.x,y:f.y});if(f.trail.length>16)f.trail.shift();}
      if(f.age>.1&&f.y>=origin.y){if(Math.abs(f.x-s.target.x)<=s.radius+9){s.reel=1.3;s.message='VAST! Trek maar, Argos!';sound('connect');}else{s.message='Plons. Mik op waar de mand straks is.';sound('water');}s.flight=null;s.flash=.7;}
    }
    if(!s.ended&&(s.remaining<=0||s.shots<=0&&!s.flight&&s.reel<=0))finish({won:false,score:s.rescued*30,title:'De zee houdt nog iets achter.',detail:'Tik op het water om je landingsplek te kiezen. De gestippelde boog laat zien waar je ring terechtkomt.'});
    say(`${s.rescued} / ${s.required} manden gered`,`${s.shots} worpen over · ${s.message}`);
  });}
  function draw(c){
    sea(c,s.time);dock(c,0,71,116,329);rect(c,0,74,113,4,P.paper);actor(c,'ione',49,166,{dir:'right'});actor(c,'hero',70,303,{dir:'right'});actor(c,'argos',38,337,{dir:'right'});for(let i=0;i<s.rescued;i++)crate(c,24+(i%3)*29,213+Math.floor(i/3)*25,17,P.gold);
    const target=s.target,reeling=s.reel>0,reelProgress=reeling?1-s.reel/1.3:0,tx=reeling?target.x+(origin.x-target.x)*reelProgress:target.x,ty=reeling?target.y-20*Math.sin(reelProgress*Math.PI):target.y+Math.sin(s.time*3)*2;
    circle(c,tx,ty+6,26,P.darkSea);crate(c,tx,ty,29,P.gold);line(c,[[tx-14,ty-10],[tx,ty-21],[tx+14,ty-10]],P.ink,2);if(reeling){line(c,[[origin.x,origin.y],[tx,ty]],P.paper,3);circle(c,tx,ty,23,P.paper);circle(c,tx,ty,18,P.gold);crate(c,tx,ty,24,P.gold);}
    if(!s.flight&&!reeling){const vx=Math.cos(rad())*s.power,vy=-Math.sin(rad())*s.power;for(let t=.12;t<-2*vy/gravity;t+=.13){const x=origin.x+vx*t,y=origin.y+vy*t+gravity*t*t/2;if(x>=118&&x<625&&y>64)rect(c,x-2,y-2,4,4,P.paper);}c.strokeStyle=P.paper;c.lineWidth=2;c.beginPath();c.ellipse(s.aimX,origin.y,20,9,0,0,TAU);c.stroke();}
    if(s.flight){const f=s.flight;for(const p of f.trail)rect(c,p.x-1,p.y-1,3,3,P.mint);line(c,[[origin.x,origin.y],[f.x,f.y]],P.paper,1);circle(c,f.x,f.y,12,P.ink);circle(c,f.x,f.y,10,P.paper);circle(c,f.x,f.y,5,P.teal);for(const off of [-7,7])rect(c,f.x+off-2,f.y-3,4,6,P.clay);}
    panel(c,18,14,604,43);text(c,'REDDINGSLIJN',40,36,13,P.ink,'left');text(c,`${s.rescued}/${s.required} manden`,327,36,12);text(c,`${s.shots} worpen`,588,36,12,P.ink,'right');
    panel(c,164,342,407,37);text(c,`BOOG ${s.angle}°`,239,362,12);meter(c,310,355,142,(s.power-155)/195,P.gold);text(c,`${Math.max(0,Math.ceil(s.remaining))} s`,536,362,12);
    if(s.flash){panel(c,160,70,422,30);text(c,s.message,371,86,11);}
  }
  function pointerDown(p){if(s.ended||s.flight||s.reel>0||!Number.isFinite(p.x))return;const x=clamp(p.x,180,575);s.power=clamp(Math.sqrt((x-origin.x)*gravity/Math.sin(2*rad())),155,350);s.aimX=landing();}
  function keyDown(code){if(s.ended)return;const id={ArrowUp:'higher',KeyW:'higher',ArrowDown:'lower',KeyS:'lower',ArrowRight:'more',KeyD:'more',ArrowLeft:'less',KeyA:'less',Space:'throw'}[code];if(id)action(id);}
  say('Haal Iones manden terug.','Tik op een landingsplek en werp. Bij bewegende manden mik je een stukje vooruit.');
  return {update,draw,action,keyDown,pointerDown,snapshot};
}

export const games = [
  {id:'vaargeul',title:'De kromme vaargeul',subtitle:'Rechtdoor is ook maar een mening',instruction:'Stuur door de openingen tussen de gouden boeien. Houd je boot uit de rotsen; vijf planken zijn niet veel.',controls:[{id:'left',label:'Links',key:'ArrowLeft'},{id:'straight',label:'Rechtdoor',key:'KeyS'},{id:'right',label:'Rechts',key:'ArrowRight'}],create:createVaargeul},
  {id:'touwtrek',title:'Een touw, twee waarheden',subtitle:'Vier poten tellen ook mee',instruction:'Trek wanneer de witte streep door de gouden knoop gaat. Geef tussendoor mee om het touw niet te breken.',controls:[{id:'pull',label:'Samen trekken',key:'Space'},{id:'rest',label:'Even meegeven',key:'KeyS'}],create:createTouwtrek},
  {id:'netten',title:'Nera’s netten',subtitle:'De vis heeft andere plannen',instruction:'Tik waar je wilt werpen. Het net landt een halve seconde later: mik vóór een vis. Laat de rode krabben met rust.',controls:[{id:'upper',label:'Ver weg',key:'Digit1'},{id:'middle',label:'Midden',key:'Digit2'},{id:'lower',label:'Dichtbij',key:'Digit3'},{id:'cast',label:'Net werpen',key:'Space'}],create:createNetten},
  {id:'lastdrager',title:'De slimste lastdrager',subtitle:'Je rug heeft ook een mening',instruction:'Duw alle kisten op de gouden meerplaatsen. Een kist kun je niet trekken. Terug maakt je vorige stap ongedaan.',controls:[{id:'up',label:'Omhoog',key:'ArrowUp'},{id:'left',label:'Links',key:'ArrowLeft'},{id:'down',label:'Omlaag',key:'ArrowDown'},{id:'right',label:'Rechts',key:'ArrowRight'},{id:'undo',label:'Terug',key:'KeyZ'}],create:createLastdrager},
  {id:'reddingslijn',title:'De reddingslijn',subtitle:'Niet alles wat drijft wil vertrekken',instruction:'Tik op het water om de landingsplek van je ring te kiezen. Werp de ring rond een mand. De gestippelde boog helpt je mikken.',controls:[{id:'lower',label:'Lagere boog',key:'ArrowDown'},{id:'higher',label:'Hogere boog',key:'ArrowUp'},{id:'less',label:'Zachter',key:'ArrowLeft'},{id:'more',label:'Harder',key:'ArrowRight'},{id:'throw',label:'Werp!',key:'Space'}],create:createReddingslijn},
];
