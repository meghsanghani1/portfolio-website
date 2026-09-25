import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sectionRoot = path.join(projectRoot, 'sections');

const sections = [
  ['00-preloader.html', 'preloader', 'top'],
  ['01-hero.html', 'hero', 'home'],
  ['02-about.html', 'about', 'about'],
  ['04-experience.html', 'experience', 'experience'],
  ['05-pre-platforms.html', 'pre-platforms', 'expertise'],
  ['06-platforms.html', 'platforms', 'platforms'],
  ['07-ai-tools.html', 'ai-tools', 'ai-tools'],
  ['08-industry.html', 'industry', 'industry'],
  ['09-case-studies.html', 'case-studies', 'case-studies'],
  ['09-faq.html', 'faq', 'faq'],
  ['11-contact.html', 'contact', 'contact'],
  ['12-footer.html', 'footer', 'footer']
];

const unique = (values) => [...new Set(values)];

function extractBody(source) {
  const body = source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return body ? body[1] : source;
}

function cleanFragment(source) {
  return source
    .replace(/^\uFEFF/, '')
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<\/?html\b[^>]*>/gi, '')
    .replace(/<\/?head\b[^>]*>/gi, '')
    .replace(/<\/?body\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<script\b[^>]*src=["']https:\/\/cdn\.tailwindcss\.com[^>]*><\/script>/gi, '')
    .trim();
}

function extractHeadAssets(source) {
  const head = source.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const assets = [];
  for (const match of head.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>|<link\b[^>]*>|<script\b[^>]*>[\s\S]*?<\/script>/gi)) {
    const tag = match[0];
    if (/^<style/i.test(tag)) assets.push(tag);
    else if (/^<link/i.test(tag) && /rel=["'](?:stylesheet|preconnect)["']/i.test(tag)) assets.push(tag);
    else if (/^<script/i.test(tag) && (/tailwindcss\.com/i.test(tag) || /tailwind\.config/i.test(tag))) assets.push(tag);
  }
  return assets;
}

const loaded = await Promise.all(sections.map(async ([file, slug, id]) => {
  const source = await readFile(path.join(sectionRoot, file), 'utf8');
  return { file, slug, id, source };
}));

const shellCss = await readFile(path.join(projectRoot, 'site-shell.css'), 'utf8');
const fluidSource = (await readFile(path.join(projectRoot, 'fluid-cursor.js'), 'utf8'))
  .replace(/\bexport\s+function\s+splashCursor\b/, 'function splashCursor');
const siteSource = (await readFile(path.join(projectRoot, 'site.js'), 'utf8'))
  .replace(/^import\s+\{\s*splashCursor\s*\}\s+from\s+["']\.\/fluid-cursor\.js["'];?\s*/m, '');
const siteBundle = `${fluidSource}\n\n${siteSource}`;

const headAssets = unique(loaded.flatMap(({ source }) => extractHeadAssets(source)))
  .map(asset => asset.replaceAll('../assets/', './assets/'));
const body = loaded.map(({ file, slug, id, source }) => {
  const fragment = cleanFragment(extractBody(source)).replaceAll('../assets/', './assets/');
  return `  <div class="portfolio-segment portfolio-segment--${slug}" id="${id}" data-source="sections/${file}">\n${fragment}\n  </div>`;
}).join('\n\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="description" content="Megh Sanghani — performance marketer and growth strategist turning data, ads and AI into measurable growth.">
  <meta name="theme-color" content="#030305">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Megh Sanghani — Performance Marketer &amp; Growth Strategist">
  <meta property="og:description" content="Performance marketing, paid media, growth strategy and AI-driven execution.">
  <meta property="og:url" content="https://meghsanghani-portfolio.vercel.app/">
  <link rel="canonical" href="https://meghsanghani-portfolio.vercel.app/">
  <title>Megh Sanghani — Performance Marketer &amp; Growth Strategist</title>
  <link rel="icon" type="image/svg+xml" href="./favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&amp;family=Inter:wght@400;500;600;700&amp;family=Outfit:wght@500;600;700;800&amp;family=Space+Mono:wght@400;700&amp;display=swap" rel="stylesheet">
${headAssets.map((asset) => `  ${asset}`).join('\n')}
  <style data-site-shell>\n${shellCss}\n  </style>
  <link rel="stylesheet" href="./menu.css">
</head>
<body>
  <div id="site-content">
${body}
  </div>
  <nav id="megh-overlay-nav" aria-label="Primary navigation">
    <a class="megh-nav-mark" href="#home" aria-label="Megh Sanghani, home">MS</a>
    <a class="megh-nav-wordmark" href="#home">MEGH SANGHANI</a>
    <button class="megh-nav-burger" id="megh-menu-toggle" type="button" aria-label="Open navigation menu" aria-controls="megh-overlay-menu" aria-expanded="false"></button>
  </nav>
  <div id="megh-overlay-wipe" aria-hidden="true">
    <div class="megh-overlay-block" style="--block-index:0"></div>
    <div class="megh-overlay-block" style="--block-index:1"></div>
    <div class="megh-overlay-block" style="--block-index:2"></div>
    <div class="megh-overlay-block" style="--block-index:3"></div>
    <div class="megh-overlay-block" style="--block-index:4"></div>
    <div class="megh-overlay-block" style="--block-index:5"></div>
    <div class="megh-overlay-block" style="--block-index:6"></div>
    <div class="megh-overlay-block" style="--block-index:7"></div>
  </div>
  <div id="megh-overlay-menu" role="dialog" aria-label="Website navigation" aria-modal="true" aria-hidden="true" inert>
    <div class="megh-menu-inner">
      <p class="megh-menu-title" style="--item-index:0">[ EXPLORE / MEGH SANGHANI ]</p>
      <div class="megh-menu-item" style="--item-index:1"><span class="megh-menu-index">01</span><a class="megh-menu-name" href="#about">About</a><span class="megh-menu-explore"><span>[ explore ]</span> ↗</span></div>
      <div class="megh-menu-item" style="--item-index:2"><span class="megh-menu-index">02</span><a class="megh-menu-name" href="#experience">Experience</a><span class="megh-menu-explore"><span>[ explore ]</span> ↗</span></div>
      <div class="megh-menu-item" style="--item-index:3"><span class="megh-menu-index">03</span><a class="megh-menu-name" href="#expertise">Expertise</a><span class="megh-menu-explore"><span>[ explore ]</span> ↗</span></div>
      <div class="megh-menu-item" style="--item-index:4"><span class="megh-menu-index">04</span><a class="megh-menu-name" href="#case-studies">Case Studies</a><span class="megh-menu-explore"><span>[ explore ]</span> ↗</span></div>
      <div class="megh-menu-item" style="--item-index:5"><span class="megh-menu-index">05</span><a class="megh-menu-name" href="#contact">Contact</a><span class="megh-menu-explore"><span>[ explore ]</span> ↗</span></div>
      <p class="megh-menu-caption">Strategy / Performance / Growth</p>
    </div>
  </div>
  <script data-site-bundle>\n${siteBundle}\n  </script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" defer></script>
  <script src="./menu.js" defer></script>
</body>
</html>
`;

await writeFile(path.join(projectRoot, 'index.html'), html);
console.log(`Built index.html from ${sections.length} section files (${Buffer.byteLength(html).toLocaleString()} bytes).`);
