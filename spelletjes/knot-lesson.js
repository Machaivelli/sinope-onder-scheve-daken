const anchors={hero:{x:138,y:282},dog:{x:476,y:248},tied:{x:306,y:147}};
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const distance=(one,other)=>Math.hypot(one.x-other.x,one.y-other.y);

export function createKnotLesson(){return {hero:{x:219,y:282,dir:'left'},dog:{x:269,y:296,dir:'right'},heroTied:false,dogTied:false,sent:false,goal:null,drag:false,time:0};}
export function pointLesson(lesson,point,drag=false){
  if(!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return;
  if(!drag&&Math.hypot(point.x-anchors.dog.x,point.y-(anchors.dog.y-22))<51){lesson.sent=true;return;}
  lesson.goal={x:clamp(point.x,48,590),y:clamp(point.y,130,358)};
  if(Math.hypot(point.x-anchors.hero.x,point.y-(anchors.hero.y-25))<50)lesson.goal={...anchors.hero};
}
function travel(actor,target,dt,speed){
  const length=distance(actor,target),amount=Math.min(length,dt*speed);actor.walk=amount>.01;if(!actor.walk)return;
  const dx=target.x-actor.x,dy=target.y-actor.y;actor.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');actor.x+=amount*dx/length;actor.y+=amount*dy/length;
}
export function stepKnotLesson(lesson,delta,keys=new Set()){
  const dt=Number.isFinite(delta)?clamp(delta,0,.1):0;if(!dt)return [];lesson.time+=dt;const events=[];
  const dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const dy=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  if(dx||dy)lesson.goal=null;
  const hero=lesson.hero,target=dx||dy?{x:clamp(hero.x+dx*60,48,590),y:clamp(hero.y+dy*60,130,358)}:lesson.goal||hero;
  travel(hero,target,dt,133);travel(lesson.dog,lesson.sent?anchors.dog:lesson.dog,dt,156);
  if(!lesson.heroTied&&distance(hero,anchors.hero)<23){lesson.heroTied=true;events.push('wood');}
  if(!lesson.dogTied&&distance(lesson.dog,anchors.dog)<20){lesson.dogTied=true;events.push('dog');}
  if(events.length&&lesson.heroTied&&lesson.dogTied)events.push('connect');return events;
}

export function drawKnotScores(ctx,state,env,x,y,width,limit,duration){
  const height=28,half=Math.floor((width-6)/2);ctx.save();ctx.translate(x,y);ctx.imageSmoothingEnabled=false;
  for(const [index,team] of state.teams.entries()){
    const left=index*(half+6),leading=state.phase==='finished'&&state.result?.winner===team.id;
    ctx.fillStyle=leading?'#e3b778':'#665c52';ctx.fillRect(left,-1,half,height+2);ctx.fillStyle='#2c444c';ctx.fillRect(left+1,1,half-2,height-2);
    env.sign?.(ctx,index?'loaf':'hero',left+3,2,26);
    for(let idx=0;idx<limit;idx++){
      const xx=Math.round(left+34+idx*(half-44)/(limit-1)),filled=idx<team.score;
      ctx.beginPath();ctx.arc(xx,14,5,0,Math.PI*2);ctx.fillStyle=filled?'#e8b573':'#796b5b';ctx.fill();ctx.beginPath();ctx.arc(xx-1,13,3,0,Math.PI*2);ctx.fillStyle=filled?'#f5d599':'#394c50';ctx.fill();
    }
  }
  if(state.phase==='playing'){
    const full=74,left=Math.floor((width-full-18)/2);ctx.fillStyle='#2c444c';ctx.fillRect(left,29,full+18,12);env.sign?.(ctx,'waterclock',left+2,29,13);ctx.fillStyle='#786858';ctx.fillRect(left+16,32,full,5);ctx.fillStyle='#a9d1bf';ctx.fillRect(left+16,32,Math.ceil(full*clamp(state.remaining/duration,0,1)),5);
  }
  ctx.restore();
}

export function drawKnotLesson(ctx,lesson,env){
  const fill=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  const poly=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],idx)=>idx?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
  const path=(points,color,width,dash=[])=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();points.forEach(([x,y],idx)=>idx?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);};
  const oval=(color,x,y,rx,ry)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  const icon=(id,x,y,size)=>env.sign?.(ctx,id,x,y,size);
  const done=lesson.heroTied&&lesson.dogTied;
  ctx.save();ctx.imageSmoothingEnabled=false;if(!env.yard?.(ctx))fill('#d0b28a',0,0,640,400);
  env.actor?.(ctx,'bion',104,153,{scale:1.25,dir:'right'});env.actor?.(ctx,'melia',526,137,{scale:1.15,dir:'left'});
  const hero=anchors.hero,dog=anchors.dog,tied=anchors.tied,corner=p=>[p.x,p.y];
  if(done)poly([corner(tied),corner(hero),corner(dog)],'#a6ab8c');
  for(const [end,solid] of [[hero,lesson.heroTied],[dog,lesson.dogTied]])path([corner(tied),corner(end)],solid?'#3b7373':'#957a61',solid?5:2,solid?[]:[5,7]);
  path([corner(hero),corner(dog)],done?'#3b7373':'#ab8e70',done?5:2,done?[]:[4,8]);
  for(const [x,y] of [[280,216],[334,232]])icon('coin',x,y,done?38:29);
  for(const [key,point] of Object.entries(anchors)){
    const fixed=key==='tied'||(key==='hero'?lesson.heroTied:lesson.dogTied);
    oval('#947d68',point.x+4,point.y+3,18,5);fill('#5b4744',point.x-5,point.y-28,10,30);fill('#ba895e',point.x-4,point.y-29,5,26);oval('#e7bd80',point.x,point.y-28,5,3);
    if(fixed){for(const off of [-7,-12])path([[point.x-6,point.y+off],[point.x+5,point.y+off-2]],'#98b5a0',3);}
    if(key!=='tied'){fill('#334a51',point.x-18,point.y-66,38,30);icon(fixed?'tick':key==='dog'?'paw':'hand',point.x-14,point.y-64,30);}
  }
  for(const [id,person] of [['hero',lesson.hero],['argos',lesson.dog]].sort((one,two)=>one[1].y-two[1].y)){
    oval('#a18a6e',person.x,person.y,13,4);env.actor?.(ctx,id,person.x,person.y,{scale:1.4,dir:person.dir,pose:person.walk?'walk':'idle'});
  }
  if(!lesson.heroTied&&distance(lesson.hero,hero)>32)path([[lesson.hero.x-8,lesson.hero.y+5],[hero.x+10,hero.y+4]],'#816958',2,[3,6]);
  if(!lesson.dogTied)path([[lesson.dog.x+9,lesson.dog.y+4],[dog.x-10,dog.y+5]],'#56817c',2,[2,6]);
  if(done){fill('#35555a',278,298,58,39);icon('circle',285,301,41);}ctx.restore();
}
