HERO VIDEO (currently disabled)
===============================

The owner prefers the original silk-gradient hero, so the video hero is
switched off — but everything needed to re-enable it is kept here:

  hero-loop.mp4 — owner-provided clinic clip (the lit Soie sign and a
  welcoming door), already optimized for the web:
    - H.264 high profile, CRF 24, 30 fps, audio stripped
    - 464x672 (portrait source), ~340 KB, +faststart
  poster frame: ../images/hero-poster.jpg

To re-activate, in index.html:
  1. Add class "hero--video" to the <section class="hero">
  2. Un-comment the <video> + .hero__veil block at the top of the hero

It will play autoplay + muted + loop + playsinline behind a dark veil;
users with prefers-reduced-motion get the still poster (script.js).
Styles live in style.css §26. A landscape 1920x1080 master, 10-20 s
seamless loop, under 8 MB, would look even sharper on large screens.
