# Moments Photo-Adaptive Liquid Glass

## Scope

Only moments.html, zh/moments.html, moments-glass.css and js/moments-glass.js
participate in the visual implementation. Both language pages load the same CSS
and JavaScript. The two HTML files add a body class, a mount call after rendering,
and lazy/async decoding hints for gallery photos. No data schema, photo path,
API, likes/comments logic, visitor identity, management token, deployment config
or Blog Paper & Ink file changes are required.

Baseline Chromium measurements: card width 544px on 1440/1024px viewports, 568px
on 768px, and 358px on a 390px viewport. Existing feed widths, gallery grid/aspect
ratios, Timeline/Snapshots and compact titles remain intact.

## Selection

IntersectionObserver (with a small look-ahead margin) supplies possible cards.
Each scheduled update computes actual viewport-clipped width × height, excluding
the portion covered by the current sticky navigation. It never compares card
visibility percentages, distance to center or top edge. The largest area is the
candidate; the current visible card remains active unless the candidate exceeds
it by 15%. Invisible current cards release immediately. A subpixel tolerance
avoids floating-point oscillation at the exact threshold.

Raw scroll events only schedule one requestAnimationFrame. A rare fast jump can
outrun IO; when its cached candidates have no visible area, one fallback pass
checks the cards directly. ResizeObserver tracks card/header size, including
comments expanding. MutationObserver handles card replacement, gallery changes
and comment rendering. Load/error, resize, pageshow and returning to visibility
also refresh selection. Without IO/RO, the viewport calculation and mutation/
load/resize events still provide a basic fallback.

## Photograph and transitions

The first actual gallery img is the source, skipping videos. A video-only or
text-only card has no photo and selects neutral; a failed image also selects
neutral. No new metadata field or new photo request is introduced.

No thumbnail assets were found. The script waits for the gallery image's own load,
uses its decode promise when available, and derives a center-cropped 96×96 JPEG
in a reusable canvas. Only this tiny derivative reaches the ambient layers. A
bounded 16-entry URL cache avoids repeated original decoding/processing on revisit.
Original gallery images remain sharp and retain their own URLs and aspect ratios.
Canvas/CORS/security/decoding failures safely fall back to neutral.

A fixed, aria-hidden, pointer-events:none container holds exactly two background
layers plus a light veil. It sits behind the normal content, below navigation,
Lightbox and native comment dialogs. Photo layers use large blur, desaturation,
controlled brightness and overscan to hide edges. Mobile reduces blur costs.
Cards are one translucent surface with subtle borders, inset highlight, restrained
shadow and backdrop blur; comments stay inside it without an opaque nested panel.

Source changes crossfade opacity over 700ms. While a fade runs, only the latest
desired source is kept; there is no unbounded transition queue and no replacement
of a visible image in-place. Stale decode promises are invalidated/aborted when
selection changes. Missing/slow images select neutral until ready. Reduced motion
removes transitions while retaining the same selection rule. Reduced transparency
uses opaque cards and no backdrop blur; unsupported backdrop-filter uses a more
opaque fallback. These CSS rules are scoped to Moments.

## Validation

Install test-only dependencies outside the checkout, as in the existing Blog docs.
With a local static server on port 8091:

```sh
NODE_PATH=/tmp/lx-blog-tests/node_modules node --test tests/moments-glass.test.cjs tests/blog-reading.test.cjs tests/blog.test.cjs tests/comments.test.cjs tests/moments-likes.test.cjs
NODE_PATH=/tmp/lx-blog-tests/node_modules node tests/moments-glass-browser.cjs
```

45 unit/DOM tests cover existing Blog/Moments behaviors plus 9 focused glass tests:
area clipping, ratio-independent choice, 15% hysteresis, first-photo selection,
neutral failures, derivative cache, stale decode cancellation, dynamic comments,
replacement, reduced motion, observer use and scroll-event coalescing.

Chromium passed EN/ZH × 1440/1024/768/390px (8 cases): selection independently
checked from live geometry, midpoint opacity crossfade, fast scroll, resize,
video-neutral transition, sharp gallery/Lightbox, no horizontal overflow, unchanged
card widths, likes and comment create/edit/delete. Six additional cases passed:
text-only, failed photo, slow photo, reduced motion, reduced transparency and back navigation.
Every API mutation in these tests is mocked; no production comments were touched.
Screenshots were inspected for desktop/mobile readability and photo detail blur.

## Performance and limitations

- At most two large blurred ambient layers; opacity is the animated property.
  There is no repeated background DOM creation or layout read on every raw event.
- Card blur is reduced from 18px to 10px on smaller screens. No permanent
  will-change is assigned to every card. Device GPU/thermal performance still
  needs real-device checking; viewport tests do not prove sustained frame rate.
- Some existing originals are large (one first photo is about 26MB). Their content
  is unchanged. Lazy loading reduces initial gallery traffic, and ambience does
  not fetch/decode them solely for itself. Asset compression can be a separate
  follow-up rather than altering the user's photo collection in this UI change.
- Cross-origin photos without canvas permission use neutral. Existing photos
  are same-origin. A source selected during a fade may wait for the current
  700ms fade before the latest transition starts; intermediate choices are dropped.
- The neutral layer starts from #E9EDF1 and is softened by the same ambient light
  treatment. Exact resulting colors depend on the photograph, compositing and GPU.
- WebKit is not installed in the current environment. Real iPhone Safari/WebKit,
  low-power phones, touch long-press, browser-specific backdrop rendering and
  slow cellular networks require Preview QA. Reduced-transparency was exercised
  through Chromium's media-feature emulation, not a real OS accessibility panel.
- No Worker/D1/schema/deployment changes or automatic merge are part of this work.

Manual Preview checklist: both languages; black/bright/saturated photos; two cards
near an area tie; rapid scroll/back navigation/rotation; long comments and text;
video-only/no-photo/failed photo; reduced motion/transparency; native Lightbox and
comment dialog keyboard focus; likes/counts/Token backup, edit, wrong token and
delete; Timeline/Snapshots; Blog and unrelated pages visually unchanged.
