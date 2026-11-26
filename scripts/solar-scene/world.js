/* Ported from the Solar Horizon prototype (2026-11-25) to three r187. Everything is drawn
   in code; nothing is downloaded. Relies on stage.js for THREE, scene, ground, sRGB, TAU. */
/* ===== procedural world: stone, trees, temple (all drawn in code, nothing downloaded) ===== */
const windU={value:0};
const world={trees:[],flames:[],lamps:[],sprites:[],flag:null,flagBase:null,doorGlow:null,flick:1,lampK:0};
function rng(seed){let s=seed;return()=>(s=(s*16807)%2147483647)/2147483647;}

function stoneTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),r=rng(5);
  x.fillStyle='#E4D2AB';x.fillRect(0,0,256,256);
  for(let i=0;i<1100;i++){const v=r()<.5;x.fillStyle=`rgba(${v?'120,95,60':'255,245,220'},${.04+r()*.08})`;x.fillRect(r()*256,r()*256,2+r()*14,2+r()*8);}
  x.strokeStyle='rgba(90,66,38,.5)';x.lineWidth=2;
  for(let j=0;j<4;j++){const y=j*64;x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke();const off=j%2?64:0;for(let k=0;k<2;k++){const xx=off+k*128;x.beginPath();x.moveTo(xx,y);x.lineTo(xx,y+64);x.stroke();}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function groundTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),r=rng(9);
  x.fillStyle='#EDEDED';x.fillRect(0,0,256,256);
  for(let i=0;i<5000;i++){const g=190+Math.floor(r()*65);x.fillStyle=`rgba(${g},${g},${g},${.25+r()*.4})`;x.fillRect(r()*256,r()*256,1+r()*3,1+r()*3);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(70,70);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function glowTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,214,120,1)');g.addColorStop(.3,'rgba(255,170,70,.45)');g.addColorStop(1,'rgba(255,150,50,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}

const stoneTx=stoneTexture();
const mStone=new THREE.MeshStandardMaterial({map:stoneTx,color:sRGB('#FFFFFF'),roughness:.95});
const mStone2=new THREE.MeshStandardMaterial({map:stoneTx,color:sRGB('#D6C095'),roughness:.95});
const mDark=new THREE.MeshStandardMaterial({color:sRGB('#1E1611'),roughness:1});
const mGold=new THREE.MeshStandardMaterial({color:sRGB('#D9A93A'),metalness:.8,roughness:.35});
const mSaff=new THREE.MeshStandardMaterial({color:sRGB('#E5761B'),roughness:.8,side:THREE.DoubleSide});
const mClay=new THREE.MeshStandardMaterial({color:sRGB('#B5651D'),roughness:.9});
const mBark=new THREE.MeshStandardMaterial({color:sRGB('#5E4630'),roughness:1});

/* a box whose stone texture keeps the same block size whatever the box size */
function blk(w,h,d,x,y,z,mat,parent,cast){
  const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv,sc=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*sc[f][0]/2,uv.getY(i)*sc[f][1]/2);}
  const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=cast!==false;m.receiveShadow=true;parent.add(m);return m;
}
function lathe(pts,seg,mat,flat){
  const m=new THREE.Mesh(new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg),mat);
  if(flat){m.material=mat.clone();m.material.flatShading=true;}m.castShadow=true;m.receiveShadow=true;return m;
}

/* ---------- peepal-style tree: branching trunk, heart-shaped leaves that flutter ---------- */
const leafShape=(()=>{const s=new THREE.Shape();s.moveTo(0,-.35);s.bezierCurveTo(-.3,-.55,-.55,-.1,-.3,.2);s.bezierCurveTo(-.2,.4,-.05,.5,0,.75);
  s.bezierCurveTo(.05,.5,.2,.4,.3,.2);s.bezierCurveTo(.55,-.1,.3,-.55,0,-.35);return s;})();
