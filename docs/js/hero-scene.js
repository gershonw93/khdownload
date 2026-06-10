// Hero background: interactive particle terrain ("the map").
// Mouse hover raises a glowing ripple; clicking fires a shockwave ring.
import * as THREE from 'three';

const canvas = document.getElementById('heroCanvas');
const hero = document.getElementById('hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

if (canvas && supportsWebGL()) {
  init();
}

function init() {
  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  const SEG = isMobile ? 80 : 140;          // grid resolution per side
  const SIZE = 46;                           // world units per side
  const MAX_CLICKS = 6;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: true, powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0a08, 26, 52);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  camera.position.set(0, 7.4, 14);
  camera.lookAt(0, -0.5, 0);

  // --- particle grid ---
  const count = SEG * SEG;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  let i = 0;
  for (let y = 0; y < SEG; y++) {
    for (let x = 0; x < SEG; x++) {
      positions[i * 3] = (x / (SEG - 1) - 0.5) * SIZE;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = (y / (SEG - 1) - 0.5) * SIZE;
      seeds[i] = Math.random();
      i++;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(999, 999) },
    uMouseStrength: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uClicks: { value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector3(999, 999, -100)) },
    uColorA: { value: new THREE.Color(0xf0a500) },
    uColorB: { value: new THREE.Color(0xf7df4d) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uMouseStrength;
      uniform float uPixelRatio;
      uniform vec3 uClicks[${MAX_CLICKS}];
      attribute float aSeed;
      varying float vElev;
      varying float vGlow;

      void main() {
        vec3 p = position;

        // rolling terrain waves
        float wave = sin(p.x * 0.55 + uTime * 0.7) * cos(p.z * 0.45 + uTime * 0.55) * 0.55
                   + sin(p.x * 0.18 - uTime * 0.35) * sin(p.z * 0.22 + uTime * 0.4) * 0.9;

        // mouse ripple — a soft hill that follows the cursor
        float md = distance(p.xz, uMouse);
        float hill = exp(-md * md * 0.18) * 2.1 * uMouseStrength;
        float ring = sin(md * 3.0 - uTime * 4.0) * exp(-md * 0.55) * 0.45 * uMouseStrength;

        // click shockwaves — expanding rings
        float shock = 0.0;
        float shockGlow = 0.0;
        for (int k = 0; k < ${MAX_CLICKS}; k++) {
          float age = uTime - uClicks[k].z;
          if (age > 0.0 && age < 3.5) {
            float cd = distance(p.xz, uClicks[k].xy);
            float radius = age * 7.0;
            float band = exp(-pow(cd - radius, 2.0) * 0.55);
            float decay = exp(-age * 1.1);
            shock += band * decay * 2.4;
            shockGlow += band * decay;
          }
        }

        p.y += wave + hill + ring + shock;
        vElev = (p.y + 1.0) / 4.0;
        vGlow = clamp(hill * 0.55 + shockGlow + ring * 0.6, 0.0, 1.0);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (1.4 + aSeed * 1.3 + vGlow * 3.2) * uPixelRatio;
        gl_PointSize = size * (12.0 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vElev;
      varying float vGlow;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.05, d);
        vec3 color = mix(uColorA, uColorB, clamp(vElev, 0.0, 1.0));
        color += vGlow * vec3(1.0, 0.95, 0.55);
        gl_FragColor = vec4(color, alpha * (0.4 + vElev * 0.35 + vGlow * 0.6));
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // invisible plane for raycasting the cursor onto the terrain
  const rayPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE * 2, SIZE * 2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  scene.add(rayPlane);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(999, 999);
  const targetMouse = new THREE.Vector2(999, 999);
  let targetStrength = 0;
  let camDriftX = 0, camDriftY = 0;

  function pointerToNdc(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  hero.addEventListener('pointermove', (e) => {
    pointerToNdc(e);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(rayPlane)[0];
    if (hit) {
      targetMouse.set(hit.point.x, hit.point.z);
      targetStrength = 1;
    }
    camDriftX = ndc.x;
    camDriftY = ndc.y;
  }, { passive: true });

  hero.addEventListener('pointerleave', () => { targetStrength = 0; });

  let clickIndex = 0;
  hero.addEventListener('pointerdown', (e) => {
    pointerToNdc(e);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(rayPlane)[0];
    if (hit) {
      uniforms.uClicks.value[clickIndex].set(hit.point.x, hit.point.z, uniforms.uTime.value);
      clickIndex = (clickIndex + 1) % MAX_CLICKS;
    }
  }, { passive: true });

  // auto shockwave every few seconds so the scene feels alive untouched
  let lastAuto = 0;

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; })
    .observe(hero);

  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;

    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    // ease mouse uniforms toward targets
    const m = uniforms.uMouse.value;
    m.lerp(targetMouse, 0.08);
    uniforms.uMouseStrength.value += (targetStrength - uniforms.uMouseStrength.value) * 0.06;

    // ambient pulse when idle
    if (t - lastAuto > 6) {
      lastAuto = t;
      uniforms.uClicks.value[clickIndex].set(
        (Math.random() - 0.5) * SIZE * 0.5,
        (Math.random() - 0.5) * SIZE * 0.5,
        t
      );
      clickIndex = (clickIndex + 1) % MAX_CLICKS;
    }

    // gentle camera parallax
    camera.position.x += (camDriftX * 1.6 - camera.position.x) * 0.03;
    camera.position.y += (7.4 + camDriftY * 0.8 - camera.position.y) * 0.03;
    camera.lookAt(0, -0.5, 0);

    renderer.render(scene, camera);
  }

  if (reducedMotion) {
    uniforms.uTime.value = 4;
    resize();
    renderer.render(scene, camera);
  } else {
    frame();
  }
}
