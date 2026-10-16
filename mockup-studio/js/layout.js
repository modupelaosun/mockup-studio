// js/layout.js — Where each device screen sits on the canvas

/* ---------- frames ---------- */

function fitFrame(aspect, extraBottomFrac, marginFrac){
  const W = canvas.width, H = canvas.height;
  const maxW = W*(1-marginFrac*2);
  const maxH = H*(1-marginFrac*2);
  let screenW = maxW;
  let screenH = screenW/aspect;
  let totalH = screenH*(1+extraBottomFrac);
  if(totalH > maxH){
    totalH = maxH;
    screenH = totalH/(1+extraBottomFrac);
    screenW = screenH*aspect;
  }
  const x = (W-screenW)/2;
  const y = (H-totalH)/2;
  return {x, y, w:screenW, h:screenH, totalH};
}

// A 16:9 recording forced into a 16:10 laptop screen has to either crop the sides
// or sit in letterbox bands. Neither is acceptable, so the screen itself takes the
// shape of the recording. Real laptops ship in 16:9 and 16:10 both, so this stays
// believable; it's only clamped to stop an odd recording producing a silly device.
function srcAspect(fallback){
  if(!state.matchAspect || !state.hasVideo || !video.videoWidth) return fallback;
  return Math.max(1.15, Math.min(2.6, video.videoWidth/video.videoHeight));
}

function getScreenRect(){
  const W = canvas.width, H = canvas.height;
  // A background image is now just a background: the device frame sits on top of it
  // like it does for every other background style. Previously this branch replaced
  // the whole frame with a slider-positioned rectangle, which silently disabled the
  // device buttons whenever a photo was loaded.
  switch(state.frame){
    case 'laptop': {
      const f = fitFrame(srcAspect(16/10), 0.17, frameMargin());
      return {x:f.x, y:f.y, w:f.w, h:f.h, kind:'laptop'};
    }
    case 'desktop': {
      const f = fitFrame(srcAspect(16/9), 0.20, frameMargin());
      return {x:f.x, y:f.y, w:f.w, h:f.h, kind:'desktop'};
    }
    case 'mobile': {
      let fw, fh;
      if(state.format==='portrait'){ fh = H*0.90; fw = fh*0.472; }
      else { fh = H*0.92; fw = fh*0.472; }
      const fx=(W-fw)/2, fy=(H-fh)/2;
      const bez = fw*0.045;
      return {x:fx+bez, y:fy+bez, w:fw-bez*2, h:fh-bez*2, kind:'mobile', outer:{x:fx,y:fy,w:fw,h:fh}};
    }
    case 'browser': {
      // The window is built outward from the content area rather than inward from
      // the canvas, so the page fills it exactly whatever shape the recording is.
      const a = srcAspect(16/10);
      const marg = frameMargin(), barFrac = 0.085;
      const maxW = W*(1-marg*2), maxH = H*(1-marg*2);
      let sw = maxW, sh = sw/a;
      let totalH = sh*(1+barFrac);
      if(totalH > maxH){ totalH = maxH; sh = totalH/(1+barFrac); sw = sh*a; }
      const bar = sh*barFrac;
      const x = (W-sw)/2, y = (H-totalH)/2 + bar;
      return {x, y, w:sw, h:sh, kind:'browser', outer:{x, y:y-bar, w:sw, h:sh+bar}};
    }
    default:
      return {x:0,y:0,w:W,h:H,kind:'none'};
  }
}