const leafGeo=new THREE.ShapeGeometry(leafShape,6);
function leafMaterial(){
  const m=new THREE.MeshStandardMaterial({roughness:.75,side:THREE.DoubleSide});
  m.onBeforeCompile=sh=>{sh.uniforms.uT=windU;
    sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph=instanceMatrix[3].x*1.7+instanceMatrix[3].z*1.3+instanceMatrix[3].y;\ntransformed.x+=sin(uT*2.6+ph)*.16;transformed.y+=cos(uT*2.1+ph)*.09;\n#endif');};
  return m;
}
function makeTree(seed){
  const r=rng(seed),g=new THREE.Group(),tips=[],up=new THREE.Vector3(0,1,0);
  function branch(pos,dir,len,rad,depth){
    const end=pos.clone().addScaledVector(dir,len);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(rad*.7,rad,len,7,1),mBark);
    m.position.copy(pos).addScaledVector(dir,len/2);m.quaternion.setFromUnitVectors(up,dir);m.castShadow=true;g.add(m);
    if(depth===0){tips.push(end);return;}
    for(let i=0;i<3;i++){
      const ang=(i/3)*TAU+r()*1.3,tilt=.5+r()*.55,perp=new THREE.Vector3(Math.cos(ang),0,Math.sin(ang));
      perp.addScaledVector(dir,-perp.dot(dir)).normalize();
      branch(end,dir.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(perp,Math.sin(tilt)).normalize(),len*(.7+r()*.12),rad*.58,depth-1);
    }
  }
  const flare=new THREE.Mesh(new THREE.CylinderGeometry(.5,.95,.7,9),mBark);flare.position.y=.3;flare.castShadow=true;g.add(flare);
  branch(new THREE.Vector3(0,.4,0),up,3.2,.42,3);
  const per=60,mesh=new THREE.InstancedMesh(leafGeo,leafMaterial(),tips.length*per),dm=new THREE.Object3D(),col=new THREE.Color();
  let n=0;tips.forEach(t=>{for(let i=0;i<per;i++){
    dm.position.set(t.x+(r()-.5)*3.2,t.y+(r()-.3)*2.4,t.z+(r()-.5)*3.2);
    dm.rotation.set(r()*TAU,r()*TAU,r()*TAU);dm.scale.setScalar(.75+r()*.7);dm.updateMatrix();mesh.setMatrixAt(n,dm.matrix);
    col.set(['#4C7A34','#5E8F3A','#3F6B2E','#6FA042','#557F36'][Math.floor(r()*5)]).convertSRGBToLinear();mesh.setColorAt(n,col);n++;}});
  mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  return g;
}

