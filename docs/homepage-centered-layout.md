# Homepage alignment follow-up

This continues `feat/homepage-ui-lab-beta` after `1de8289`; it is not a new branch
or replacement PR. Before editing, the workspace was clean, the remote branch
still pointed to the same commit, and that commit was not an ancestor of
origin/main. GitHub API listing returned 403; no matching pull/head reference was
found, so an existing PR URL/open state cannot be confirmed. No PR is created.

## Changes

- `profile-editorial.css`: the existing 1.2fr/1fr desktop Hero grid is retained.
  All information rows share the left column's center. The name's existing font
  family, size, weight and color rules are unchanged. Existing mobile image-first
  stacking remains.
- Keywords are now lightweight wrapping flex text, without tag padding, fixed
  2×2 rows, hover fills, borders or underlines. The original words/order remain.
  `js/profile-layout.js` measures only keyword row starts after font load/resize.
  A faint CSS middot is hidden on each row's first item. Visibility changes do
  not alter item widths, so this cannot cause a wrapping feedback loop or isolated
  separators. It makes no network requests and uses no dependencies.
- Social links use a compact, centered four-item row when the information column
  has more than 460px available. A container query changes it to two equal columns
  at 460px and below, with a viewport fallback for older browsers. Icons, names,
  destinations, target/rel attributes and existing underline hover behavior remain.
- Email is centered in the same axis and retains its actual mailto address.
- The four homepage HTML entries rearrange only the location heading: its existing
  dot precedes the localized heading, with the sharing state still accessible.
  The old clock decoration is removed. Location has no background, border, radius,
  shadow or card padding. Its internal heading, place/icon and relative time center
  under a 160px faint separator. It remains independent of Email and no new card
  or location data source is introduced.

## Why the portrait was oval

The previous shared rule set width:100%, max-width:420px and height:480px. The image
could shrink with its flex/grid column while its height stayed fixed. The parent
now provides a responsive 1:1 aspect ratio; the image also has aspect-ratio:1/1,
height:auto, flex-shrink:0, object-fit:cover and border-radius:50%. This removes the
conflicting fixed height rather than layering different height overrides. Original
photo URLs/files, orange border, shadow and hover remain unchanged. Mobile size
limits remain 320px / 220px at the existing breakpoints.

## Protected behavior

`js/profile-location.js` is byte-for-byte unchanged in this commit: same API,
request count, omitted credentials, no-store cache, timeout, textContent escaping,
city/district deduplication, relative-time timer, hidden-tab handling, status and
24-hour privacy rules. Place names remain the original English API strings in
both languages. No translation, coordinates, tokens, backend or database changes.

Logo, navigation, Lab, Blog/TOC, article bodies, comments and likes are untouched.
The existing inherited theme variables style the transparent location component;
no new global homepage theme engine or switch is introduced. Dark component tests
supply those existing host theme variables, rather than claiming that the whole
legacy homepage has gained a new dark mode.

## Verification

```sh
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node --test --test-reporter=tap tests/*.test.cjs
node dev/build-vercel.js
python3 -m http.server 8101 --bind 127.0.0.1 --directory dist
SITE_TEST_URL=http://127.0.0.1:8101 NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/homepage-centered-browser.cjs
SITE_TEST_URL=http://127.0.0.1:8101 NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/ui-lab-browser.cjs
SITE_TEST_URL=http://127.0.0.1:8100 NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/profile-location-browser.cjs
```

Actual Chromium checks cover 375/430/768/1366/1440px × EN/ZH × desktop/mobile
entrypoint: matching information center axes, natural keyword row separators,
responsive social rows, strict image/container circles, no document overflow,
transparent location presentation, English place names, relative time, and exactly
one location API request. Before/after computed name typography is identical at
all five breakpoints. Name, keyword strings, social URLs/icon URLs, photo src and
email href are compared to the preceding commit. Light/dark component screenshots
were actually inspected. The existing UI/Lab/TOC and five-state location browser
regressions also run, with homepage assertions updated for this confirmed design.

All 86 existing unit tests ran: 83 passed, with the same three unrelated
blog.test.cjs baseline failures (article count, pin ordering and metadata generation).
Comments/likes and all location unit tests passed. Static build and diff checks pass.

Real phone hardware, production API/CORS and the PR state remain unverified.
Network fixtures are explicit; two original remote social images cannot load in
the restricted environment, so screenshots show their missing-image placeholders.
Their source URLs are preserved. No formal deployment or merge is performed.

## File list

Updated: `index.html`, `zh/index.html`, `index-mobile.html`, `zh/index-mobile.html`,
`profile-editorial.css`, `tests/ui-lab-browser.cjs`.
New: `js/profile-layout.js`, `tests/homepage-centered-browser.cjs`,
`docs/homepage-centered-layout.md`.

## Selected full-height Hero and capsule invitation

Follow-up on the same branch: the introduction now has a minimum viewport height
minus the *measured* header, with 100svh and a 100vh fallback. The existing content
keeps its typography, circle and column proportions; flexible free space centers
it vertically. Education starts after the Hero, so its heading is not visible on
entry. Short/mobile screens naturally extend the Hero when content needs more
room; nothing is scaled down or covered by a fixed overlay.

The selected light-orange capsule sits in normal flow at the Hero bottom, 24px
from the edge: localized label, small orange dot and down arrow, thin warm border,
soft fill and restrained shadow. Its 46px hit area works with keyboard/modified
clicks. The arrow moves 4px over a three-second cycle, repeats three times then
stops, and pauses in hidden documents. Reduced-motion disables animation and uses
immediate scrolling. Clicking scrolls to Education with header clearance and a
normal #education URL. Header resize is observed by the existing layout helper;
there is no fixed nav-height guess after initialization, scroll listener or timer.
The API/location code remains untouched.

Added `tests/homepage-scroll-cue-browser.cjs`: six screen sizes, both languages and
both entrypoint types (24 checks), first-viewport exclusion of Education, pill
bounds/centering/hit area, circle preservation, URL target/header clearance,
responsive header measurement, reduced motion and keyboard activation. This is
also exercised against the static build. Existing homepage center/preservation
checks and all 86 unit tests retain their prior outcomes. Real mobile browser
chrome/Safari hardware remains for manual testing.
