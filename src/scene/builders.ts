import * as THREE from 'three/webgpu';
import { apps } from '../content';
import { codeScreen, labelTexture, phoneTexture } from './textures';

export function rbox(w: number, h: number, d: number, r = 0.04) {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const bevel = Math.min(r * 0.6, d * 0.3);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - bevel * 2) / 2);
  return g;
}

const mat = (color: string, rough = 0.6, metal = 0.05, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, shadow = true) {
  const o = new THREE.Mesh(geo, m);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

/** Seeded random so the scene looks the same for everyone. */
export function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// ------------------------------------------------------------------ island
export function buildIsland() {
  const g = new THREE.Group();
  const top = mesh(new THREE.CylinderGeometry(7, 6.7, 0.5, 64), mat('#11131c', 0.85), false);
  top.position.y = -0.25;
  g.add(top);

  // glowing grid on the floor
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d')!;
  const grd = x.createRadialGradient(512, 512, 40, 512, 512, 512);
  grd.addColorStop(0, '#171b28');
  grd.addColorStop(1, '#0c0e15');
  x.fillStyle = grd;
  x.fillRect(0, 0, 1024, 1024);
  x.strokeStyle = 'rgba(69,240,176,0.16)';
  x.lineWidth = 2;
  for (let i = 0; i <= 1024; i += 64) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 1024); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(1024, i); x.stroke();
  }
  x.strokeStyle = 'rgba(69,240,176,0.55)';
  x.lineWidth = 4;
  x.beginPath(); x.arc(512, 512, 506, 0, Math.PI * 2); x.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const floor = mesh(new THREE.CircleGeometry(6.95, 64), mat('#ffffff', 0.9, 0, { map: tex }), false);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.002;
  g.add(floor);

  // rocky underside
  const under = new THREE.ConeGeometry(6.7, 4.2, 18, 4);
  const pos = under.attributes.position as THREE.BufferAttribute;
  const r = rng(11);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 2.05) {
      pos.setX(i, pos.getX(i) * (0.85 + r() * 0.3));
      pos.setZ(i, pos.getZ(i) * (0.85 + r() * 0.3));
      pos.setY(i, y + (r() - 0.5) * 0.4);
    }
  }
  under.computeVertexNormals();
  const rock = mesh(under, mat('#191527', 0.95, 0, { flatShading: true }), false);
  rock.rotation.x = Math.PI;
  rock.position.y = -2.6;
  g.add(rock);

  // rim light strip
  const rim = new THREE.Mesh(new THREE.TorusGeometry(6.98, 0.025, 8, 160), new THREE.MeshBasicMaterial({ color: '#45f0b0' }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.0;
  g.add(rim);

  // small floating rocks
  const rocks = new THREE.Group();
  const rm = mat('#1d1830', 0.95, 0, { flatShading: true });
  for (let i = 0; i < 9; i++) {
    const s = 0.25 + r() * 0.55;
    const m = mesh(new THREE.DodecahedronGeometry(s, 0), rm, false);
    const a = (i / 9) * Math.PI * 2 + r();
    const d = 8.5 + r() * 3;
    m.position.set(Math.cos(a) * d, -1.5 + r() * 3.5, Math.sin(a) * d);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    m.userData.phase = r() * Math.PI * 2;
    rocks.add(m);
  }
  g.add(rocks);
  return { group: g, rocks };
}

// ------------------------------------------------------------------ desk + monitor
export function buildDesk() {
  const g = new THREE.Group();
  const wood = mat('#3b2b20', 0.55, 0.0);
  const dark = mat('#1a1d27', 0.4, 0.4);
  const top = mesh(rbox(3.4, 1.5, 0.1, 0.06), wood);
  top.rotation.x = -Math.PI / 2;
  top.position.y = 1.05;
  g.add(top);
  for (const [lx, lz] of [[-1.55, -0.6], [1.55, -0.6], [-1.55, 0.6], [1.55, 0.6]]) {
    const leg = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 12), dark);
    leg.position.set(lx, 0.5, lz);
    g.add(leg);
  }

  // monitor
  const stand = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.42, 16), dark);
  stand.position.set(0, 1.3, -0.4);
  g.add(stand);
  const foot = mesh(rbox(0.6, 0.3, 0.03, 0.08), dark);
  foot.rotation.x = -Math.PI / 2;
  foot.position.set(0, 1.115, -0.4);
  g.add(foot);
  const frame = mesh(rbox(2.0, 1.2, 0.07, 0.06), mat('#0e1017', 0.35, 0.5));
  frame.position.set(0, 1.95, -0.42);
  g.add(frame);
  const code = codeScreen();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), new THREE.MeshBasicMaterial({ map: code.texture, toneMapped: false }));
  screen.position.set(0, 1.95, -0.38);
  screen.name = 'monitor';
  g.add(screen);

  // keyboard with glowing keys
  const kb = mesh(rbox(1.1, 0.36, 0.04, 0.04), mat('#14161f', 0.5, 0.3));
  kb.rotation.x = -Math.PI / 2;
  kb.position.set(-0.05, 1.125, 0.25);
  g.add(kb);
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.02, 0.07), mat('#262a38', 0.5, 0.2, { emissive: '#45f0b0', emissiveIntensity: 0.06 }), 4 * 13);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 13; col++) {
      m4.makeTranslation(-0.05 - 0.48 + col * 0.08, 1.155, 0.25 - 0.12 + row * 0.08);
      keys.setMatrixAt(k++, m4);
    }
  g.add(keys);

  // mouse
  const mouse = mesh(new THREE.CapsuleGeometry(0.05, 0.06, 4, 12), mat('#14161f', 0.4, 0.3));
  mouse.rotation.x = Math.PI / 2;
  mouse.scale.set(1, 1, 0.5);
  mouse.position.set(0.8, 1.12, 0.3);
  g.add(mouse);

  // mug with steam-free glow
  const mug = mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.2, 20), mat('#e9edf5', 0.3));
  mug.position.set(1.25, 1.2, -0.05);
  g.add(mug);
  const handle = mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 16), mat('#e9edf5', 0.3));
  handle.position.set(1.35, 1.2, -0.05);
  g.add(handle);

  // lamp
  const lampMat = mat('#2a2e3d', 0.4, 0.6);
  const base = mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 20), lampMat);
  base.position.set(-1.35, 1.12, -0.35);
  g.add(base);
  const arm = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), lampMat);
  arm.position.set(-1.25, 1.5, -0.3);
  arm.rotation.z = -0.3;
  g.add(arm);
  const head = mesh(new THREE.ConeGeometry(0.14, 0.2, 20, 1, true), lampMat);
  head.position.set(-1.05, 1.86, -0.22);
  head.rotation.z = 0.9;
  g.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshBasicMaterial({ color: '#ffd59a' }));
  bulb.position.set(-1.0, 1.8, -0.2);
  g.add(bulb);
  const lamp = new THREE.PointLight('#ffb057', 6, 4, 1.6);
  lamp.position.set(-0.95, 1.7, -0.15);
  g.add(lamp);

  // plant
  const pot = mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.24, 16), mat('#c96f4a', 0.8));
  pot.position.set(1.45, 1.22, -0.5);
  g.add(pot);
  const leafMat = mat('#2fae6f', 0.6, 0, { flatShading: true });
  const r = rng(5);
  for (let i = 0; i < 7; i++) {
    const leaf = mesh(new THREE.ConeGeometry(0.05, 0.42 + r() * 0.2, 5), leafMat);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(1.45 + Math.cos(a) * 0.05, 1.5, -0.5 + Math.sin(a) * 0.05);
    leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(leaf);
  }

  // monitor glow light
  const glow = new THREE.PointLight('#45f0b0', 3, 3.5, 1.8);
  glow.position.set(0, 1.9, 0.2);
  g.add(glow);

  return { group: g, code, screen };
}