/* ---------- Nagara-style temple: plinth, porch with pillars, sanctum, curved tower, amalaka, kalasha, flag ---------- */
function buildTemple(){
  const T=new THREE.Group(),SY=1.25,CY=-1.2; // platform top, sanctum centre z
  blk(15,.45,15,0,.225,0,mStone2,T);blk(14,.4,14,0,.65,0,mStone,T);blk(13,.4,13,0,1.05,0,mStone2,T);
  for(let i=0;i<4;i++){const top=1-i*.25;blk(4.4,top,.5,0,top/2,6.75+i*.5,mStone,T);}
  // sanctum
  blk(6.1,.4,6.1,0,SY+.2,CY,mStone2,T);
  blk(5.6,3.6,5.6,0,SY+.4+1.8,CY,mStone,T);
  blk(6.0,.35,6.0,0,SY+.4+3.6+.175,CY,mStone2,T);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>blk(.5,3.6,.5,sx*2.85,SY+.4+1.8,CY+sz*2.85,mStone2,T));
  const ny=SY+.4+1.9;
  [-1,1].forEach(s=>{blk(.12,2.4,1.7,s*2.82,ny,CY,mStone2,T);blk(.08,2.0,1.3,s*2.87,ny,CY,mDark,T);});
  blk(1.7,2.4,.12,0,ny,CY-2.82,mStone2,T);blk(1.3,2.0,.08,0,ny,CY-2.87,mDark,T);
  // curved tower
  const BY=SY+.4+3.6+.35,N=18,LH=.32,W0=5.4;
  for(let i=0;i<N;i++){const t=i/N,w=W0*(1-.74*Math.pow(t,1.2)),y=BY+i*LH+LH/2;
    blk(w,LH,w,0,y,CY,i%2?mStone:mStone2,T);
    blk(w*.42,LH,w+.32,0,y,CY,mStone,T);blk(w+.32,LH,w*.42,0,y,CY,mStone,T);
    if(i%4===3)blk(w+.5,.1,w+.5,0,y+LH/2,CY,mStone2,T);}
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{for(let i=0;i<7;i++){const w=1.4*(1-.78*Math.pow(i/7,1.1));blk(w,LH,w,sx*2.25,BY+i*LH+LH/2,CY+sz*2.25,i%2?mStone:mStone2,T);}});
  const topY=BY+N*LH;
  blk(1.3,.5,1.3,0,topY+.25,CY,mStone2,T);
  const am=lathe([[.001,0],[.95,0],[1.05,.12],[1.05,.3],[.9,.42],[.55,.5],[.001,.5]],20,mStone2,true);am.position.set(0,topY+.5,CY);T.add(am);
  const ka=lathe([[.001,0],[.3,0],[.42,.15],[.42,.4],[.2,.55],[.12,.7],[.001,.8]],18,mGold);ka.position.set(0,topY+1.0,CY);T.add(ka);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.5,8),mGold);pole.position.set(0,topY+2.1,CY);pole.castShadow=true;T.add(pole);
  const fg=new THREE.PlaneGeometry(1.4,.75,14,1);fg.translate(.7,0,0);
  const flag=new THREE.Mesh(fg,mSaff);flag.position.set(.04,topY+2.5,CY);flag.castShadow=true;T.add(flag);
  world.flag=flag;world.flagBase=Float32Array.from(fg.attributes.position.array);
  // porch: pillars, roof slab, stepped roof
  [-2.7,-.9,.9,2.7].forEach(x=>pillar(T,x,5.4,SY));
  [-2.7,2.7].forEach(x=>pillar(T,x,3.4,SY));
  blk(7.6,.4,6.6,0,SY+2.9+.2,3.9,mStone2,T);
  for(let i=0;i<4;i++)blk(6.8-i*1.2,.45,5.8-i*1.05,0,SY+3.3+.225+i*.45,3.9-i*.1,i%2?mStone:mStone2,T);
  // doorway
  blk(2.5,.4,.36,0,SY+2.75,1.9,mStone2,T);[-1,1].forEach(s=>blk(.3,2.6,.36,s*1.1,SY+1.3,1.9,mStone2,T));
  blk(1.9,2.5,.12,0,SY+1.25,1.8,mDark,T);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.4),new THREE.MeshBasicMaterial({color:0x2a1a10,fog:false}));glow.position.set(0,SY+1.2,1.88);T.add(glow);world.doorGlow=glow;
  // lamps (diyas) and their light
  const gt=glowTexture();
  [-4.9,-3.4,-1.9,1.9,3.4,4.9].forEach(x=>{
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.12,.09,.07,10),mClay);base.position.set(x,SY+.04,6.2);base.castShadow=true;T.add(base);
    const fl=new THREE.Mesh(new THREE.ConeGeometry(.055,.22,8),new THREE.MeshBasicMaterial({color:0xffc04d,fog:false}));fl.position.set(x,SY+.19,6.2);T.add(fl);world.flames.push(fl);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));sp.position.set(x,SY+.25,6.2);sp.scale.setScalar(1.1);T.add(sp);world.sprites.push(sp);});
  [[0,SY+1.8,3.0,1.5],[-3.6,SY+1.2,6.6,.9],[3.6,SY+1.2,6.6,.9]].forEach(([x,y,z,k])=>{const l=new THREE.PointLight(0xffa850,0,16,2);l.position.set(x,y,z);T.add(l);world.lamps.push({l,k});});
  return T;
}
function pillar(T,x,z,SY){
  blk(.62,.25,.62,x,SY+.125,z,mStone2,T);
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(.21,.24,2.2,12),mStone);sh.position.set(x,SY+.25+1.1,z);sh.castShadow=true;sh.receiveShadow=true;T.add(sh);
  blk(.52,.18,.52,x,SY+.25+2.2+.09,z,mStone2,T);blk(.9,.2,.9,x,SY+.25+2.2+.28,z,mStone2,T);
}

