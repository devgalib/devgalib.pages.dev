// Mini Arrow Puzzle: tap an arrow; it slides out if nothing blocks its lane.

type Dir = 0 | 1 | 2 | 3; // up, right, down, left
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const COLORS = ['#45f0b0', '#8b7bff', '#ffb057', '#5ec8ff'];
const LEVELS = [
  { n: 4, count: 9 },
  { n: 5, count: 15 },
  { n: 6, count: 23 },
  { n: 7, count: 32 },
  { n: 8, count: 44 },
];

type Moving = { x: number; y: number; d: Dir; t: number };
type Shake = { x: number; y: number; t: number };

export class ArrowPuzzle {
  private g: CanvasRenderingContext2D;
  private grid: (Dir | -1)[][] = [];
  private n = 4;
  private level = 0;
  private hearts = 3;
  private moving: Moving[] = [];
  private shake: Shake | null = null;
  private cursor = { x: 0, y: 0 };
  private showCursor = false;
  private raf = 0;
  private last = 0;
  private winT = -1;
  private seed = 7;

  constructor(
    private canvas: HTMLCanvasElement,
    private ui: { level: HTMLElement; hearts: HTMLElement; msg: HTMLElement; reset: HTMLElement },
    private onChange: () => void = () => {},
  ) {
    this.g = canvas.getContext('2d')!;
    canvas.tabIndex = 0;
    canvas.addEventListener('pointerdown', (e) => this.onPointer(e));
    canvas.addEventListener('keydown', (e) => this.onKey(e));
    canvas.addEventListener('focus', () => { this.showCursor = true; this.draw(); });
    canvas.addEventListener('blur', () => { this.showCursor = false; this.draw(); });
    ui.reset.addEventListener('click', () => this.start(this.level));
    this.start(0);
  }

  private rand() {
    // deterministic per level so every visitor gets the same boards
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  private free(grid: (Dir | -1)[][], x: number, y: number) {
    const d = grid[y][x] as Dir;
    let cx = x + DX[d];
    let cy = y + DY[d];
    while (cx >= 0 && cy >= 0 && cx < this.n && cy < this.n) {
      if (grid[cy][cx] !== -1) return false;
      cx += DX[d];
      cy += DY[d];
    }
    return true;
  }

  private solvable(src: (Dir | -1)[][]) {
    const grid = src.map((r) => r.slice());
    for (;;) {
      let removed = false;
      let left = 0;
      for (let y = 0; y < this.n; y++)
        for (let x = 0; x < this.n; x++) {
          if (grid[y][x] === -1) continue;
          if (this.free(grid, x, y)) { grid[y][x] = -1; removed = true; } else left++;
        }
      if (left === 0) return true;
      if (!removed) return false;
    }
  }

  start(level: number) {
    this.level = level;
    const spec = LEVELS[Math.min(level, LEVELS.length - 1)];
    this.n = spec.n;
    this.seed = 1000 + level * 7919;
    // Build in reverse removal order: each new arrow must have a clear lane among the arrows
    // already placed (those get removed after it). That guarantees every board is solvable.
    // Keep the candidate with the fewest arrows free at the start (the hardest to read).
    let best: (Dir | -1)[][] = [];
    let bestScore = Infinity;
    for (let attempt = 0; attempt < 40; attempt++) {
      const grid = Array.from({ length: this.n }, () => Array<Dir | -1>(this.n).fill(-1));
      const cells = Array.from({ length: this.n * this.n }, (_, i) => i).sort(() => this.rand() - 0.5);
      let placed = 0;
      for (const i of cells) {
        if (placed >= spec.count) break;
        const x = i % this.n;
        const y = Math.floor(i / this.n);
        const dirs = ([0, 1, 2, 3] as Dir[]).sort(() => this.rand() - 0.5);
        for (const d of dirs) {
          grid[y][x] = d;
          if (this.free(grid, x, y)) { placed++; break; }
          grid[y][x] = -1;
        }
      }
      let freeCount = 0;
      for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) if (grid[y][x] !== -1 && this.free(grid, x, y)) freeCount++;
      const score = freeCount + Math.abs(spec.count - placed) * 3;
      if (score < bestScore && this.solvable(grid)) { bestScore = score; best = grid; }
    }
    this.grid = best;
    this.hearts = 3;
    this.moving = [];
    this.shake = null;
    this.winT = -1;
    this.cursor = { x: 0, y: 0 };
    this.ui.level.textContent = `Level ${level + 1}`;
    this.ui.msg.textContent = level === 0 ? 'Tap an arrow whose lane is clear.' : `${spec.count} arrows. Read the board first.`;
    this.updateHearts();
    this.draw();
  }

  private updateHearts() {
    this.ui.hearts.textContent = '♥'.repeat(this.hearts) + '♡'.repeat(3 - this.hearts);
    this.ui.hearts.setAttribute('aria-label', `${this.hearts} hearts left`);
  }

  private remaining() {
    let c = 0;
    for (const r of this.grid) for (const v of r) if (v !== -1) c++;
    return c;
  }

