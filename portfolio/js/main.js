/* ==========================================================================
   Elara Voss — Portfolio 2026
   GSAP + ScrollTrigger + Lenis + Three.js
   ========================================================================== */
import * as THREE from "./vendor/three.module.min.js";

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* --------------------------------------------------------------------------
   Text splitting (chars for display type, words for paragraphs)
   -------------------------------------------------------------------------- */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = "";
  el.setAttribute("aria-label", text);
  const frag = document.createDocumentFragment();
  for (const word of text.split(" ")) {
    const w = document.createElement("span");
    w.className = "word";
    w.setAttribute("aria-hidden", "true");
    for (const ch of word) {
      const c = document.createElement("span");
      c.className = "char";
      c.textContent = ch;
      w.appendChild(c);
    }
    frag.appendChild(w);
    frag.appendChild(document.createTextNode(" "));
  }
  el.appendChild(frag);
  return el.querySelectorAll(".char");
}

document.querySelectorAll("[data-split]").forEach(splitChars);

/* --------------------------------------------------------------------------
   Smooth scroll (Lenis) + ScrollTrigger sync
   -------------------------------------------------------------------------- */
let lenis = null;
if (!prefersReducedMotion) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.2 });
  else target.scrollIntoView({ behavior: "smooth" });
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(target);
  });
});

document.getElementById("to-top").addEventListener("click", () => {
  scrollToTarget(document.body);
});

/* --------------------------------------------------------------------------
   Three.js — domain-warped aurora backdrop
   -------------------------------------------------------------------------- */
const canvas = document.getElementById("webgl");
const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
let renderer = null;

function initWebGL() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "low-power" });
  } catch {
    canvas.style.background =
      "radial-gradient(120% 90% at 70% 10%, #1d1640 0%, #0a0a0b 55%), #0a0a0b";
    return;
  }

  const maxDPR = window.innerWidth < 768 ? 1.5 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uIntro: { value: prefersReducedMotion ? 1 : 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform vec2 uRes;
      uniform vec2 uMouse;
      uniform float uIntro;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = rot * p * 2.0 + 100.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 1.7;
        float t = uTime * 0.055;
        vec2 m = (uMouse - 0.5) * 0.6;

        vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t * 1.3));
        vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + m),
                      fbm(p + 3.2 * q + vec2(8.3, 2.8) - m));
        float f = fbm(p + 3.0 * r);

        vec3 base   = vec3(0.040, 0.040, 0.045);
        vec3 violet = vec3(0.430, 0.230, 1.000);
        vec3 teal   = vec3(0.086, 0.880, 0.740);
        vec3 lime   = vec3(0.851, 1.000, 0.247);

        vec3 col = base;
        col = mix(col, violet * 0.50, smoothstep(0.25, 0.90, f) * 0.60);
        col = mix(col, teal * 0.42, smoothstep(0.45, 1.00, length(q)) * 0.34);
        col = mix(col, lime * 0.55, smoothstep(0.55, 0.95, r.x) * 0.28);

        float band = smoothstep(0.60, 0.70, f) * smoothstep(0.84, 0.72, f);
        col += lime * band * 0.30;

        float vig = smoothstep(1.30, 0.30, length(uv - 0.5));
        col *= vig;
        col *= uIntro;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  const clock = new THREE.Clock();
  let running = true;

  function render() {
    if (!running) return;
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
  }

  if (prefersReducedMotion) {
    uniforms.uTime.value = 12.0;
    renderer.render(scene, camera);
  } else {
    gsap.ticker.add(render);
    document.addEventListener("visibilitychange", () => {
      running = document.visibilityState === "visible";
      if (running) clock.getDelta();
    });
    // Fade the backdrop as the user scrolls past the hero
    gsap.to(canvas, {
      opacity: 0.3,
      ease: "none",
      scrollTrigger: { trigger: "#work", start: "top 90%", end: "top 20%", scrub: true },
    });
  }

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
  });

  window.addEventListener("pointermove", (e) => {
    mouse.tx = e.clientX / window.innerWidth;
    mouse.ty = 1 - e.clientY / window.innerHeight;
  });

  return uniforms;
}

const glUniforms = initWebGL();

/* --------------------------------------------------------------------------
   Preloader + hero intro
   -------------------------------------------------------------------------- */
