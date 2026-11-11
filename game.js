import * as THREE from 'three';

const canvas = document.querySelector('#world');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a7d2c2');
scene.fog = new THREE.FogExp2('#a7d2c2', 0.0037);
const camera = new THREE.PerspectiveCamera(54, innerWidth/innerHeight, .1, 650);
const clock = new THREE.Clock();
const world = new THREE.Group(); scene.add(world);

const hemi = new THREE.HemisphereLight('#e5f4e3','#4f6951',2.05); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0c8',3.3); sun.position.set(-75,110,40); sun.castShadow=true;
sun.shadow.mapSize.set(1536,1536); sun.shadow.camera.left=-115; sun.shadow.camera.right=115; sun.shadow.camera.top=115; sun.shadow.camera.bottom=-115; sun.shadow.bias=-.0002; scene.add(sun);
const fill = new THREE.DirectionalLight('#9dd4db',.65); fill.position.set(65,35,-90); scene.add(fill);

const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness});
const grassMat=mat('#688d58');
const playerMats={coat:mat('#d6a957'), dark:mat('#334947'), skin:mat('#eac29a'), pack:mat('#506859'), trim:mat('#f2dfaa')};
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function heightAt(x,z){
  const r=Math.hypot(x,z);
  const edge=smooth(136,101,r);
  const hills=2.2*Math.sin(x*.038+z*.016)*Math.cos(z*.035-x*.012)+1.2*Math.sin(z*.075+x*.03);
  const mound=8*Math.exp(-((x+44)**2+(z+30)**2)/1500)+5.5*Math.exp(-((x-40)**2+(z-38)**2)/1100)+3.7*Math.exp(-((x-8)**2+(z+72)**2)/900);
  const valley=-1.8*Math.exp(-((x-2)**2+(z-15)**2)/400);
  return -3.2 + edge*(4.4+hills+mound+valley);
}
function groundColor(h,x,z){
  const c=new THREE.Color();
  if(h>7)c.set('#7a8e70');
  else if(h>4)c.set('#7b996c');
  else if(h>1.3)c.set('#76985f');
  else c.set('#71925b');
  const noise=Math.sin(x*.31+z*.2)*Math.cos(z*.29-x*.11)*.035;
  c.offsetHSL(0,0,noise);
  return c;
}
const groundGeo=new THREE.PlaneGeometry(280,280,150,150); groundGeo.rotateX(-Math.PI/2);
const pos=groundGeo.attributes.position; const colors=[];
for(let i=0;i<pos.count;i++){
  const x=pos.getX(i), z=pos.getZ(i), h=heightAt(x,z); pos.setY(i,h);
  const c=groundColor(h,x,z); colors.push(c.r,c.g,c.b);
}
groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); groundGeo.computeVertexNormals();
const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1})); ground.receiveShadow=true; world.add(ground);
const ocean=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:'#4c8990',roughness:.36,metalness:.04})); ocean.rotation.x=-Math.PI/2; ocean.position.y=-3.7; scene.add(ocean);
const beach=new THREE.Mesh(new THREE.RingGeometry(110,139,112),new THREE.MeshStandardMaterial({color:'#c6b47c',roughness:1,side:THREE.DoubleSide})); beach.rotation.x=-Math.PI/2; beach.position.y=-2.85; scene.add(beach);

