import { apps } from './content';

// CSS 3D version of the workspace for devices without WebGL/WebGPU.
// Same layout idea, built from DOM layers with perspective. No GPU API needed.

const VIEWS = [
  'rotateX(-12deg) rotateY(-18deg) translateZ(-120px)',
  'rotateX(-4deg) rotateY(0deg) translateZ(260px)',
  'rotateX(-8deg) rotateY(-42deg) translate3d(-260px, 0, 120px)',
  'rotateX(-6deg) rotateY(30deg) translate3d(330px, 0, 160px)',
  'rotateX(-38deg) rotateY(0deg) translate3d(0, -40px, 140px)',
  'rotateX(-16deg) rotateY(14deg) translateZ(-260px)',
];

export function initFallback(root: HTMLElement, reducedMotion: boolean) {
  const phones = apps
    .slice(0, 5)
    .map((a, i) => {
      const x = 190 + i * 62;
      const z = -Math.abs(i - 2) * 50 + 40;
      return `<div class="c3 c3-phone" style="left:${x}px;top:-140px;background:linear-gradient(${a.color},#0a0b10);transform:translateZ(${z}px) rotateY(${-(i - 2) * 12}deg);animation-delay:${i * -0.8}s"><div><b>${a.glyph}</b>${a.name}</div></div>`;
    })
    .join('');
  const bars = Array.from({ length: 30 }, (_, i) => `<i style="height:${10 + ((i * 37) % 90) * (0.4 + i / 50)}%"></i>`).join('');
  root.innerHTML = `
    <div class="c3-cam">
      <div class="c3-world" id="c3w">
        <div class="c3 c3-glow"></div>
        <div class="c3 c3-floor"></div>
        <div class="c3 c3-bars">${bars}</div>
        <div class="c3 c3-desk"></div>
        <div class="c3 c3-monitor"><em>class</em> Galib : Developer {<br>&nbsp; val handle = "@devgalib"<br>&nbsp; val apps = 11<br>&nbsp; fun build() = ship()<br>}</div>
        ${phones}
        <div class="c3 c3-cab"><div>↑ → ↓</div></div>
      </div>
    </div>`;
  const world = root.querySelector<HTMLElement>('#c3w')!;
  let stop = 0;
  let mx = 0;
  let my = 0;
  const apply = () => {
    const tilt = reducedMotion ? '' : ` rotateY(${mx * 6}deg) rotateX(${-my * 4}deg)`;
    world.style.transform = VIEWS[stop] + tilt;
  };
  if (!reducedMotion)
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
      apply();
    }, { passive: true });
  apply();
  return {
    setStop(p: number) {
      const s = Math.round(p);
      if (s !== stop) { stop = s; apply(); }
    },
  };
}