const preloader = document.getElementById("preloader");

function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
  tl.to(".hero__line .char", { y: 0, duration: 1.2, stagger: 0.028 }, 0)
    .to("#hero [data-reveal]", { opacity: 1, y: 0, duration: 1, stagger: 0.12 }, 0.45);
  if (glUniforms) tl.to(glUniforms.uIntro, { value: 1, duration: 2.2, ease: "power2.inOut" }, 0);
}

function runPreloader() {
  if (prefersReducedMotion) {
    preloader.remove();
    gsap.set("#hero [data-reveal], [data-reveal]", { opacity: 1, y: 0 });
    gsap.set(".split .char", { y: 0 });
    return;
  }
  document.body.classList.add("is-locked");
  const countEl = document.getElementById("preloader-count");
  const bar = document.getElementById("preloader-bar");
  const state = { p: 0 };

  gsap.timeline()
    .to(state, {
      p: 100,
      duration: 1.6,
      ease: "power2.inOut",
      onUpdate() {
        countEl.textContent = Math.round(state.p);
        bar.style.width = state.p + "%";
      },
    })
    .to(".preloader__inner", { opacity: 0, y: -24, duration: 0.45, ease: "power2.in" })
    .to(".preloader__panel--l", { xPercent: -101, duration: 0.9, ease: "power4.inOut" }, "<0.15")
    .to(".preloader__panel--r", { xPercent: 101, duration: 0.9, ease: "power4.inOut" }, "<")
    .add(() => {
      document.body.classList.remove("is-locked");
      heroIntro();
    }, "-=0.55")
    .set(preloader, { display: "none" });
}

if (document.fonts && document.fonts.ready) {
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]).then(runPreloader);
} else {
  runPreloader();
}

/* --------------------------------------------------------------------------
   Scroll-driven reveals
   -------------------------------------------------------------------------- */
