import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sectionRoot = path.join(projectRoot, 'sections');
const files = (await readdir(sectionRoot)).filter((name) => /^\d{2}-.+\.html$/.test(name)).sort();
const failures = [];

for (const file of files) {
  const source = await readFile(path.join(sectionRoot, file), 'utf8');
  const executableSource = source.replace(/<!--[\s\S]*?-->/g, '');
  let number = 0;
  for (const match of executableSource.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=|application\/json/i.test(match[1])) continue;
    number += 1;
    try {
      new vm.Script(match[2], { filename: `${file}:inline-${number}.js` });
    } catch (error) {
      failures.push(`${file}, inline script ${number}: ${error.stack || error.message}`);
    }
  }
}

const index = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
for (const [pattern, label] of [
  [/<div\b[^>]*class="[^"]*portfolio-segment/g, 'section wrappers'],
  [/<h1\b/gi, 'page h1 elements'],
  [/data-source="sections\//g, 'source markers']
]) {
  const count = [...index.matchAll(pattern)].length;
  console.log(`${label}: ${count}`);
}

if (files.length !== 13) failures.push(`Expected 13 section files; found ${files.length}.`);
if (!index.includes('data-site-shell') || !index.includes('data-site-bundle')) failures.push('Self-contained shared site assets are missing.');
if (/href=["']\.\/site-shell\.css|src=["']\.\/site\.js/.test(index)) failures.push('Combined index still depends on external shell assets.');
if (!index.includes('function splashCursor')) failures.push('Fluid cursor is missing from the combined index.');
if (!index.includes('simResolution: coarsePointer.matches ? 64 : 96')) failures.push('Responsive fluid-cursor performance settings are missing.');
if (!index.includes('id="home"') || !index.includes('id="contact"')) failures.push('Required navigation targets are missing.');
if (/Your Name|Placeholder tagline/.test(index)) failures.push('Preloader placeholder content is still present.');
if (index.includes('data-source="sections/03-pre-experience.html"')) failures.push('The removed pre-experience section is still included in the combined page.');
if (/o2cd-(?:stage|word|discipline|final-plate)/.test(index)) failures.push('Removed Foundation/Expansion/Evolved transition code is still present.');
if ((index.match(/<div\b[^>]*class="[^"]*portfolio-segment/g) || []).length !== 12) failures.push('Expected 12 built page sections after removing pre-experience and adding Case Studies.');
if ((index.match(/data-source="sections\//g) || []).length !== 12) failures.push('Expected 12 source markers after removing pre-experience and adding Case Studies.');
if (index.indexOf('data-source="sections/02-about.html"') > index.indexOf('data-source="sections/04-experience.html"')) failures.push('About does not flow directly into Experience.');
if (!index.includes('id="case-studies"')) failures.push('The Performance Marketing section is missing.');
if (index.indexOf('data-source="sections/08-industry.html"') > index.indexOf('data-source="sections/09-case-studies.html"')) failures.push('Case Studies must follow Industry.');
if (index.indexOf('data-source="sections/09-case-studies.html"') > index.indexOf('data-source="sections/10-faq.html"')) failures.push('FAQ must follow Case Studies.');
for (const file of ['meta-ads.html', 'google-ads.html', 'seo.html', 'email-marketing.html', 'whatsapp-marketing.html']) {
  const href = `href="case-studies/${file}"`;
  if (!index.includes(href)) failures.push(`Missing case-study card link: ${href}`);
  try {
    await readFile(path.join(projectRoot, 'case-studies', file), 'utf8');
  } catch {
    failures.push(`Missing case-study destination page: case-studies/${file}`);
  }
}
if (/Scroll through all 18|Drag to explore|Swipe all 18 to continue/.test(index)) failures.push('Legacy forced-scroll Industry instructions are still present.');
if (!index.includes('Swipe to see industries')) failures.push('Industry swipe instruction is missing.');
if (!index.includes('(+91) - 72020 77591') || !index.includes('href="tel:+917202077591"')) failures.push('The formatted dialable phone number is missing.');
if (index.includes('margin-bottom:500svh')) failures.push('Legacy mobile Industry scroll spacer is still present.');
if (index.includes('Move your cursor to make waves') || index.includes('Swipe to make waves')) failures.push('The removed fluid cursor instruction is still present.');
if (!index.includes('.megh-atlas__progress { display:none; }')) failures.push('The unwanted Experience divider line is still enabled.');
if (!index.includes('grid-template-columns:minmax(130px,.48fr) minmax(90px,.34fr) minmax(0,1fr)')) failures.push('The repaired About closing layout is missing.');
if (index.includes("positionLabel('.emj-beyond-label'")) failures.push('About still overrides the mobile AND BEYOND position in JavaScript.');
if (!index.includes('#ms-contact-root .ms-contact__art {\n          display: none;')) failures.push('The contact character is not hidden on mobile.');
if (!index.includes('fluid.pause()') || !index.includes('fluid.resume()')) failures.push('The Contact performance handoff for the fluid renderer is missing.');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Static checks passed for ${files.length} section files and five case-study pages.`);
}
