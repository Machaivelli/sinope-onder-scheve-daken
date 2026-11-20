const turns=[[0,-1],[1,0],[0,1],[-1,0]];

export function drawSpring(ctx,water,env){
  const {cols,rows,tile,ox,oy,flow,leak}=water,side=tile/2;
  ctx.save();ctx.imageSmoothingEnabled=false;
  const rect=(x,y,width,height,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(width),Math.round(height));};
  const pipe=(points,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.beginPath();points.forEach(([xx,yy],idx)=>idx?ctx.lineTo(Math.round(xx),Math.round(yy)):ctx.moveTo(Math.round(xx),Math.round(yy)));ctx.stroke();};
  if(!env.springWall?.(ctx))rect(0,0,640,400,'#849685');
  rect(ox-9,oy-8,cols*tile+18,rows*tile+19,'#645a50');rect(ox-6,oy-5,cols*tile+12,rows*tile+11,'#d7bb92');
  const inletY=oy+(water.start[1]+.5)*tile,outletY=oy+(water.goal[1]+.5)*tile,right=ox+cols*tile;
  for(const [first,last,yy] of [[ox-62,ox,inletY],[right,right+65,outletY]]){rect(first,yy-9,last-first,17,'#5d5551');rect(first,yy-7,last-first,12,'#bd8e63');rect(first,yy-4,last-first,6,first<ox?'#98c6b3':'#8a725b');}
  env.sign?.(ctx,'basin',ox-112,inletY-53,73);env.sign?.(ctx,water.result||water.filling&&water.stream*6.5>=flow.length?'drink':'dry',right+32,outletY-19,70);
  const count=Math.min(flow.length,Math.floor(water.stream*6.5)+1);
  for(let idx=0;idx<water.cells.length;idx++){
    const cell=water.cells[idx],column=idx%cols,row=Math.floor(idx/cols),left=ox+column*tile,top=oy+row*tile,cx=left+side,cy=top+side;
    const ports=cell.ports.map(port=>turns[(port+cell.rotation)%4]);const active=flow.indexOf(idx),broken=water.flowing&&!water.filling&&!water.result&&active>=0&&leak?.x===column&&leak?.y===row;
    rect(left+1,top+1,tile-2,tile-2,'#91785d');rect(left+2,top+2,tile-5,tile-6,(row+column)%2?'#d5be97':'#dcca9f');rect(left+5,top+5,tile-11,2,'#ecd7ae');
    for(let spot=0;spot<4;spot++){const xx=left+8+(idx*11+spot*17)%(tile-19),yy=top+8+(idx*7+spot*13)%(tile-18);rect(xx,yy,3,1,'#bcaa88');}
    const edge=([dx,dy])=>[cx+dx*side,cy+dy*side],path=[edge(ports[0]),[cx,cy],edge(ports[1])];pipe(path,'#805d50',tile*.33);pipe(path,'#c28b67',tile*.25);pipe(path,'#916c59',tile*.115);
    if(active>=0&&active<count&&!broken){pipe(path,'#427d80',tile*.13);pipe(path,'#a8d2bb',tile*.05);}
    for(const [dx,dy] of ports){const xx=cx+dx*(side-6),yy=cy+dy*(side-6);if(dx)rect(xx-1,yy-tile*.15,3,tile*.3,'#e4b986');else rect(xx-tile*.15,yy-1,tile*.3,3,'#e4b986');}
    if(idx===water.selected){ctx.strokeStyle='#395f64';ctx.lineWidth=3;ctx.strokeRect(left+4,top+4,tile-8,tile-8);env.sign?.(ctx,'turn',left+5,top+6,17);}
  }
  if(water.flowing&&!water.filling&&!water.result&&leak&&count>=flow.length){
    const xx=Math.max(ox+10,Math.min(right-12,ox+(leak.x+.5)*tile)),yy=Math.max(oy+10,Math.min(oy+rows*tile-12,oy+(leak.y+.5)*tile));
    for(const [dx,dy] of [[-12,-11],[4,-15],[13,-7]]){rect(xx+dx,yy+dy,4,7,'#3b6e73');rect(xx+dx,yy+dy,2,3,'#d9ead1');}env.sign?.(ctx,'turn',xx+6,yy+6,21);
  }
  ctx.restore();
}