// ------------------------------------------------------------------ phones
export function buildPhones() {
  const g = new THREE.Group();
  const textures = apps.map(phoneTexture);
  const bodyMat = mat('#0d0f16', 0.3, 0.7);
  const body = rbox(0.66, 1.32, 0.07, 0.1);
  const screenGeo = new THREE.PlaneGeometry(0.58, 1.2);
  const phones: { obj: THREE.Group; screen: THREE.Mesh; idx: number; phase: number; base: THREE.Vector3; flip: number }[] = [];
  const COUNT = 5;
  for (let i = 0; i < COUNT; i++) {
    const p = new THREE.Group();
    p.add(mesh(body, bodyMat));
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: textures[i], toneMapped: false }));
    screen.position.z = 0.041;
    screen.name = 'phone';
    p.add(screen);
    const a = (i - (COUNT - 1) / 2) * 0.42;
    const base = new THREE.Vector3(Math.sin(a) * 1.9, 1.95 + Math.cos(i * 1.7) * 0.18, -Math.cos(a) * 1.9 + 1.9);
    p.position.copy(base);
    p.rotation.y = -a * 0.9;
    g.add(p);
    phones.push({ obj: p, screen, idx: i, phase: i * 1.3, base, flip: -1 });
  }
  // pedestal
  const ped = mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.14, 48), mat('#151826', 0.5, 0.4));
  ped.position.set(0, 0.07, 0.35);
  g.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.015, 8, 96), new THREE.MeshBasicMaterial({ color: '#8b7bff' }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.145, 0.35);
  g.add(ring);
  const light = new THREE.PointLight('#8b7bff', 5, 5, 1.5);
  light.position.set(0, 2.2, 1.6);
  g.add(light);

  let next = COUNT;
  let timer = 0;
  let which = 0;
  function update(t: number, dt: number) {
    timer += dt;
    if (timer > 2.4) {
      timer = 0;
      phones[which].flip = 0;
      which = (which + 1) % COUNT;
    }
    for (const ph of phones) {
      ph.obj.position.y = ph.base.y + Math.sin(t * 1.1 + ph.phase) * 0.07;
      if (ph.flip >= 0) {
        ph.flip += dt / 0.8;
        const e = Math.min(1, ph.flip);
        ph.obj.rotation.y = -Math.asin(ph.base.x / 1.9) * 0.9 + e * Math.PI * 2;
        if (e > 0.5 && ph.idx !== next % textures.length && ph.flip - dt / 0.8 <= 0.5) {
          ph.idx = next % textures.length;
          next++;
          (ph.screen.material as THREE.MeshBasicMaterial).map = textures[ph.idx];
          (ph.screen.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
        if (e >= 1) ph.flip = -1;
      }
    }
  }
  return { group: g, update };
}

// ------------------------------------------------------------------ arcade cabinet
export function buildCabinet(puzzleCanvas: HTMLCanvasElement) {
  const g = new THREE.Group();
  const body = mat('#1d1538', 0.45, 0.3);
  const trim = new THREE.MeshBasicMaterial({ color: '#8b7bff' });

  const lower = mesh(rbox(1.2, 1.1, 0.9, 0.05), body);
  lower.position.set(0, 0.55, 0);
  g.add(lower);
  const panel = mesh(rbox(1.3, 0.12, 0.55, 0.04), mat('#2a1f52', 0.4, 0.3));
  panel.position.set(0, 1.18, 0.3);
  panel.rotation.x = 0.25;
  g.add(panel);
  const upper = mesh(rbox(1.2, 1.25, 0.7, 0.05), body);
  upper.position.set(0, 1.85, -0.1);
  g.add(upper);
  const marquee = mesh(rbox(1.3, 0.32, 0.8, 0.05), body);
  marquee.position.set(0, 2.62, -0.05);
  g.add(marquee);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.26), new THREE.MeshBasicMaterial({ map: labelTexture('ARROW PUZZLE', '#ffb057'), transparent: true, toneMapped: false }));
  sign.position.set(0.04, 2.62, 0.36);
  g.add(sign);

  const tex = new THREE.CanvasTexture(puzzleCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  // upper body front face is at z = 0.25; sit just in front of it, flat, so no row clips into the body
  screen.position.set(0, 1.96, 0.262);
  screen.name = 'cabinet';
  g.add(screen);

  // controls
  const stick = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), mat('#111', 0.4));
  stick.position.set(-0.3, 1.33, 0.32);
  g.add(stick);
  const ball = mesh(new THREE.SphereGeometry(0.06, 16, 16), mat('#ff5d73', 0.3));
  ball.position.set(-0.3, 1.43, 0.32);
  g.add(ball);
  const btnCols = ['#45f0b0', '#ffb057', '#5ec8ff'];
  btnCols.forEach((col, i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), new THREE.MeshBasicMaterial({ color: col }));
    b.position.set(0.08 + i * 0.16, 1.27, 0.34);
    b.rotation.x = 0.25;
    g.add(b);
  });

  // neon edges
  for (const sx of [-0.61, 0.61]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.7, 0.02), trim);
    strip.position.set(sx, 1.38, 0.47);
    g.add(strip);
  }
  const light = new THREE.PointLight('#8b7bff', 4, 4, 1.6);
  light.position.set(0, 2.0, 1.2);
  g.add(light);

  return { group: g, texture: tex, screen };
}

