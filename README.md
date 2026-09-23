# Megh Sanghani Portfolio

Single-page portfolio assembled in the supplied order from section `00` through section `12`, with a page-level WebGL fluid cursor and five separate performance-marketing case-study pages.

## Deploy with GitHub and Vercel

1. Extract the ZIP, then upload **everything inside the extracted folder** to the root of a GitHub repository. Keep the `case-studies` and `sections` folders intact.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Leave **Framework Preset** as **Other** and keep the build/output fields empty.
4. Deploy.

Vercel serves the root `index.html` directly. No package installation or build command is required.

## Case-study URLs

The Performance Marketing cards open these pages in the same tab:

- `case-studies/meta-ads.html`
- `case-studies/google-ads.html`
- `case-studies/seo.html`
- `case-studies/email-marketing.html`
- `case-studies/whatsapp-marketing.html`

Do not move these five files to the repository root. The cards intentionally use the `case-studies/` folder paths.

## Edit or rebuild sections

The original ordered source files are in `sections/`. After changing a section, run:

```bash
node scripts/build.mjs
```

Then commit the regenerated `index.html`.

## CV file

The hero links to `Megh-Sanghani-CV.pdf`. Add that PDF to the repository root before publishing if you want the Download CV button to work.
