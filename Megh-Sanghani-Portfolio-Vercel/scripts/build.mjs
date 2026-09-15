import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sectionsDir = path.join(root, "sections");

const sections = [
  { file: "00-preloader.html", key: "preloader", anchor: "top" },
  { file: "01-hero.html", key: "hero", anchor: "home" },
  { file: "02-about.html", key: "about", anchor: "about" },
  { file: "03-pre-experience.html", key: "work-intro", anchor: "work" },
  { file: "04-experience.html", key: "experience", anchor: "experience" },
  { file: "05-pre-platforms.html", key: "expertise-intro", anchor: "expertise" },
  { file: "06-platforms.html", key: "platforms", anchor: "platforms" },
  { file: "07-ai-tools.html", key: "ai-tools", anchor: "ai-tools" },
  { file: "08-industry.html", key: "industry", anchor: "industry" },
  { file: "09-faq.html", key: "faq", anchor: "faq" },
  { file: "10-contact.html", key: "contact", anchor: "contact" },
  { file: "11-footer.html", key: "footer", anchor: "footer" },
];

function splitDocument(source) {
  const cleaned = source.replace(/^\uFEFF/, "");
  const head = cleaned.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const body = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  return {
    head: head
      .replace(/<meta\b[^>]*>/gi, "")
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
      .trim(),
    body: (body ?? cleaned)
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<\/?html\b[^>]*>/gi, "")
      .replace(/<\/?body\b[^>]*>/gi, "")
      .trim(),
  };
}

function cleanPreloader(markup) {
  return markup.replace(
    /\s*<!-- ---------- Hero content revealed underneath ---------- -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*(?=<\/section>)/i,
    "\n",
  );
}

function sectionMarkup(section, source) {
  const parts = splitDocument(source);
  let body = section.key === "preloader" ? cleanPreloader(parts.body) : parts.body;
  if (section.key === "faq") {
    body = body.replace(/<script\b[^>]*src=["']https:\/\/cdn\.tailwindcss\.com["'][^>]*>\s*<\/script>/i, "");
  }
  const classes = `portfolio-segment portfolio-segment--${section.key}`;
  const wrapped = `<div class="${classes}" id="${section.anchor}" data-source="${section.file}">\n${body}\n</div>`;
  return { head: parts.head, body: wrapped };
}

function dedupeHeadAssets(markup) {
  const seen = new Set();
  return markup.replace(
    /<link\b[^>]*>|<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>/gi,
    (tag) => {
      const href = tag.match(/\b(?:href|src)=["']([^"']+)["']/i)?.[1];
      if (!href || !seen.has(href)) {
        if (href) seen.add(href);
        return tag;
      }
      return "";
    },
  );
}

await mkdir(root, { recursive: true });

const built = [];
for (const section of sections) {
  const source = await readFile(path.join(sectionsDir, section.file), "utf8");
  built.push(sectionMarkup(section, source));
}

const combinedHead = dedupeHeadAssets(built.map((part) => part.head).filter(Boolean).join("\n"));

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="description" content="Megh Sanghani — performance marketer and growth strategist turning data, ads and AI into measurable growth.">
  <meta name="theme-color" content="#030305">
  <title>Megh Sanghani — Performance Marketer &amp; Growth Strategist</title>
  <link rel="icon" type="image/svg+xml" href="./favicon.svg">
  ${combinedHead}
  <link rel="stylesheet" href="./site-shell.css">
</head>
<body>
  <a class="site-skip-link" href="#home">Skip to portfolio</a>
  <main id="portfolio">
${built.map((part) => part.body).join("\n")}
  </main>
  <script type="module" src="./site.js"></script>
</body>
</html>
`;

await writeFile(path.join(root, "index.html"), page, "utf8");
console.log(`Built index.html from ${sections.length} ordered sections (${Buffer.byteLength(page)} bytes).`);
