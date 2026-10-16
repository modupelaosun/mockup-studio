// js/devices.js — Laptop / desktop / phone / browser chrome, screen painting, layers

function roundRect(x,y,w,h,r){
  r = Math.max(0, Math.min(r, Math.min(w,h)/2));
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function withShadow(blurPx, offsetY, fn){
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.38)';
  ctx.shadowBlur = blurPx;
  ctx.shadowOffsetY = offsetY;
  fn();
  ctx.restore();
}

// Aluminium finishes. Each frame reads its colours from here so the whole mockup
// stays consistent when the finish is switched.
const FINISH = {
  black: {
    body:'#33363b', bodyDark:'#1a1c1f', edge:'rgba(255,255,255,0.20)',
    base:'#3a3d43', baseDark:'#1d1f22', groove:'#0d0e10',
    phone:'#0c0d0f', phoneEdge:'rgba(255,255,255,0.16)', button:'#2a2c30',
  },
  silver: {
    body:'#cdcfd4', bodyDark:'#9a9da4', edge:'rgba(255,255,255,0.85)',
    base:'#d9dbdf', baseDark:'#a3a6ad', groove:'#6d7077',
    phone:'#c4c7cd', phoneEdge:'rgba(255,255,255,0.9)', button:'#a8abb1',
  },
};

// A MacBook seen head-on: thin uniform bezels with a slightly deeper chin, a dark
// hinge line, then the front edge of the base flaring out below it with the
// finger groove cut into the middle.
function drawLaptopChrome(rect){
  const f = FINISH[state.finish];
  const bez  = rect.w*0.016;
  const chin = rect.w*0.026;
  const lidX = rect.x-bez, lidY = rect.y-bez;
  const lidW = rect.w+bez*2, lidH = rect.h+bez+chin;
  const r = lidW*0.017;
  const cx = lidX+lidW/2;

  const gap   = lidH*0.010;
  const baseH = lidH*0.055;
  const bTop  = lidY+lidH+gap;
  const halfT = lidW/2, halfB = lidW*0.548;

  // one soft contact shadow under the whole machine
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = lidW*0.07;
  ctx.shadowOffsetY = lidH*0.045;
  ctx.fillStyle = '#000';
  roundRect(lidX, lidY, lidW, lidH+gap+baseH, r);
  ctx.fill();
  ctx.restore();

  // base front edge
  const bgrad = ctx.createLinearGradient(0, bTop, 0, bTop+baseH);
  bgrad.addColorStop(0, f.base);
  bgrad.addColorStop(1, f.baseDark);
  ctx.fillStyle = bgrad;
  ctx.beginPath();
  ctx.moveTo(cx-halfT, bTop);
  ctx.lineTo(cx+halfT, bTop);
  ctx.lineTo(cx+halfB, bTop+baseH*0.6);
  ctx.quadraticCurveTo(cx+halfB, bTop+baseH, cx+halfB-baseH*0.55, bTop+baseH);
  ctx.lineTo(cx-halfB+baseH*0.55, bTop+baseH);
  ctx.quadraticCurveTo(cx-halfB, bTop+baseH, cx-halfB, bTop+baseH*0.6);
  ctx.closePath();
  ctx.fill();

  // finger groove
  const gw = lidW*0.135, gh = baseH*0.5;
  ctx.fillStyle = f.groove;
  ctx.beginPath();
  ctx.moveTo(cx-gw/2, bTop+baseH*0.06);
  ctx.quadraticCurveTo(cx, bTop+baseH*0.06+gh, cx+gw/2, bTop+baseH*0.06);
  ctx.closePath();
  ctx.fill();

  // hinge shadow between lid and base
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(lidX+lidW*0.015, lidY+lidH, lidW*0.97, gap*1.4);

  // lid
  const lgrad = ctx.createLinearGradient(lidX, lidY, lidX+lidW, lidY+lidH);
  lgrad.addColorStop(0, f.body);
  lgrad.addColorStop(1, f.bodyDark);
  ctx.fillStyle = lgrad;
  roundRect(lidX, lidY, lidW, lidH, r);
  ctx.fill();

  // machined edge catching the light
  ctx.strokeStyle = f.edge;
  ctx.lineWidth = Math.max(1, lidW*0.0016);
  roundRect(lidX+ctx.lineWidth/2, lidY+ctx.lineWidth/2, lidW-ctx.lineWidth, lidH-ctx.lineWidth, r);
  ctx.stroke();

  // screen well behind the video
  ctx.fillStyle = '#000';
  roundRect(rect.x, rect.y, rect.w, rect.h, rect.w*0.006);
  ctx.fill();
}

