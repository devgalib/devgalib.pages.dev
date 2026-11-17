import './styles.css';
import { appUrl, apps, profile, repoUrl, repos, stack, stats } from './content';
import { ArrowPuzzle } from './puzzle';
import { initTerminal } from './terminal';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);

// ------------------------------------------------------------------ content
function renderContent() {
  const h1 = $('[data-name]');
  if (!reducedMotion) {
    h1.setAttribute('aria-label', profile.name);
    h1.innerHTML = profile.name
      .split(' ')
      .map((w, wi) => `<span aria-hidden="true" style="white-space:nowrap">${[...w].map((ch, i) => `<span class="ch" style="animation-delay:${0.35 + wi * 0.18 + i * 0.035}s">${ch}</span>`).join('')}</span>`)
      .join(' ');
  }

  $<HTMLImageElement>('#avatar').src = profile.avatar;
  $('#stats').innerHTML = stats.map((s) => `<div><dt>${s.value}</dt><dd>${s.label}</dd></div>`).join('');
  $('#stack').innerHTML = stack.map((s) => `<li>${s}</li>`).join('');

  const list = $('#app-list');
  list.innerHTML = apps
    .map((a) => `<li data-cat="${a.category}"><a class="app" href="${appUrl(a)}" target="_blank" rel="noopener"><i style="background:${a.color}" aria-hidden="true">${a.glyph}</i><div><b>${a.name}</b><span>${a.blurb}</span></div></a></li>`)
    .join('');
  const cats = ['All', 'Islamic', 'Productivity', 'Learning'];
  const filters = $('#app-filters');
  filters.innerHTML = cats.map((c, i) => `<button role="tab" aria-selected="${i === 0}" data-cat="${c}">${c}</button>`).join('');
  filters.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    filters.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    list.querySelectorAll<HTMLElement>('li').forEach((li) => (li.hidden = b.dataset.cat !== 'All' && li.dataset.cat !== b.dataset.cat));
  });

  const LANG: Record<string, string> = { Kotlin: '#a97bff', Python: '#3572a5', JavaScript: '#f1e05a', TypeScript: '#3178c6' };
  $('#repos').innerHTML = repos
    .map((r) => `<li><a href="${repoUrl(r.name)}" target="_blank" rel="noopener"><b>${r.name}</b><small><span class="lang" style="--c:${LANG[r.lang] ?? '#888'};display:inline">${r.lang}</span> · ★${r.stars}</small><span>${r.desc}</span></a></li>`)
    .join('');

  const contacts = [
    ['GitHub', '@' + profile.handle, profile.github],
    ['Google Play', '11 apps', profile.playDev],
    ['Edu Reminder', 'edureminder.com', profile.companyUrl],
    ['X / Twitter', '@edureminder', profile.x],
    ['Email', profile.email, `mailto:${profile.email}`],
  ];
  $('#contact-list').innerHTML = contacts
    .map(([t, s, href]) => `<li><a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}><span>${t}</span><small>${s} ↗</small></a></li>`)
    .join('');
  $('#year').textContent = String(new Date().getFullYear());
}

// ------------------------------------------------------------------ boot log
const bootLog = $('#boot-log');
const bootFill = $('#boot-fill');
function log(msg: string, pct: number) {
  bootLog.innerHTML += `> ${msg}\n`;
  const lines = bootLog.innerHTML.split('\n');
  if (lines.length > 7) bootLog.innerHTML = lines.slice(-7).join('\n');
  bootFill.style.width = pct + '%';
}
function bootDone() {
  setTimeout(() => $('#boot').classList.add('done'), reducedMotion ? 0 : 250);
}

// ------------------------------------------------------------------ capability
function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}
const lowPower =
  params.get('quality') === 'low' ||
  (params.get('quality') !== 'high' &&
    ((matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820) ||
      (navigator.hardwareConcurrency ?? 8) <= 2 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4));

// ------------------------------------------------------------------ scroll -> camera stop
const sections = [...document.querySelectorAll<HTMLElement>('.sec')];
function scrollStop() {
  const y = scrollY;
  const vh = innerHeight;
  for (let i = 0; i < sections.length - 1; i++) {
    const top = sections[i].offsetTop;
    const end = top + sections[i].offsetHeight;
    const holdEnd = end - vh; // tall sections keep the camera still while you read
    if (y < top) return i;
    if (y <= holdEnd) return i;
    if (y < end) return i + (y - holdEnd) / (end - holdEnd);
  }
  return sections.length - 1;
}

let setStop: (p: number) => void = () => {};
function onScroll() {
  const p = scrollStop();
  setStop(p);
  const max = document.documentElement.scrollHeight - innerHeight;
  $('#progress-fill').style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
}

function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}

// ------------------------------------------------------------------ start
async function start() {
  renderContent();

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.querySelector('.panel')?.classList.add('in');
        const id = e.target.id;
        document.querySelectorAll('.nav nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
      }
    },
    { threshold: 0.25 },
  );
  sections.forEach((s) => io.observe(s));

  let world: import('./scene/world').World | null = null;
  const puzzle = new ArrowPuzzle($<HTMLCanvasElement>('#puzzle'), { level: $('#pz-level'), hearts: $('#pz-hearts'), msg: $('#pz-msg'), reset: $('#pz-reset') }, () => world?.markTextureDirty());
  if (import.meta.env.DEV) (window as unknown as { __puzzle: ArrowPuzzle }).__puzzle = puzzle;
  initTerminal($('#term-out'), $<HTMLInputElement>('#term-in'), goTo);
  $('.term').addEventListener('click', () => $<HTMLInputElement>('#term-in').focus());

  const mode = params.get('mode');
  const can3D = mode !== 'css' && (('gpu' in navigator) || hasWebGL2());
  log('booting devgalib.workspace', 4);
  // never hold the content hostage: show the page after 1.8s even if shaders are still compiling
  const bootTimer = setTimeout(bootDone, 1800);

  if (can3D) {
    try {
      const { World } = await import('./scene/world');
      world = new World({ canvas: $<HTMLCanvasElement>('#gl'), puzzleCanvas: $<HTMLCanvasElement>('#puzzle'), forceWebGL: mode === 'webgl', lowPower, reducedMotion, log });
      await world.init();
      world.onPick = (s) => goTo(sections[s].id);
      setStop = (p) => world!.setStop(p);
      $('#mode').textContent = world.backend + (lowPower ? ' · lite' : '');
      world.onQuality = (q) => ($('#mode').textContent = world!.backend + (q < 3 ? ' · lite' : ''));
      document.documentElement.classList.add('mode-3d');
    } catch (err) {
      console.warn('[portfolio] 3D failed, using CSS 3D fallback', err);
      world = null;
    }
  }
  if (!world) {
    const { initFallback } = await import('./fallback');
    document.documentElement.classList.add('mode-css');
    const fb = initFallback($('#css3d'), reducedMotion);
    setStop = (p) => fb.setStop(p);
    $('#mode').textContent = 'CSS 3D';
    log('no GPU API: CSS 3D mode', 100);
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
  clearTimeout(bootTimer);
  bootDone();
  requestAnimationFrame(() => document.documentElement.classList.add('ready'));
}

start();
