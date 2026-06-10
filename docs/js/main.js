/* ClickTok Marketing — interactions
   GSAP + ScrollTrigger + Lenis (all vendored locally) */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktop = window.matchMedia('(min-width: 981px)').matches;

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ============ Smooth scroll (Lenis) ============ */
  let lenis = null;
  if (!reducedMotion) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(hash) {
    const el = document.querySelector(hash);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.4, force: true });
    else el.scrollIntoView({ behavior: 'smooth' });
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      if (hash.length > 1) {
        e.preventDefault();
        // close the mobile menu first: lenis.start() resets in-flight scrolls
        if (menuOpen) setMenu(false);
        scrollToTarget(hash);
      }
    });
  });

  /* ============ Preloader ============ */
  const preloader = document.getElementById('preloader');
  const countEl = document.getElementById('preloaderCount');

  function heroIntro() {
    const tl = gsap.timeline();
    tl.from('.hero__eyebrow', { y: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out' })
      .from('.hero__line .char', {
        yPercent: 115,
        duration: 0.9,
        stagger: 0.022,
        ease: 'power4.out',
      }, '-=0.4')
      .from('.hero__sub', { y: 26, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, '-=0.55')
      .from('.hero__cta .btn', { y: 22, autoAlpha: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }, '-=0.45')
      .from('.hero__hint, .hero__scroll, .nav', { autoAlpha: 0, duration: 0.8 }, '-=0.3');
  }

  // split hero title into characters before anything animates
  document.querySelectorAll('.hero__line').forEach((line) => {
    const frag = document.createDocumentFragment();
    [...line.childNodes].forEach((node) => {
      const isEm = node.nodeName === 'EM';
      const text = node.textContent;
      [...text].forEach((ch) => {
        if (ch === ' ') { frag.append(document.createTextNode(' ')); return; }
        const s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch;
        if (isEm) {
          const em = document.createElement('em');
          em.appendChild(s);
          frag.appendChild(em);
        } else {
          frag.appendChild(s);
        }
      });
    });
    line.replaceChildren(frag);
  });

  function finishLoading() {
    const tl = gsap.timeline({
      onComplete: () => {
        preloader.remove();
        document.body.removeAttribute('data-loading');
        heroIntro();
        ScrollTrigger.refresh();
      },
    });
    tl.to('.preloader__inner', { autoAlpha: 0, y: -30, duration: 0.5, ease: 'power2.in' })
      .to('.preloader__curtain', { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '-=0.1')
      .to(preloader, { autoAlpha: 0, duration: 0.2 }, '-=0.2');
  }

  if (reducedMotion) {
    preloader.remove();
    document.body.removeAttribute('data-loading');
    gsap.set('.hero__line .char', { yPercent: 0 });
  } else {
    gsap.to('.preloader__letter', {
      y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'power4.out', delay: 0.15,
    });
    const counter = { v: 0 };
    gsap.to(counter, {
      v: 100,
      duration: 1.4,
      ease: 'power2.inOut',
      onUpdate: () => { countEl.textContent = Math.round(counter.v); },
      onComplete: () => {
        if (document.readyState === 'complete') finishLoading();
        else window.addEventListener('load', finishLoading, { once: true });
      },
    });
  }

  /* ============ Custom cursor ============ */
  if (finePointer && !reducedMotion) {
    document.body.classList.add('has-cursor');
    const cursor = document.getElementById('cursor');
    const label = cursor.querySelector('.cursor__label');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const target = { x: pos.x, y: pos.y };

    window.addEventListener('pointermove', (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
    }, { passive: true });

    gsap.ticker.add(() => {
      pos.x += (target.x - pos.x) * 0.18;
      pos.y += (target.y - pos.y) * 0.18;
      cursor.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    });

    document.querySelectorAll('[data-cursor]').forEach((el) => {
      const mode = el.dataset.cursor;
      el.addEventListener('pointerenter', () => {
        cursor.classList.add(`cursor--${mode}`);
        if (mode === 'card') label.textContent = 'explore';
      });
      el.addEventListener('pointerleave', () => cursor.classList.remove(`cursor--${mode}`));
    });

    window.addEventListener('pointerdown', () => gsap.to('.cursor__ring', { scale: 0.8, duration: 0.15 }));
    window.addEventListener('pointerup', () => gsap.to('.cursor__ring', { scale: 1, duration: 0.3, ease: 'back.out(3)' }));
  }

  /* ============ Click sparks (everywhere) ============ */
  if (!reducedMotion) {
    const sparkCanvas = document.getElementById('sparks');
    const ctx = sparkCanvas.getContext('2d');
    let particles = [];
    let raf = null;

    function sizeSparks() {
      sparkCanvas.width = innerWidth * Math.min(devicePixelRatio, 2);
      sparkCanvas.height = innerHeight * Math.min(devicePixelRatio, 2);
      sparkCanvas.style.width = innerWidth + 'px';
      sparkCanvas.style.height = innerHeight + 'px';
      ctx.setTransform(Math.min(devicePixelRatio, 2), 0, 0, Math.min(devicePixelRatio, 2), 0, 0);
    }
    sizeSparks();
    window.addEventListener('resize', sizeSparks);

    const COLORS = ['#f7df4d', '#f0a500', '#f5f4ee', '#fff3b0'];

    window.addEventListener('pointerdown', (e) => {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
        const speed = 2.2 + Math.random() * 4;
        particles.push({
          x: e.clientX, y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          life: 1,
          size: 1.5 + Math.random() * 2.5,
          color: COLORS[(Math.random() * COLORS.length) | 0],
        });
      }
      if (!raf) loop();
    }, { passive: true });

    function loop() {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      particles = particles.filter((p) => p.life > 0);
      if (!particles.length) { cancelAnimationFrame(raf); raf = null; return; }
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.vx *= 0.985;
        p.life -= 0.022;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(p.size * p.life, 0), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ============ Nav: shrink + hide on scroll down ============ */
  const nav = document.getElementById('nav');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle('nav--scrolled', y > 40);
      nav.classList.toggle('nav--hidden', y > 600 && y > lastY && !menuOpen);
      lastY = y;
    },
  });

  /* ============ Mobile menu ============ */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  let menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    menu.classList.toggle('menu--open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* ============ Magnetic buttons ============ */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      const strength = 0.35;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: x * strength, y: y * strength, duration: 0.4, ease: 'power3.out' });
        gsap.to(el.querySelector('.btn__label'), { x: x * strength * 0.4, y: y * strength * 0.4, duration: 0.4 });
      });
      el.addEventListener('pointerleave', () => {
        gsap.to([el, el.querySelector('.btn__label')], { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* ============ Service cards: tilt + glare + click-expand ============ */
  document.querySelectorAll('.card').forEach((card) => {
    if (finePointer && !reducedMotion) {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--gx', `${px * 100}%`);
        card.style.setProperty('--gy', `${py * 100}%`);
        gsap.to(card, {
          rotateY: (px - 0.5) * 10,
          rotateX: (0.5 - py) * 8,
          duration: 0.5,
          ease: 'power2.out',
          transformPerspective: 900,
        });
      });
      card.addEventListener('pointerleave', () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
      });
    }
    const toggle = () => {
      const willOpen = !card.classList.contains('card--open');
      card.classList.toggle('card--open', willOpen);
      if (willOpen && !reducedMotion) {
        gsap.fromTo(card.querySelectorAll('.card__list li'),
          { x: -14, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out', delay: 0.1 });
      }
      setTimeout(() => ScrollTrigger.refresh(), 600);
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  /* ============ Scroll reveals ============ */
  // split [data-reveal] titles into masked lines (each <br> chunk = a line)
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines
      .map((l) => `<span class="reveal-line"><span>${l}</span></span>`)
      .join('');
    gsap.to(el.querySelectorAll('.reveal-line > span'), {
      y: 0,
      yPercent: 0,
      duration: 1,
      stagger: 0.12,
      ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  if (!reducedMotion) {
    gsap.utils.toArray('.card').forEach((card, i) => {
      gsap.from(card, {
        y: 70,
        autoAlpha: 0,
        duration: 0.9,
        delay: (i % 3) * 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 88%' },
      });
    });

    gsap.from('.chip', {
      y: 26,
      autoAlpha: 0,
      duration: 0.6,
      stagger: 0.07,
      ease: 'power3.out',
      scrollTrigger: { trigger: '#whyChips', start: 'top 90%' },
    });

    gsap.from('.contact__sub, .contact .btn--big', {
      y: 36,
      autoAlpha: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.contact', start: 'top 70%' },
    });
  }

  /* ============ Marquee: drift + scroll velocity ============ */
  if (!reducedMotion) {
    const track = document.getElementById('marqueeTrack');
    const groupWidth = () => track.children[0].offsetWidth;
    let xPos = 0;
    let velocity = 0;
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => { velocity += self.getVelocity() * 0.00045; },
    });
    gsap.ticker.add((_, delta) => {
      velocity *= 0.92;
      xPos -= (0.05 + Math.abs(velocity)) * delta * 0.06 * groupWidth() * 0.01;
      const w = groupWidth();
      if (xPos <= -w) xPos += w;
      track.style.transform = `translateX(${xPos}px)`;
    });
  }

  /* ============ Process: horizontal scroll (desktop) ============ */
  if (desktop && !reducedMotion) {
    const track = document.getElementById('processTrack');
    const wrap = document.getElementById('processWrap');
    const getDistance = () => track.scrollWidth - innerWidth;
    gsap.to(track, {
      x: () => -getDistance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '#process',
        start: 'top top',
        end: () => `+=${getDistance() * 1.4}`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
  } else if (!reducedMotion) {
    gsap.utils.toArray('.step').forEach((step) => {
      gsap.from(step, {
        y: 50,
        autoAlpha: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: step, start: 'top 90%' },
      });
    });
  }

  /* ============ Why statement: word-by-word light-up ============ */
  const statement = document.getElementById('whyStatement');
  statement.innerHTML = statement.textContent
    .trim()
    .split(/\s+/)
    .map((w) => `<span class="w">${w}</span>`)
    .join(' ');
  const words = statement.querySelectorAll('.w');
  if (reducedMotion) {
    words.forEach((w) => w.classList.add('lit'));
  } else {
    ScrollTrigger.create({
      trigger: statement,
      start: 'top 80%',
      end: 'bottom 45%',
      scrub: true,
      onUpdate: (self) => {
        const upto = Math.floor(self.progress * words.length);
        words.forEach((w, i) => w.classList.toggle('lit', i <= upto));
      },
    });
  }

  /* ============ Contact button: confetti pop ============ */
  const contactBtn = document.getElementById('contactBtn');
  contactBtn.addEventListener('click', () => {
    if (reducedMotion) return;
    gsap.fromTo(contactBtn, { scale: 0.94 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' });
  });
})();
