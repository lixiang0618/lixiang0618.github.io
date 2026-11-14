# Graph homepage — first local version

The four existing entrypoints share `profile-graph.css` and
`js/profile-graph.js`. Original headings, details, links and image URLs remain
in their HTML files. JavaScript enhances the records into illustrated tiles;
without JavaScript the original content remains available.

- The finite intro gathers dark brown particles into XIANG and splits them
  between the existing brand SVG and the English name. It automatically runs
  on the first direct entry in a tab, never on return from another site page.
  Navigation is revealed at the end, with its existing markup and
  layout unchanged. Skip, reduced motion, history navigation and section links
  do not require watching the intro.
- Tiles reuse the corresponding bilingual Lab SVG illustrations. Hover/focus
  previews a source image; clicking opens a native modal dialog containing the
  original text and media. Escape closes it and restores keyboard focus.
- The portrait is a simple rounded rectangle. Original social logos, contacts,
  live location integration and all ten sports photos are retained.
- Education shows the original degree/major inline without grades or a modal.
  Sports use the original masonry proportions without fixed-height cropping.
- Lab illustrations animate only while visible and respect reduced motion.
- Display derivatives under `assets/homepage/` reduce portrait/photo-wall
  transfers. Dialogs use original media, including the LearnGo GIFs.

`js/profile-entry.js` handles both browser language and mobile entrypoints.
Explicit Chinese URLs remain Chinese. `?lang=en` or `?lang=zh` selects a language;
`?view=mobile` and `?view=desktop` allow either existing device entrypoint to be
reviewed without changing the browser user agent. Query parameters and hashes
survive redirects.

Rebuild shared artwork after changing Lab illustrations:

```powershell
node dev/build-homepage-art.js
```

Regenerate display derivatives on Windows without changing source media:

```powershell
& .\dev\prepare-homepage-images.ps1
```

Check language and device routing:

```powershell
node --test tests/homepage-entry.test.cjs
```

Local preview (no publishing step):

```powershell
node dev/homepage-preview.js
```

The preview binds only to loopback and proxies the existing public location
endpoint through `/__profile-location`. Production continues to call the
original HTTPS API directly; there are no stored or invented location values.

Country flags use `js/profile-country-flags.js` and 64 locally stored SVGs under
`assets/flags/` (flag-icons 7.6.0, MIT). Match the API's country/country_code only,
using English/Chinese names and ISO aliases. Unknown countries retain the pin;
paused/stale/unavailable location states hide the flag. No third-party image
requests or city-based country guessing are used.

## Current review decisions

- Name stays on one line: 李想 / Li Xiang, using a heavier sans-serif face.
- Sports shows only the original icon and sport name, in aligned equal columns.
- Detail dialogs ease in over 560 ms and out over 400 ms, including the backdrop;
  reduced motion remains immediate.
- Original visible body text was compared with `main` for all four entrypoints.
  Research/internship/project paragraphs are preserved; the desktop English
  modal audit contains 19 original list items across seven records.
- The post-intro first screen now uses an 880px-wide centered composition:
  a full-width identity heading, research interests/social links beside the
  portrait, and an email/location strip across the bottom. The fixed hero height
  is removed so Education appears sooner. On phones, portrait, name, information
  and contacts stack centrally; project copy below remains left aligned.

## Shared research artwork

`node dev/build-research-art.js` updates just the CCHAN/SNA SVGs in both Lab
landing pages, then regenerates `js/profile-art.js` for the homepage. Artwork
source is `lab/shared/research-gallery-art.js`; motion lives in `lab/gallery.css`.

- CCHAN: reject P₁–H–D′–P₃ in red, merge H/D into HD, accept P₁–HD–P₂ in green.
- SNA: identify the 11 actual core universities, zoom to the core, return to the
  26-node overview. The core/periphery projection changes display coordinates;
  source membership and connectivity are retained.
- Both stories pause off screen. Reduced motion shows a meaningful static state.
- These two homepage tiles keep the animated art visible on hover; original
  research images remain available in the detail dialog.

## Relationship statement hero
The approved bilingual copy is The world happens in between. / 我从万物的联系中，看见世界。. The identity remains on one line; social links and email share the left column, portrait and live country/location share the right. Original interests move to the research heading. A decorative, non-intercepting canvas draws two permanently connected particles, warm color exchanges and a traveling pulse, plus sparse ambient points. Nearby mouse movement gently attracts the pair; pointer leave releases them. Mobile uses fewer points and centered composition. Reduced motion draws a still frame; animation pauses when hidden or offscreen. Existing intro hides the ambient canvas until completion.


Latest layout: desktop retains text left and portrait/location right, with an underlined identity. Mobile places portrait/location left and name/statement right; social links and email sit near the first viewport bottom without boxes or separators. The 13-node colorful constellation occupies the desktop gap and mobile space to the right of location. Research keyword chips are removed. Ambient particles remain behind both layouts.