const treeInstances=[];
function treeAt(x,z,scale=1){
  const y=heightAt(x,z); if(y<-.1)return;
  treeInstances.push({x,z,y,scale,tone:Math.random()});
}
function rockAt(x,z,s=1){const y=heightAt(x,z);const m=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),mat('#777f70'));m.position.set(x,y+s*.42,z);m.scale.set(1,.72,.84);m.rotation.set(rand(0,1),rand(0,5),rand(0,1));m.castShadow=true;m.receiveShadow=true;world.add(m)}
// Organic groves leave room around trails and landmarks.
for(let i=0;i<430;i++){
  const x=rand(-112,112),z=rand(-112,112),r=Math.hypot(x,z);
  if(r>107||heightAt(x,z)<.2)continue;
  const trail=Math.abs(z-(.32*x+12));
  const meadow=Math.hypot(x+5,z+8);
  if(trail<5.4||meadow<17)continue;
  if(Math.random()<.78)treeAt(x,z,rand(.65,1.28));
}
for(let i=0;i<90;i++){
  const a=rand(0,Math.PI*2),r=rand(20,103),x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(heightAt(x,z)>.2 && Math.abs(z-(.32*x+12))>4)rockAt(x,z,rand(.25,.9));
}
// Keep the forest light enough for phones: thousands of tree parts, only three draw calls.
const treeDummy=new THREE.Object3D();
const trunkInstances=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.21,2.1,6),mat('#6a503b'),treeInstances.length);
const crownInstances=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.35,1),new THREE.MeshStandardMaterial({color:'#fff',roughness:1}),treeInstances.length);
const crownTopInstances=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.9,0),new THREE.MeshStandardMaterial({color:'#fff',roughness:1}),treeInstances.length);
for(let i=0;i<treeInstances.length;i++){
 const t=treeInstances[i];treeDummy.position.set(t.x,t.y+1.05*t.scale,t.z);treeDummy.rotation.set(0,0,0);treeDummy.scale.setScalar(t.scale);treeDummy.updateMatrix();trunkInstances.setMatrixAt(i,treeDummy.matrix);
 treeDummy.position.set(t.x,t.y+2.55*t.scale,t.z);treeDummy.scale.set(t.scale*.92,t.scale*1.14,t.scale*.91);treeDummy.updateMatrix();crownInstances.setMatrixAt(i,treeDummy.matrix);
 treeDummy.position.set(t.x+.5*t.scale,t.y+3.15*t.scale,t.z+.18*t.scale);treeDummy.scale.setScalar(t.scale);treeDummy.updateMatrix();crownTopInstances.setMatrixAt(i,treeDummy.matrix);
 const color=new THREE.Color(t.tone>.5?'#52784f':t.tone>.25?'#5c8053':'#68885a');crownInstances.setColorAt(i,color);crownTopInstances.setColorAt(i,color);
}
trunkInstances.castShadow=true;crownInstances.castShadow=true;crownTopInstances.castShadow=true;world.add(trunkInstances,crownInstances,crownTopInstances);

// Soft trail winding across the island.
const trailPoints=[];
for(let i=0;i<=70;i++){const t=i/70,x=-94+t*188,z=.32*x+12+Math.sin(t*Math.PI*2)*4;trailPoints.push(new THREE.Vector3(x,heightAt(x,z)+.1,z));}
const trail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trailPoints),190,2.1,7,false),mat('#b4a779'));trail.position.y=.02;world.add(trail);

function makeCabin(x,z){
  const y=heightAt(x,z);const group=new THREE.Group();group.position.set(x,y,z);
  const base=new THREE.Mesh(new THREE.BoxGeometry(8,4.2,6),mat('#99704e'));base.position.y=2.1;base.castShadow=true;base.receiveShadow=true;group.add(base);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(5.5,3,4),mat('#554d3e'));roof.position.y=5.5;roof.rotation.y=Math.PI/4;roof.scale.z=.82;roof.castShadow=true;group.add(roof);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.3,.12),mat('#4a4034'));door.position.set(0,1.15,3.06);group.add(door);
  for(const xw of [-2.4,2.4]){const win=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.05,.14),mat('#afd0bd'));win.position.set(xw,2.45,3.08);group.add(win)}
  world.add(group);
}
makeCabin(-20,-20);

