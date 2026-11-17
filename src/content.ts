// All real data about Asadullah Hil Galib (devgalib). Edit here; the page and 3D scene read from it.

export const profile = {
  name: 'Asadullah Hil Galib',
  handle: 'devgalib',
  role: 'Android & game developer',
  company: 'Edu Reminder',
  companyUrl: 'https://edureminder.com',
  github: 'https://github.com/devgalib',
  avatar: 'https://github.com/devgalib.png?size=240',
  playDev: 'https://play.google.com/store/apps/dev?id=5933037260447171212',
  x: 'https://twitter.com/edureminder',
  email: 'support@edureminder.com',
  since: 2021,
};

export const stats = [
  { value: '12.4k', label: 'contributions' },
  { value: '128', label: 'repositories' },
  { value: '11', label: 'apps on Google Play' },
  { value: '2', label: 'games' },
];

export const stack = ['Kotlin', 'Jetpack Compose', 'Android', 'TypeScript', 'JavaScript', 'Python', 'Three.js', 'HTML & CSS'];

export type App = {
  name: string;
  category: 'Islamic' | 'Productivity' | 'Learning';
  blurb: string;
  slug: string;
  play: string;
  color: string;
  glyph: string;
};

const play = (id: string) => `https://play.google.com/store/apps/details?id=com.edureminder.${id}`;

export const apps: App[] = [
  { name: 'Ruh ul muslim', category: 'Islamic', blurb: 'Prayer times, Qibla and 500+ duas.', slug: 'ruhulmuslim', play: play('ruhulmuslim'), color: '#1f9d74', glyph: '☾' },
  { name: 'Al Quran', category: 'Islamic', blurb: 'Read, listen and memorize, word by word.', slug: 'alquran', play: play('alquran'), color: '#2a7f62', glyph: '۞' },
  { name: 'Hisnul Muslim', category: 'Islamic', blurb: 'Authentic daily supplications.', slug: 'hisnulmuslim', play: play('hisnulmuslim'), color: '#3a8f5c', glyph: '✦' },
  { name: 'Al Hadith', category: 'Islamic', blurb: 'A catalog of authentic Hadith.', slug: 'alhadith', play: play('alhadith'), color: '#4c7a3d', glyph: '❖' },
  { name: 'Noteezy', category: 'Productivity', blurb: 'Markdown notes with encrypted sync.', slug: 'notepad', play: play('notepad'), color: '#5b5bd6', glyph: '#' },
  { name: 'Money Manager', category: 'Productivity', blurb: 'Budgets, expenses and charts.', slug: 'moneymanager', play: play('moneymanager'), color: '#d6893a', glyph: '$' },
  { name: 'Notepad', category: 'Productivity', blurb: 'Instant, lightweight notes.', slug: 'notebook', play: play('notebook'), color: '#c9a227', glyph: '✎' },
  { name: 'My Diary', category: 'Productivity', blurb: 'A private, encrypted journal.', slug: 'diary', play: play('diary'), color: '#b8456b', glyph: '♥' },
  { name: 'Notis', category: 'Productivity', blurb: 'Recover deleted messages and media.', slug: 'notisave', play: play('notisave'), color: '#2f7fd1', glyph: '◉' },
  { name: 'Churanto', category: 'Learning', blurb: 'Voice-guided learning for kids 3–8.', slug: 'churanto', play: play('churanto'), color: '#e0533d', glyph: '★' },
  { name: 'Vocabulary', category: 'Learning', blurb: '18,000+ words in 17 languages.', slug: 'vocabulary', play: play('vocabulary'), color: '#8a4fd6', glyph: 'A' },
];

export const appUrl = (a: App) => `https://edureminder.com/${a.slug}`;

export const repos = [
  { name: 'QuickTube', lang: 'Kotlin', stars: 25, desc: 'Open-source Android video & music downloader. 1,800+ sites, in-app browser, share-to-download.' },
  { name: 'compose-reorderable', lang: 'Kotlin', stars: 3, desc: 'A lightweight Jetpack Compose library for reorderable lists and grids with drag and drop.' },
  { name: 'quran-video-editor', lang: 'Python', stars: 0, desc: 'Quran recitation video maker: background clips, smooth transitions, keyed recitation.' },
  { name: 'livetv-plus-webos', lang: 'JavaScript', stars: 0, desc: 'Clean live-TV home screen for LG webOS TVs.' },
];

export const repoUrl = (name: string) => `${profile.github}/${name}`;
