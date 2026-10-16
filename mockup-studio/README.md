# Mockup Studio

Screen recording → device frame → export. Built by Modupe Laosun.

Open `index.html` in a browser (or use a Live Server extension in Cursor).

## Files

| File | What it does |
|---|---|
| `js/state.js` | Global state, colour swatches |
| `js/wallpapers.js` | Code-drawn wallpapers + wallpaper picker |
| `js/controls.js` | Sidebar controls: segmented buttons, layout, layers, background photo |
| `js/source-video.js` | Loading the main video + showing the finished export |
| `js/playback.js` | Second (phone) recording, play/pause, seek bar |
| `js/canvas-size.js` | Canvas resolution and device margin |
| `js/camera.js` | Smart camera: zoom timeline, manual points, motion scan, path building |
| `js/painters.js` | How the video is painted into a screen: FILL, SHOW ALL, follow-action |
| `js/layout.js` | Where each device screen sits on the canvas |
| `js/background.js` | Canvas background drawing |
| `js/devices.js` | Laptop / desktop / phone / browser chrome, screen painting, layers |
| `js/render.js` | Camera-path overlay, click prompt, main draw() and render loop |
| `js/export.js` | MP4 conversion and video export |
| `js/main.js` | First paint (must load last) |

Scripts share one global scope and load in the order listed in `index.html`. Keep that order.