// The notch sits over the picture, so it is painted after the video.
function drawLaptopOverlay(rect){
  const bez = rect.w*0.016;
  const nW = rect.w*0.095, nH = bez*1.15;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(rect.x+(rect.w-nW)/2, rect.y);
  ctx.lineTo(rect.x+(rect.w+nW)/2, rect.y);
  ctx.lineTo(rect.x+(rect.w+nW)/2, rect.y+nH-nH*0.4);
  ctx.quadraticCurveTo(rect.x+(rect.w+nW)/2, rect.y+nH, rect.x+(rect.w+nW)/2-nH*0.4, rect.y+nH);
  ctx.lineTo(rect.x+(rect.w-nW)/2+nH*0.4, rect.y+nH);
  ctx.quadraticCurveTo(rect.x+(rect.w-nW)/2, rect.y+nH, rect.x+(rect.w-nW)/2, rect.y+nH-nH*0.4);
  ctx.closePath();
  ctx.fill();
}

function drawFrameChrome(rect){
  ctx.save();
  if(rect.kind==='laptop'){
    drawLaptopChrome(rect);
  } else if(rect.kind==='desktop'){
    const fd = FINISH[state.finish];
    const bezel = rect.w*0.02;
    withShadow(rect.w*0.05, rect.h*0.03, ()=>{
      const dg = ctx.createLinearGradient(rect.x, rect.y, rect.x+rect.w, rect.y+rect.h);
      dg.addColorStop(0, fd.body);
      dg.addColorStop(1, fd.bodyDark);
      ctx.fillStyle = dg;
      roundRect(rect.x-bezel, rect.y-bezel, rect.w+bezel*2, rect.h+bezel*2, 10);
      ctx.fill();
    });
    const standY = rect.y+rect.h+bezel*2;
    const neckH = rect.h*0.12, footY = standY+neckH;
    ctx.fillStyle = fd.base;
    ctx.fillRect(rect.x+rect.w/2-rect.w*0.015, standY, rect.w*0.03, neckH);
    roundRect(rect.x+rect.w/2-rect.w*0.09, footY, rect.w*0.18, rect.h*0.02, 4);
    ctx.fill();
  } else if(rect.kind==='mobile'){
    const fm = FINISH[state.finish];
    const o = rect.outer;
    withShadow(o.w*0.14, o.h*0.02, ()=>{
      ctx.fillStyle = fm.phone;
      roundRect(o.x, o.y, o.w, o.h, o.w*0.145);
      ctx.fill();
    });
    // brushed rail
    ctx.strokeStyle = fm.phoneEdge;
    ctx.lineWidth = Math.max(1, o.w*0.007);
    roundRect(o.x+o.w*0.006, o.y+o.w*0.006, o.w-o.w*0.012, o.h-o.w*0.012, o.w*0.14);
    ctx.stroke();
    // side buttons
    ctx.fillStyle = fm.button;
    roundRect(o.x-o.w*0.012, o.y+o.h*0.20, o.w*0.014, o.h*0.075, o.w*0.007); ctx.fill();
    roundRect(o.x+o.w-o.w*0.002, o.y+o.h*0.26, o.w*0.014, o.h*0.11, o.w*0.007); ctx.fill();
  } else if(rect.kind==='browser'){
    const o = rect.outer;
    const barMidY = o.y + (rect.y - o.y)/2;
    withShadow(o.w*0.04, o.h*0.02, ()=>{
      ctx.fillStyle = '#e7e5e0';
      roundRect(o.x, o.y, o.w, o.h, 10);
      ctx.fill();
    });
    ['#e0604f','#e0b64f','#5fae5a'].forEach((c,i)=>{
      ctx.fillStyle=c;
      ctx.beginPath();
      ctx.arc(o.x+18+i*16, barMidY, 5, 0, Math.PI*2);
      ctx.fill();
    });
  }
  ctx.restore();
}

