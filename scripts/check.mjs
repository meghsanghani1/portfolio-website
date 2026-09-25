import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = await readFile(path.join(root, 'index.html'), 'utf8');
const errors = [];
const ordered = [
  '00-preloader.html', '01-hero.html', '02-about.html',
  '04-experience.html', '05-pre-platforms.html', '06-platforms.html',
  '07-ai-tools.html', '08-industry.html', '09-case-studies.html',
  '09-faq.html', '11-contact.html', '12-footer.html'
];
let previous = -1;
for (const filename of ordered) {
  const position = page.indexOf(`data-source="sections/${filename}"`);
  if (position < 0 || position <= previous) errors.push(`Missing or out of order: ${filename}`);
  previous = position;
  await stat(path.join(root, 'sections', filename)).catch(() => errors.push(`Missing section: ${filename}`));
}
for (const [name, filename] of [
  ['Meta Ads','meta-ads.html'], ['Google Ads','google-ads.html'],
  ['SEO','seo.html'], ['Email Marketing','email-marketing.html'],
  ['WhatsApp Marketing','whatsapp-marketing.html']
]) {
  if (!page.includes(`href="case-studies/${filename}"`)) errors.push(`${name} card link is missing.`);
  const casePage = await readFile(path.join(root, 'case-studies', filename), 'utf8').catch(() => '');
  if (!casePage.includes('href="/#case-studies"')) errors.push(`${name} back button is missing.`);
}
if (!page.includes('class="ms-hero__case-button" href="#case-studies"')) errors.push('Hero case study button does not target the section.');
if (!page.includes('class="ms-hero__cv-button" href="./Megh-Sanghani-CV.pdf" download')) errors.push('CV button is not prepared for PDF download.');
if ((page.match(/class="megh-overlay-block"/g) ?? []).length !== 8) errors.push('Overlay must have eight wipe blocks.');
if ((page.match(/class="megh-menu-name"/g) ?? []).length !== 5) errors.push('Navigation links are missing.');
if (!page.includes('function splashCursor')) errors.push('Fluid cursor was not bundled into index.html.');
for (const filename of ['site-shell.css','site.js','fluid-cursor.js','menu.css','menu.js','favicon.svg','vercel.json']) {
  await stat(path.join(root,filename)).catch(() => errors.push(`Missing asset: ${filename}`));
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Website structure, menu, cursor, five case studies and back links passed.');
  if (!await stat(path.join(root,'Megh-Sanghani-CV.pdf')).catch(() => null)) {
    console.log('CV PDF pending: place Megh-Sanghani-CV.pdf in the website root.');
  }
}
