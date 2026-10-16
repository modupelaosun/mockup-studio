// js/render.js — Camera-path overlay, click prompt, main draw() and render loop

function drawCameraPath(rect){
  if(!cam.path || !state.hasVideo) return;
  const vw=video.videoWidth, vh=video.videoHeight;
  ctx.save();
  ctx.strokeStyle = 'rgba(47,111,94,0.9)';
  ctx.lineWidth = 2;
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(47,111,94,0.9)';
  const bx = 14, by = 14, bw = 150, bh = 150*vh/vw;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.beginPath();
  for(let i=0;i<cam.path.n;i+=2){
    const X = bx + cam.path.x[i]*bw, Y = by + cam.path.y[i]*bh;
    i===0 ? ctx.moveTo(X,Y) : ctx.lineTo(X,Y);
  }
  ctx.strokeStyle = 'rgba(231,240,236,0.55)';
  ctx.stroke();

  // The points the person placed, so it's obvious what the camera is aiming at.
  cam.points.forEach(p=>{
    ctx.fillStyle = 'rgba(231,240,236,0.9)';
    ctx.beginPath();
    ctx.arc(bx + p.x*bw, by + p.y*bh, 3, 0, Math.PI*2);
    ctx.fill();
  });

  const cr = cameraCrop(rect.w, rect.h, video.currentTime);
  ctx.strokeStyle = '#2f6f5e';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + cr.sx/vw*bw, by + cr.sy/vh*bh, cr.cw/vw*bw, cr.ch/vh*bh);
  ctx.fillStyle = '#e7f0ec';
  ctx.fillText(`zoom ${cr.z.toFixed(2)}×`, bx+6, by+bh+16);
  ctx.restore();
}

// Follow action does nothing at all until the person clicks the video, and a
// sentence in the sidebar is not enough — people skip sidebar text and conclude
// the feature is broken. So the instruction goes on the picture itself, where
// they are already looking, and disappears the moment the first point exists.
// Preview only: it must never reach the exported file.
function drawPointPrompt(rect){
  const msg = video.paused
    ? 'Click where the camera should look'
    : 'Pause, then click where the camera should look';

  let size = Math.max(canvas.width*0.011, Math.min(canvas.width*0.019, rect.w*0.038));
  ctx.font = `600 ${size}px -apple-system, "Inter", "Segoe UI", Helvetica, Arial, sans-serif`;
  let tw = ctx.measureText(msg).width;
  const maxW = rect.w*0.86;
  if(tw > maxW){                       // narrow frames, like a phone screen
    size *= maxW/tw;
    ctx.font = `600 ${size}px -apple-system, "Inter", "Segoe UI", Helvetica, Arial, sans-serif`;
    tw = ctx.measureText(msg).width;
  }

  const padX = size*0.85, padY = size*0.6;
  const pw = tw + padX*2, ph = size*1.35 + padY*2;
  const px = rect.x + (rect.w - pw)/2;
  const py = rect.y + (rect.h - ph)/2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = size*0.9;
  ctx.shadowOffsetY = size*0.25;
  ctx.fillStyle = 'rgba(16,24,21,0.88)';
  roundRect(px, py, pw, ph, ph/2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg, rect.x + rect.w/2, py + ph/2);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

function needsPointPrompt(){
  return !isExporting && state.hasVideo && state.fit === 'smart'
      && cam.mode === 'manual' && cam.points.length === 0;
}

function draw(){
  drawBackground();

  if(state.layout === 'layered'){
    drawLayer(state.layerA);
    if(state.layerB.enabled) drawLayer(state.layerB, hasVideoB ? videoB : video);
    if(!isExporting && cam.debug && state.fit==='smart'){
      drawCameraPath(layeredFrameRect(state.layerA.frame, 0, 0, canvas.width*state.layerA.scale/100));
    }
    if(needsPointPrompt()){
      const l = state.layerA;
      drawPointPrompt(layeredFrameRect(l.frame, canvas.width*l.x/100, canvas.height*l.y/100, canvas.width*l.scale/100));
    }
    return;
  }

  const rect = getScreenRect();
  if(rect.kind !== 'none') drawFrameChrome(rect);
  paintScreen(rect);
  if(rect.kind === 'mobile') drawMobileOverlay(rect);
  if(rect.kind === 'laptop') drawLaptopOverlay(rect);

  if(!isExporting && cam.debug && state.fit==='smart') drawCameraPath(rect);
  if(needsPointPrompt()) drawPointPrompt(rect);
}

let rafId=null;
function loop(){
  draw();
  rafId = requestAnimationFrame(loop);
}
function stopLoop(){ if(rafId){ cancelAnimationFrame(rafId); rafId=null; } }
video.addEventListener('play', ()=>{ if(!rafId) loop(); });
video.addEventListener('pause', ()=>{ stopLoop(); draw(); });
video.addEventListener('ended', ()=>{ stopLoop(); draw(); });
