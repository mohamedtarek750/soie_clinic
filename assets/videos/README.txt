HERO VIDEO
==========

hero-loop.mp4 — the clinic-tour reel from Soie's own Instagram
(reception with the lit sign, treatment prep, the equipment rooms),
prepared for the web:

  - H.264 high profile, CRF 26, 25 fps, audio stripped (plays silent)
  - 360x640 portrait source, 68 s, ~1.9 MB, +faststart
  - poster frame: ../images/hero-poster.jpg (the reception shot)

It plays as the homepage hero background: autoplay, muted, loop,
playsinline, behind a dark veil for text readability. Users with
prefers-reduced-motion get the still poster instead (script.js), and
the whisper of blur in style.css §26 hides upscaling artifacts on
large screens.

To swap in a new clip, replace hero-loop.mp4 (and ideally the poster)
with the same settings. A landscape 1920x1080 master, 10-20 s seamless
loop, under 8 MB, would look even sharper on big desktop displays.
