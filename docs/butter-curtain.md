# Butter editorial navigation

The original static HTML architecture remains intact. Eight EN/ZH desktop/mobile
Profile, Blog and Moments entrypoints share `editorial-curtain.css` and
`js/editorial-curtain.js`. Links continue to navigate to real documents.

Supporting browsers use same-origin cross-document View Transitions. A short-lived
session intent records only an ordinary click's destination. `pageswap` and
`pagereveal` give the curtain a named snapshot and the `editorial` transition type.
The browser prepares the new document before the animation starts. Both page
snapshots stay still: the old page is removed at 50%, while the opaque curtain
covers the viewport from 43% through 57%. The named curtain alone sweeps upward
using the requested 1050ms keyframes and easing. Keep its element until `finished`:
removing it at `ready` cancels the live incoming snapshot in Chromium.

The live curtain starts at `translateY(105%)`, below the viewport. Only its named
snapshot group sweeps across the screen. Previously the live element was inserted
at `inset: 0` during `pageswap`, so it could paint a full yellow source frame while
the next document was being prepared, before the actual sweep. This was visible
on returning to the heavier Profile (including scroll restoration and media
initialization). A compositor recording reproduced that extra yellow frame before
`pagereveal`/`ready`; it was not a second animation or a different Profile theme.
Staging only the curtain offscreen removes that preparation flash without hiding
the page, adding delays or changing any snapshot keyframes, colors or timing.

The three Butter colors are fixed, independent of page themes. There is no fetched
HTML replacement, framework, loading overlay, page scaling or fade. Unsupported
APIs, unavailable session storage and reduced motion use normal navigation.
Direct visits, refresh and history do not opt into the editorial animation.
Modified clicks, download links and new tabs retain their native behavior; a
pending navigation suppresses repeated ordinary clicks. Mobile Profile links use
the existing mobile HTML entrypoint directly. Profile scroll is restored before
the incoming capture when returning through an enhanced navigation.

## Validation

Install test dependencies outside the checkout (as documented in `blog.md`), then:

```sh
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node --test tests/*.test.cjs
python3 -m http.server 8091 --bind 127.0.0.1
# In a separate terminal:
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/butter-curtain-browser.cjs
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/butter-curtain-flash-browser.cjs
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/blog-browser.cjs
```

The curtain browser test checks all six directions in EN/ZH at desktop and mobile
sizes, the actual generated animation's offsets, duration, easing and vertical
positions, exact colors, destination titles, scroll restoration, history, reload,
reduced motion, duplicate clicks and native link behavior. Additional cases cover
slow responses, unsupported APIs and an unavailable destination. Optional
`CURTAIN_ARTIFACT_DIR` saves centered curtain screenshots to an existing directory.
Production API calls in tests are mocked. Actual Safari and Firefox are not
covered by the Chromium matrix; feature detection preserves native navigation.

The flash regression records actual Chromium compositor frames for Blog and
Moments returning to Profile in both languages and at both viewport sizes. It
rejects yellow frames before animation readiness, multiple sweeps, residual
overlays, page errors and local image 404s. `SITE_TEST_URL` can point both curtain
tests at the local `dist/` server to exercise a Vercel Preview build. External
requests are blocked or mocked in these tests.

## Profile media fixes

The portrait switcher and language-indicator setup now share the original IIFE
with `resourceBase`. Previously the switcher referenced that private variable
outside its scope and threw before registering its click handler. The browser
matrix now requires no page errors, and tests exercise all three portrait files.

Gallery requests use exactly the five files already displayed by the old loader:
`research-gnn-2.png`, `research-sna-2.png`, `research-asrs-1.png`,
`internship-sinolight-1.png` and `project-igo-1.png`. All are tracked under
`Resources/` and copied unchanged into `dist/Resources/`. Numbering gaps and
nonexistent `.jpg` variants were speculative probes, not missing required photos.
The intentionally differently named `deleteresearch-gnn-1.png` is not added to a
gallery. Existing selections, ordering and containers remain intact. Optional
skill/social icons may use an explicit Resources-relative `data-icon` filename;
there are no active `data-skill` or `data-social` elements in the current HTML.
