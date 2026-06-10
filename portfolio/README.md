# Elara Voss — Portfolio Landing Page

A fictional UI/UX designer portfolio landing page. Fully self-contained static
site — all libraries and fonts are vendored locally, no CDN or build step needed.

## Run it

Serve the folder with any static server and open it in a browser:

```bash
cd portfolio
python3 -m http.server 8000
# → http://localhost:8000
```

(A server is required because the JS is loaded as an ES module; opening
`index.html` directly via `file://` will not work.)

## What's inside

- **Three.js** — full-screen domain-warped FBM "aurora" fragment shader backdrop,
  mouse-reactive, DPR-clamped, paused when the tab is hidden.
- **GSAP + ScrollTrigger** — preloader with counter, char-split hero reveal,
  scroll-driven section reveals, work-card parallax, scrub-highlighted about
  statement, stat counters, velocity-reactive marquee.
- **Lenis** — smooth scrolling, synced to ScrollTrigger.
- Custom cursor with hover states and magnetic buttons (fine pointers only).
- Fullscreen mobile menu, responsive `clamp()` typography, no horizontal
  overflow at any viewport.
- `prefers-reduced-motion` honored throughout (static shader frame, no
  animations); content remains visible if JS fails.

## Structure

```
portfolio/
├── index.html
├── css/style.css
├── fonts/            # Space Grotesk, Instrument Serif, JetBrains Mono (woff2)
└── js/
    ├── main.js
    └── vendor/       # gsap, ScrollTrigger, lenis, three (pinned local copies)
```