// ------------------------------------------------------------------ contribution skyline
export function buildSkyline() {
  const W = 30;
  const H = 7;
  const geo = new THREE.BoxGeometry(0.16, 1, 0.16);
  geo.translate(0, 0.5, 0);
  const m = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, emissive: '#0f3a2a', emissiveIntensity: 0.6 });
  const inst = new THREE.InstancedMesh(geo, m, W * H);
  inst.castShadow = true;
  inst.receiveShadow = true;
  inst.name = 'skyline';
  const r = rng(3);
  const heights: number[] = [];
  const shades = ['#16302a', '#1b6b4c', '#27a874', '#45f0b0', '#a6ffd9'];
  const c = new THREE.Color();
  for (let w = 0; w < W; w++)
    for (let d = 0; d < H; d++) {
      // more activity toward recent weeks, like a real streak
      const trend = 0.25 + (w / W) * 0.75;
      const v = Math.max(0, Math.min(1, r() * trend + (r() > 0.92 ? 0.4 : 0)));
      const lvl = Math.min(4, Math.floor(v * 5));
      heights.push(0.05 + v * v * 1.4);
      c.set(shades[lvl]);
      inst.setColorAt(w * H + d, c);
    }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  function apply(grow: number, t: number) {
    for (let w = 0; w < W; w++)
      for (let d = 0; d < H; d++) {
        const i = w * H + d;
        const delay = (w / W) * 0.6;
        const e = Math.max(0, Math.min(1, (grow - delay) / 0.4));
        const wave = 1 + Math.sin(t * 2 + w * 0.4 + d) * 0.04;
        p.set((w - W / 2) * 0.2, 0, (d - H / 2) * 0.2);
        s.set(1, Math.max(0.02, heights[i] * e * wave), 1);
        m4.compose(p, q, s);
        inst.setMatrixAt(i, m4);
      }
    inst.instanceMatrix.needsUpdate = true;
  }
  apply(1, 0);
  const g = new THREE.Group();
  g.add(inst);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.48), new THREE.MeshBasicMaterial({ map: labelTexture('12,458 commits', '#45f0b0'), transparent: true, toneMapped: false, depthWrite: false }));
  tag.position.set(-1.7, 1.9, 0);
  g.add(tag);
  return { group: g, apply };
}

