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

The baseline Profile `script.js` already throws `resourceBase is not defined`
because the portrait switcher references a variable scoped inside a previous
IIFE. The browser test explicitly tolerates that one pre-existing error and fails
on any new page errors. This navigation change does not alter that script.
