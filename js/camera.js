// js/camera.js — Smart camera: zoom timeline, manual points, motion scan, path building

/* ============================================================
   SMART CAMERA
   A virtual camera window travels across the source video.
   Its aspect always matches the destination screen rect, so at
   zoom 1 the longer source dimension is the only one cropped —
   a 16:9 recording inside a phone screen keeps its full height
   and the camera pans horizontally to follow what's moving.
   ============================================================ */
const cam = {
  mode: 'manual',  // 'manual' = the person points at it, 'auto' = detected
  points: [],      // manual camera points: {t, x, y} with x/y as 0..1 of the recording
  samples: null,   // raw motion readings from the scan pass
  path: null,      // smoothed per-frame camera track
  analyzing: false,
  zoom: 55,
  hold: 1.0,       // seconds each point stays at full zoom
  smooth: 60,
  debug: false,
};

function resetCamera(){
  cam.samples = null;
  cam.path = null;
  cam.points = [];
  camBar.style.width = '0%';
  camStatus.textContent = '';
  analyzeBtn.textContent = 'Scan recording';
  renderPoints();
}

// The path is rebuilt from whatever the current mode already has, so the sliders
// stay live without ever forcing another scan.
function refreshPath(){
  if(cam.mode === 'manual' ? cam.points.length : cam.samples){ buildPath(); draw(); }
  drawZoomStrip();
}

/* ---------- zoom timeline ---------- */
// The whole complaint here was invisible: you could not tell whether the camera
// had returned to full screen or was still slightly zoomed. This draws the zoom
// over time, so the flat stretches at the bottom are the moments showing the
// whole screen, and the humps are the zooms.
const zoomStrip = document.getElementById('zoomStrip');
const zsCtx = zoomStrip.getContext('2d');

function drawZoomStrip(){
  const W = zoomStrip.width, H = zoomStrip.height;
  zsCtx.clearRect(0,0,W,H);
  const pad = 6, baseY = H - pad, topY = pad;

  zsCtx.strokeStyle = '#d6d4cd';
  zsCtx.lineWidth = 1;
  zsCtx.beginPath();
  zsCtx.moveTo(0, baseY + 0.5); zsCtx.lineTo(W, baseY + 0.5);
  zsCtx.stroke();

  if(!cam.path || !video.duration){
    zsCtx.fillStyle = '#9a978f';
    zsCtx.font = '11px monospace';
    zsCtx.textAlign = 'center';
    zsCtx.fillText('no camera points yet', W/2, H/2 + 4);
    zsCtx.textAlign = 'start';
    return;
  }

  const maxZ = 1 + (cam.zoom/100)*1.8;
  const span = Math.max(0.001, maxZ - 1);
  zsCtx.beginPath();
  zsCtx.moveTo(0, baseY);
  for(let i=0;i<cam.path.n;i++){
    const x = (i/(cam.path.n-1))*W;
    const f = (cam.path.z[i]-1)/span;
    zsCtx.lineTo(x, baseY - f*(baseY-topY));
  }
  zsCtx.lineTo(W, baseY);
  zsCtx.closePath();
  zsCtx.fillStyle = 'rgba(47,111,94,0.18)';
  zsCtx.fill();
  zsCtx.strokeStyle = '#2f6f5e';
  zsCtx.lineWidth = 1.5;
  zsCtx.stroke();

  cam.points.forEach(p=>{
    const x = (p.t/video.duration)*W;
    zsCtx.fillStyle = '#2f6f5e';
    zsCtx.beginPath();
    zsCtx.arc(x, topY, 3, 0, Math.PI*2);
    zsCtx.fill();
  });

  if(state.hasVideo){
    const x = (video.currentTime/video.duration)*W;
    zsCtx.strokeStyle = '#16181d';
    zsCtx.lineWidth = 1;
    zsCtx.beginPath();
    zsCtx.moveTo(x, 0); zsCtx.lineTo(x, H);
    zsCtx.stroke();
  }
}

