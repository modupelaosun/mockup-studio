// js/source-video.js — Loading the main video + showing the finished export

const dropZone = document.getElementById('dropZone');
let fileInput = document.getElementById('fileInput');
const video = document.getElementById('srcVideo');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stageEmpty = document.getElementById('stageEmpty');
const transport = document.getElementById('transport');
const playBtn = document.getElementById('playBtn');
const seek = document.getElementById('seek');
const timeLabel = document.getElementById('timeLabel');
const exportBtn = document.getElementById('exportBtn');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('statusText');
const analyzeBtn = document.getElementById('analyzeBtn');
const camBar = document.getElementById('camBar');
const camStatus = document.getElementById('camStatus');

/* ---------- handing over the finished file ---------- */
const resultPanel = document.getElementById('resultPanel');
const resultPreview = document.getElementById('resultPreview');
const downloadBtn = document.getElementById('downloadBtn');
const resultNote = document.getElementById('resultNote');
let resultUrl = null;

// iOS ignores the download attribute on a blob and opens the video instead, so
// there the honest instruction is to save it out of the player.
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile = isIOS || /Android/.test(navigator.userAgent);

function prettySize(bytes){
  if(bytes > 1024*1024) return (bytes/1024/1024).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes/1024)) + ' KB';
}

// Shows the finished file with a real button the person presses themselves.
// The previous version clicked a hidden link from script and revoked the blob
// 30 seconds later: mobile browsers ignore that click entirely, and even where
// it worked a slow or queued download found the URL already destroyed.
function presentResult(blob, filename){
  if(resultUrl) URL.revokeObjectURL(resultUrl);   // only the previous file, never the current one
  resultUrl = URL.createObjectURL(blob);

  resultPreview.src = resultUrl;
  downloadBtn.href = resultUrl;
  downloadBtn.setAttribute('download', filename);
  const ext = (filename.split('.').pop() || '').toUpperCase();
  downloadBtn.textContent = `Download ${ext} · ${prettySize(blob.size)}`;

  // Whether a blob download succeeds on a phone depends on the browser, not just
  // the operating system — Chrome on iPhone saves it, Safari often opens it
  // instead. Since that can't be detected reliably, the note leads with the
  // button and offers the fallback rather than guessing which will happen.
  resultNote.textContent = isMobile
    ? (isIOS
        ? 'Tap Download. If it opens the video instead of saving, press and hold it and choose Save to Photos.'
        : 'Tap Download. If nothing happens, press and hold the video above and save it from there.')
    : 'Press Download to save it. It goes to your usual downloads folder.';

  // Hand the emphasis over: Download becomes the one primary action, and the
  // export button steps back and relabels, since re-exporting is now the
  // alternative rather than the obvious next move.
  exportBtn.classList.add('demoted');
  exportBtn.textContent = 'Export again';

  resultPanel.style.display = 'block';
  resultPanel.scrollIntoView({behavior:'smooth', block:'nearest'});
}

['dragover','dragenter'].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.add('has-file');}));
dropZone.addEventListener('dragleave', e=>{e.preventDefault();});
dropZone.addEventListener('drop', e=>{
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if(f) loadFile(f);
});
fileInput.addEventListener('change', e=>{
  const f = e.target.files[0];
  if(f) loadFile(f);
});

function setDropZoneContent(html){
  dropZone.innerHTML = html + '<input type="file" id="fileInput" accept="video/*">';
  fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', e=>{
    const f = e.target.files[0];
    if(f) loadFile(f);
  });
}

let videoObjectUrl = null;

function loadFile(file){
  if(!file.type.startsWith('video/')){
    setDropZoneContent(`"${file.name}" isn't a video file. Click to pick another.`);
    return;
  }
  setDropZoneContent(`Loading "${file.name}"…`);
  stageEmpty.textContent = 'Loading video…';
  stageEmpty.style.display = 'block';
  canvas.style.display = 'none';
  transport.style.display = 'none';
  resetCamera();

  video.onloadedmetadata = ()=>{
    state.hasVideo = true;
    dropZone.classList.add('has-file');
    setDropZoneContent(`Loaded: ${file.name}<br><span style="font-size:11px;">${video.videoWidth}×${video.videoHeight} · click to replace</span>`);
    stageEmpty.style.display = 'none';
    canvas.style.display = 'block';
    transport.style.display = 'flex';
    exportBtn.disabled = false;
    exportBtn.textContent = 'Record & Export';
    exportBtn.classList.remove('demoted');   // new recording, nothing exported from it yet
    analyzeBtn.disabled = false;
    sizeCanvas();
    draw();
    seek.max = Math.floor(video.duration*10);
    timeLabel.textContent = `0:00 / ${fmt(video.duration)}`;
    updateCanvasCursor();
    if(state.fit === 'smart' && cam.mode === 'auto' && !cam.samples) analyzeMotion();
  };
  video.onerror = ()=>{
    const err = video.error;
    let msg = 'Could not load this video.';
    if(err){
      if(err.code === err.MEDIA_ERR_SRC_NOT_SUPPORTED) msg = `Your browser can't play this file's codec (common with some .mov screen recordings — HEVC). Try re-exporting as H.264 mp4, or use a different browser (Safari plays more formats than Chrome).`;
      else if(err.code === err.MEDIA_ERR_DECODE) msg = 'This video file appears to be corrupted or uses an unsupported codec.';
    }
    stageEmpty.textContent = msg;
    stageEmpty.style.display = 'block';
    canvas.style.display = 'none';
    transport.style.display = 'none';
    setDropZoneContent(`Couldn't load that file. Click to pick another.`);
  };
  if(videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
  videoObjectUrl = URL.createObjectURL(file);
  video.src = videoObjectUrl;
}

function fmt(s){
  s = Math.max(0,Math.floor(s||0));
  const m = Math.floor(s/60), r = s%60;
  return `${m}:${r.toString().padStart(2,'0')}`;
}
