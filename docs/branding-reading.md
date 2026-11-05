# Branding and Blog reading navigation

> Current UI update: both languages now use the unchanged English SVG at 168px
> desktop / 140px mobile. See [UI and Lab Beta](ui-lab-beta.md). The asset/import
> measurements below record the earlier branding implementation.

## Brand assets and header scope

The uploaded originals are stored as `assets/branding/xiangology.svg` and
`assets/branding/xiangology-zh.svg`. Their paths, transforms, colors and strokes
are unchanged. Only the root viewBox adds four SVG units of padding on each edge:
English `-4 -4 671.6 168`; Chinese `-4 -4 593 168`. This includes the upper-right
orange strokes' rounded caps without clipping and preserves vector artwork.

`assets/branding/branding.css` is the shared, final header stylesheet. All fourteen
EN/ZH entries (desktop/mobile home, About, Blog list/article, Moments and 404)
use an image inside the existing home link, with localized alt and aria-label.
The missing-route language initializer also preserves/swaps this image rather
than replacing it with text. Personal names in biographies and article metadata
are untouched. Menus and language links retain their existing destinations/UI.

Measured image boxes (CSS pixels, proportions preserved):

| Language | Desktop (>600px) | Mobile (≤600px) |
| --- | --- | --- |
| English | 216 × 54.03 | 180 × 45.03 |
| Chinese | 196 × 55.53 | 160 × 45.33 |

At narrow widths the existing flex header/menu can wrap instead of shrinking
or clipping the logo. The original mobile-home column layout is retained.
The original brown artwork gets a paper backing only on the dark 404 header.
Screenshots at 375/390/430/1600px were inspected: lettering, orange underline and
upper-right marks remain clear and complete. SVG markup comparison confirmed
that the uploaded artwork changed only in its viewBox.

## Hierarchy and anchors

The existing NFC/lowercase `section-…` heading slug and collision suffix algorithm
is unchanged, including H1-title deduplication and H2–H6 support. The actual
SAR_Note H4 still resolves to `section-1-2-4-双塔模型-dual-tower-model`, compatible
with the old percent-encoded share link. Duplicate titles keep distinct IDs.

`js/blog-reading.js` builds native nested ordered lists with independent arrow
buttons and anchor links. H2 branches start open (H3 links visible), while H3 and
deeper child lists start collapsed. Scrollspy opens only the active heading's
ancestors and leaves other branches alone. On desktop it scrolls the sidebar's
actual scroll container; on mobile it scrolls the TOC's own bounded viewport.
When an automatic mobile expansion changes the article's top position, the
viewport and cached heading positions are compensated rather than jumping away
from the reader. Manual toggle changes trigger a fresh measurement.

TOC clicks use pushState and scroll below the measured sticky header; modified
clicks retain normal anchor behavior. hashchange/popstate and bfcache restoration
resolve after Markdown, heading IDs, TOC and fonts exist. Hash has priority over
reading memory. Any present but invalid hash safely falls back to the page top,
without consulting memory. Normal scrolling does not rewrite the URL.

## Reading memory and copy controls

Each article stores `{headingId, offset, updatedAt}` in
`lx_blog_position:<post.file>`. Offset is relative to the heading and the current
header clearance, not an absolute document scrollY. EN/ZH share a record for the
same Markdown article. localStorage is browser- and origin-specific: different
hosts/profiles do not share it. Denied storage safely disables persistence.

Scroll writes are throttled to once per 900ms, with pagehide/hidden flushes.
Initialization/restore events cannot overwrite old records. Missing headings or
invalid records return to the start. After fonts and two paint frames, a bounded
correction window handles layout changes: normally 1.8 seconds, up to six seconds
for pending images before the target. User wheel/touch/pointer/key input cancels
correction immediately, so it cannot fight intentional reading. Scroll anchoring
and native smooth hash scrolling are temporarily suppressed only while restoring.
Later-than-six-second content changes or externally replaced article structure
can still require manual repositioning.

H2–H6 retain their heading semantics and receive an accessible chain button.
Desktop hover/keyboard focus reveals it; mobile shows a 32px button. It copies the
current origin/language article URL, p parameter and encoded heading hash. A
short visible and screen-reader confirmation follows success; denied clipboard
access falls back to legacy copy, then a selectable URL dialog if needed.

## Validation and limits

External jsdom/playwright-core dependencies were reused; package manifests and
lockfiles are unchanged. APIs are blocked/mocked in browser tests; no backend,
Worker, D1, production comments or likes were modified.

```sh
python3 -m http.server 8094 --bind 127.0.0.1
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/branding-reading-browser.cjs
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/reading-persistence-browser.cjs
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node --test --test-reporter=tap tests/*.test.cjs
node dev/build-vercel.js
```

- Brand checks passed for seven page types × two languages × four widths (56
  combinations): loaded assets, localized home links/alt, image/header containment,
  size and no menu overlap. Screenshots inspected on desktop and mobile.
- Reading tests passed for EN/ZH at 390px and 1600px: defaults, automatic ancestors,
  independent manually opened branches, H4 refresh restoration with relative
  offset, H5/H6 links, URL-hash priority, copy URL/success/failure, back/forward,
  independent articles, invalid hash and removed-heading fallback. The real
  SAR_Note legacy H4 link also passed. These checks ran against the built output.
- A persistent Chromium profile was actually closed/reopened and restored the
  record. A three-second delayed image before the target caused correct
  repositioning without overwriting the saved record during initialization.
- Existing math browser regressions passed (six cases); existing viewport/404
  regressions passed. All 75 existing unit tests ran: 72 passed, with the same
  three pre-existing blog.test.cjs failures (article count, pinned ordering,
  generated metadata equality). Comments/likes unit regressions passed.
- Real iPhone Safari/Android hardware and production clipboard permission UI were
  not available. Chromium screenshots/mobile emulation do not establish those
  device-specific results. No remote deployment or merge was performed.

An unrelated observation was checked against origin/main rather than changed:
the current real SAR_Note produces a 1115px document scroll width at a 390px
Chromium viewport on both origin/main and this branch. The fixture layout/math
regressions pass; the existing real-article overflow remains a separate issue.
