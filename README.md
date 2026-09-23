# Megh Sanghani Portfolio

This package contains the complete Vercel-ready website, all 13 numbered section files, and five separate Performance Marketing case-study pages. The removed `03-pre-experience.html` transition remains as a documented placeholder, while the generated website flows directly from About to Experience.

## Deploy through GitHub and Vercel

1. Extract this ZIP.
2. Upload the extracted files and folders to the root of the GitHub repository connected to Vercel.
3. Commit and push the changes.
4. In Vercel, use **Framework Preset: Other**. No install, build, or output command is required because `index.html` is already generated.

## Edit a section

Edit the matching file in `sections/`, then rebuild the combined page:

```bash
node scripts/build.mjs
node scripts/check.mjs
```

Commit both the edited section and regenerated `index.html`.

## Files that must remain together

- `index.html` (includes the shared responsive CSS and fluid-cursor JavaScript, so it also works when opened by itself)
- `site-shell.css`
- `site.js`
- `fluid-cursor.js`
- `favicon.svg`
- `vercel.json`
- `sections/`
- `case-studies/`
- `scripts/`

Keep the folders intact when uploading. In particular, the five destination pages must remain inside `case-studies/`; do not move them to the repository root.

## Case-study URLs

- `case-studies/meta-ads.html`
- `case-studies/google-ads.html`
- `case-studies/seo.html`
- `case-studies/email-marketing.html`
- `case-studies/whatsapp-marketing.html`

The five cards open these pages in the same browser tab.

## CV button

The existing hero button points to `Megh-Sanghani-CV.pdf`. Add that exact PDF filename to the repository root when it is available; otherwise the existing Download CV link will return 404.

## Responsive behavior included

- Shared Inter body typography and Outfit display typography across all sections.
- Consistent desktop/mobile gutters, title scale, card radii, line height, focus states, and touch target sizing.
- Native-scroll-driven AI Tools sequence on desktop and mobile.
- Mobile AI Tools uses the complete viewport height with balanced artwork and copy spacing.
- Industry carousel uses normal horizontal swipe/drag in both directions and never traps vertical page scrolling; the complete Industry list remains unchanged below it.
- The former Foundation, Expansion, and Evolved transition is removed on desktop, tablet, and mobile; About now hands directly to Experience.
- The About closing copy uses normal responsive layout flow so its label and heading do not overlap or crop.
- Smoother Experience and finale progress interpolation.
- Contact video scrubs from the pointer’s absolute position across the whole section, with queued-seek protection and frame smoothing.
- The Contact character is hidden on mobile only and remains interactive on desktop.
- The fluid splash effect supports mouse, touch, and pen input and is bundled directly into the combined page.
- Mobile navigation includes focus containment, Escape-to-close, and synchronized ARIA state.
- FAQ remains fully intact and starts collapsed for faster scanning.

## Verification performed

- All 13 section files pass JavaScript syntax checks.
- The combined page contains exactly 12 rendered source wrappers (the empty transition placeholder is excluded) and one page-level `h1`.
- All five case-study card links and destination pages are present.
- No duplicate IDs or missing internal anchor targets were found.
- All six Platform cards contain valid image/SVG media markup.
- Desktop and mobile animation breakpoints and native scroll tracks were checked in the generated source.
