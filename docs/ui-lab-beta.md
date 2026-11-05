# Homepage UI and Lab Beta

## Scope and structure

All work is on `feat/homepage-ui-lab-beta`, based on origin/main `1a550fb`.
No framework, dependency, Worker, database, API address or content pipeline changed.

- `blog.css`: every TOC row is a two-column grid. The fixed arrow column exists
  even for a leaf; anchor text always occupies column two. Nested lists keep
  their existing indentation. Disclosure, hash/history, scrollspy and memory logic
  are unchanged; no per-item margin patch is used.
- `assets/branding/branding.css` and the EN/ZH HTML headers: both languages now use
  the existing, unchanged `xiangology.svg`. The Chinese SVG is retained as an
  unused source asset. Width is 168px above 700px and 140px below, about 22% less
  than the previous English logo, with auto height (42px / 35px approximately) and
  a minimum 44px link hit area. Menus can wrap, preserving all original items.
- All shared headers include Profile → Lab Beta → Blog → Moments → About. The
  root and Chinese 404 entries also include these items, and `js/404.js` updates
  their absolute paths/labels when root fallback HTML is served at a Chinese URL.
- The four homepage variants share text-then-media DOM order and shared profile
  CSS. A responsive grid puts media first below 980px, without language-specific
  layout rules. Duplicated mobile hero overrides were removed. Text, portrait,
  keywords, social links, Email and location share the same sizing and spacing.
- Keywords and social links each use two equal grid columns at every width.
  Keyword cells reserve enough room for the actual two-line English phrases.
  Social text remains visible on mobile. All original words, destination URLs,
  platform icon URLs and personal information are preserved.
- The existing timeline's fixed 1100px width/110px margin widened the homepage to
  1226px at a 375px viewport, including origin/main. A scoped narrow-screen width,
  margin and content-shrink rule fixes the actual overflow rather than adding
  document clipping. Its content and desktop layout remain unchanged.

## Quiet Card

Each homepage places `.profile-location-wrap` after, not inside, Email's contact
row. It is centered below 980px and capped at 360px, with equal responsive outer
space. The card uses a warm white surface, thin warm-gray border, 14px radius and
very light shadow. It has a small heading, API sharing status, original orange
pin, city/district label and clock/relative timestamp. Dark theme variables are
provided for the existing `data-blog-theme="dark"` convention.

`js/profile-location.js` still GETs the same public API with credentials omitted,
no-store cache and a six-second AbortController timeout. City/district deduplication
and region/country fallback remain unchanged. There are no coordinates, tokens,
storage or more precise addresses in the presentation. Strings use textContent.
No sample place or timestamp is hardcoded in product code.

Only a successful active response with a valid place/date enables the green
status and four-second ease-in-out breathing dot. Its tooltip explicitly says it
means sharing status, not online presence or continuous tracking. Paused/stale
responses never display a supplied location; their dot is neutral and still.
Unavailable/errors remain quietly hidden with reserved layout space.

Relative time uses Intl.RelativeTimeFormat and the original timestamp. It updates
locally every 30 seconds, pauses in hidden documents, and refreshes on return.
It does not poll or continuously track the API/user. A valid full local-time date
is retained as the time element's title. Invalid timestamps and future dates over
one minute are hidden; a tiny positive clock skew displays Just now. The original
24-hour privacy cutoff remains: the location is removed at expiry, not shown as
an old "2 days ago" location. Reduced motion disables breathing.

## Lab

`lab.html` / `zh/lab.html`, `lab.css` and `js/lab.js` form a small static page.
Main content is exactly the provided bilingual title/description and a decorative
SVG flask. A clipped orange liquid path slowly rises/falls; three small bubbles
have staggered, slow loops. There are no project lists, tags, demos or promises
beyond the requested copy. SVG viewBox and CSS transforms preserve layout size.

The theme button shares `lx_blog_theme` with Blog; the language link switches
between the two Lab URLs. All five normal nav destinations and the standard footer
are retained. Both pages have localized description/OG description, canonical,
EN/ZH/x-default hreflang, title and favicon. Animation pauses in the background
and is disabled under prefers-reduced-motion. The standard static build already
copies these files; no deployment or router changes are needed.

## Verification

External test dependencies remain outside the checkout:

```sh
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node --test --test-reporter=tap tests/*.test.cjs
node dev/build-vercel.js
python3 -m http.server 8099 --bind 127.0.0.1 --directory dist
SITE_TEST_URL=http://127.0.0.1:8099 NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/ui-lab-browser.cjs
READING_ONLY=1 SITE_TEST_URL=http://127.0.0.1:8099 NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/branding-reading-browser.cjs
SITE_TEST_URL=http://127.0.0.1:8099 NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/profile-location-browser.cjs
```

The UI browser suite covers 375/430/768/1440px, four homepage variants, paired EN/ZH
bounding-box parity, two-column rows, source text/link preservation, centered card,
document width, every shared header including 404/Lab, nav order/overlap, theme,
language targets, SEO, running/reduced animations, TOC alignment before/after
expansion and heading navigation. Screenshots were actually inspected.
The reading browser regression covers both languages on mobile/desktop, deep
anchors, copy success/failure, saved position, hash priority, history, and the real
SAR_Note legacy link. Location browser checks cover all five states on the four
homepages, relative labels, full-time tooltips, loading reservation and timeout.
Location unit tests also advance time, verify expiry, future/invalid data, DOM
escaping and unchanged privacy filters.

All 86 unit tests executed: 83 passed; the same three pre-existing blog.test.cjs
failures remain (article count, pinned ordering, generated metadata equality).
Comments/likes regressions passed. No unrelated article content/test baseline was
changed to hide those failures.

Live API/CORS, production hosting and real iPhone/Android hardware were not
verified. The environment currently denies the API/GitHub API hosts; browser API
responses are explicit fixtures. Two original remote social icons cannot load
under the restricted test network; their URLs were intentionally preserved.
The previously recorded real SAR_Note overflow is outside this change; the new
TOC fixture has no overflow. No production deployment or merge is performed.

## File inventory

New: `lab.html`, `zh/lab.html`, `lab.css`, `js/lab.js`,
`tests/ui-lab-browser.cjs`, `docs/ui-lab-beta.md`.

Updated page pairs: `index.html`, `zh/index.html`, `index-mobile.html`,
`zh/index-mobile.html`, `about.html`, `zh/about.html`, `blog.html`, `zh/blog.html`,
`blog-post.html`, `zh/blog-post.html`, `moments.html`, `zh/moments.html`,
`404.html`, `zh/404.html`.

Updated shared styles/logic: `assets/branding/branding.css`, `blog.css`,
`profile-editorial.css`, `js/profile-location.js`, `js/404.js`.
Updated checks/docs: `tests/branding-reading-browser.cjs`,
`tests/profile-location-browser.cjs`, `tests/profile-location.test.cjs`,
`docs/branding-reading.md` (points to the current logo sizes).
