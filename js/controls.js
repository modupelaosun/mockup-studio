// js/controls.js — Sidebar controls: segmented buttons, layout, layers, background photo

function wireSeg(id, key, cb){
  const seg = document.getElementById(id);
  seg.querySelectorAll('button').forEach(btn=>{
    btn.onclick = ()=>{
      seg.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state[key] = btn.dataset[key];
      if(cb) cb();
      sizeCanvas();
      draw();
    };
  });
}
wireSeg('formatSeg','format');
wireSeg('frameSeg','frame');
wireSeg('fitSeg','fit', ()=>{
  const smart = state.fit === 'smart';
  document.getElementById('camPanel').style.display = smart ? 'block' : 'none';
  // Only the auto mode needs a scan; manual waits for the person to click.
  if(smart && cam.mode === 'auto' && state.hasVideo && !cam.samples && !cam.analyzing) analyzeMotion();
  updateCanvasCursor();
});
wireSeg('finishSeg','finish');
wireSeg('qualitySeg','quality', ()=>{ resetCamera(); });
document.getElementById('deviceSize').addEventListener('input', e=>{
  state.deviceSize = +e.target.value;
  draw();
});
document.getElementById('matchChk').addEventListener('change', e=>{
  state.matchAspect = e.target.checked;
  draw();
});
document.getElementById('glareChk').addEventListener('change', e=>{
  state.glare = e.target.checked;
  draw();
});
wireSeg('bgSeg','bg', ()=>{
  document.getElementById('photoControls').style.display = state.bg==='photo' ? 'block' : 'none';
  document.getElementById('wallpaperControls').style.display = state.bg==='wallpaper' ? 'block' : 'none';
  document.getElementById('solidRow').style.display = (state.bg==='solid' || state.bg==='gradient') ? 'flex' : 'none';
});

document.getElementById('layoutSeg').querySelectorAll('button').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('#layoutSeg button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.layout = btn.dataset.layout;
    const layered = state.layout === 'layered';
    document.getElementById('layeredPanel').style.display = layered ? 'block' : 'none';
    document.getElementById('deviceFrameFieldset').style.display = layered ? 'none' : 'block';
    draw();
  };
});

function wireLayerFrameSeg(id, layerObj){
  document.getElementById(id).querySelectorAll('button').forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll(`#${id} button`).forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      layerObj.frame = btn.dataset.frame;
      draw();
    };
  });
}
wireLayerFrameSeg('layerAFrameSeg', state.layerA);
// The front device is always the phone. A laptop in front of a laptop is not a
// shot anyone wants, and the whole point of the layered mockup is showing the
// wide layout and the mobile layout together — so the choice is removed rather
// than offered and then regretted. state.layerB.frame stays 'mobile'.

['layerAx','layerAy','layerAscale'].forEach(id=>{
  document.getElementById(id).addEventListener('input', e=>{
    const key = id==='layerAx'?'x':id==='layerAy'?'y':'scale';
    state.layerA[key] = +e.target.value;
    draw();
  });
});
['layerBx','layerBy','layerBscale'].forEach(id=>{
  document.getElementById(id).addEventListener('input', e=>{
    const key = id==='layerBx'?'x':id==='layerBy'?'y':'scale';
    state.layerB[key] = +e.target.value;
    draw();
  });
});
document.getElementById('layerBEnabled').addEventListener('change', e=>{
  state.layerB.enabled = e.target.checked;
  draw();
});

let photoObjectUrl = null;
const photoDrop = document.getElementById('photoDrop');
const photoInput = document.getElementById('photoInput');

function loadBgImage(f){
  if(!f || !f.type.startsWith('image/')) return;
  const img = new Image();
  img.onload = ()=>{
    state.bgImage = img;
    photoDrop.classList.add('has-file');
    photoDrop.firstChild.textContent = `Using ${f.name} — click to replace`;
    draw();
  };
  if(photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
  photoObjectUrl = URL.createObjectURL(f);
  img.src = photoObjectUrl;
}

photoInput.addEventListener('change', e=>loadBgImage(e.target.files[0]));
['dragover','dragenter'].forEach(ev=>photoDrop.addEventListener(ev, e=>e.preventDefault()));
photoDrop.addEventListener('drop', e=>{
  e.preventDefault();
  loadBgImage(e.dataTransfer.files[0]);
});

document.getElementById('imgDim').addEventListener('input', e=>{
  state.imgDim = +e.target.value;
  draw();
});
document.getElementById('imgBlur').addEventListener('input', e=>{
  state.imgBlur = +e.target.value;
  draw();
});
