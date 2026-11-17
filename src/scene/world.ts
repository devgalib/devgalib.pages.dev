import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { buildCabinet, buildDesk, buildDust, buildIsland, buildPhones, buildSkyline, buildTags } from './builders';

type Stop = { pos: [number, number, number]; target: [number, number, number] };

// Camera stops, one per page section: hero, about, apps, games, code, contact.
const STOPS: Stop[] = [
  { pos: [1.2, 5.0, 13.8], target: [0.3, 1.1, 0] },
  { pos: [0.9, 2.15, 2.9], target: [0, 1.85, -0.4] },
  { pos: [7.3, 2.5, 5.6], target: [4.1, 1.85, 0.95] },
  { pos: [-1.9, 2.25, 3.1], target: [-4.1, 1.75, 0.6] },
  { pos: [2.6, 4.2, 1.6], target: [0, 0.6, -3.7] },
  { pos: [0, 8.5, 18], target: [0, 1.0, 0] },
];
const PICKS: Record<string, number> = { monitor: 1, phone: 2, cabinet: 3, skyline: 4 };

export type WorldOptions = {
  canvas: HTMLCanvasElement;
  puzzleCanvas: HTMLCanvasElement;
  forceWebGL: boolean;
  lowPower: boolean;
  reducedMotion: boolean;
  log: (msg: string, pct: number) => void;
};

export class World {
  renderer!: THREE.WebGPURenderer;
  backend = 'WebGL';
  onPick: (stop: number) => void = () => {};
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  private pipeline?: THREE.RenderPipeline;
  private clock = new THREE.Timer();
  private stop = 0;
  private camPos = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private wantPos = new THREE.Vector3();
  private wantTarget = new THREE.Vector3();
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private ray = new THREE.Raycaster();
  private pickables: THREE.Object3D[] = [];
  private frameTimes: number[] = [];
  private degraded = false;
  private skylineGrow = 0;
  private distK = 1;
  private parts!: {
    desk: ReturnType<typeof buildDesk>;
    phones: ReturnType<typeof buildPhones>;
    cabinet: ReturnType<typeof buildCabinet>;
    skyline: ReturnType<typeof buildSkyline>;
    island: ReturnType<typeof buildIsland>;
    tags: THREE.Group;
    dust: THREE.InstancedMesh;
  };

  constructor(private o: WorldOptions) {}