// Landmark rings and small floral accents.
const landmarkData=[
 {name:'SUNMEADOW',detail:'The open country',x:0,z:0},
 {name:'OLD PINE LOOKOUT',detail:'A quiet view above the trees',x:-48,z:-34},
 {name:'WAYFARER CABIN',detail:'A shelter on the old trail',x:-20,z:-20},
 {name:'MISTY HOLLOW',detail:'Where the valley breathes',x:14,z:18},
 {name:'SILVERGLASS SHORE',detail:'The island edge',x:83,z:16},
 {name:'FERNGLEN',detail:'A green pocket of quiet',x:39,z:55},
 {name:'NORTHWIND RIDGE',detail:'High ground, wide sky',x:-4,z:-81}
];
function markerRing(x,z,color='#eed789'){
 const y=heightAt(x,z);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.3,.09,8,24),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.35,roughness:.36}));ring.position.set(x,y+1.25,z);ring.rotation.x=Math.PI/2;ring.castShadow=true;world.add(ring);
 const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.65,0),new THREE.MeshStandardMaterial({color:'#fff1b1',emissive:'#d6b958',emissiveIntensity:.75,roughness:.22,metalness:.1}));crystal.position.set(x,y+2.25,z);crystal.castShadow=true;world.add(crystal);
 const glow=new THREE.PointLight('#f0d783',1.8,8,2);glow.position.set(x,y+2,z);world.add(glow);
 return {x,z,ring,crystal,glow,collected:false};
}
const waypoints=[[-60,-24],[-42,-51],[-24,-4],[-3,16],[22,32],[44,54],[70,20],[10,-70]];
const collectibles=waypoints.map(([x,z])=>markerRing(x,z));
for(let i=0;i<150;i++){
 const x=rand(-94,94),z=rand(-94,94);if(heightAt(x,z)<.4||Math.hypot(x,z)<15)continue;
 const flower=new THREE.Mesh(new THREE.SphereGeometry(.09,6,6),mat(Math.random()>.5?'#e4d58c':'#d7c4a0'));flower.position.set(x,heightAt(x,z)+.16,z);world.add(flower);
}

// A small hiker, assembled from simple low-poly shapes.
const player=new THREE.Group();
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.47,.86,4,8),playerMats.coat);torso.position.y=1.28;torso.castShadow=true;player.add(torso);
const head=new THREE.Mesh(new THREE.SphereGeometry(.34,12,10),playerMats.skin);head.position.y=2.15;head.castShadow=true;player.add(head);
const hair=new THREE.Mesh(new THREE.SphereGeometry(.35,10,7,0,Math.PI*2,0,Math.PI*.56),playerMats.dark);hair.position.y=2.23;player.add(hair);
const pack=new THREE.Mesh(new THREE.BoxGeometry(.52,.72,.28),playerMats.pack);pack.position.set(0,1.35,-.43);pack.castShadow=true;player.add(pack);
for(const side of [-1,1]){
 const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.53,3,7),playerMats.dark);leg.position.set(side*.23,.49,0);leg.castShadow=true;player.add(leg);
 const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.5,3,7),playerMats.coat);arm.position.set(side*.56,1.35,0);arm.rotation.z=side*-.12;arm.castShadow=true;player.add(arm);
}
const scarf=new THREE.Mesh(new THREE.TorusGeometry(.28,.055,6,12),playerMats.trim);scarf.position.set(0,1.83,0);scarf.rotation.x=Math.PI/2;player.add(scarf);
player.position.set(0,heightAt(0,0),0);scene.add(player);

const state={mode:'explore',playing:false,paused:false,startedAt:0,elapsed:0,shards:0,visited:new Set(),checkpoint:0,jumpV:0,onGround:true,velocity:new THREE.Vector3(),cameraYaw:0,cameraPitch:.21,joyX:0,joyY:0,sprint:false,dragging:false,lastX:0,lastY:0,hideMap:false};
const $=s=>document.querySelector(s);
const overlay=$('#menu-overlay'),pausePanel=$('#pause-panel'),toast=$('#toast');
const modeNames={explore:'FREE ROAM',trail:'TRAIL RUN',photo:'PHOTO WALK'};
const modeDescriptions={explore:['The wild is yours.','Follow the trail. Find your own path.'],trail:['Reach the wayfinders.','Eight markers. One winding trail. Go!'],photo:['Take it all in.','No rush. Just you and the wide open.']};
function notify(text){$('#toast-text').textContent=text;toast.classList.add('show');clearTimeout(notify.timeout);notify.timeout=setTimeout(()=>toast.classList.remove('show'),2350)}
function setMode(mode){state.mode=mode;document.querySelectorAll('.mode-card').forEach(el=>el.classList.toggle('selected',el.dataset.mode===mode));$('#mode-label').textContent=modeNames[mode];$('#quest-title').textContent=modeDescriptions[mode][0];$('#quest-sub').textContent=modeDescriptions[mode][1];$('#mode-banner').textContent=`${modeNames[mode]}  ·  ${mode==='trail'?'MARKERS AHEAD':mode==='photo'?'SLOW DOWN & LOOK':'EXPLORE AT YOUR OWN PACE'}`}
document.querySelectorAll('.mode-card').forEach(el=>el.addEventListener('click',()=>setMode(el.dataset.mode)));