// The notch sits on top of the video, so it is painted after the screen content.
function drawMobileOverlay(rect){
  const o = rect.outer;
  const pillW = o.w*0.30, pillH = o.w*0.082;
  ctx.fillStyle = '#000';
  roundRect(o.x+(o.w-pillW)/2, rect.y+o.w*0.035, pillW, pillH, pillH/2);
  ctx.fill();
}

function layeredFrameRect(frame, cx, cy, targetW){
  switch(frame){
    case 'laptop': {
      const aspect=srcAspect(16/10), extra=0.17;
      const w=targetW, h=w/aspect, totalH=h*(1+extra);
      return {x:cx-w/2, y:cy-totalH/2, w, h, kind:'laptop'};
    }
    case 'desktop': {
      const aspect=srcAspect(16/9), extra=0.20;
      const w=targetW, h=w/aspect, totalH=h*(1+extra);
      return {x:cx-w/2, y:cy-totalH/2, w, h, kind:'desktop'};
    }
    case 'mobile': {
      const outerAspect=0.472;
      const fw=targetW, fh=fw/outerAspect;
      const fx=cx-fw/2, fy=cy-fh/2;
      const bez=fw*0.045;
      return {x:fx+bez, y:fy+bez, w:fw-bez*2, h:fh-bez*2, kind:'mobile', outer:{x:fx,y:fy,w:fw,h:fh}};
    }
    case 'browser': {
      const a = srcAspect(16/10), barFrac = 0.085;
      const fw=targetW, sh=fw/a, fh=sh*(1+barFrac), bar=sh*barFrac;
      const fx=cx-fw/2, fy=cy-fh/2;
      return {x:fx, y:fy+bar, w:fw, h:sh, kind:'browser', outer:{x:fx,y:fy,w:fw,h:fh}};
    }
    default:
      return {x:cx-targetW/2, y:cy-(targetW*9/16)/2, w:targetW, h:targetW*9/16, kind:'none'};
  }
}

function paintScreen(rect, vid=video){
  ctx.save();
  const clipR = rect.radius!==undefined
    ? rect.radius
    : (rect.kind==='mobile' ? rect.w*0.115 : (rect.kind==='none' ? 0 : 6));
  roundRect(rect.x, rect.y, rect.w, rect.h, clipR);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  paintVideo(rect.x, rect.y, rect.w, rect.h, vid);
  if(state.glare && rect.kind !== 'none'){
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x+rect.w*0.8, rect.y+rect.h*1.1);
    g.addColorStop(0,    'rgba(255,255,255,0.14)');
    g.addColorStop(0.30, 'rgba(255,255,255,0.035)');
    g.addColorStop(0.46, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
  return clipR;
}

function drawLayer(layer, vid=video){
  const W=canvas.width, H=canvas.height;
  const rect = layeredFrameRect(layer.frame, W*layer.x/100, H*layer.y/100, W*layer.scale/100);
  if(rect.kind !== 'none') drawFrameChrome(rect);
  paintScreen(rect, vid);
  if(rect.kind === 'mobile') drawMobileOverlay(rect);
  if(rect.kind === 'laptop') drawLaptopOverlay(rect);
}