// ------------------------------------------------------------------ ambient bits
export function buildDust(count: number) {
  const geo = new THREE.OctahedronGeometry(0.025, 0);
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#7f8cff', transparent: true, opacity: 0.7 }), count);
  const r = rng(99);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = 2 + r() * 14;
    m4.makeTranslation(Math.cos(a) * d, -3 + r() * 11, Math.sin(a) * d);
    inst.setMatrixAt(i, m4);
  }
  return inst;
}

export function buildTags() {
  const words = ['fun ship()', '<Compose />', 'offlineFirst', 'Kotlin', 'Three.js', '@devgalib', 'git push', 'val apps = 11'];
  const g = new THREE.Group();
  const r = rng(21);
  words.forEach((w, i) => {
    const mtl = new THREE.SpriteMaterial({ map: labelTexture(w, i % 2 ? '#8b7bff' : '#45f0b0'), transparent: true, opacity: 0.55, depthWrite: false });
    const s = new THREE.Sprite(mtl);
    // keep tags behind and beside the island so they never drift into the camera's face
    const a = Math.PI * 1.05 + (i / (words.length - 1)) * Math.PI * 0.9;
    const d = 8 + r() * 3;
    s.position.set(Math.cos(a) * d, 3 + r() * 3.5, Math.sin(a) * d);
    s.scale.set(2.0, 0.375, 1);
    s.userData.phase = r() * 6;
    s.userData.y = s.position.y;
    g.add(s);
  });
  return g;
}