if (!prefersReducedMotion) {
  // Generic fade-up reveals (outside the hero, which the intro handles)
  document.querySelectorAll("main [data-reveal]:not(#hero [data-reveal])").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  // Section heading char reveals
  document.querySelectorAll(".section-head__title .split, .contact__title .split").forEach((el) => {
    gsap.to(el.querySelectorAll(".char"), {
      y: 0,
      duration: 1,
      ease: "power4.out",
      stagger: 0.025,
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  // Work cards: rise in + cover art parallax
  document.querySelectorAll("[data-work]").forEach((item) => {
    gsap.from(item, {
      y: 70,
      opacity: 0,
      duration: 1.1,
      ease: "power3.out",
      scrollTrigger: { trigger: item, start: "top 88%" },
    });
    const art = item.querySelector("[data-parallax]");
    gsap.fromTo(
      art,
      { yPercent: -7 },
      {
        yPercent: 7,
        ease: "none",
        scrollTrigger: { trigger: item, start: "top bottom", end: "bottom top", scrub: true },
      }
    );
  });

  // Services rows: stagger in
  gsap.from("[data-service]", {
    y: 48,
    opacity: 0,
    duration: 0.9,
    ease: "power3.out",
    stagger: 0.08,
    scrollTrigger: { trigger: ".services__list", start: "top 85%" },
  });

  // Footer wordmark slides up into view
  gsap.from(".footer__wordmark", {
    yPercent: 40,
    ease: "none",
    scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true },
  });
} else {
  gsap.set("[data-reveal]", { opacity: 1, y: 0 });
  gsap.set(".split .char", { y: 0 });
}

/* --------------------------------------------------------------------------
   About statement — word-by-word scrub highlight
   -------------------------------------------------------------------------- */
const statement = document.getElementById("about-statement");
{
  const words = statement.textContent.trim().split(/\s+/);
  statement.textContent = "";
  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = "w";
    span.textContent = word;
    statement.appendChild(span);
    if (i < words.length - 1) statement.appendChild(document.createTextNode(" "));
  });
  const spans = statement.querySelectorAll(".w");
  if (prefersReducedMotion) {
    spans.forEach((s) => s.classList.add("is-on"));
  } else {
    ScrollTrigger.create({
      trigger: statement,
      start: "top 80%",
      end: "bottom 45%",
      scrub: true,
      onUpdate(self) {
        const n = Math.floor(self.progress * spans.length);
        spans.forEach((s, i) => s.classList.toggle("is-on", i < n));
      },
    });
  }
}

/* --------------------------------------------------------------------------
   Stat counters
   -------------------------------------------------------------------------- */
document.querySelectorAll("[data-count]").forEach((el) => {
  const target = Number(el.dataset.count);
  if (prefersReducedMotion) {
    el.textContent = target;
    return;
  }
  gsap.fromTo(
    el,
    { textContent: 0 },
    {
      textContent: target,
      duration: 1.6,
      ease: "power2.out",
      snap: { textContent: 1 },
      scrollTrigger: { trigger: el, start: "top 88%" },
    }
  );
});

/* --------------------------------------------------------------------------
   Marquee — infinite loop, speed reacts to scroll velocity
   -------------------------------------------------------------------------- */
{
  const track = document.getElementById("marquee-track");
  if (!prefersReducedMotion) {
    const loop = gsap.to(track, { xPercent: -50, duration: 22, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      trigger: ".marquee",
      start: "top bottom",
      end: "bottom top",
      onUpdate(self) {
        const v = gsap.utils.clamp(-4, 4, self.getVelocity() / 220);
        gsap.to(loop, {
          timeScale: 1 + Math.abs(v),
          duration: 0.4,
          overwrite: true,
          onComplete: () => gsap.to(loop, { timeScale: 1, duration: 1.2 }),
        });
      },
    });
  }
}

/* --------------------------------------------------------------------------
   Custom cursor + magnetic elements (fine pointers only)
   -------------------------------------------------------------------------- */
if (isFinePointer && !prefersReducedMotion) {
  document.body.classList.add("has-cursor");
  const cursor = document.getElementById("cursor");
  const dot = cursor.querySelector(".cursor__dot");
  const ring = cursor.querySelector(".cursor__ring");
  const label = cursor.querySelector(".cursor__label");

  const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3.out" });
  const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3.out" });
  const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
  const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

  window.addEventListener("pointermove", (e) => {
    dotX(e.clientX); dotY(e.clientY);
    ringX(e.clientX); ringY(e.clientY);
  });

  document.querySelectorAll("[data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      const mode = el.dataset.cursor;
      cursor.classList.toggle("is-link", mode === "link");
      cursor.classList.toggle("is-view", mode === "view");
      label.textContent = mode === "view" ? "View" : "";
    });
    el.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-link", "is-view");
    });
  });

  // Magnetic buttons
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
    });
    el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
  });
}

/* --------------------------------------------------------------------------
   Mobile menu
   -------------------------------------------------------------------------- */
const menu = document.getElementById("menu");
const navToggle = document.getElementById("nav-toggle");
let menuOpen = false;

function openMenu() {
  menuOpen = true;
  document.body.classList.add("menu-open");
  navToggle.setAttribute("aria-expanded", "true");
  menu.setAttribute("aria-hidden", "false");
  if (lenis) lenis.stop();
  gsap.set(menu, { visibility: "visible" });
  gsap.timeline()
    .to(menu, { clipPath: "inset(0% 0 0% 0)", duration: 0.7, ease: "power4.inOut" })
    .from(".menu__link", { y: 60, opacity: 0, duration: 0.6, ease: "power3.out", stagger: 0.06 }, "-=0.25")
    .from(".menu__foot", { opacity: 0, duration: 0.4 }, "-=0.3");
}

function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  document.body.classList.remove("menu-open");
  navToggle.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-hidden", "true");
  if (lenis) lenis.start();
  gsap.to(menu, {
    clipPath: "inset(0 0 100% 0)",
    duration: 0.55,
    ease: "power4.inOut",
    onComplete: () => gsap.set(menu, { visibility: "hidden" }),
  });
}

gsap.set(menu, { clipPath: "inset(0 0 100% 0)" });
navToggle.addEventListener("click", () => (menuOpen ? closeMenu() : openMenu()));
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

/* --------------------------------------------------------------------------
   Local time widget (designer is Tokyo-based)
   -------------------------------------------------------------------------- */
{
  const el = document.getElementById("local-time");
  const fmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo",
  });
  const tick = () => (el.textContent = fmt.format(new Date()) + " TYO");
  tick();
  setInterval(tick, 30000);
}