function buildWorld(){
  ground.material.map=groundTexture();ground.material.map.repeat.set(.25,.25);ground.material.needsUpdate=true;
  const T=buildTemple();T.scale.setScalar(1.45);T.position.set(0,0,-25);scene.add(T);
  buildRiver();
  [[-21,-21,1.05,3],[22,-23,1.15,9],[-9,-41,1.6,5],[11,-38,1.4,17]].forEach(([x,z,k,seed])=>{
    const g=makeTree(seed);g.position.set(x,0,z);g.scale.setScalar(k);scene.add(g);world.trees.push({g,ph:seed});});
}
/* lamps come on as the Sun nears the horizon, at dusk and again before dawn */
function lampUpdate(alt){
  const k=Math.max(0,Math.min(1,(3-alt)/9));world.lampK=k;
  world.flames.forEach(f=>f.visible=k>.03);world.sprites.forEach(s=>{s.visible=k>.03;s.material.opacity=k*.9*world.flick;});
  world.lamps.forEach(o=>o.l.intensity=o.k*1.7*LAMP_SCALE*k*world.flick);
  (world.floats||[]).forEach(o=>{o.fl.visible=k>.03;o.sp.visible=k>.03;o.sp.material.opacity=k*.85*world.flick;});
  if(world.doorGlow)world.doorGlow.material.color.copy(new THREE.Color('#2A1A10').lerp(new THREE.Color('#FFB65A'),k));
}
/* time-driven life: breeze in the trees, flag flutter, flame flicker */
function worldTick(t){
  if(world.water&&world.water.material.uniforms)world.water.material.uniforms['time'].value=t*.6;
  if(world.boat){world.boat.position.y=-.93+Math.sin(t*.9)*.03;world.boat.rotation.z=Math.sin(t*.7)*.015;}
  (world.floats||[]).forEach((o,i)=>{o.f.position.y=-.92+Math.sin(t*1.1+i)*.012;o.fl.scale.y=.9+.25*Math.sin(t*15+i*2);o.f.position.x=((((i*3.7-20+t*(.25+.1*(i%3)))%40)+40)%40)-20;});
  world.trees.forEach(o=>{o.g.rotation.z=Math.sin(t*.8+o.ph)*.012;o.g.rotation.x=Math.cos(t*.6+o.ph)*.009;});
  world.flick=.88+.12*Math.sin(t*13.1)*Math.sin(t*7.3+1);
  world.flames.forEach((f,i)=>{f.scale.y=.9+.25*Math.sin(t*17+i*1.7);f.scale.x=f.scale.z=.95+.1*Math.sin(t*11+i);});
  if(world.flag){const p=world.flag.geometry.attributes.position,b=world.flagBase;
    for(let i=0;i<p.count;i++){const x=b[i*3];p.setZ(i,Math.sin(x*4-t*5)*.17*(x/1.4));p.setY(i,b[i*3+1]+Math.sin(x*3-t*4)*.04*(x/1.4));}p.needsUpdate=true;}
}

