import { apps, profile, repoUrl, repos, stack, stats } from './content';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

const FILES: Record<string, string> = {
  'about.md': `# ${profile.name}\n${profile.role}. Founder of ${profile.company}.\nI build calm, fast Android apps and games, offline first.\nCoding since ${profile.since}.`,
  'stack.txt': stack.join('\n'),
  'next.md': '# next\n- bigger, more visual games\n- 3D worlds\n- more open source',
};

export function initTerminal(out: HTMLElement, input: HTMLInputElement, onNavigate: (id: string) => void) {
  const history: string[] = [];
  let hi = 0;

  const print = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  };

  const cmds: Record<string, (args: string[]) => string | void> = {
    help: () =>
      [
        '<span class="c">whoami</span>      who I am',
        '<span class="c">neofetch</span>    system info, developer edition',
        '<span class="c">ls</span>          list files',
        '<span class="c">cat</span> <span class="m">file</span>    read a file',
        '<span class="c">apps</span>        my Android apps',
        '<span class="c">repos</span>       open-source projects',
        '<span class="c">open</span> <span class="m">name</span>   open a repo on GitHub',
        '<span class="c">goto</span> <span class="m">section</span> jump to about | apps | games | code | contact',
        '<span class="c">clear</span>       clear the screen',
      ].join('\n'),
    whoami: () => `${profile.name} <span class="m">(@${profile.handle})</span>\n${profile.role} · founder of ${profile.company}`,
    neofetch: () =>
      [
        `<span class="c">       ▄▄▄▄▄       </span> <span class="c">galib</span>@<span class="c">workspace</span>`,
        `<span class="c">    ▄█▀▀   ▀▀█▄    </span> -----------------`,
        `<span class="c">   ██  ▄▀▀▀▄  ██   </span> <span class="v">OS</span>: Android (11 apps shipped)`,
        `<span class="c">   ██  █   █  ██   </span> <span class="v">Lang</span>: Kotlin, TypeScript, Python`,
        `<span class="c">   ██  ▀▄▄▄█  ██   </span> <span class="v">UI</span>: Jetpack Compose`,
        `<span class="c">    ▀█▄▄   ▄▄█▀    </span> <span class="v">Commits</span>: ${stats[0].value}`,
        `<span class="c">       ▀▀▀▀▀  ▀    </span> <span class="v">Uptime</span>: since ${profile.since}`,
      ].join('\n'),
    ls: () => Object.keys(FILES).map((f) => `<span class="v">${f}</span>`).join('  ') + '  <span class="w">apps/</span>  <span class="w">repos/</span>',
    cat: ([f]) => {
      if (!f) return '<span class="w">usage: cat &lt;file&gt;</span>';
      const body = FILES[f];
      return body ? esc(body) : `<span class="w">cat: ${esc(f)}: no such file</span>`;
    },
    apps: () => apps.map((a) => `<span class="c">${a.name.padEnd(14)}</span><span class="m">${a.category}</span>`).join('\n'),
    repos: () => repos.map((r) => `<span class="c">${r.name.padEnd(22)}</span><span class="m">★${r.stars} ${r.lang}</span>`).join('\n'),
    open: ([name]) => {
      const r = repos.find((x) => x.name.toLowerCase() === (name || '').toLowerCase());
      if (!r) return `<span class="w">open: try one of: ${repos.map((x) => x.name).join(', ')}</span>`;
      window.open(repoUrl(r.name), '_blank', 'noopener');
      return `opening <span class="c">${r.name}</span>…`;
    },
    goto: ([s]) => {
      const ok = ['top', 'about', 'apps', 'games', 'code', 'contact'];
      if (!s || !ok.includes(s)) return `<span class="w">goto: ${ok.join(' | ')}</span>`;
      onNavigate(s);
      return `→ ${s}`;
    },
    clear: () => { out.innerHTML = ''; },
    sudo: () => '<span class="w">nice try.</span>',
    exit: () => 'there is no exit. only ship.',
  };

  const run = (line: string) => {
    print(`<span class="c">galib@workspace:~$</span> ${esc(line)}`);
    const [name, ...args] = line.trim().split(/\s+/);
    if (!name) return;
    const fn = cmds[name.toLowerCase()];
    const res = fn ? fn(args) : `<span class="w">${esc(name)}: command not found.</span> type <span class="c">help</span>`;
    if (typeof res === 'string') print(res);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = input.value;
      if (v.trim()) { history.push(v); hi = history.length; }
      input.value = '';
      run(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hi > 0) input.value = history[--hi];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hi = Math.min(history.length, hi + 1);
      input.value = history[hi] ?? '';
    } else if (e.key === 'Tab') {
      const v = input.value.trim();
      const match = Object.keys(cmds).find((c) => c.startsWith(v) && v);
      if (match) { e.preventDefault(); input.value = match + ' '; }
    }
  });

  print('<span class="m">Welcome. This terminal is real. Type</span> <span class="c">help</span><span class="m">, or try</span> <span class="c">neofetch</span><span class="m">.</span>');
}