document.getElementById('camZoom').addEventListener('input', e=>{
  cam.zoom = +e.target.value;
  refreshPath();
});
document.getElementById('camHold').addEventListener('input', e=>{
  cam.hold = +e.target.value / 100;
  refreshPath();
});
document.getElementById('camSmooth').addEventListener('input', e=>{
  cam.smooth = +e.target.value;
  refreshPath();
});
document.getElementById('camDebug').addEventListener('change', e=>{
  cam.debug = e.target.checked;
  draw();
});
analyzeBtn.addEventListener('click', ()=>analyzeMotion());

wireSeg('camModeSeg','cammode', ()=>{
  cam.mode = state.cammode;
  const manual = cam.mode === 'manual';
  document.getElementById('manualCam').style.display = manual ? 'block' : 'none';
  document.getElementById('autoCam').style.display = manual ? 'none' : 'block';
  if(!manual && state.hasVideo && !cam.samples && !cam.analyzing) analyzeMotion();
  else { buildPath(); updateCanvasCursor(); draw(); }
});

/* ---------- manual camera points ---------- */

const pointList = document.getElementById('pointList');
const clearPointsBtn = document.getElementById('clearPointsBtn');

function renderPoints(){
  clearPointsBtn.disabled = cam.points.length === 0;
  if(!cam.points.length){
    pointList.innerHTML = '<p class="empty">No camera points yet. Pause and click the preview to add one.</p>';
    return;
  }
  pointList.innerHTML = '';
  cam.points.forEach((p,i)=>{
    const row = document.createElement('div');
    row.className = 'pt';
    const time = document.createElement('b');
    time.textContent = fmt(p.t);
    const label = document.createElement('span');
    label.textContent = `${Math.round(p.x*100)}% across, ${Math.round(p.y*100)}% down`;
    const del = document.createElement('button');
    del.textContent = '×';
    del.title = 'Remove this point';
    del.setAttribute('aria-label', `Remove camera point at ${fmt(p.t)}`);
    del.onclick = ()=>{
      cam.points.splice(i,1);
      renderPoints();
      buildPath();
      drawZoomStrip();
      draw();
    };
    row.append(time, label, del);
    pointList.appendChild(row);
  });
}

clearPointsBtn.addEventListener('click', ()=>{
  cam.points = [];
  renderPoints();
  buildPath();
  drawZoomStrip();
  draw();
});

// The rect the video is being painted into right now — needed to turn a click on
// the canvas back into a position inside the recording.
function activeRect(){
  if(state.layout === 'layered'){
    const l = state.layerA;
    return layeredFrameRect(l.frame, canvas.width*l.x/100, canvas.height*l.y/100, canvas.width*l.scale/100);
  }
  return getScreenRect();
}

function updateCanvasCursor(){
  const pointing = state.fit === 'smart' && cam.mode === 'manual' && state.hasVideo;
  canvas.classList.toggle('pointing', pointing);
}

canvas.addEventListener('click', e=>{
  if(state.fit !== 'smart' || cam.mode !== 'manual' || !state.hasVideo || !video.videoWidth) return;

  // The canvas is displayed scaled down by CSS, so a click has to be converted
  // into the canvas's own coordinate space before anything else.
  const box = canvas.getBoundingClientRect();
  const px = (e.clientX - box.left) * (canvas.width / box.width);
  const py = (e.clientY - box.top) * (canvas.height / box.height);

  const rect = activeRect();
  const u = (px - rect.x) / rect.w;
  const v = (py - rect.y) / rect.h;
  if(u < 0 || u > 1 || v < 0 || v > 1) return;   // clicked the frame or background

  // Invert the crop the camera is currently showing, so the click lands on the
  // thing under the pointer even when the view is already zoomed in.
  const c = cameraCrop(rect.w, rect.h, video.currentTime);
  const x = (c.sx + u*c.cw) / video.videoWidth;
  const y = (c.sy + v*c.ch) / video.videoHeight;

  const t = video.currentTime;
  const near = cam.points.findIndex(p => Math.abs(p.t - t) < 0.25);
  if(near >= 0) cam.points[near] = {t, x, y};      // clicking again at the same moment moves it
  else cam.points.push({t, x, y});
  cam.points.sort((a,b)=>a.t-b.t);

  renderPoints();
  buildPath();
  drawZoomStrip();
  draw();
});

