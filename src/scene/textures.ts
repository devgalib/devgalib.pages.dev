import * as THREE from 'three/webgpu';
import type { App } from '../content';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

const FONT = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', Consolas, monospace";

/** A phone screen that looks like an app home screen. */
export function phoneTexture(app: App): THREE.CanvasTexture {
  const [c, g] = canvas(256, 512);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, app.color);
  grd.addColorStop(1, '#0a0b10');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 512);

  // status bar
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.font = `600 14px ${FONT}`;
  g.fillText('9:41', 18, 26);
  g.fillRect(200, 16, 36, 10);

  // icon
  g.fillStyle = 'rgba(255,255,255,0.16)';
  roundRect(g, 78, 96, 100, 100, 28);
  g.fill();
  g.fillStyle = '#fff';
  g.font = `600 56px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(app.glyph, 128, 148);

  g.font = `700 24px ${FONT}`;
  g.fillText(app.name, 128, 236);
  g.font = `400 13px ${FONT}`;
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fillText(app.category, 128, 264);

  // fake UI cards
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `rgba(255,255,255,${0.1 - i * 0.015})`;
    roundRect(g, 22, 300 + i * 46, 212, 36, 10);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    roundRect(g, 34, 312 + i * 46, 80 + ((i * 37) % 60), 12, 6);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const CODE = [
  ['k', 'class '], ['t', 'Galib '], ['p', ': '], ['t', 'Developer'], ['p', ' {'], ['n', ''],
  ['p', '  '], ['k', 'val '], ['v', 'name '], ['p', '= '], ['s', '"Asadullah Hil Galib"'], ['n', ''],
  ['p', '  '], ['k', 'val '], ['v', 'handle '], ['p', '= '], ['s', '"@devgalib"'], ['n', ''],
  ['p', '  '], ['k', 'val '], ['v', 'stack '], ['p', '= '], ['f', 'listOf'], ['p', '('], ['s', '"Kotlin"'], ['p', ', '], ['s', '"Compose"'], ['p', ')'], ['n', ''],
  ['n', ''],
  ['p', '  '], ['k', 'override fun '], ['f', 'build'], ['p', '() = '], ['f', 'ship'], ['p', '('], ['n', ''],
  ['p', '    apps = '], ['v', '11'], ['p', ','], ['n', ''],
  ['p', '    games = '], ['v', '2'], ['p', ','], ['n', ''],
  ['p', '    offlineFirst = '], ['k', 'true'], ['p', ','], ['n', ''],
  ['p', '  )'], ['n', ''],
  ['n', ''],
  ['p', '  '], ['c', '// next: bigger worlds, in 3D'], ['n', ''],
  ['p', '}'], ['n', ''],
] as const;

const COLORS: Record<string, string> = { k: '#c792ea', t: '#ffcb6b', p: '#c9d0dd', v: '#82aaff', s: '#45f0b0', f: '#89ddff', c: '#5c6370' };

/** Monitor screen: an editor that types code. Call update(t) each frame. */
export function codeScreen() {
  const [c, g] = canvas(1024, 600);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const total = CODE.reduce((n, [, s]) => n + s.length, 0);
  let lastShown = -1;

  function draw(shown: number, cursorOn: boolean) {
    g.fillStyle = '#0b0d14';
    g.fillRect(0, 0, 1024, 600);
    // title bar
    g.fillStyle = '#12151f';
    g.fillRect(0, 0, 1024, 44);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(26 + i * 22, 22, 7, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = '#9aa3b5';
    g.font = `20px ${MONO}`;
    g.fillText('Galib.kt', 110, 29);

    g.font = `26px ${MONO}`;
    let x = 70;
    let y = 92;
    let line = 1;
    let left = shown;
    g.fillStyle = '#3b4252';
    g.fillText(String(line), 20, y);
    for (const [kind, text] of CODE) {
      if (kind === 'n') {
        y += 38;
        x = 70;
        line++;
        if (left > 0 || line <= 2) {
          g.fillStyle = '#3b4252';
          g.fillText(String(line), 20, y);
        }
        continue;
      }
      if (left <= 0) break;
      const part = text.slice(0, left);
      left -= text.length;
      g.fillStyle = COLORS[kind];
      g.fillText(part, x, y);
      x += g.measureText(part).width;
    }
    if (cursorOn) {
      g.fillStyle = '#45f0b0';
      g.fillRect(x + 2, y - 22, 13, 28);
    }
  }

  return {
    texture: tex,
    update(time: number) {
      const cycle = 16;
      const t = time % cycle;
      const shown = Math.min(total, Math.floor(t * 34));
      const cursor = Math.floor(time * 2) % 2 === 0;
      const key = shown * 2 + (cursor ? 1 : 0);
      if (key !== lastShown) {
        lastShown = key;
        draw(shown, cursor);
        tex.needsUpdate = true;
      }
    },
  };
}

/** Small label sprite texture (used for floating tags). */
export function labelTexture(text: string, color = '#45f0b0') {
  const [c, g] = canvas(512, 96);
  g.font = `600 44px ${MONO}`;
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.fillText(text, 12, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