  async init() {
    const { canvas, forceWebGL, lowPower, log } = this.o;
    log('init renderer', 10);
    this.renderer = new THREE.WebGPURenderer({ canvas, antialias: !lowPower, forceWebGL, powerPreference: 'high-performance' });
    await this.renderer.init();
    // @ts-expect-error backend type is not exported
    this.backend = this.renderer.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL 2';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !lowPower;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    log(`backend: <b>${this.backend}</b>`, 25);

    const s = this.scene;
    s.background = new THREE.Color('#07080c');
    s.fog = new THREE.Fog('#07080c', 16, 42);

    log('lighting', 35);
    s.add(new THREE.HemisphereLight('#8b9bff', '#120f1c', 0.9));
    const key = new THREE.DirectionalLight('#ffffff', 1.6);
    key.position.set(5, 9, 6);
    key.castShadow = !lowPower;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    s.add(key);
    const rim = new THREE.DirectionalLight('#8b7bff', 1.2);
    rim.position.set(-6, 4, -8);
    s.add(rim);

    log('island', 45);
    const island = buildIsland();
    s.add(island.group);

    log('desk + monitor', 55);
    const desk = buildDesk();
    s.add(desk.group);

    log('phones (11 apps)', 65);
    const phones = buildPhones();
    phones.group.position.set(3.9, 0, 0.6);
    phones.group.rotation.y = 0.6;
    s.add(phones.group);

    log('arcade cabinet', 72);
    const cabinet = buildCabinet(this.o.puzzleCanvas);
    cabinet.group.position.set(-4.1, 0, 0.4);
    cabinet.group.rotation.y = 0.75;
    s.add(cabinet.group);

    log('contribution skyline', 80);
    const skyline = buildSkyline();
    skyline.group.position.set(0, 0, -3.7);
    s.add(skyline.group);

    const tags = buildTags();
    s.add(tags);
    const dust = buildDust(lowPower ? 140 : 320);
    s.add(dust);

    this.parts = { desk, phones, cabinet, skyline, island, tags, dust };
    this.pickables = [desk.screen, cabinet.screen, skyline.group.children[0], ...phones.group.children.filter((c) => c.type === 'Group')];

    log('post-processing', 88);
    if (!lowPower) this.setupBloom();

    this.camPos.set(...STOPS[0].pos).add(new THREE.Vector3(0, 6, 14));
    this.camTarget.set(...STOPS[0].target);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    }, { passive: true });
    canvas.addEventListener('click', (e) => this.pick(e));
    canvas.addEventListener('pointermove', (e) => {
      canvas.style.cursor = this.hit(e) >= 0 ? 'pointer' : '';
    }, { passive: true });

    log('compiling shaders', 94);
    await this.renderer.compileAsync(s, this.camera);
    log('ready', 100);
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private setupBloom() {
    const pipeline = new THREE.RenderPipeline(this.renderer);
    const scenePass = pass(this.scene, this.camera);
    const color = scenePass.getTextureNode('output');
    const glow = bloom(color, 0.55, 0.45, 0.62);
    pipeline.outputNode = color.add(glow);
    this.pipeline = pipeline;
  }

  setStop(p: number) {
    this.stop = Math.max(0, Math.min(STOPS.length - 1, p));
  }

  private hit(e: MouseEvent) {
    const r = this.o.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    const hits = this.ray.intersectObjects(this.pickables, true);
    if (!hits.length) return -1;
    let o: THREE.Object3D | null = hits[0].object;
    while (o) {
      if (PICKS[o.name] !== undefined) return PICKS[o.name];
      if (o.children.some((c) => c.name === 'phone')) return PICKS.phone;
      o = o.parent;
    }
    return -1;
  }

  private pick(e: MouseEvent) {
    const s = this.hit(e);
    if (s >= 0) this.onPick(s);
  }

  private resize() {
    const w = innerWidth;
    const h = innerHeight;
    const aspect = w / h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = aspect;
    this.distK = aspect < 1 ? 1 + (1 - aspect) * 0.75 : 1;
    // keep roughly the same horizontal coverage on narrow screens
    this.camera.fov = aspect >= 1.7 ? 40 : Math.min(75, (2 * Math.atan(Math.tan((40 * Math.PI) / 360) * (1.7 / aspect)) * 180) / Math.PI);
    // shift the scene so it sits beside / above the content panels
    if (w > 860) this.camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    else this.camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    this.camera.updateProjectionMatrix();
  }

  private sample(p: number, outPos: THREE.Vector3, outTarget: THREE.Vector3) {
    const i = Math.min(STOPS.length - 2, Math.floor(p));
    let f = p - i;
    f = f * f * (3 - 2 * f); // smoothstep between stops
    const a = STOPS[i];
    const b = STOPS[i + 1];
    outPos.set(a.pos[0] + (b.pos[0] - a.pos[0]) * f, a.pos[1] + (b.pos[1] - a.pos[1]) * f, a.pos[2] + (b.pos[2] - a.pos[2]) * f);
    outTarget.set(a.target[0] + (b.target[0] - a.target[0]) * f, a.target[1] + (b.target[1] - a.target[1]) * f, a.target[2] + (b.target[2] - a.target[2]) * f);
    // portrait screens: step back so the subject still fits the narrow view
    if (this.distK !== 1) outPos.sub(outTarget).multiplyScalar(this.distK).add(outTarget);
    // lift the path between stops so the camera arcs over the island instead of clipping through objects
    const arc = Math.sin(f * Math.PI) * 1.6;
    outPos.y += arc;
  }

  private frame() {
    this.clock.update();
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.getElapsed();
    const { reducedMotion } = this.o;
    const P = this.parts;

    this.sample(this.stop, this.wantPos, this.wantTarget);
    // gentle orbit on the hero and contact views
    const orbitW = Math.max(0, 1 - this.stop) + Math.max(0, this.stop - 4);
    if (!reducedMotion && orbitW > 0) {
      const a = Math.sin(t * 0.15) * 0.35 * orbitW;
      const dx = this.wantPos.x - this.wantTarget.x;
      const dz = this.wantPos.z - this.wantTarget.z;
      this.wantPos.x = this.wantTarget.x + dx * Math.cos(a) - dz * Math.sin(a);
      this.wantPos.z = this.wantTarget.z + dx * Math.sin(a) + dz * Math.cos(a);
    }
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 3));
    if (!reducedMotion) {
      this.wantPos.x += this.pointerSmooth.x * 0.35;
      this.wantPos.y += this.pointerSmooth.y * 0.2;
    }
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    this.camPos.lerp(this.wantPos, k);
    this.camTarget.lerp(this.wantTarget, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);

    if (!reducedMotion) {
      P.desk.code.update(t);
      P.phones.update(t, dt);
      for (const r of P.island.rocks.children) r.position.y += Math.sin(t * 0.6 + r.userData.phase) * 0.002;
      for (const s of P.tags.children) s.position.y = s.userData.y + Math.sin(t * 0.5 + s.userData.phase) * 0.25;
      P.dust.rotation.y = t * 0.02;
    } else {
      P.desk.code.update(1e3);
    }
    const wantGrow = this.stop > 3.4 ? 1 : 0.35;
    this.skylineGrow += (wantGrow - this.skylineGrow) * (1 - Math.exp(-dt * 2));
    P.skyline.apply(reducedMotion ? 1 : this.skylineGrow * 1.6, reducedMotion ? 0 : t);

    if (this.pipeline) this.pipeline.render();
    else this.renderer.render(this.scene, this.camera);

    this.watchPerf(dt);
  }

  /** If the device struggles, step quality down (resolution, then bloom, then shadows) instead of stuttering. */
  private quality = 3;
  private watchPerf(dt: number) {
    if (this.degraded || this.clock.getElapsed() < 2.5 || document.hidden) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 120) return;
    const sorted = this.frameTimes.slice().sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.frameTimes = [];
    if (median <= 1 / 45) return;
    this.quality--;
    if (this.quality === 2) this.renderer.setPixelRatio(Math.min(1, window.devicePixelRatio));
    else if (this.quality === 1) this.pipeline = undefined;
    else {
      this.renderer.shadowMap.enabled = false;
      this.degraded = true;
    }
    this.resize();
    this.onQuality(this.quality);
    console.info('[portfolio] quality step ->', this.quality, `(${(1 / median).toFixed(0)} fps)`);
  }
  onQuality: (q: number) => void = () => {};

  markTextureDirty() {
    if (this.parts) this.parts.cabinet.texture.needsUpdate = true;
  }
}
