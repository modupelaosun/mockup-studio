// js/playback.js — Second (phone) recording, play/pause, seek bar

/* ---------- second recording for the front layer ---------- */
// The whole point of the layered shot is one design on two devices: the wide
// layout on the laptop, the mobile layout on the phone. That needs a second
// recording, because a landscape recording squeezed into a phone screen can only
// ever be cropped or stretched. The main recording stays the timeline; this one
// is slaved to it.
const videoB = document.getElementById('srcVideoB');
const dropZoneB = document.getElementById('dropZoneB');
let fileInputB = document.getElementById('fileInputB');
let videoBObjectUrl = null;
let hasVideoB = false;

function setDropZoneBContent(html){
  dropZoneB.innerHTML = html + '<input type="file" id="fileInputB" accept="video/*">';
  fileInputB = document.getElementById('fileInputB');
  fileInputB.addEventListener('change', e=>{
    const f = e.target.files[0];
    if(f) loadFileB(f);
  });
}

function loadFileB(file){
  if(!file.type.startsWith('video/')){
    setDropZoneBContent(`"${file.name}" isn't a video file. Click to pick another.`);
    return;
  }
  setDropZoneBContent(`Loading "${file.name}"…`);
  videoB.onloadedmetadata = ()=>{
    hasVideoB = true;
    dropZoneB.classList.add('has-file');
    setDropZoneBContent(`Front device: ${file.name}<br><span style="font-size:11px;">${videoB.videoWidth}×${videoB.videoHeight} · click to replace</span>`);
    document.getElementById('layerBNote').textContent =
      'This device now plays its own recording, kept in step with the main one.';
    syncVideoB(true);
    draw();
  };
  videoB.onerror = ()=>{
    hasVideoB = false;
    setDropZoneBContent(`Couldn't load that file. Click to pick another.`);
    draw();
  };
  if(videoBObjectUrl) URL.revokeObjectURL(videoBObjectUrl);
  videoBObjectUrl = URL.createObjectURL(file);
  videoB.src = videoBObjectUrl;
}

fileInputB.addEventListener('change', e=>{
  const f = e.target.files[0];
  if(f) loadFileB(f);
});
['dragover','dragenter'].forEach(ev=>dropZoneB.addEventListener(ev, e=>e.preventDefault()));
dropZoneB.addEventListener('drop', e=>{
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if(f) loadFileB(f);
});

// Keeps the second recording in step with the main one. If it is shorter it
// simply holds on its last frame rather than looping, which would read as a
// glitch in an exported mockup.
function syncVideoB(seekToo){
  if(!hasVideoB || !videoB.duration) return;
  // The motion scan races the main recording at 8x; the second one sits it out.
  if(cam.analyzing){ if(!videoB.paused) videoB.pause(); return; }
  const t = Math.min(video.currentTime, videoB.duration - 0.05);
  if(seekToo || Math.abs(videoB.currentTime - t) > 0.15){
    try { videoB.currentTime = Math.max(0, t); } catch(e){}
  }
  if(video.paused || video.currentTime >= videoB.duration){
    if(!videoB.paused) videoB.pause();
  } else if(videoB.paused){
    videoB.play().catch(()=>{});
  }
}

playBtn.onclick = ()=>{
  if(cam.analyzing) return;
  if(video.paused){ video.play(); playBtn.textContent='❚❚'; }
  else { video.pause(); playBtn.textContent='▶'; }
  syncVideoB(false);
};
video.addEventListener('play', ()=>syncVideoB(true));
video.addEventListener('pause', ()=>syncVideoB(false));
video.addEventListener('ended', ()=>{ playBtn.textContent='▶'; syncVideoB(false); });
video.addEventListener('timeupdate', ()=>{
  if(cam.analyzing) return;
  if(document.activeElement !== seek) seek.value = Math.floor(video.currentTime*10);
  timeLabel.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
  syncVideoB(false);
  drawZoomStrip();
});
seek.addEventListener('input', ()=>{
  if(cam.analyzing) return;
  video.currentTime = seek.value/10;
  syncVideoB(true);
  draw();
  drawZoomStrip();
});
