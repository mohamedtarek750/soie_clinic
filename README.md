# Soie Clinic — Website

Luxury aesthetic clinic in New Cairo & Mohandseen. A fully static,
dependency-free site: hand-crafted HTML + CSS + vanilla JavaScript.
No build step — open `index.html` or serve the folder with any static server.

## Site map

| Page | File |
|---|---|
| Home (landing) | `index.html` |
| About | `about.html` |
| Doctors | `doctors.html` → `doctor-ghada.html`, `doctor-ghada-metwally.html`, `doctor-nada-salama.html` |
| Services | `services.html` → `service-<treatment>.html` (11 treatment pages) |
| Products | `products.html` |
| Before & After | `before-after.html` |
| Book Appointment | `book.html` |
| Contact | `contact.html` |
| FAQ | `faq.html` |

Shared assets: `style.css` (design tokens + all components), `script.js`
(all behaviour, element-guarded so one file serves every page),
`sitemap.xml`, `robots.txt`.

## Booking

`book.html` lets visitors choose **branch → doctor → treatment → date →
time**; the summary builds a pre-filled WhatsApp message to the chosen
branch. There is no backend — the team confirms each request personally.
Doctor/treatment pages deep-link with `book.html?doctor=<slug>` and
`book.html?service=<slug>`.

## Content that still needs owner input

- **Dr. Nada Salama's profile** — her Instagram is not publicly
  readable, so only verified basics are shown. Add her specialty, bio
  and treatments in `doctor-nada-salama.html` when confirmed.
- **Products** — `products.html` lists doctor-curated categories; replace
  with the clinic's actual retail range (brand, product, price) when
  confirmed.
- **Clinic statistics** — a commented-out block in the homepage stats
  section is ready for verified figures (happy clients, years of
  experience, treatments performed, patient satisfaction). Un-comment
  and replace the `XX` placeholders only with confirmed numbers.

Already provided by the owner: doctor portraits
(`assets/images/doctor-*.jpg`) and real client reviews — the homepage
shows the clinic's WhatsApp feedback screenshots exactly as provided
(`assets/images/reviews/`), with names blurred in the originals.

## Editing notes

- Design tokens (palette, type, shadows, easing) live at the top of
  `style.css`; all pages inherit them.
- The doctors' public data was compiled from their public Instagram
  profiles (July 2026): @drghada.health, @dr_ghada_metwally_facials,
  @dr.nadasalama.
- Inner pages were scaffolded from a shared template, so nav / footer /
  modal markup is identical across files — if you change one, mirror the
  change in the others (or ask your developer to regenerate).
