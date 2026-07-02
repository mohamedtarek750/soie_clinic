HERO VIDEO — WHAT IS NEEDED
===========================

The homepage hero is prepared for a cinematic background video, but no
video is shipped: the clinic's Instagram reels sit behind Instagram's
login wall and are not licensed for hotlinking, so nothing could be
embedded legally or reliably.

To activate the video hero, place here:

  hero-loop.mp4   MP4 / H.264, ~10–20 second seamless loop,
                  1920×1080, ideally under 8 MB (compress with
                  HandBrake or ffmpeg: crf 26–28, no audio track)

…and a poster frame at:

  ../images/hero-poster.jpg   (first frame, JPEG, ~150 KB)

Then in index.html:
  1. Add class "hero--video" to the <section class="hero">
  2. Un-comment the <video> + .hero__veil block at the top of the hero

The video plays autoplay + muted + loop + playsinline with a dark
overlay for text readability. Styles live in style.css §26.
