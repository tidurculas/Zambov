# Kania Flowers Web

## Required assets

Only two media assets are required. Put both inside the `assets` folder with these exact names:

- `assets/video.mp4`
- `assets/audio.mp3`

### Recommended video export

- Portrait ratio: **9:16**
- Resolution: **1080 × 1920**
- Format: MP4
- Video codec: H.264
- Frame rate: 30 fps
- No audio is needed because the video is muted and loops as the poem background.
- Keep the important subject near the center so it survives cropping on desktop and iPad.

### Recommended audio export

- Format: MP3
- 128–192 kbps is enough for background music.
- Trim any unwanted silence at the beginning.

## Experience

- The introduction works like a clean device-activation flow.
- Tap, swipe, scroll, or use arrow keys to move between slides.
- The music and background video begin only after the visitor presses **Start**.
- On an iPhone, the portrait video fills the screen.
- On a landscape iPad or desktop, the portrait video stays centered while a blurred version fills the surrounding space.
- The site still works with a dark animated fallback if the video file is missing.

## Publish on GitHub Pages

1. Create a public GitHub repository.
2. Upload `index.html`, `style.css`, `script.js`, and the complete `assets` folder.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**.
5. Choose the `main` branch and `/(root)` folder.
6. Save and wait for GitHub to provide the site URL.

## Public-file reminder

Files hosted through a public GitHub Pages repository can be accessed by anyone with the URL. Only upload media you are comfortable publishing and have permission to use.

## Bug fix in this build

- The invisible tap-to-continue layer is disabled on the “Are you ready?” screen, so the **Start** button is clickable.
- The intro progress bar fades out on the ready screen instead of appearing stuck at 100%.
- Audio playback is requested immediately from the Start tap for better iPhone/Safari compatibility.


## Readability treatment

The poem background now uses a subtle 2.5 px video blur, reduced brightness and saturation, a dark center-weighted vignette, and a soft text shadow. The video remains visible as atmosphere while the poem stays readable on bright footage.
