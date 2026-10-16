// js/export.js — MP4 conversion and video export

/* ---------- Optional MP4 conversion ---------- */
const convertBtn = document.getElementById('convertBtn');
let ffmpegInstance = null;

function showConvertButton(webmBlob){
  convertBtn.style.display = 'block';
  convertBtn.textContent = 'Convert to MP4';
  convertBtn.disabled = false;
  convertBtn.onclick = ()=>convertToMp4(webmBlob);
}

async function convertToMp4(webmBlob){
  convertBtn.disabled = true;
  convertBtn.textContent = 'Loading converter…';
  try{
    if(!ffmpegInstance){
      const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
      const { fetchFile, toBlobURL } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');
      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      convertBtn.textContent = 'Downloading converter (~30MB, one-time)…';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegInstance = { ffmpeg, fetchFile };
    }
    convertBtn.textContent = 'Converting…';
    const { ffmpeg, fetchFile } = ffmpegInstance;
    await ffmpeg.writeFile('in.webm', await fetchFile(webmBlob));
    await ffmpeg.exec(['-i','in.webm','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','out.mp4']);
    const data = await ffmpeg.readFile('out.mp4');
    const mp4Blob = new Blob([data.buffer], {type:'video/mp4'});
    presentResult(mp4Blob, `mockup-${state.frame}-${state.format}.mp4`);
    convertBtn.style.display = 'none';
    statusText.textContent = 'Converted. Your MP4 is ready below.';
  } catch(err){
    console.error(err);
    convertBtn.textContent = 'Conversion failed. Try again.';
    convertBtn.disabled = false;
  }
}

/* ---------- Export ---------- */
exportBtn.addEventListener('click', async ()=>{
  if(!state.hasVideo || cam.analyzing) return;
  exportBtn.disabled = true;
  convertBtn.style.display = 'none';
  // Clear the previous file so nobody downloads the old one by mistake, and take
  // the emphasis back while this is the only action running.
  resultPanel.style.display = 'none';
  resultPreview.removeAttribute('src');
  exportBtn.classList.remove('demoted');
  statusText.textContent = 'Recording…';
  progressBar.style.width='0%';
  isExporting = true;

  video.currentTime = 0;
  video.playbackRate = 1;
  video.muted = false;
  // The second recording has to restart with the first or the exported file
  // would begin part-way through it.
  if(hasVideoB){
    videoB.playbackRate = 1;
    try { videoB.currentTime = 0; } catch(e){}
  }
  try { await video.play(); }
  catch(e){
    statusText.textContent = 'Playback was blocked. Press play once, then export.';
    isExporting = false;
    exportBtn.disabled = false;
    return;
  }
  syncVideoB(true);
  playBtn.textContent = '❚❚';

  // Capture after playback starts — Chrome hands back zero audio tracks if the
  // stream is grabbed before the element has ever played.
  const canvasStream = canvas.captureStream(30);
  let audioTracks = [];
  try{
    const vidStream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
    audioTracks = vidStream.getAudioTracks();
  } catch(e){ /* silent recording */ }

  const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

  const mp4Candidates = ['video/mp4;codecs=avc1,mp4a.40.2','video/mp4;codecs=h264,aac','video/mp4'];
  const webmCandidates = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  let mimeType = mp4Candidates.find(t=>MediaRecorder.isTypeSupported(t));
  const isNativeMp4 = !!mimeType;
  if(!mimeType) mimeType = webmCandidates.find(t=>MediaRecorder.isTypeSupported(t)) || 'video/webm';

  // Bitrate has to rise with resolution or 1440p just produces a bigger blur.
  const bitrate = {'720':8_000_000, '1080':16_000_000, '1440':28_000_000}[state.quality] || 16_000_000;
  const recorder = new MediaRecorder(combined, {mimeType, videoBitsPerSecond: bitrate});
  const chunks = [];
  recorder.ondataavailable = e=>{ if(e.data.size>0) chunks.push(e.data); };

  recorder.onstop = ()=>{
    isExporting = false;
    const outType = isNativeMp4 ? 'video/mp4' : 'video/webm';
    const ext = isNativeMp4 ? 'mp4' : 'webm';
    const blob = new Blob(chunks, {type:outType});
    presentResult(blob, `mockup-${state.frame}-${state.format}.${ext}`);
    exportBtn.disabled = false;
    progressBar.style.width='100%';
    if(isNativeMp4){
      statusText.textContent = 'Done. Your MP4 is ready below.';
    } else {
      statusText.textContent = 'Done. Ready below as .webm — this browser can\'t record MP4 directly.';
      showConvertButton(blob);
    }
    draw();
  };

  recorder.start();

  const dur = video.duration;
  const tick = setInterval(()=>{
    progressBar.style.width = Math.min(100,(video.currentTime/dur*100))+'%';
  }, 150);

  video.addEventListener('ended', function onEnd(){
    clearInterval(tick);
    recorder.stop();
    video.muted = true;
    playBtn.textContent = '▶';
  }, {once:true});
});
