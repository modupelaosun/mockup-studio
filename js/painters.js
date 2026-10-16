// js/painters.js — How the video is painted into a screen: FILL, SHOW ALL, follow-action

/* ---------- video painters ---------- */

// Every painter takes the video to draw. It defaults to the main recording, so
// single-frame mode is untouched; layered mode passes the second recording for
// the front device when one has been loaded.
const FILL_MAX_CROP = 1.06;   // Fill may crop at most 6% — it never zooms into the picture

// FILL: the recording fills the screen, but only crops a sliver if the shapes
// differ slightly. If they differ a lot, thin black bars are shown instead of
// zooming in and cutting off buttons and edges.
function drawVideoCover(x,y,w,h,vid=video){
  if(!vid || vid.videoWidth===0) return;
  const vw=vid.videoWidth, vh=vid.videoHeight;
  const fitScale   = Math.min(w/vw, h/vh);
  const coverScale = Math.max(w/vw, h/vh);
  const scale = Math.min(coverScale, fitScale*FILL_MAX_CROP);
  const dw=vw*scale, dh=vh*scale;
  ctx.drawImage(vid, x+(w-dw)/2, y+(h-dh)/2, dw, dh);
}

// SHOW ALL: the whole recording, nothing cropped, drawn once on a plain dark
// screen. The old blurred copy behind it looked like the video was doubled.
function drawVideoContain(x,y,w,h,vid=video){
  if(!vid || vid.videoWidth===0) return;
  const vw=vid.videoWidth, vh=vid.videoHeight;
  const scale = Math.min(w/vw, h/vh);
  const dw=vw*scale, dh=vh*scale;
  ctx.drawImage(vid, x+(w-dw)/2, y+(h-dh)/2, dw, dh);
}

// Which part of the recording the camera is looking at right now. Shared by the
// painter, the debug overlay and the click handler — a click can only be turned
// back into a position in the recording by inverting exactly this crop.
function cameraCrop(w, h, t){
  const vw=video.videoWidth, vh=video.videoHeight;
  const c = camAt(t);
  const destA = w/h;
  let cw, ch;
  if(vw/vh > destA){ ch = vh; cw = ch*destA; }   // wide source, tall target: keep full height
  else { cw = vw; ch = cw/destA; }
  cw = Math.min(vw, cw/c.z);
  ch = Math.min(vh, ch/c.z);
  const sx = Math.max(0, Math.min(vw-cw, c.x*vw - cw/2));
  const sy = Math.max(0, Math.min(vh-ch, c.y*vh - ch/2));
  return {sx, sy, cw, ch, z:c.z};
}

function drawVideoSmart(x,y,w,h){
  if(!state.hasVideo || video.videoWidth===0) return;
  const c = cameraCrop(w, h, video.currentTime);
  ctx.drawImage(video, c.sx, c.sy, c.cw, c.ch, x, y, w, h);
}

function paintVideo(x,y,w,h,vid=video){
  // The camera path is measured against the main recording, so it only applies
  // to that one. A second recording falls back to filling its own screen.
  if(state.fit==='smart' && vid===video) drawVideoSmart(x,y,w,h);
  else if(state.fit==='contain') drawVideoContain(x,y,w,h,vid);
  else drawVideoCover(x,y,w,h,vid);
}

// Blur is by far the most expensive canvas operation, and export records in real
// time, so a slow blur means dropped frames in the finished file. Blurring a
// thumbnail and scaling it up looks identical and costs almost nothing.
const blurSrc = document.createElement('canvas');
const blurOut = document.createElement('canvas');
const blurSrcCtx = blurSrc.getContext('2d');
const blurOutCtx = blurOut.getContext('2d');

function drawBlurFill(x,y,w,h,brightness,vid=video){
  if(!vid || vid.videoWidth===0) return;
  const bw = 96;
  const bh = Math.max(2, Math.round(bw * vid.videoHeight / vid.videoWidth));
  if(blurSrc.width !== bw || blurSrc.height !== bh){
    blurSrc.width = blurOut.width = bw;
    blurSrc.height = blurOut.height = bh;
  }
  blurSrcCtx.drawImage(vid, 0, 0, bw, bh);
  blurOutCtx.filter = `blur(5px) brightness(${brightness})`;
  blurOutCtx.drawImage(blurSrc, 0, 0);
  blurOutCtx.filter = 'none';
  const scale = Math.max(w/bw, h/bh);
  const dw = bw*scale, dh = bh*scale;
  ctx.drawImage(blurOut, x+(w-dw)/2, y+(h-dh)/2, dw, dh);
}
