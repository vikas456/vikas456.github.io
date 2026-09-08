# vikasperaka.com

Personal site for Vikas Peraka — built with [Astro](https://astro.build), deployed
as a static site to GitHub Pages at **https://www.vikasperaka.com**.

## Status

The redesign lives on the `redesign` branch and **is not live**. `master` still
serves the previous Webflow site. See "Going live" below.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # generates assets, then builds to dist/
npm run preview  # serve the production build locally
```

## Where things live

| Path | What it is |
|---|---|
| `src/data/site.ts` | Name, role, email, links, SEO strings, GA4 id, form key |
| `src/data/content.ts` | Reach diagram nodes, career timeline, selected work |
| `src/components/` | One component per section of the page |
| `src/scripts/` | Reach diagram (canvas), contact form, scroll-spy |
| `src/styles/global.css` | The whole stylesheet — dark-first, no framework |
| `src/assets/` | Images processed at build time (portrait, work shots) |
| `public/` | Files served as-is: CNAME, robots.txt, favicons, OG image |
| `scripts/generate-assets.mjs` | Rasterises favicon.ico, apple-touch-icon, OG card |
| `archive/` | The previous Webflow site, kept for reference |

## Editing content

Almost all copy lives in `src/data/content.ts` and `src/data/site.ts`. Timeline
bullets accept a small amount of inline HTML (`<b>`, `<em>`) so numbers can be
highlighted; `<em>` renders in gold and is used for metrics.

> **Whitespace gotcha:** in `.astro` templates, keep inline elements such as
> `<b>` and `<span>` on the same line as the word before them. Astro trims
> whitespace at line breaks next to elements, which glues words together.

## Adding project screenshots

Drop a file into `src/assets/work/` named after the work item's `slug`:

```
src/assets/work/meta-shop.png
src/assets/work/accounts-center.png
src/assets/work/boosted-listings.png
src/assets/work/messenger.png
src/assets/work/redraft.png
src/assets/work/uteats.png
```

Any of `.png` `.jpg` `.jpeg` `.webp` `.avif` works. The image is picked up on the
next build, converted to WebP, and served responsively — no code change needed.
Until a file exists, the hand-drawn placeholder illustration renders instead.

Supply images at roughly **1360×528** (2× the 680×264 display size).

## Contact form

The form posts to [Web3Forms](https://web3forms.com) (free, no backend). Without a
key it falls back to opening the visitor's mail client, so the button always does
something real.

To enable real delivery, create `.env` in the repo root:

```
PUBLIC_WEB3FORMS_KEY=your-access-key-here
```

For the deployed site, add the same value as a repository secret and expose it to
the build step in `.github/workflows/deploy.yml`.

Spam protection: a honeypot field plus Web3Forms' own filtering. Submissions that
trip the honeypot are silently accepted and discarded so bots learn nothing.

## Analytics

Google Analytics 4 (`G-35Y4X5T43C`, carried over from the old site) with custom
events in `src/components/Analytics.astro`:

| Event | Fires when |
|---|---|
| `section_view` | A section scrolls into view (35% visible) |
| `nav_click` | A rail nav link is used |
| `resume_click` | The resume is opened |
| `email_click` | An email link is used |
| `outbound_click` | Any external link is clicked (records the URL) |
| `contact_submit` | The contact form is submitted (`sent`/`error`/`mailto`) |
| `reach_diagram_explore` | A visitor hovers the hero diagram |

## SEO

Per-page title/description, canonical URLs, Open Graph and Twitter card tags,
`Person` JSON-LD, generated `sitemap-index.xml`, and `robots.txt` (which excludes
`/archive/` so the old site cannot compete with the new pages). The hero diagram
is canvas, so its content is mirrored in a visually-hidden list for crawlers and
screen readers.

## Going live

1. Merge `redesign` into `master`.
2. **Repo Settings → Pages → Source:** switch from "Deploy from a branch" to
   "GitHub Actions". Until this is changed, nothing about the live site changes.
3. **Actions → Deploy site → Run workflow.**
4. Verify https://www.vikasperaka.com, then uncomment the `push:` trigger in
   `.github/workflows/deploy.yml` for automatic deploys.

`public/CNAME` preserves the custom domain, and GitHub Pages continues to serve
it over HTTPS.
