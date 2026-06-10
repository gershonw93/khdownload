# ClickTok Marketing — website

A fully static multi-page site. No build step — deploy the `docs/` folder
anywhere (GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any web host).

## Structure
- `index.html` — the funnel: outcome-led hero → "What's holding you back?"
  diagnostic (routes visitors to the right service) → process → why → one CTA
- `services/maps.html` — Local Google Ranking
- `services/websites.html` — Website Design & Build
- `services/ads.html` — Paid Ads
- `services/automation.html` — Process Automation
- `services/software.html` — Custom Software
- `clicktok-*.html` — self-contained standalone bundles of each page for
  local preview (download into one folder and the links work); not needed
  for deployment

## Stack
- **Three.js** — interactive particle-terrain hero (hover ripples, click shockwaves)
- **GSAP + ScrollTrigger** — preloader, text reveals, pinned horizontal process
  section, scroll-velocity marquee, scrub-lit "why" statement
- **Lenis** — smooth scrolling
- All libraries and fonts are vendored locally in `vendor/` and `fonts/` —
  no CDN dependencies, works offline.

## Interactions
- Custom cursor with hover states (desktop only)
- Magnetic buttons
- 3D tilt + cursor-tracking glare on service cards; click/tap to expand details
- Click anywhere → spark burst; click the hero terrain → shockwave
- Mobile friendly: touch-safe fallbacks, reduced particle counts,
  `prefers-reduced-motion` respected

## Local preview
```sh
cd docs && python3 -m http.server 8000
# open http://localhost:8000
```

## GitHub Pages
Repo Settings → Pages → Deploy from branch → select branch + `/docs` folder.
⚠️ Note: GitHub Pages requires the repository to be public (on free plans) —
this repo contains cookie/token files at the root that should be removed or
moved before making it public.
