// js/background.js — Canvas background drawing

function drawBackground(){
  const W=canvas.width, H=canvas.height;
  if(state.bg==='wallpaper'){
    ctx.drawImage(getWallpaperCanvas(W,H), 0, 0);
    return;
  }
  if(state.bg==='photo'){
    if(state.bgImage){
      const img = state.bgImage;
      const scale = Math.max(W/img.width, H/img.height);
      const dw = img.width*scale, dh = img.height*scale;
      ctx.save();
      // Blurring a background photo is what stops it competing with the device on
      // top of it, so it's offered as a slider rather than left to the person's
      // image editor.
      if(state.imgBlur > 0){
        ctx.filter = `blur(${(state.imgBlur/100)*Math.min(W,H)*0.045}px)`;
        const over = (state.imgBlur/100)*0.12;   // grow past the edges so blur can't bleed in
        ctx.drawImage(img, (W-dw)/2 - W*over, (H-dh)/2 - H*over, dw + W*over*2, dh + H*over*2);
      } else {
        ctx.drawImage(img, (W-dw)/2, (H-dh)/2, dw, dh);
      }
      ctx.restore();
      if(state.imgDim < 100){
        ctx.fillStyle = `rgba(0,0,0,${(100-state.imgDim)/65*0.75})`;
        ctx.fillRect(0,0,W,H);
      } else if(state.imgDim > 100){
        ctx.fillStyle = `rgba(255,255,255,${(state.imgDim-100)/30*0.28})`;
        ctx.fillRect(0,0,W,H);
      }
    } else {
      ctx.fillStyle = '#2b2d31';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#9a978f';
      ctx.font = `${Math.round(W*0.014)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Upload a photo to use as the background', W/2, H/2);
      ctx.textAlign = 'start';
    }
    return;
  }
  if(state.bg==='solid'){
    ctx.fillStyle = state.color;
    ctx.fillRect(0,0,W,H);
  } else if(state.bg==='gradient'){
    const g = ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0, state.color);
    g.addColorStop(1, '#0e0f11');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);
  } else if(state.bg==='blur'){
    ctx.fillStyle = '#0e0f11';
    ctx.fillRect(0,0,W,H);
    drawBlurFill(-40,-40,W+80,H+80,0.62);
  }
}