/* ===== river, ghat steps, pavilions, boat, floating lamps ===== */
const mWood=new THREE.MeshStandardMaterial({color:sRGB('#7A4E2A'),roughness:.9});
const mLeaf=new THREE.MeshStandardMaterial({color:sRGB('#5B7F34'),roughness:.9});
function riverGroundGeometry(){ // ground with a river cut out of it, plus a notch for the ghat steps (shape y runs to world -z)
  const s=new THREE.Shape();s.absarc(0,0,140,0,TAU,false);
  const h=new THREE.Path();h.moveTo(-120,-4.5);h.lineTo(120,-4.5);h.lineTo(120,8.7);h.lineTo(8,8.7);h.lineTo(8,11.4);h.lineTo(-8,11.4);h.lineTo(-8,8.7);h.lineTo(-120,8.7);h.closePath();
  s.holes.push(h);return new THREE.ShapeGeometry(s,64);
}
function waterNormalTexture(){
  const S=256,c=document.createElement('canvas');c.width=c.height=S;const cx=c.getContext('2d'),img=cx.createImageData(S,S),h=new Float32Array(S*S);
  const f=(u,v)=>Math.sin(u*TAU*3+Math.sin(v*TAU*2)*1.5)*.5+Math.sin((u+v)*TAU*5)*.3+Math.sin(v*TAU*7-u*TAU*2)*.2;
  for(let y=0;y<S;y++)for(let x=0;x<S;x++)h[y*S+x]=f(x/S,y/S);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const nx=(h[y*S+(x+S-1)%S]-h[y*S+(x+1)%S])*3,ny=(h[((y+S-1)%S)*S+x]-h[((y+1)%S)*S+x])*3,l=Math.hypot(nx,ny,1),i=(y*S+x)*4;
    img.data[i]=(nx/l*.5+.5)*255;img.data[i+1]=(ny/l*.5+.5)*255;img.data[i+2]=(1/l*.5+.5)*255;img.data[i+3]=255;}
  cx.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function chhatri(x,z){
  const g=new THREE.Group();blk(3.2,.35,3.2,0,.175,0,mStone2,g);
  [[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]].forEach(([a,b])=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,1.9,10),mStone);p.position.set(a,.35+.95,b);p.castShadow=true;p.receiveShadow=true;g.add(p);});
  blk(3.4,.25,3.4,0,.35+1.9+.125,0,mStone2,g);
  const d=new THREE.Mesh(new THREE.SphereGeometry(1.35,24,12,0,TAU,0,Math.PI/2),mStone);d.scale.y=.8;d.position.y=.35+1.9+.25;d.castShadow=true;g.add(d);
  const k=lathe([[.001,0],[.3,0],[.42,.15],[.42,.4],[.2,.55],[.12,.7],[.001,.8]],14,mGold);k.scale.setScalar(.45);k.position.y=d.position.y+1.08;g.add(k);
  g.position.set(x,0,z);return g;
}
function buildBoat(){
  const g=new THREE.Group(),sh=new THREE.Shape();
  sh.moveTo(-2.2,.55);sh.lineTo(-1.7,0);sh.lineTo(1.7,0);sh.lineTo(2.2,.55);sh.lineTo(1.9,.55);sh.lineTo(1.5,.15);sh.lineTo(-1.5,.15);sh.lineTo(-1.9,.55);sh.closePath();
  const m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.9,bevelEnabled:false}),mWood);m.position.z=-.45;m.castShadow=true;g.add(m);
  blk(.2,.08,.9,.4,.3,0,mWood,g);return g;
}
function buildRiver(){
  const geo=new THREE.PlaneGeometry(240,13.2);let water;
  if(THREE.Water){
    water=new THREE.Water(geo,{textureWidth:512,textureHeight:512,waterNormals:waterNormalTexture(),sunDirection:new THREE.Vector3(0,1,0),sunColor:0xffffff,waterColor:0x3e7384,distortionScale:3.2,size:4,fog:true});
  }else{
    water=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:sRGB('#3E7384'),transparent:true,opacity:.85,roughness:.1,metalness:.2}));world.waterFallback=true;
  }
  water.rotation.x=-Math.PI/2;water.position.set(0,-.95,-2.1);scene.add(water);world.water=water;
  // ghat: forecourt, six steps down to the water, retaining walls, two small pavilions
  blk(30,.06,2.4,0,.03,-12.6,mStone2,scene,false);
  for(let k=0;k<6;k++){const top=-.15*(k+1);blk(16,top+1.2,.45,0,(top-1.2)/2,-11.4+.45*k+.225,k%2?mStone:mStone2,scene,false);}
  [-1,1].forEach(s=>{blk(112,1.2,.4,s*64,-.62,-8.9,mStone2,scene,false);blk(.4,1.2,2.7,s*8.2,-.62,-10.05,mStone2,scene,false);scene.add(chhatri(s*12,-12.6));});
  // boat
  const boat=buildBoat();boat.position.set(7,-.93,-3.6);boat.rotation.y=.12;scene.add(boat);world.boat=boat;
  // floating lamps in leaf bowls
  const r=rng(23),gt=glowTexture();world.floats=[];
  for(let i=0;i<11;i++){const f=new THREE.Group();
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.17,.1,.07,10),mLeaf);bowl.castShadow=true;f.add(bowl);
    const fl=new THREE.Mesh(new THREE.ConeGeometry(.05,.2,8),new THREE.MeshBasicMaterial({color:0xffc04d,fog:false}));fl.position.y=.15;f.add(fl);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));sp.position.y=.2;sp.scale.setScalar(1.0);f.add(sp);
    f.position.set(-20+r()*40,-.92,-8.5+r()*9);scene.add(f);world.floats.push({f,fl,sp});}
}
function riverUpdate(alt,dir){
  const w=world.water;if(!w)return;
  const k=Math.max(0,Math.min(1,(alt+8)/22)),col=new THREE.Color('#06101C').lerp(new THREE.Color('#3E7384'),k);
  if(world.waterFallback){w.material.color.copy(col).convertSRGBToLinear();return;}
  const u=w.material.uniforms;u.sunDirection.value.copy(dir).normalize();u.waterColor.value.copy(col).convertSRGBToLinear();
  u.sunColor.value.setScalar(Math.max(0,Math.min(1,(alt+1)/8)));
}
