# Megh Sanghani portfolio

This is the full static website, ready to place at the root of your GitHub repository connected to Vercel. It includes the homepage assembled from your latest sections, the five final case study pages, the fluid cursor, and the new fullscreen navigation.

## Upload and deploy

1. Extract the ZIP and upload its **contents**, preserving the `sections/`, `case-studies/` and `scripts/` folders, to the root of your existing GitHub repository.
2. Commit and push the changes. Vercel can serve the included `index.html` as a static site with Framework Preset **Other**; no build command is needed for deployment.
3. When you provide your CV, save the PDF as **`Megh-Sanghani-CV.pdf`** alongside `index.html`. The Download CV button already points to that exact filename and has the `download` attribute. Until that PDF is added, the button's destination is unavailable.

## Order and links

The homepage follows `00, 01, 02, 04, 05, 06, 07, 08, Case Studies, 09 FAQ, 11, 12`; unused section numbers are intentionally skipped. The Case Studies button and navigation menu scroll to `#case-studies`. Each of the five cards links to its own page under `case-studies/`, and each page's back button returns to `/#case-studies`.

The menu uses eight staggered vertical wipe blocks, a reversible GSAP timeline loaded from the pinned npm distribution, and a CSS fallback if the library cannot load. It respects reduced motion. The menu labels use your site content: About Me, Experience, Expertise, AI Tools, Case Studies, and Contact. The fluid cursor is retained from the earlier website and bundled into `index.html`.

## Edit later

Edit a file under `sections/`, then regenerate and check the homepage before committing:

```bash
node scripts/build.mjs
node scripts/check.mjs
```

Commit the regenerated `index.html` with the changed section. If you change menu markup, edit `scripts/build.mjs`; its styling and behavior are in `menu.css` and `menu.js`.

The `assets/` folder stores the supplied media previously embedded inside HTML. Keep it beside `index.html` when uploading to GitHub.
