# Megh Sanghani Portfolio

Single-page portfolio assembled in the supplied order from section `00` through section `11`, with a page-level WebGL fluid cursor.

## Deploy with GitHub and Vercel

1. Upload this folder to a new GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Leave **Framework Preset** as **Other** and keep the build/output fields empty.
4. Deploy.

Vercel serves the root `index.html` directly. No package installation or build command is required.

## Edit or rebuild sections

The original ordered source files are in `sections/`. After changing a section, run:

```bash
node scripts/build.mjs
```

Then commit the regenerated `index.html`.

## CV file

The hero links to `Megh-Sanghani-CV.pdf`. Add that PDF to the repository root before publishing if you want the Download CV button to work.