const mapCanvas=$('#minimap'),mapCtx=mapCanvas.getContext('2d');
function drawMap(){
 const c=mapCtx,w=176,h=176;c.clearRect(0,0,w,h);c.save();c.beginPath();c.arc(w/2,h/2,85,0,Math.PI*2);c.clip();
 c.fillStyle='#648656';c.fillRect(0,0,w,h);
 for(let i=0;i<16;i++){const x=((i*43)%162)+7,y=((i*67)%162)+7;c.fillStyle=i%3?'rgba(181,199,139,.15)':'rgba(46,85,67,.18)';c.beginPath();c.ellipse(x,y,10+(i*7%16),7+(i*5%12),i*.4,0,Math.PI*2);c.fill()}
 c.strokeStyle='#c2b27d';c.lineWidth=3;c.beginPath();for(let i=0;i<=60;i++){let t=i/60,x=-94+t*188,z=.32*x+12+Math.sin(t*Math.PI*2)*4;let px=w/2+x*.65,py=h/2+z*.65;i===0?c.moveTo(px,py):c.lineTo(px,py)}c.stroke();
 for(let i=0;i<collectibles.length;i++){const p=collectibles[i];const x=w/2+p.x*.65,y=h/2+p.z*.65;c.fillStyle=p.collected?'#64725c':(state.mode==='trail'&&i===state.checkpoint?'#fff0a2':'#e5d58c');c.beginPath();c.arc(x,y,p.collected?2.2:3.1,0,Math.PI*2);c.fill()}
 for(const l of landmarkData){const x=w/2+l.x*.65,y=h/2+l.z*.65;c.fillStyle='rgba(240,239,211,.62)';c.fillRect(x-1,y-1,2,2)}
 const px=w/2+player.position.x*.65,py=h/2+player.position.z*.65;c.save();c.translate(px,py);c.rotate(-player.rotation.y);c.fillStyle='#fff5cf';c.strokeStyle='#324a3e';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-6);c.lineTo(4,4);c.lineTo(0,2);c.lineTo(-4,4);c.closePath();c.fill();c.stroke();c.restore();c.restore();
}
function startGame(){
 const wasPlaying=state.playing;state.playing=true;state.paused=false;state.elapsed=0;state.startedAt=performance.now();
 if(!wasPlaying){state.shards=0;state.visited.clear();state.checkpoint=0;collectibles.forEach(p=>{p.collected=false;p.ring.visible=true;p.crystal.visible=true;p.glow.visible=true});player.position.set(0,heightAt(0,0),0);state.velocity.set(0,0,0)}
 overlay.classList.add('hidden');pausePanel.classList.remove('visible');$('#pause-button').style.display='block';
 $('#photo-button').classList.toggle('visible',state.mode==='photo');
 $('#quest-title').textContent=modeDescriptions[state.mode][0];$('#quest-sub').textContent=modeDescriptions[state.mode][1];
 $('#bottom-hint').innerHTML=state.mode==='photo'?'<span class="keycap">DRAG</span> LOOK AROUND <span class="hint-divider">·</span> TAKE YOUR TIME':'<span class="keycap">WASD</span> MOVE <span class="hint-divider">·</span> <span class="keycap">SPACE</span> JUMP <span class="hint-divider">·</span> <span class="keycap">SHIFT</span> SPRINT';
 const banner=$('#mode-banner');banner.classList.add('show');setTimeout(()=>banner.classList.remove('show'),2500);
}
function pauseGame(){if(!state.playing)return;state.paused=!state.paused;pausePanel.classList.toggle('visible',state.paused)}
$('#play-button').addEventListener('click',startGame);$('#resume-button').addEventListener('click',()=>{state.paused=false;pausePanel.classList.remove('visible')});$('#pause-button').addEventListener('click',pauseGame);$('#home-button').addEventListener('click',()=>state.playing?pauseGame():overlay.classList.remove('hidden'));$('#menu-button').addEventListener('click',()=>{state.paused=false;state.playing=false;pausePanel.classList.remove('visible');overlay.classList.remove('hidden');$('#pause-button').style.display='none';$('#photo-button').classList.remove('visible')});
$('#map-toggle').addEventListener('click',()=>{state.hideMap=!state.hideMap;$('.hud-right').style.opacity=state.hideMap?'0':'1';$('.hud-right').style.pointerEvents=state.hideMap?'none':'auto'});
$('#photo-button').addEventListener('click',()=>{
 renderer.render(scene,camera);
 try{const a=document.createElement('a');a.download=`wildbound-${Date.now()}.png`;a.href=renderer.domElement.toDataURL('image/png');a.click();notify('A moment saved to your device')}catch(e){notify('Screenshot unavailable in this browser')}
});

