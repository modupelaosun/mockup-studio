// js/state.js — Global state, colour swatches

const state = {
  format: 'landscape',
  frame: 'none',
  fit: 'cover',
  bg: 'wallpaper',
  wallpaper: 'aurora',
  wpDim: 100,
  finish: 'black',
  matchAspect: true,
  quality: '1080',
  deviceSize: 45,
  glare: false,
  color: '#1f2430',
  hasVideo: false,
  bgImage: null,
  imgDim: 100,
  imgBlur: 0,
  layout: 'single',
  layerA: {frame:'laptop', x:50, y:52, scale:70},
  layerB: {enabled:true, frame:'mobile', x:76, y:80, scale:30},
};

// Preview-only chrome (placement guides, camera path overlay) must never end up
// in the exported file, so every draw knows whether it is a preview or a frame
// that MediaRecorder is capturing.
let isExporting = false;

const COLORS = ['#1f2430','#0e0f11','#f6f5f2','#2f6f5e','#b5502f','#3a4a6b'];
const swatchesEl = document.getElementById('swatches');
COLORS.forEach((c,i)=>{
  const d = document.createElement('div');
  d.className = 'sw'+(i===0?' active':'');
  d.style.background = c;
  d.onclick = ()=>{ state.color=c; [...swatchesEl.children].forEach(x=>x.classList.remove('active')); d.classList.add('active'); draw(); };
  swatchesEl.appendChild(d);
});
