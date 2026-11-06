# Wellife Playground

## Current UX

The bilingual page starts with Today's Balance (energy in, active exercise out, difference and five food nutrient totals). A single compact comparison chart switches between energy and nutrients. Below it, Food Recognition and Motion Recognition are aligned columns on desktop, stacked on mobile. Today's Records defaults to five recent entries, with View All and expandable detail rows. Methodology and references are collapsed.

Food uses one local photograph, previous/next arrows and a ten-sample selector. Portion number/range inputs are linked; all six nutrient values update. Photo recognition is an explicitly simulated preset lookup. Source/preparation details and individual photo credits are consolidated under Methods & sources.

Motion starts with numbered Sample 01–06, not named activity choices. Deterministic arrays are generated, features computed and six rule logits passed through actual stable Softmax; the resulting prediction selects the MET mapping. Switching samples automatically runs this process. The signal monitor scrolls a six-second window of the actual data, breaking the path at recording wraps rather than inventing connecting segments. No Play/Pause/Resume controls remain. Reduced motion shows stable traces; offscreen/background rendering is suspended and resumes when visible.

The existing six movement generators, nutrient catalog, photograph files and arithmetic are retained. The simulated CNN architecture, fixed untrained convolution/pooling, formulas and limitations are shown in Methodology. CNN outputs are not misrepresented as the rule classifier.

Buttons support focus, hover and pressed states. Add actions show Added ✓, a nearby message and a short toast, while totals animate. Every intentional submission adds one distinct entry; feedback does not disable legitimate repeated additions. New record rows enter; deleted rows leave with a brief transition. Reduced motion avoids these effects.

## Arithmetic and storage

- Gross kcal = MET × 3.5 × kg × min / 200.
- Active kcal = (MET − 1) × 3.5 × kg × min / 200.
- Difference = food kcal − active exercise kcal; resting metabolism is excluded.
- Food portions scale per-100g values by grams/100. Missing values stay unknown.
- Fuel shares normalize to sum to one. C/F/P teaching oxidation grams use gross energy × share / (4/9/4).
- New activity entries store `fuelRatios` and computed `fuelGrams`. Editing weight/duration preserves ratios and recomputes grams. Summaries independently recompute from the canonical ratios and energy.
- Food macro totals are never reduced by estimated fuel usage. Sugar/water usage is not estimated.
- Legacy activities lacking fuel ratios remain readable; their fuel usage is unknown, not silently filled with invented assumptions. Partial totals are labeled.
- The existing `wellife.daily.v1` key and schema version are preserved. New fields are optional for old entries. Records remain local, editable and deletable, including day clear and cross-tab refresh.
- An unsaved example day previews the dashboard in a new browser. Starting empty persists the preference; real records always replace the example. No preview entries are written into the diary.

## Data and photographs

`lab/wellife/catalog.json` retains the user's ten DEMO nutrient records, including null tofu sugar, and labeled MET teaching assumptions. They are not verified USDA or Compendium records. Provenance and concise recognition/estimation notes are consolidated under Methods & sources; the main workspace has no repeating disclosure badges.

Ten real Wikimedia Commons photographs are stored in `assets/wellife/foods/`. `SOURCES.json` records author, license, source, URLs and hashes. `ATTRIBUTION.md` provides readable credits. Files are unchanged Wikimedia-provided images/thumbnails; display uses CSS object-fit. Runtime images are local rather than remote hotlinks.

## Files

- `page.js`: generated bilingual markup and progressive disclosure.
- `wellife.css`: scoped dashboard, responsive workbenches and interaction states.
- `app.js`: numbered sample classification, food selection, feedback, diary and overview coordination.
- `signal-monitor.js`: continuous real-array rendering and sample inspection.
- `engine.js`: arithmetic, storage validation and fuel-aware aggregation.
- `motion.js`: unchanged deterministic synthetic kinematics and feature classifier.
- The two checked-in Wellife HTML pages are generated through `node dev/build-lab-pages.js`.

## Focused validation

As requested, this UX change avoids the full-site test suite. Relevant checks:

- 14 Wellife unit tests: deterministic models/physics, signal-driven classification, Softmax, arithmetic, catalog/photo provenance, diary persistence, new fuel snapshots, edit recalculation, legacy unknown fuel usage.
- Four targeted Chromium contexts: 375px/1440px × English/Chinese, light/dark coverage, reduced motion. They exercise all six numbered datasets, single-photo selection, portion scaling, both add actions, fuel aggregation, edit/delete, reload persistence, recent-five/View All and no horizontal overflow.
- One normal-motion context confirms automatic waveform scrolling without playback controls.
- Desktop/mobile screenshots inspected. A reduced-motion scan-line race found during review was corrected.
- JavaScript syntax checks and static build. No lint command is configured in package.json.

Development and push target for this UX change is `lab` only. No main merge, backend, D1, likes/comments, DNS or deployment configuration changes.

## Readability and alignment update

The interface now operates on the current local day only: no calendar or history picker. Existing past records remain intact in storage but are not displayed. New entries, aggregation and day clear all use the current local date, with midnight refresh. The intensity selector is removed; recognition uses the detected activity’s default existing MET reference.

Both process-button chains have been removed. Controls, nutrient names and units use larger text; mobile nutrient totals wrap into three readable columns. Native selectors have a consistent arrow and hover/focus treatment. Both workbenches align their headings, selectors, 360px visual stages and bottom add buttons on desktop. On small screens the image and waveform stages are 310px high (285px at 320px width). Food photos use contain so the food stays fully visible. Comparison notes and repetitive primary-screen prose are removed; concise formulas, provenance and units remain under the collapsed methods area.

Focused validation: the four bilingual functional contexts pass, plus layout checks at 320, 375, 430, 768, 1024 and 1440px. Checks include document and control overflow, nutrient name size, matching desktop panel/stage bounds, today-only record creation and absence of date/intensity/process controls. Desktop/mobile screenshots were inspected. No full-site test run was needed for this UI change.