const ANALYZE_RATE = 8;      // playback speed used during the scan pass
// A cursor is only ~20px wide. Scanning at 64px meant it shrank below one pixel
// and disappeared, leaving page scrolling as the only thing the detector could
// see — and a full-page scroll means "everything moved", which reads as "don't
// zoom". 192 is wide enough for the cursor to survive.
const ANALYZE_W = 192;
const BLOCK = 12;            // diff is pooled into blocks of this many pixels
const DIFF_THRESHOLD = 22;   // downscaling softens edges, so this is generous

async function analyzeMotion(){
  if(!state.hasVideo || cam.analyzing) return;
  cam.analyzing = true;
  cam.path = null;
  analyzeBtn.disabled = true;
  exportBtn.disabled = true;
  analyzeBtn.textContent = 'Scanning…';
  camStatus.textContent = 'Watching for movement…';
  camBar.style.width = '0%';

  const resumeAt = video.currentTime;
  const wasPlaying = !video.paused;
  video.pause();

  const AW = ANALYZE_W;
  const AH = Math.max(4, Math.round(AW * video.videoHeight / video.videoWidth));
  const COLS = Math.ceil(AW/BLOCK), ROWS = Math.ceil(AH/BLOCK);
  const NBLOCKS = COLS*ROWS;
  const ac = document.createElement('canvas');
  ac.width = AW; ac.height = AH;
  const actx = ac.getContext('2d', {willReadFrequently:true});

  const samples = [];
  let prev = null;
  const energy = new Float32Array(NBLOCKS);
  const order = new Int32Array(NBLOCKS);

  // Pools the frame difference into blocks and asks how few blocks it takes to
  // account for most of the movement. A click or a cursor lights up two or three
  // blocks — that's something to zoom into. A page scroll lights up nearly all of
  // them — that's a whole-screen event, so hold still and stay wide.
  function takeSample(t){
    actx.drawImage(video, 0, 0, AW, AH);
    let cur;
    try { cur = actx.getImageData(0,0,AW,AH).data; }
    catch(e){ return; }
    if(prev){
      energy.fill(0);
      let total = 0, moved = 0;
      for(let y=0; y<AH; y++){
        const brow = ((y/BLOCK)|0)*COLS;
        for(let x=0; x<AW; x++){
          const i = (y*AW + x)*4;
          const d = Math.abs(cur[i]-prev[i]) + Math.abs(cur[i+1]-prev[i+1]) + Math.abs(cur[i+2]-prev[i+2]);
          if(d > DIFF_THRESHOLD){
            energy[brow + ((x/BLOCK)|0)] += d;
            total += d;
            moved++;
          }
        }
      }
      if(total > 0 && moved/(AW*AH) > 0.0004){
        for(let i=0;i<NBLOCKS;i++) order[i] = i;
        const arr = Array.from(order).sort((a,b)=>energy[b]-energy[a]);
        let cum = 0, k = 0, sx = 0, sy = 0, sw = 0;
        while(k < arr.length && cum < total*0.65 && energy[arr[k]] > 0){
          const b = arr[k], e = energy[b];
          cum += e;
          sx += ((b%COLS)+0.5)*e;
          sy += (((b/COLS)|0)+0.5)*e;
          sw += e;
          k++;
        }
        samples.push({
          t,
          x: (sx/sw)/COLS,
          y: (sy/sw)/ROWS,
          tight: 1 - k/NBLOCKS,
          global: moved/(AW*AH) > 0.28,
          active: true,
        });
      } else {
        samples.push({t, x:null, y:null, tight:0, global:false, active:false});
      }
    }
    prev = cur;
  }

  await new Promise(resolve=>{
    let finished = false;
    const finish = ()=>{ if(!finished){ finished = true; resolve(); } };

    if(typeof video.requestVideoFrameCallback === 'function'){
      const onFrame = (now, meta)=>{
        if(finished) return;
        takeSample(meta.mediaTime);
        camBar.style.width = Math.min(100, meta.mediaTime/video.duration*100)+'%';
        if(video.ended) finish();
        else video.requestVideoFrameCallback(onFrame);
      };
      video.addEventListener('ended', finish, {once:true});
      video.muted = true;
      video.playbackRate = ANALYZE_RATE;
      video.currentTime = 0;
      video.play().then(()=>video.requestVideoFrameCallback(onFrame)).catch(finish);
    } else {
      // Firefox and older browsers: step through with seeks instead.
      const step = 0.2;
      let t = 0;
      const onSeeked = ()=>{
        if(finished) return;
        takeSample(video.currentTime);
        camBar.style.width = Math.min(100, t/video.duration*100)+'%';
        t += step;
        if(t >= video.duration - 0.05){
          video.removeEventListener('seeked', onSeeked);
          finish();
        } else {
          video.currentTime = t;
        }
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = 0;
    }
  });

  video.pause();
  video.playbackRate = 1;
  video.muted = true;
  video.currentTime = resumeAt;
  playBtn.textContent = '▶';

  cam.samples = samples;
  cam.analyzing = false;
  analyzeBtn.disabled = false;
  exportBtn.disabled = false;
  camBar.style.width = '100%';

  const local = samples.filter(s=>s.active && !s.global).length;
  const scroll = samples.filter(s=>s.global).length;
  if(samples.length < 4){
    camStatus.textContent = 'Scan found too few frames. The camera will stay centred.';
    cam.samples = null;
  } else if(local < 6){
    camStatus.textContent = 'Only whole-screen changes here (scrolling, transitions), so the camera stays wide. It zooms on cursor movement and clicks.';
  } else {
    analyzeBtn.textContent = 'Scan again';
    camStatus.textContent = `${local} moments to zoom into, ${scroll} scrolls to stay wide for. Drag zoom and smoothness freely — no rescan needed.`;
  }

  buildPath();
  draw();
  if(wasPlaying) video.play();
}

// Blurs a 1-D signal with a Gaussian kernel. Because the whole path is known in
// advance, smoothing looks both backwards and forwards — which is what makes the
// camera start drifting toward the action just before it happens, instead of
// lurching after it.
function gaussianSmooth(arr, sigma){
  if(sigma < 0.5) return;
  const r = Math.ceil(sigma*2.5);
  const k = new Float32Array(r*2+1);
  let sum = 0;
  for(let i=-r;i<=r;i++){ const v = Math.exp(-(i*i)/(2*sigma*sigma)); k[i+r]=v; sum+=v; }
  for(let i=0;i<k.length;i++) k[i] /= sum;
  const src = Float32Array.from(arr);
  const n = arr.length;
  for(let i=0;i<n;i++){
    let acc = 0;
    for(let j=-r;j<=r;j++){
      acc += src[Math.min(n-1, Math.max(0, i+j))] * k[j+r];
    }
    arr[i] = acc;
  }
}

// Stretches each zoom-in outward in time. Without this the camera darts in and
// out on every brief flurry of activity; holding the peak across a window turns
// a cluster of small moments into one deliberate move.
function dilate(arr, radius){
  const src = Float32Array.from(arr);
  const n = arr.length;
  for(let i=0;i<n;i++){
    let m = -Infinity;
    const lo = Math.max(0,i-radius), hi = Math.min(n-1,i+radius);
    for(let j=lo;j<=hi;j++) if(src[j]>m) m=src[j];
    arr[i] = m;
  }
}

const RAMP_MIN = 0.30, RAMP_MAX = 1.10;
function rampSeconds(){ return RAMP_MIN + (cam.smooth/100)*(RAMP_MAX-RAMP_MIN); }
function holdSeconds(){ return cam.hold; }

// Each point is its own zoom segment — in, hold, out — exactly like a click in
// Screen Studio. The envelope is the strongest segment at that instant, so
// wherever no segment is running the value is 0 and the camera shows the whole
// screen. The earlier version measured distance to the nearest point instead,
// which made one continuous 4.7-second-wide blob per point: any two points
// closer than that never dropped back to full screen and the camera simply
// panned between them while still zoomed, which reads as the picture scrolling.
function zoomEnvelopeAt(t){
  const half = holdSeconds()/2, ramp = rampSeconds();
  let best = 0;
  for(const p of cam.points){
    const d = Math.abs(p.t - t);
    if(d >= half + ramp) continue;
    const s = d <= half ? 1 : 1 - (d - half)/ramp;
    const e = s*s*(3 - 2*s);                    // smoothstep
    if(e > best) best = e;
  }
  return best;
}

function buildManualPath(){
  const FPS = 30;
  if(!cam.points.length || !video.duration){ cam.path = null; return; }
  const n = Math.max(2, Math.ceil(video.duration*FPS)+1);
  const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);

  const maxZoom = 1 + (cam.zoom/100) * 1.8;

  let holdX = cam.points[0].x, holdY = cam.points[0].y;
  for(let i=0;i<n;i++){
    const t = i/FPS;
    let best = null, bestDist = Infinity;
    for(const p of cam.points){
      const d = Math.abs(p.t - t);
      if(d < bestDist){ bestDist = d; best = p; }
    }
    if(best){ holdX = best.x; holdY = best.y; }
    px[i] = holdX;
    py[i] = holdY;
    pz[i] = 1 + zoomEnvelopeAt(t) * (maxZoom - 1);
  }

  // Position is smoothed only enough to soften the handover, which lands in the
  // middle of a gap. Smoothing it as widely as before pushed the move into the
  // zoomed-in stretches, where it is visible as a pan.
  gaussianSmooth(px, rampSeconds()*0.45*FPS);
  gaussianSmooth(py, rampSeconds()*0.45*FPS);
  cam.path = {fps:FPS, n, x:px, y:py, z:pz};
}

