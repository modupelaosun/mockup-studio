// js/wallpapers.js — Code-drawn wallpapers + wallpaper picker

/* ============================================================
   WALLPAPERS
   Drawn with code rather than loaded as images, so the whole tool
   stays one file with nothing to download and every wallpaper
   renders crisp at any canvas size.
   ============================================================ */
const WALLPAPERS = [
  {id:'aurora', name:'Aurora', type:'ribbon', base:'#060a18', ribbons:[
    {y:0.16, amp:0.10, thick:0.22, freq:1.6, phase:0.2, c1:'#1b3f8a', c2:'#2aa1b3'},
    {y:0.38, amp:0.12, thick:0.20, freq:1.2, phase:1.4, c1:'#5b2f9d', c2:'#1f6f6a'},
    {y:0.60, amp:0.09, thick:0.26, freq:1.9, phase:2.6, c1:'#0e2a5c', c2:'#7a3f9d'},
  ]},
  {id:'tide', name:'Tide', type:'ribbon', base:'#03121d', ribbons:[
    {y:0.22, amp:0.08, thick:0.24, freq:1.3, phase:0.6, c1:'#0a4f6b', c2:'#2fa7a0'},
    {y:0.48, amp:0.11, thick:0.28, freq:1.7, phase:2.0, c1:'#062f45', c2:'#0f6b8a'},
  ]},
  {id:'dusk', name:'Dusk', type:'mesh', base:'#160c26', blobs:[
    {x:0.18,y:0.22,r:0.62,c:'#8f3570',a:0.95},
    {x:0.80,y:0.30,r:0.55,c:'#d9663f',a:0.80},
    {x:0.52,y:0.88,r:0.70,c:'#3d2168',a:0.95},
  ]},
  {id:'ember', name:'Ember', type:'mesh', base:'#170b08', blobs:[
    {x:0.25,y:0.75,r:0.60,c:'#c2502a',a:0.90},
    {x:0.76,y:0.24,r:0.55,c:'#e0933c',a:0.70},
    {x:0.50,y:0.50,r:0.45,c:'#6b2118',a:0.90},
  ]},
  {id:'meadow', name:'Meadow', type:'mesh', base:'#06150e', blobs:[
    {x:0.22,y:0.30,r:0.60,c:'#2f6f5e',a:0.95},
    {x:0.78,y:0.72,r:0.58,c:'#6aa84f',a:0.62},
    {x:0.55,y:0.18,r:0.40,c:'#10493a',a:0.90},
  ]},
  {id:'graphite', name:'Graphite', type:'mesh', base:'#0e0f12', blobs:[
    {x:0.30,y:0.25,r:0.65,c:'#333842',a:0.95},
    {x:0.78,y:0.78,r:0.55,c:'#4a515d',a:0.70},
  ]},
  {id:'sandstone', name:'Sandstone', type:'mesh', light:true, base:'#efe4d4', blobs:[
    {x:0.25,y:0.28,r:0.60,c:'#e3b487',a:0.90},
    {x:0.80,y:0.70,r:0.55,c:'#cf8e6b',a:0.72},
    {x:0.55,y:0.98,r:0.50,c:'#b9c4b2',a:0.70},
  ]},
  {id:'ink', name:'Ink', type:'mesh', base:'#08090c', blobs:[
    {x:0.50,y:0.35,r:0.70,c:'#1b2a4a',a:0.90},
    {x:0.85,y:0.88,r:0.45,c:'#2b3550',a:0.60},
  ]},
];

// Fading a radial gradient to transparent *black* muddies the colour as it goes,
// so the outer stop has to be the same hue at zero alpha instead.
function rgba(hex, a){
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

function renderWallpaper(cv, W, H, wp, dim){
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = wp.base;
  c.fillRect(0,0,W,H);

  c.save();
  c.filter = `blur(${Math.max(2, Math.round(Math.min(W,H)*0.075))}px)`;
  if(wp.type === 'ribbon'){
    const steps = 26;
    wp.ribbons.forEach(rb=>{
      const g = c.createLinearGradient(0, rb.y*H, W, (rb.y+rb.thick)*H);
      g.addColorStop(0, rb.c1);
      g.addColorStop(1, rb.c2);
      c.fillStyle = g;
      c.beginPath();
      for(let i=0;i<=steps;i++){
        const t=i/steps, X=-W*0.15 + t*W*1.3;
        const Y=(rb.y + Math.sin(t*Math.PI*rb.freq + rb.phase)*rb.amp)*H;
        i===0 ? c.moveTo(X,Y) : c.lineTo(X,Y);
      }
      for(let i=steps;i>=0;i--){
        const t=i/steps, X=-W*0.15 + t*W*1.3;
        const Y=(rb.y + Math.sin(t*Math.PI*rb.freq + rb.phase)*rb.amp + rb.thick)*H;
        c.lineTo(X,Y);
      }
      c.closePath();
      c.fill();
    });
  } else {
    wp.blobs.forEach(b=>{
      const R = b.r*Math.max(W,H);
      const g = c.createRadialGradient(b.x*W, b.y*H, 0, b.x*W, b.y*H, R);
      g.addColorStop(0,   rgba(b.c, b.a));
      g.addColorStop(0.6, rgba(b.c, b.a*0.35));
      g.addColorStop(1,   rgba(b.c, 0));
      c.fillStyle = g;
      c.fillRect(0,0,W,H);
    });
  }
  c.restore();

  // Gentle falloff at the edges so the device reads as the subject.
  const v = c.createRadialGradient(W/2, H*0.45, Math.min(W,H)*0.12, W/2, H*0.5, Math.max(W,H)*0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, wp.light ? 'rgba(90,70,50,0.20)' : 'rgba(0,0,0,0.40)');
  c.fillStyle = v;
  c.fillRect(0,0,W,H);

  if(dim < 100){
    c.fillStyle = `rgba(0,0,0,${(100-dim)/65*0.75})`;
    c.fillRect(0,0,W,H);
  } else if(dim > 100){
    c.fillStyle = `rgba(255,255,255,${(dim-100)/30*0.28})`;
    c.fillRect(0,0,W,H);
  }
}

const wpCache = {key:null, canvas:document.createElement('canvas')};
function getWallpaperCanvas(W,H){
  const key = `${state.wallpaper}|${W}x${H}|${state.wpDim}`;
  if(wpCache.key !== key){
    const wp = WALLPAPERS.find(w=>w.id===state.wallpaper) || WALLPAPERS[0];
    renderWallpaper(wpCache.canvas, W, H, wp, state.wpDim);
    wpCache.key = key;
  }
  return wpCache.canvas;
}

const wpGrid = document.getElementById('wpGrid');
WALLPAPERS.forEach(wp=>{
  const fig = document.createElement('figure');
  if(wp.id === state.wallpaper) fig.classList.add('active');
  const thumb = document.createElement('canvas');
  renderWallpaper(thumb, 88, 50, wp, 100);
  const cap = document.createElement('figcaption');
  cap.textContent = wp.name;
  fig.append(thumb, cap);
  fig.onclick = ()=>{
    state.wallpaper = wp.id;
    [...wpGrid.children].forEach(f=>f.classList.remove('active'));
    fig.classList.add('active');
    draw();
  };
  wpGrid.appendChild(fig);
});
document.getElementById('wpDim').addEventListener('input', e=>{
  state.wpDim = +e.target.value;
  draw();
});
