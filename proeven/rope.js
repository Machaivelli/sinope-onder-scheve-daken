const P={ink:'#263747',paper:'#f1dca9',gold:'#e8b64e',teal:'#4c9b95',foam:'#8ecac0',plum:'#785677',roof:'#c96c52',sand:'#c99b62',light:'#f8e9c5'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const approach=(v,target,amount)=>v+clamp(target-v,-amount,amount);
const pointOnSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/d,0,1):0;return {x:a.x+t*dx,y:a.y+t*dy};};
export const meta={id:'rope',title:'Touwstreken',subtitle:'Twee uiteinden. Eén slecht idee.',description:'Jij en Argos dragen hetzelfde touw. Leg het rond Bions handgreep en trek zijn grote broodplank uit de doorgang. Bion onthoudt aan welke kant jullie trekken.',instruction:'Loop met WASD of sleep Diogenes. Klik om Argos te sturen. Q roept hem terug; E maakt het touw los.'};

export function createConcept(api){
 let clock=0,stage=0,phase='play',phaseTime=0,drag=null,dragOffset={x:0,y:0},lastStatus='',hooked=false,tension=0,resisting=false,saidBrace=false,hookCooldown=0;
 let hero,dog,board,following=false;
 const peg=()=>({x:board.x,y:184});
 const end=a=>({x:a.x,y:a.y-(a===hero?22:12)});
 const tell=(title,detail)=>{const k=title+'|'+detail;if(k!==lastStatus){lastStatus=k;api.setStatus?.(title,detail);}};
 function setup(round){
  stage=round;phase='play';phaseTime=0;hooked=false;tension=0;resisting=false;saidBrace=false;following=false;drag=null;hookCooldown=0;
  hero={x:188,y:278,tx:188,ty:278,dir:'right',walking:false};dog={x:244,y:294,tx:244,ty:294,dir:'right',walking:false};board={x:320,parked:false};
  tell(round?'Hij kent jullie truc':'Het touw kan méér dan vasthouden',round?'Bion zet zich links schrap. Trek zijn plank deze keer aan de andere kant weg.':'Stuur Argos achter de gouden handgreep. Roep hem terug en trek samen opzij.');
 }
 setup(0);
 function walk(a,dt,keys){
  let dx=a.tx-a.x,dy=a.ty-a.y;
  if(a===hero){
   const kx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
   const ky=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
   if(kx||ky){dx=kx*100;dy=ky*100;a.tx=a.x;a.ty=a.y;}
  }
  const d=Math.hypot(dx,dy),speed=a===hero?150:180,step=Math.min(d,speed*dt);
  a.walking=d>1.5;if(!a.walking)return;
  a.dir=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
  const nx=clamp(a.x+dx/d*step,32,608),ny=clamp(a.y+dy/d*step,92,334);
  // Argos fits below the counter. Diogenes must open the central passage.
  const blocked=(x,y)=>a===hero&&y>161&&y<226&&(x<260||x>380||Math.abs(x-board.x)<100);
  if(!blocked(nx,a.y))a.x=nx;
  if(!blocked(a.x,ny))a.y=ny;
 }
 function commandDog(p){following=false;dog.tx=clamp(p.x,32,608);dog.ty=clamp(p.y,92,334);api.sound?.('dog');}
 function recall(){following=true;api.sound?.('dog');if(hooked)tell('Nu trekken jullie samen',stage?'Bion houdt links tegen. Neem het touw mee naar rechts.':'Loop opzij met Diogenes. Argos houdt het andere uiteinde vast.');}
 function action(id){
  if(phase==='won')return;
  if(id==='call')recall();
  if(id==='loosen'&&hooked){hooked=false;tension=0;hookCooldown=.75;api.sound?.('cloth');tell('Los. Probeer gerust iets anders.','Het touw pakt de gouden handgreep wanneer Argos erachter langs loopt.');}
 }
 function keyDown(code){if(code==='KeyQ')action('call');if(code==='KeyE')action('loosen');}
 function pointerDown(p){
  if(phase!=='play'&&phase!=='cross')return;
  // Sprite hit areas extend above the feet, so they work at touch sizes too.
  if(Math.abs(p.x-hero.x)<25&&p.y>hero.y-65&&p.y<hero.y+13){drag='hero';dragOffset={x:hero.x-p.x,y:hero.y-p.y};hero.tx=hero.x;hero.ty=hero.y;return;}
  if(Math.abs(p.x-dog.x)<28&&p.y>dog.y-39&&p.y<dog.y+15){drag='dog';dragOffset={x:dog.x-p.x,y:dog.y-p.y};following=false;return;}
  commandDog(p);
 }
 function pointerMove(p){if(drag==='hero'){hero.tx=clamp(p.x+dragOffset.x,32,608);hero.ty=clamp(p.y+dragOffset.y,92,334);}else if(drag==='dog'){dog.tx=clamp(p.x+dragOffset.x,32,608);dog.ty=clamp(p.y+dragOffset.y,92,334);}}
 function pointerUp(p){if(drag&&!p.cancelled)pointerMove(p);drag=null;}
 function update(delta,keys=new Set()){
  const dt=clamp(Number(delta)||0,0,.05);if(!dt)return;clock+=dt;hookCooldown=Math.max(0,hookCooldown-dt);if(phase==='won')return;
  if(phase==='roundDone'){phaseTime+=dt;if(phaseTime>=2.3)setup(1);return;}
  if(board.parked)board.x=approach(board.x,board.parkX,75*dt);
  if(following){dog.tx=clamp(hero.x+(hero.x<320?28:-28),32,608);dog.ty=clamp(hero.y+13,92,334);}
  walk(hero,dt,keys);walk(dog,dt,new Set());
  const h=end(hero),d=end(dog),p=peg();
  if(!hooked&&hookCooldown===0&&!board.parked&&hero.y>228&&dog.y<173&&length(pointOnSegment(p,h,d),p)<19){
   hooked=true;api.sound?.('wood');tell('Het touw zit om de handgreep!','Roep Argos met Q terug. Loop daarna samen naar één kant.');
  }
  resisting=false;
  if(hooked&&!board.parked){
   const dh=length(h,p),dd=length(d,p),span=dh+dd;
   tension=clamp((span-305)/85,0,1);
   const pull=(h.x-p.x)/Math.max(1,dh)+(d.x-p.x)/Math.max(1,dd);
   const side=Math.sign(pull),aligned=Math.abs(pull)>.58;
   resisting=stage===1&&side<0&&tension>.02&&aligned;
   if(resisting&&!saidBrace){saidBrace=true;api.sound?.('wood');tell('“Links? Niet nóg eens!”','Bion leunt naar links. Loop met Argos om en trek naar rechts.');}
   if(aligned&&tension>.02&&!resisting){
    // In the first setup the bread cart visibly blocks the right-hand bay.
    const min=110,max=stage===0?326:530;
    board.x=clamp(board.x+pull*tension*79*dt,min,max);
   }
   const open=board.x<211||board.x>429;
   if(open){board.parked=true;board.parkX=board.x<320?190:450;hooked=false;tension=0;phase='cross';api.sound?.('connect');tell('De Broodpoort is open!','Loop samen door de opening naar de zon. Q houdt Argos bij je.');}
  }else tension=approach(tension,0,dt*3);
  if(phase==='cross'&&hero.y<145&&dog.y<150&&Math.abs(hero.x-320)<57&&Math.abs(dog.x-320)<65){
   api.sound?.('connect');
   if(stage===0){phase='roundDone';phaseTime=0;tell('“Nog eens. Maar nu let ik op.”','Bion zet de plank terug. Hij heeft jullie eerste streek onthouden.');}
   else{phase='won';tell('Bion staat aan de verkeerde kant.','Twee uiteinden. Eén gedeelde streek.');api.finish?.('De Broodwacht staat te kijken','Bion leunt nog naar links terwijl jullie voorbijlopen. Argos wacht in de zon. De Broodwacht neemt pauze.');}
  }
 }
 function txt(c,text,x,y,size=13,color=P.ink,align='left'){c.font=`bold ${size}px monospace`;c.fillStyle=color;c.textAlign=align;c.fillText(text,Math.round(x),Math.round(y));c.textAlign='left';}
 function line(c,color,width,points){c.strokeStyle=color;c.lineWidth=width;c.beginPath();for(let i=0;i<points.length;i++)c[i?'lineTo':'moveTo'](Math.round(points[i].x),Math.round(points[i].y));c.stroke();}
 function counter(c,x,w){
  c.fillStyle=P.ink;c.fillRect(x,167,w,54);c.fillStyle=P.plum;c.fillRect(x+3,170,w-6,44);c.fillStyle=P.roof;c.fillRect(x,163,w,12);c.fillStyle=P.paper;c.fillRect(x+4,165,w-8,3);
  for(let k=x+13;k<x+w-10;k+=32){c.fillStyle='#a57863';c.fillRect(k,181,24,22);c.fillStyle=P.ink;c.fillRect(k+3,184,18,2);}
 }
 function bread(c,x,y,turn=0){c.save();c.translate(x,y);c.rotate(turn);c.fillStyle=P.ink;c.fillRect(-12,-6,24,13);c.fillStyle=P.gold;c.fillRect(-10,-8,20,13);c.fillStyle=P.light;for(let i=-6;i<=6;i+=6)c.fillRect(i,-6,2,5);c.restore();}
 function draw(c){
  c.fillStyle=P.paper;c.fillRect(0,0,640,360);
  c.fillStyle='#d6b77e';c.fillRect(0,93,640,267);c.fillStyle='#e8cd96';c.fillRect(26,101,588,243);
  for(let i=0;i<35;i++){const x=30+(i*97)%578,y=108+(i*43)%224;c.fillStyle=i%3?'#d7b47b':'#edd8a3';c.fillRect(x,y,14+i%8,3);}
  // A tiny bent-roof bakery rather than a generic duel arena.
  c.fillStyle=P.ink;c.fillRect(22,35,222,112);c.fillStyle=P.roof;c.fillRect(30,48,206,88);c.fillStyle=P.plum;c.fillRect(83,62,98,69);c.fillStyle=P.ink;c.fillRect(94,80,78,51);c.fillStyle=P.gold;c.fillRect(101,116,64,10);
  c.fillStyle=P.ink;c.beginPath();c.moveTo(17,46);c.lineTo(89,14);c.lineTo(190,28);c.lineTo(245,50);c.closePath();c.fill();c.fillStyle=P.roof;c.beginPath();c.moveTo(31,41);c.lineTo(92,22);c.lineTo(188,36);c.lineTo(226,43);c.closePath();c.fill();
  c.fillStyle=P.teal;c.fillRect(385,34,234,112);c.fillStyle=P.foam;c.fillRect(390,40,224,92);for(let i=0;i<6;i++){c.fillStyle=i%2?P.paper:P.plum;c.fillRect(391+i*36,41,34,12);}
  c.fillStyle=P.ink;c.fillRect(285,50,70,107);c.fillStyle='#e8b64e';c.fillRect(293,53,54,100);c.fillStyle=P.light;c.fillRect(301,62,38,83);c.fillStyle=P.gold;c.fillRect(315,33,9,12);
  txt(c,'DE BROODPOORT',320,25,13,P.ink,'center');
  counter(c,26,226);counter(c,389,225);
  if(stage===0){for(let i=0;i<4;i++)bread(c,470+i*29,159-i%2*9,i%2*.15);txt(c,'VOL',548,199,12,P.light,'center');}
  else{txt(c,'Bion houdt links',110,196,12,P.light,'center');for(let i=0;i<3;i++)bread(c,78+i*43,157,-.12);}
  const bx=Math.round(board.x),shake=resisting?Math.round(Math.sin(clock*38)*2):0;
  api.actor?.(c,'bion',bx+(stage? -25:0)+shake,190,{dir:board.parked?'left':'down',pose:'idle',scale:2});
  c.fillStyle='#ae8655';c.fillRect(bx-92,204,187,16);c.fillStyle=P.ink;c.fillRect(bx-96,173,192,37);c.fillStyle=P.sand;c.fillRect(bx-93,176,186,30);c.fillStyle=P.paper;c.fillRect(bx-89,180,178,4);c.fillStyle='#9c7650';c.fillRect(bx-89,198,178,4);
  for(let i=0;i<5;i++)bread(c,bx-65+i*33,172+(i%2)*3,.07*(i%3-1));
  c.fillStyle=P.ink;c.fillRect(bx-11,178,23,18);c.fillStyle=hooked?P.foam:P.gold;c.fillRect(bx-8,180,17,13);c.fillStyle=P.ink;c.fillRect(bx-4,184,9,6);
  if(!hooked&&!board.parked){txt(c,'handgreep',bx,228,11,P.ink,'center');c.fillStyle=P.gold;c.fillRect(bx-2,207,4,7);}
  if(board.parked){c.fillStyle='#e8de9a';c.fillRect(274,149,91,91);txt(c,'SAMEN ERDOOR',320,168,11,P.teal,'center');for(let y=182;y<238;y+=20){c.fillStyle=P.teal;c.beginPath();c.moveTo(316,y+7);c.lineTo(320,y);c.lineTo(324,y+7);c.fill();}}
  // Rope geometry is the same polyline used for contact and pulling.
  const h=end(hero),d=end(dog),p=peg();
  if(hooked){line(c,P.ink,6,[h,p,d]);line(c,resisting?P.roof:tension>.25?P.light:P.gold,3,[h,p,d]);c.fillStyle=P.light;c.fillRect(p.x-5,p.y-3,10,6);}
  else{
   const mid={x:(h.x+d.x)/2,y:(h.y+d.y)/2+Math.min(22,7+length(h,d)*.025)};
   line(c,P.ink,5,[h,mid,d]);line(c,P.gold,2,[h,mid,d]);
  }
  if(resisting){txt(c,'“Niet aan dié kant!”',board.x+10,111,12,P.ink,'center');for(const s of [-1,1]){c.fillStyle=P.roof;c.fillRect(board.x+s*113,184,7,3);}}
  const actors=[['hero',hero],['argos',dog]].sort((a,b)=>a[1].y-b[1].y);
  for(const [id,a] of actors){
   c.fillStyle='#ac9167';c.beginPath();c.ellipse(a.x,a.y+2,id==='hero'?16:22,5,0,0,Math.PI*2);c.fill();
   api.actor?.(c,id,a.x,a.y,{dir:a.dir,pose:a.walking?'walk':'idle',scale:2});
  }
  if(drag){const a=drag==='hero'?hero:dog;line(c,P.teal,1,[{x:a.tx-8,y:a.ty},{x:a.tx+8,y:a.ty}]);line(c,P.teal,1,[{x:a.tx,y:a.ty-6},{x:a.tx,y:a.ty+6}]);}
  else if(!following&&length(dog,{x:dog.tx,y:dog.ty})>14){c.strokeStyle=P.teal;c.lineWidth=2;c.strokeRect(dog.tx-5,dog.ty-3,10,6);}
  txt(c,stage?'II · Bion heeft opgelet':'I · Een touw en een handgreep',22,348,12,P.ink);
  if(phase==='roundDone'){c.fillStyle=P.ink;c.fillRect(117,111,406,64);txt(c,'“Nog eens. Maar nu let ik op.”',320,139,15,P.paper,'center');txt(c,'Bion zet zich aan jullie eerste kant schrap.',320,160,11,P.foam,'center');}
 }
 return {update,draw,pointerDown,pointerMove,pointerUp,keyDown,action,controls:[{id:'call',label:'Argos, hier!',key:'Q'},{id:'loosen',label:'Touw losmaken',key:'E'}],snapshot:()=>({stage,phase,hooked,tension,resisting,following,hero:{...hero},dog:{...dog},board:{...board}})};
}
