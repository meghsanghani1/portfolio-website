import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const browser = await chromium.launch({
  headless: true,
  executablePath: chromium.executablePath(),
  args: ['--no-sandbox'],
});

async function inspect(label, viewport) {
  const page = await browser.newPage({ viewportSize: viewport, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(450);

  const preloader = await page.evaluate(() => {
    const overlay = document.querySelector('.portfolio-segment--preloader');
    const mark = overlay?.querySelector('.mjp-final-m, .mjp-m, svg, canvas');
    const rect = mark?.getBoundingClientRect();
    return {
      overlayWidth: overlay?.getBoundingClientRect().width ?? 0,
      markCenter: rect ? rect.left + rect.width / 2 : null,
      viewportCenter: innerWidth / 2,
    };
  });

  await page.waitForTimeout(2300);
  const summary = await page.evaluate(() => {
    const visibleOverflow = [...document.querySelectorAll('body *')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && (rect.right > innerWidth + 2 || rect.left < -2))
      .slice(0, 12)
      .map(({ element, rect }) => ({
        tag: element.tagName,
        id: element.id,
        className: String(element.className).slice(0, 100),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      }));

    const aiStage = document.querySelector('#megh-ai-toolkit .mat-stage')?.getBoundingClientRect();
    const aiCopy = document.querySelector('#megh-ai-toolkit .mat-copy.mat-active')?.getBoundingClientRect();
    const contactArt = document.querySelector('#ms-contact-root .ms-contact__art');

    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
      },
      segmentWidths: [...document.querySelectorAll('.portfolio-segment')].map((node) => Math.round(node.getBoundingClientRect().width)),
      fluidCanvas: Boolean(document.querySelector('.fluid-cursor-canvas')),
      aiStageHeight: aiStage ? Math.round(aiStage.height) : null,
      aiCopyBottomGap: aiCopy ? Math.round(innerHeight - aiCopy.bottom) : null,
      contactArtDisplay: contactArt ? getComputedStyle(contactArt).display : null,
      visibleOverflow,
    };
  });

  await page.screenshot({ path: path.join(root, `qa-${label}.png`), fullPage: false });
  await page.close();
  return { label, preloader, summary };
}

const results = [];
results.push(await inspect('mobile-390x844', { width: 390, height: 844 }));
results.push(await inspect('mobile-412x915', { width: 412, height: 915 }));
results.push(await inspect('desktop-1440x900', { width: 1440, height: 900 }));
console.log(JSON.stringify(results, null, 2));

await browser.close();