const keys=new Set();
window.addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.code==='Escape'||e.code==='KeyP'){if(state.playing)pauseGame()}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>keys.clear());
const joy=$('#joystick'),knob=$('#joy-knob');let joyId=null;
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(joyId);updateJoy(e)});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateJoy(e)});
function updateJoy(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=34,len=Math.hypot(dx,dy),k=len>max?max/len:1;state.joyX=dx*k/max;state.joyY=dy*k/max;knob.style.transform=`translate(${dx*k}px,${dy*k}px)`}
function releaseJoy(){joyId=null;state.joyX=0;state.joyY=0;knob.style.transform='translate(0,0)'}
joy.addEventListener('pointerup',releaseJoy);joy.addEventListener('pointercancel',releaseJoy);joy.addEventListener('lostpointercapture',releaseJoy);
const jumpButton=$('#jump-button'),sprintButton=$('#sprint-button');
jumpButton.addEventListener('pointerdown',e=>{e.preventDefault();keys.add('Space')});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>jumpButton.addEventListener(ev,()=>keys.delete('Space')));
sprintButton.addEventListener('pointerdown',e=>{e.preventDefault();state.sprint=true});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>sprintButton.addEventListener(ev,()=>state.sprint=false));
// Drag anywhere on the world to orbit the follow camera.
canvas.addEventListener('pointerdown',e=>{if(!state.playing||state.paused)return;state.dragging=true;state.lastX=e.clientX;state.lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!state.dragging)return;const dx=e.clientX-state.lastX,dy=e.clientY-state.lastY;state.cameraYaw-=dx*.006;state.cameraPitch=clamp(state.cameraPitch-dy*.003,-.05,.65);state.lastX=e.clientX;state.lastY=e.clientY});
canvas.addEventListener('pointerup',()=>state.dragging=false);canvas.addEventListener('pointercancel',()=>state.dragging=false);
canvas.addEventListener('wheel',e=>{if(state.playing){e.preventDefault();camera.fov=clamp(camera.fov+e.deltaY*.025,39,68);camera.updateProjectionMatrix()}},{passive:false});

