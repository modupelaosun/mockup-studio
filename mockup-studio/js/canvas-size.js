// js/canvas-size.js — Canvas resolution and device margin

// The frame body and margins eat into the canvas, so a 1280-wide canvas left a
// 1920-wide recording rendered at roughly 900px — half size, and small text in the
// recording turned to mush. Rendering the canvas larger gives the screen area back
// its pixels. Everything else is measured as a fraction of canvas width, so nothing
// needs adjusting when this changes.
const QUALITY = {'720':720, '1080':1080, '1440':1440};
function sizeCanvas(){
  const short = QUALITY[state.quality] || 1080;
  const long = Math.round(short*16/9);
  if(state.format === 'portrait'){ canvas.width=short; canvas.height=long; }
  else { canvas.width=long; canvas.height=short; }
  wpCache.key = null;   // wallpaper is cached per canvas size
}

// Device size trades margin for pixels: a bigger device means the recording is
// drawn larger, which is the difference between readable body text and a smudge.
function frameMargin(){
  return 0.12 - (state.deviceSize/100)*0.10;
}
sizeCanvas();
