"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $("stage"), ctx = canvas.getContext("2d", { alpha: true });
  const controls = {
    headX: $("headX"), headY: $("headY"), roll: $("roll"), eyeOpen: $("eyeOpen"), mouthOpen: $("mouthOpen"), smile: $("smile"), physics: $("physics")
  };
  const outputs = {
    headX: $("headXOut"), headY: $("headYOut"), roll: $("rollOut"), eyeOpen: $("eyeOut"), mouthOpen: $("mouthOut"), smile: $("smileOut"), physics: $("physicsOut")
  };
  const status = $("status"), camera = $("camera"), cameraStatus = $("cameraStatus"), startCamera = $("startCamera"), stopCamera = $("stopCamera");
  const state = { time: 0, last: performance.now(), hairAngle: 0, hairVelocity: 0, ribbonAngle: 0, ribbonVelocity: 0, stream: null };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const value = key => Number(controls[key].value);

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function outputsUpdate() {
    outputs.headX.textContent = Math.round(value("headX"));
    outputs.headY.textContent = Math.round(value("headY"));
    outputs.roll.textContent = Math.round(value("roll"));
    outputs.eyeOpen.textContent = `${Math.round(value("eyeOpen"))}%`;
    outputs.mouthOpen.textContent = `${Math.round(value("mouthOpen"))}%`;
    outputs.smile.textContent = `${Math.round(value("smile"))}%`;
    outputs.physics.textContent = `${Math.round(value("physics"))}%`;
  }

  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function fillEllipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
  function strokeEllipse(x,y,rx,ry,stroke,width=2){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}

  function drawBody(cx, cy, s) {
    ctx.save(); ctx.translate(cx, cy + 218*s);
    ctx.fillStyle="#17141a"; ctx.beginPath(); ctx.moveTo(-112*s,-62*s); ctx.quadraticCurveTo(-142*s,80*s,-118*s,235*s); ctx.lineTo(118*s,235*s); ctx.quadraticCurveTo(142*s,80*s,112*s,-62*s); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#eee7e9"; ctx.beginPath(); ctx.moveTo(-72*s,-45*s); ctx.lineTo(-54*s,190*s); ctx.lineTo(54*s,190*s); ctx.lineTo(72*s,-45*s); ctx.quadraticCurveTo(0,0,-72*s,-45*s); ctx.fill();
    ctx.fillStyle="#211b24"; roundRect(-86*s,35*s,172*s,30*s,8*s); ctx.fill();
    ctx.fillStyle="#efe7ea"; ctx.beginPath(); ctx.moveTo(-122*s,44*s); ctx.lineTo(-170*s,150*s); ctx.lineTo(-110*s,138*s); ctx.lineTo(-76*s,82*s); ctx.fill(); ctx.beginPath(); ctx.moveTo(122*s,44*s); ctx.lineTo(170*s,150*s); ctx.lineTo(110*s,138*s); ctx.lineTo(76*s,82*s); ctx.fill();
    ctx.restore();
  }

  function drawRibbon(cx, cy, s, angle) {
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
    ctx.fillStyle="#171319"; ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-44*s,-20*s);ctx.lineTo(-35*s,27*s);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(44*s,-20*s);ctx.lineTo(35*s,27*s);ctx.closePath();ctx.fill();fillEllipse(0,0,13*s,12*s,"#ebe2e6");
    ctx.restore();
  }

  function drawBackHair(cx, cy, s, headX, headY, hairAngle) {
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(hairAngle*.5);
    ctx.fillStyle="#211d23"; ctx.beginPath(); ctx.ellipse(headX*0.3*s,8*s+headY*.18*s,112*s,130*s,0,0,Math.PI*2); ctx.fill();
    for(let i=-3;i<=3;i++){const x=i*27*s;ctx.beginPath();ctx.moveTo(x-20*s,55*s);ctx.quadraticCurveTo(x,150*s,x+10*s,174*s);ctx.quadraticCurveTo(x+30*s,133*s,x+28*s,67*s);ctx.fill();}
    ctx.restore();
  }

  function drawSideLocks(cx, cy, s, angle) {
    for (const side of [-1,1]) {
      ctx.save(); ctx.translate(cx+side*86*s,cy+42*s); ctx.rotate(side*angle);
      ctx.fillStyle="#19171c"; ctx.beginPath(); ctx.moveTo(-15*s,-34*s);ctx.quadraticCurveTo(side*30*s,52*s,-2*s,150*s);ctx.quadraticCurveTo(side*-18*s,92*s,-31*s,-16*s);ctx.closePath();ctx.fill();
      ctx.restore();
    }
  }

  function drawHead(cx, cy, s, p) {
    ctx.save(); ctx.translate(cx + p.headX*1.35*s, cy + p.headY*.8*s); ctx.rotate(p.roll*Math.PI/180);
    const squash = 1 - Math.abs(p.headX)/260;
    ctx.scale(squash,1);
    fillEllipse(0,4*s,91*s,107*s,"#f0d8d6");
    ctx.fillStyle="#211d23";ctx.beginPath();ctx.arc(0,-15*s,101*s,Math.PI*.95,Math.PI*2.05);ctx.lineTo(93*s,34*s);ctx.quadraticCurveTo(46*s,-6*s,23*s,26*s);ctx.quadraticCurveTo(-20*s,-2*s,-92*s,35*s);ctx.closePath();ctx.fill();
    for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*24*s-17*s,-91*s);ctx.quadraticCurveTo(i*19*s,-28*s,i*14*s,38*s);ctx.lineTo((i+1)*15*s,15*s);ctx.quadraticCurveTo((i+1)*24*s,-55*s,(i+1)*22*s,-92*s);ctx.fill();}
    drawHeaddress(0,-103*s,s);
    drawFace(0,10*s,s,p);
    ctx.restore();
  }

  function drawHeaddress(x,y,s){ctx.save();ctx.translate(x,y);ctx.fillStyle="#f4eaed";for(let i=-4;i<=4;i++){fillEllipse(i*19*s,0,15*s,22*s,"#f4eaed");}ctx.fillStyle="#161319";roundRect(-69*s,0,138*s,15*s,6*s);ctx.fill();ctx.restore();}

  function drawFace(x,y,s,p){
    const eye = clamp(p.eyeOpen/100,0,1), smile=clamp(p.smile/100,-1,1), mouth=clamp(p.mouthOpen/100,0,1);
    const eyeY=-7*s, eyeRX=25*s, eyeRY=(3+10*eye)*s;
    for(const side of[-1,1]){
      ctx.save();ctx.translate(x+side*36*s+p.headX*.1*s,y+eyeY);
      fillEllipse(0,0,eyeRX,eyeRY,"#f7ecec");
      if(eye>.08){fillEllipse(side*-2*s,2*s,9*s,Math.max(2,8*eye)*s,"#51464d");fillEllipse(side*-2*s,3*s,4*s,Math.max(1,4*eye)*s,"#17151a");fillEllipse(side*-5*s,-2*s,2*s,2*s,"#fff");}
      ctx.strokeStyle="#312a30";ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(-eyeRX,0);ctx.quadraticCurveTo(0,-(12+3*eye)*s,eyeRX,0);ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle="#6a555d";ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(-7*s,24*s);ctx.quadraticCurveTo(0,28*s,7*s,24*s);ctx.stroke();
    const mouthY=48*s, mw=(18+10*Math.abs(smile))*s, mh=(3+17*mouth)*s;
    ctx.beginPath();ctx.ellipse(x,y+mouthY,mw,mh,0,0,Math.PI*2);ctx.fillStyle=mouth>.08?"#6b3943":"#9c5f68";ctx.fill();
    if(smile>.15){ctx.strokeStyle="#9b5c67";ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(x,y+mouthY-2*s,mw,8*s,0,Math.PI);ctx.stroke();}
    if(smile<-.15){ctx.strokeStyle="#80535d";ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(x,y+mouthY+10*s,mw,8*s,Math.PI,Math.PI*2);ctx.stroke();}
    if(p.expression==="shy"){ctx.globalAlpha=.28;fillEllipse(-57*s,31*s,24*s,12*s,"#f37f9f");fillEllipse(57*s,31*s,24*s,12*s,"#f37f9f");ctx.globalAlpha=1;}
    if(p.expression==="angry"){ctx.strokeStyle="#362a30";ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(-62*s,-33*s);ctx.lineTo(-18*s,-25*s);ctx.moveTo(62*s,-33*s);ctx.lineTo(18*s,-25*s);ctx.stroke();}
    if(p.expression==="sad"){ctx.strokeStyle="#58444c";ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(-61*s,-28*s);ctx.lineTo(-21*s,-37*s);ctx.moveTo(61*s,-28*s);ctx.lineTo(21*s,-37*s);ctx.stroke();}
  }

  function draw(now){
    resize(); const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
    const s=Math.min(w/560,h/760),cx=w/2,cy=h/2-80*s;
    const p={headX:value("headX"),headY:value("headY"),roll:value("roll"),eyeOpen:value("eyeOpen"),mouthOpen:value("mouthOpen"),smile:value("smile"),expression:document.body.dataset.expression||"neutral"};
    drawBody(cx,cy,s); drawRibbon(cx,cy+295*s,s,state.ribbonAngle*Math.PI/180); drawBackHair(cx,cy,s,p.headX,p.headY,state.hairAngle*Math.PI/180); drawSideLocks(cx,cy,s,state.hairAngle*Math.PI/150); drawHead(cx,cy,s,p);
  }

  function physics(dt){
    const strength=value("physics")/100, driver=-(value("headX")*.22+value("roll")*.45)*strength;
    const spring=12, damping=Math.pow(.78,dt*60);
    state.hairVelocity+=(driver-state.hairAngle)*spring*dt; state.hairVelocity*=damping; state.hairAngle+=state.hairVelocity*dt*60;
    const rTarget=-driver*.65; state.ribbonVelocity+=(rTarget-state.ribbonAngle)*9*dt; state.ribbonVelocity*=Math.pow(.82,dt*60); state.ribbonAngle+=state.ribbonVelocity*dt*60;
  }

  function tick(now){const dt=Math.min(.05,(now-state.last)/1000);state.last=now;state.time+=dt;physics(dt);draw(now);requestAnimationFrame(tick);}

  const presets={
    neutral:{eyeOpen:100,mouthOpen:0,smile:0},smile:{eyeOpen:92,mouthOpen:12,smile:70},happy:{eyeOpen:65,mouthOpen:28,smile:88},laugh:{eyeOpen:18,mouthOpen:75,smile:100},sad:{eyeOpen:72,mouthOpen:8,smile:-60},angry:{eyeOpen:86,mouthOpen:18,smile:-45},surprised:{eyeOpen:100,mouthOpen:80,smile:0},shy:{eyeOpen:62,mouthOpen:8,smile:45}
  };
  function applyExpression(name){const p=presets[name]||presets.neutral;document.body.dataset.expression=name;for(const [k,v] of Object.entries(p)){controls[k].value=v;}outputsUpdate();status.textContent=`Expression: ${name}`;}
  document.querySelectorAll("[data-expression]").forEach(b=>b.addEventListener("click",()=>applyExpression(b.dataset.expression)));
  Object.values(controls).forEach(c=>c.addEventListener("input",outputsUpdate));
  $("resetModel").addEventListener("click",()=>{controls.headX.value=0;controls.headY.value=0;controls.roll.value=0;controls.physics.value=65;state.hairAngle=state.hairVelocity=state.ribbonAngle=state.ribbonVelocity=0;applyExpression("neutral");status.textContent="Prototype reset";});

  async function startCam(){if(state.stream)return;try{state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});camera.srcObject=state.stream;await camera.play();startCamera.disabled=true;stopCamera.disabled=false;cameraStatus.textContent="Camera active locally. No frames are uploaded.";}catch(e){cameraStatus.textContent=e?.name==="NotAllowedError"?"Camera permission denied.":"Could not start camera.";}}
  function stopCam(){state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;camera.srcObject=null;startCamera.disabled=false;stopCamera.disabled=true;cameraStatus.textContent="Camera off.";}
  startCamera.addEventListener("click",startCam);stopCamera.addEventListener("click",stopCam);window.addEventListener("beforeunload",stopCam);window.addEventListener("resize",draw);
  applyExpression("neutral");outputsUpdate();requestAnimationFrame(tick);
})();