const cameraTarget=new THREE.Vector3();
function updatePlayer(dt){
 if(!state.playing||state.paused)return;
 let ix=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+state.joyX;
 let iz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+state.joyY;
 const inputLen=Math.hypot(ix,iz);if(inputLen>1){ix/=inputLen;iz/=inputLen}
 const photo=state.mode==='photo';const speed=photo?3.5:(keys.has('ShiftLeft')||keys.has('ShiftRight')||state.sprint?10.4:6.5);
 const sin=Math.sin(state.cameraYaw),cos=Math.cos(state.cameraYaw);
 const dx=ix*cos-iz*sin,dz=ix*sin+iz*cos;
 if(inputLen>.05){state.velocity.x=dx*speed;state.velocity.z=dz*speed;player.rotation.y=Math.atan2(dx,dz)}else{state.velocity.x*=Math.pow(.001,dt);state.velocity.z*=Math.pow(.001,dt)}
 player.position.x+=state.velocity.x*dt;player.position.z+=state.velocity.z*dt;
 const radius=Math.hypot(player.position.x,player.position.z);if(radius>106){const k=106/radius;player.position.x*=k;player.position.z*=k;state.velocity.x*=.2;state.velocity.z*=.2}
 const floor=heightAt(player.position.x,player.position.z);
 if((keys.has('Space')||keys.has('ArrowUp')&&false)&&state.onGround){state.jumpV=7.5;state.onGround=false;keys.delete('Space')}
 state.jumpV-=19*dt;player.position.y+=state.jumpV*dt;
 if(player.position.y<=floor){player.position.y=floor;state.jumpV=0;state.onGround=true}
 const moving=inputLen>.08;const swing=moving?Math.sin(performance.now()*.012*(speed/6.5))*.07:0;
 torso.position.y=1.28+Math.abs(swing)*.2;head.position.y=2.15+Math.abs(swing)*.2;
 for(let i=0;i<player.children.length;i++){if(player.children[i].geometry.type==='CapsuleGeometry'&&i>3){player.children[i].rotation.x=i%2?swing:-swing}}
}
function updateWorld(dt){
 const time=performance.now()*.001;
 for(const p of collectibles){if(!p.collected){p.crystal.rotation.y+=dt*.8;p.crystal.position.y=heightAt(p.x,p.z)+2.25+Math.sin(time*2.2+p.x)*.13;p.ring.rotation.z+=dt*.28}}
 const px=player.position.x,pz=player.position.z;
 let nearest=Infinity;
 for(const loc of landmarkData){const d=Math.hypot(px-loc.x,pz-loc.z);if(d<nearest){nearest=d;if(d<20){$('#location-name').textContent=loc.name;$('#location-detail').textContent=loc.detail}}
  if(d<5&&!state.visited.has(loc.name)){state.visited.add(loc.name);notify(`Discovered · ${loc.name}`)}
 }
 if(nearest>21){$('#location-name').textContent='SUNMEADOW';$('#location-detail').textContent='The open country'}
 for(let i=0;i<collectibles.length;i++){
  const p=collectibles[i];if(p.collected)continue;
  if(state.mode==='trail'&&i!==state.checkpoint)continue;
  if(Math.hypot(px-p.x,pz-p.z)<3.15){p.collected=true;p.ring.visible=false;p.crystal.visible=false;p.glow.visible=false;state.shards++;if(state.mode==='trail')state.checkpoint++;
   const done=state.shards===collectibles.length;notify(done?'All wayfinders found · Beautifully done':state.mode==='trail'?`Marker ${state.checkpoint} of 8 · Keep moving`:'Wayfinder found · Keep wandering');
   if(done){$('#quest-title').textContent=state.mode==='trail'?'Trail complete.':'You found them all.';$('#quest-sub').textContent='The best part was the way there.';}
  }
 }
 $('#shard-count').textContent=String(state.shards).padStart(2,'0');
 const pct=Math.round(state.shards/collectibles.length*100);$('#quest-progress').style.width=`${pct}%`;
 $('#progress-count').textContent=state.mode==='trail'?`${state.checkpoint} / 8 MARKERS`:`${state.shards} / 8 WAYFINDERS`;
 $('#quest-percent').textContent=`${pct}%`;
 const target=new THREE.Vector3(px+Math.sin(state.cameraYaw)*9,player.position.y+4.4+state.cameraPitch*7,pz+Math.cos(state.cameraYaw)*9);
 camera.position.lerp(target,1-Math.pow(.0008,dt));cameraTarget.set(px,player.position.y+1.35,pz);camera.lookAt(cameraTarget);
 drawMap();
}
function updateClock(){
 if(state.playing&&!state.paused)state.elapsed=(performance.now()-state.startedAt)/1000;
 const mins=Math.floor(state.elapsed/60),secs=Math.floor(state.elapsed%60);$('#timer-display').textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
 const cycle=(performance.now()/1000/300)%1,hour=Math.floor((8+cycle*12)%24),minute=Math.floor((cycle*720)%60);
 $('#clock-label').textContent=`${String(hour%12||12).padStart(2,'0')}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`;
}
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.04);updatePlayer(dt);updateWorld(dt);updateClock();renderer.render(scene,camera)}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65))}
window.addEventListener('resize',resize);
setMode('explore');camera.position.set(0,8,12);camera.lookAt(0,1,0);drawMap();frame();