function buildPath(){
  if(cam.mode === 'manual') return buildManualPath();
  if(!cam.samples || !cam.samples.length || !video.duration){ cam.path = null; return; }
  const FPS = 30;
  const n = Math.max(2, Math.ceil(video.duration*FPS)+1);
  const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);

  const maxZoom  = 1 + (cam.zoom/100) * 1.8;
  const IDLE_HOLD = 2.5;    // stay on the spot through a pause before pulling back
  const DEADZONE  = 0.035;

  const s = cam.samples;
  let si = 0;
  let holdX = 0.5, holdY = 0.5, holdZ = 1, lastActiveT = -999;

  for(let i=0;i<n;i++){
    const t = i/FPS;
    while(si < s.length-1 && s[si+1].t <= t) si++;
    const smp = s[si];

    if(smp && smp.active && !smp.global){
      // Localised activity — a cursor, a click, a menu opening. Go to it.
      if(Math.abs(smp.x-holdX) > DEADZONE || Math.abs(smp.y-holdY) > DEADZONE){
        holdX = smp.x; holdY = smp.y;
      }
      const f = Math.max(0, Math.min(1, (smp.tight - 0.72)/0.24));
      holdZ = 1 + f*(maxZoom-1);
      lastActiveT = t;
    } else if(smp && smp.global){
      // Whole screen changed — a scroll or a page transition. Stay put, go wide.
      holdZ = 1;
      lastActiveT = t;
    } else if(t - lastActiveT > IDLE_HOLD){
      holdZ = 1;
    }

    px[i] = holdX; py[i] = holdY; pz[i] = holdZ;
  }

  dilate(pz, Math.round(FPS*0.45));

  const sigma = (0.18 + (cam.smooth/100)*1.1) * FPS;
  gaussianSmooth(px, sigma);
  gaussianSmooth(py, sigma);
  gaussianSmooth(pz, sigma*1.25);
  settleZoom(pz, maxZoom);
  cam.path = {fps:FPS, n, x:px, y:py, z:pz};
}

// Smoothing leaves a low tail behind every zoom peak, so the quiet stretches come
// out at ~1.09x instead of 1.0 and the screen is never shown whole. Anything
// within the deadzone is pulled down to exactly 1.0 and the rest is rescaled, so
// the peaks still reach full zoom and nothing steps at the boundary.
function settleZoom(pz, maxZoom){
  const DEAD = 0.12;
  const span = Math.max(1e-6, (maxZoom - 1) - DEAD);
  for(let i=0;i<pz.length;i++){
    pz[i] = 1 + Math.max(0, (pz[i] - 1) - DEAD) * (maxZoom - 1) / span;
  }
}

function camAt(t){
  const p = cam.path;
  if(!p) return {x:0.5, y:0.5, z:1};
  const f = Math.min(p.n-1, Math.max(0, t*p.fps));
  const i = Math.floor(f), j = Math.min(p.n-1, i+1), a = f-i;
  return {
    x: p.x[i]*(1-a) + p.x[j]*a,
    y: p.y[i]*(1-a) + p.y[j]*a,
    z: p.z[i]*(1-a) + p.z[j]*a,
  };
}
