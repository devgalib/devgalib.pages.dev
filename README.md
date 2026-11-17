# devgalib — portfolio

Personal site of **Asadullah Hil Galib** (`@devgalib`): a 3D workspace you walk through by scrolling.

- **3D:** Three.js `WebGPURenderer` (uses WebGPU, falls back to WebGL 2 automatically).
- **No GPU API?** A CSS-3D version of the same scene loads instead. Content is plain HTML in every mode.
- **Adaptive quality:** if frame rate drops, it lowers resolution, then bloom, then shadows.

## Run

```bash
npm install
npm run dev
```

```bash
npm run build
```

The output in `dist/` is a static site (Cloudflare Pages, Vercel, Netlify, GitHub Pages).

## Edit content

Everything about you (apps, repos, stats, links) lives in `src/content.ts`.

## Test switches

- `?mode=webgl`: force WebGL 2
- `?mode=css`: force the CSS-3D fallback
- `?quality=low` / `?quality=high`: force quality

## Map

| File | What |
|---|---|
| `src/scene/world.ts` | renderer, camera stops, scroll camera, bloom, perf watcher |
| `src/scene/builders.ts` | island, desk, monitor, phones, arcade cabinet, skyline |
| `src/scene/textures.ts` | canvas textures: typing code editor, phone screens |
| `src/puzzle.ts` | mini Arrow Puzzle (always-solvable generator) |
| `src/terminal.ts` | the working terminal |
| `src/fallback.ts` | CSS-3D scene |
