# Blog viewport and the missing-zero page

## Blog: evidence and scope

Normal Python articles had no document overflow at 375/390/430px or 1600px.
A deliberately long **inline** KaTeX formula did extend the document (2354px on
mobile), unlike display math, tables and code which already had local scrollers.
The root canvas also had a transparent background while only body painted paper.
These are confirmed weaknesses; neither establishes the cause of an unseen iPhone
recording. No viewport scale restriction was added.

`blog.css` paints the root canvas with the existing light/dark paper colors and
allows pathological unbroken article titles to wrap. `BlogMarkdown.containMath`
measures inline formulas after rendering, font loading and content resizing. Only
formulas wider than their containing text block gain a keyboard-accessible local
scroller. Short formulas keep the existing inline baseline, font and line height.
Tables retain their own wrapper; display math and preformatted code keep theirs.
There is no document-wide clipping, CSS zoom, page transform, or forced JS zoom.

Eight before/after Python screenshots (375/390/430/1600px × light/dark) were byte
identical. New fixture tests additionally exercise both languages and huge inline
math alongside display math, tables and code, including 22px reading text.
Chromium mobile emulation is **not** real Safari pinch testing. Safari may reveal
an area wider than the layout viewport when zooming below its initial scale;
painting the canvas makes its color continuous, but cannot make a fixed layout
fill a larger visual viewport without changing layout. Recheck on actual iPhones
at 100%, zoomed in, pinched out, and after rotation, in both themes. Confirm local
horizontal scrolling and pinch enlargement still work. No minimum-scale workaround
is assumed portable or necessary.

## One 24-second drama, two languages

`404.html` and `zh/404.html` provide semantic, navigable no-JS fallbacks. Both load
`404.css` and `js/404.js`. At a missing URL the root entry chooses Chinese only for
`/zh/…`, updates document language/title, and uses absolute asset/navigation URLs.
An explicit language link reaches the other 404 entry. Dynamic text uses textContent.

The two fours slide in; the orange zero drops and bounces; a quiet interval leads
to right/left collisions and staggered reactions; zero escalates to aerial feints,
then flies out while both fours lean inward and a dashed placeholder/“Where’s 0?!”
appear. Zero rolls back, promises to behave, and rests before repeating. Six timed
speech bubbles share the CSS timeline. Only transforms and opacity animate.
The stage clips its own offstage actors without changing document width. Links
remain visible and usable throughout. A pause button and visibilitychange pause
support readers; reduced-motion renders a stable 404, without bubbles or animation.
Decorative actors/dialogue are aria-hidden and never announced in a loop.

## Hosting behavior (configuration versus deployment)

- **GitHub Pages:** the existing Pages workflow uploads the repository root, which
  now includes root `404.html` and both shared assets. Pages' native custom error
  mechanism serves root `404.html` for missing paths with 404 and preserves the
  URL; client code handles `/zh/…`. No redirect to home or custom catch-all rewrite
  is added. This repository is a user site at `/`; project-site subpath deployment
  would require a different base path. Pages cannot provide a distinct JSON API
  fallback using static HTML alone: unknown same-origin `/api/*` gets the host's
  normal custom HTML 404. There are no same-origin API handlers in this checkout;
  the real client API is the separate `https://api.lxiang.cc` origin, untouched.
- **Vercel:** `dev/build-vercel.js` copies the error entries/assets into `dist/`.
  `vercel.json` first resolves existing filesystem/function routes, then terminates
  unmatched `/api` and `/api/*` with an empty 404, then internally serves
  `/404.html` with status 404 for all other missing paths. Existing files win;
  requests retain their original URL. The route array passed
  `@vercel/routing-utils@5.3.0` normalization without errors. No external API
  routing or SPA fallback was present to overwrite.
- **lxiang.cc / Cloudflare:** no Wrangler config, Worker, Pages Functions, CNAME,
  or Cloudflare routing configuration exists in the checkout. Attempts to inspect
  this domain's HTTP headers were denied by the environment egress policy.
  Cloudflare DNS alone cannot establish its hosting architecture. No speculative
  `_redirects` or Worker deployment was added. If it proxies Pages/Vercel, preserve
  the origin's 404 status/body and avoid edge redirects/error replacement/caching
  that converts 404 to 200. If it is Cloudflare Pages static hosting, root
  `404.html` enables native missing-path fallback; exclude `/api/*` in any existing
  Functions/Worker handler before HTML fallback. If an existing Worker owns the
  routes, retain its API dispatch first, fetch the static origin/assets, and only
  substitute this root error document for an actual missing HTML navigation,
  returning `new Response(errorBody, {status:404, headers:{'Content-Type':
  'text/html; charset=utf-8'}})`. Do not substitute upstream 5xx or network errors.
  The actual Cloudflare route and origin must be confirmed before that change.

Live host status/body checks and provider Preview deployment are **not verified**.
The browser's deep-path tests deliberately fulfill 404 fixtures, verifying the
page's path handling and absolute assets, not the providers' production behavior.
After deployment, GET `/abc`, `/random-page`, `/zh/not-exist`, and
`/blog/something-not-found` on all three hosts. Require HTTP 404, original URL,
correct language, successfully loaded CSS/JS, and working links. On Vercel also
check `/api/not-exist` is 404 without this HTML, and verify all normal routes.

## Missing article versus failed load

Both article entries dispatch the shared component when `p` is absent, a
successfully loaded metadata list has no matching file, or its Markdown GET
returns 404. They do not redirect or fetch an arbitrary query-supplied path.
Metadata failures, aborted/network requests and non-404 article errors retain the
existing localized load-error state. Existing articles and their bodies are unchanged.
For `/blog-post.html?p=missing`, the HTML shell exists and the static host returns
200 before JS runs. The component changes the visual state and sets noindex; it
cannot retroactively change that HTTP status. A real query-aware HTTP 404 needs
provider/server logic with the same canonical metadata; none is claimed here.

## Validation

From the checkout, with external test dependencies and a local static server:

```sh
python3 -m http.server 8093 --bind 127.0.0.1
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/viewport-404-browser.cjs
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules SITE_TEST_URL=http://127.0.0.1:8093 node tests/blog-math-browser.cjs
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node --test --test-reporter=tap tests/*.test.cjs
node dev/build-vercel.js
```

The new browser suite passed 16 layout/theme cases, 8 full-timeline stage cases,
12 article-error cases, reduced-motion, no-JS links, dark 404, background pause and four deep fallback
fixtures. The existing math browser suite passed six EN/ZH desktop/mobile cases.
All 75 existing unit tests ran: 72 passed, with the same three baseline failures
in `tests/blog.test.cjs`: old article count, pinned-first expectation, and generated
metadata equality. No article content or unrelated baseline tests were modified.
Do not run sync.js directly merely for testing: it rewrites tracked page/content
files; the existing tests run generation in temporary fixtures instead.