  private tap(x: number, y: number) {
    if (this.hearts <= 0 || this.winT >= 0) return;
    const d = this.grid[y]?.[x];
    if (d === undefined || d === -1) return;
    if (this.free(this.grid, x, y)) {
      this.grid[y][x] = -1;
      this.moving.push({ x, y, d, t: 0 });
      const left = this.remaining();
      if (left > 0) this.ui.msg.textContent = `Nice. ${left} arrow${left === 1 ? '' : 's'} left.`;
      if (left === 0) {
        this.winT = 0;
        const next = this.level + 1;
        this.ui.msg.textContent = next < LEVELS.length ? 'Board cleared! Next level…' : 'You beat every level. Respect.';
        setTimeout(() => this.start(next < LEVELS.length ? next : 0), 1400);
      }
    } else {
      this.hearts--;
      this.updateHearts();
      this.shake = { x, y, t: 0 };
      this.ui.msg.textContent = this.hearts > 0 ? 'Blocked! Something is in its lane.' : 'Out of hearts. Try again.';
      if (this.hearts <= 0) setTimeout(() => this.start(this.level), 1300);
    }
    this.animate();
  }

  private onPointer(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    const { pad, cell } = this.metrics();
    const sx = ((e.clientX - r.left) / r.width) * this.canvas.width;
    const sy = ((e.clientY - r.top) / r.height) * this.canvas.height;
    const x = Math.floor((sx - pad) / cell);
    const y = Math.floor((sy - pad) / cell);
    if (x >= 0 && y >= 0 && x < this.n && y < this.n) {
      this.showCursor = false;
      this.tap(x, y);
    }
  }

  private onKey(e: KeyboardEvent) {
    const k = e.key;
    const map: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (map[k]) {
      e.preventDefault();
      this.showCursor = true;
      this.cursor.x = Math.max(0, Math.min(this.n - 1, this.cursor.x + map[k][0]));
      this.cursor.y = Math.max(0, Math.min(this.n - 1, this.cursor.y + map[k][1]));
      this.draw();
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      this.tap(this.cursor.x, this.cursor.y);
    }
  }

  private metrics() {
    const size = this.canvas.width;
    const pad = size * 0.06;
    const cell = (size - pad * 2) / this.n;
    return { size, pad, cell };
  }

  private animate() {
    if (this.raf) return;
    this.last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      for (const m of this.moving) m.t += dt;
      this.moving = this.moving.filter((m) => m.t < 0.55);
      if (this.shake) { this.shake.t += dt; if (this.shake.t > 0.4) this.shake = null; }
      if (this.winT >= 0) this.winT += dt;
      this.draw();
      if (this.moving.length || this.shake || (this.winT >= 0 && this.winT < 1.4)) this.raf = requestAnimationFrame(step);
      else this.raf = 0;
    };
    this.raf = requestAnimationFrame(step);
  }

  private arrow(cx: number, cy: number, s: number, d: Dir, color: string, alpha = 1) {
    const g = this.g;
    g.save();
    g.globalAlpha = alpha;
    g.translate(cx, cy);
    g.rotate((d * Math.PI) / 2);
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = s * 0.35;
    g.beginPath();
    const w = s * 0.17;
    g.moveTo(0, -s * 0.36);
    g.lineTo(s * 0.3, -s * 0.04);
    g.lineTo(w, -s * 0.04);
    g.lineTo(w, s * 0.34);
    g.lineTo(-w, s * 0.34);
    g.lineTo(-w, -s * 0.04);
    g.lineTo(-s * 0.3, -s * 0.04);
    g.closePath();
    g.fill();
    g.restore();
  }

  draw() {
    const g = this.g;
    const { size, pad, cell } = this.metrics();
    g.clearRect(0, 0, size, size);
    const bg = g.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#0d1018');
    bg.addColorStop(1, '#141026');
    g.fillStyle = bg;
    g.fillRect(0, 0, size, size);

    for (let y = 0; y < this.n; y++)
      for (let x = 0; x < this.n; x++) {
        g.fillStyle = 'rgba(255,255,255,0.035)';
        g.beginPath();
        g.roundRect(pad + x * cell + 3, pad + y * cell + 3, cell - 6, cell - 6, cell * 0.18);
        g.fill();
      }

    for (let y = 0; y < this.n; y++)
      for (let x = 0; x < this.n; x++) {
        const d = this.grid[y][x];
        if (d === -1) continue;
        let ox = 0;
        let col = COLORS[d];
        if (this.shake && this.shake.x === x && this.shake.y === y) {
          ox = Math.sin(this.shake.t * 60) * cell * 0.08 * (1 - this.shake.t / 0.4);
          col = '#ff5d73';
        }
        this.arrow(pad + (x + 0.5) * cell + ox, pad + (y + 0.5) * cell, cell, d as Dir, col);
      }

    for (const m of this.moving) {
      const e = m.t / 0.55;
      const dist = e * e * (this.n + 1) * cell;
      this.arrow(pad + (m.x + 0.5) * cell + DX[m.d] * dist, pad + (m.y + 0.5) * cell + DY[m.d] * dist, cell, m.d, COLORS[m.d], 1 - e);
    }

    if (this.showCursor) {
      g.strokeStyle = '#ffffff';
      g.lineWidth = 3;
      g.beginPath();
      g.roundRect(pad + this.cursor.x * cell + 2, pad + this.cursor.y * cell + 2, cell - 4, cell - 4, cell * 0.18);
      g.stroke();
    }

    if (this.winT >= 0) {
      g.fillStyle = `rgba(69,240,176,${Math.max(0, 0.25 - this.winT * 0.15)})`;
      g.fillRect(0, 0, size, size);
      g.fillStyle = '#45f0b0';
      g.font = `700 ${size * 0.09}px 'Space Grotesk', sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('CLEARED', size / 2, size / 2);
      g.textAlign = 'start';
      g.textBaseline = 'alphabetic';
    }
    this.onChange();
  }
}
