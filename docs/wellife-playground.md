# Wellife implementation status

Branch: `feat/wellife-interactive-playground`.
Created from `origin/lab` (83b1a74), then fast-forwarded to SNA (69d1739) with the user's explicit approval to include SNA. Neither integration branch was modified.

## Implemented

- Bilingual five-section page with existing Lab navigation, theme and warm editorial styling.
- Deterministic six-activity motion generator (`motion.js`), seed 20261106, 16 seconds, 50 Hz. Independent piecewise position trajectories; numerical differentiation produces linear velocity then acceleration. Readout az adds 9.81 m/s²; small independent sensor noise is added only to acceleration.
- Sitting: nonperiodic millimeter posture drift. Walking: asymmetric gait templates, lateral alternating sway and forward progression. Push-ups: slow shallow descent/hold/asymmetric push. Squats: deeper descent and longer bottom hold. Running: support compression/push plus ballistic flight. Frog jumps: crouch, takeoff, ballistic flight, forward travel, landing and recovery.
- Canvas plots actual generated arrays, with six facets, separate scales and explicit units; pointer/time slider readout, channel filtering, play/pause/replay, phase labels. Playback pauses in background; reduced-motion avoids automatic playback and stage delays.
- Fixed untrained az convolution and max pooling are actually computed. Conceptual pipeline animation reveals these traces. Six rule logits use signal features (never selected preset identity); stable Softmax normalizes scores. Not a trained CNN or calibrated model.
- Pure energy/fuel/portion arithmetic, with input bounds, unknown nutrient preservation and explicit gross versus active energy.
- Daily log controller implements add/edit/delete/day-clear, local dates, schema-versioned localStorage, cross-tab refresh, and linked overview. Energy difference is food intake minus active exercise only; no nutrient grams are subtracted.

## Demo catalog and remaining photos

The user supplied ten nutrient records with identifiers DEMO-001 through DEMO-010: cooked rice, roasted skinless chicken breast, boiled egg, boiled broccoli, raw banana, raw apple, whole milk, roasted salmon, dry oats and firm tofu. Values were transcribed without alteration. Tofu sugar remains null.

`catalog.json` now uses `mode: "demo"` and `verified: false`. The food selector, portion calculation, daily diary and summaries are enabled. The page identifies these as user-provided examples, not verified USDA records. DEMO identifiers are preserved as local sample identifiers and are never linked to invented FoodData Central record pages.

The user also authorized approximate teaching MET assumptions. Six sample parameters (sitting 1.3, walking 3.5, push-ups 3.8, squats 5, frog jumps 8, running 8.3) are marked DEMO, proxy and unverified; they enable the energy/fuel/log interactions. These are not claimed to be 2024 Compendium entries or individual measurements.

Real food photographs are still pending. Cards currently use textual food-name placeholders explicitly labeled “Photo pending”; no site logo, generated photo, external hotlink, or broken image is used. Setting a food's `photo` metadata to a real local image automatically enables the existing photograph/credit view.

Wellife remains **building** in the Lab registry while photographs are missing. Replacing sample data with official records can be done without changing the arithmetic or diary architecture.

The current cloud network policy blocks direct source/image downloads. A network configuration draft was saved for user review; saving does not apply or publish it. Requested hosts: `fdc.nal.usda.gov`, `api.nal.usda.gov`, `pacompendium.com`, `www.pacompendium.com`, `commons.wikimedia.org`, `upload.wikimedia.org`. Alternatively the user can upload photos with permission to use them.

Future official-data upgrade: retrieve source records and metadata, verify preparation states, preserve nulls, cite actual numeric FDC IDs, then switch data provenance. Never relabel DEMO records as verified official data.

## Catalog interface

Top level: `{version: 1, verified, mode, foods, activities, sources}`.

Food: `{id, name: {en,zh}, fdcId, description, state: {en,zh}, portion, per100g: {energy,carbs,protein,fat,sugar,water}, provenance, photo: null | {path,author,license,licenseUrl,source}}`. Values are numeric or null. Units kcal/100g for energy, g/100g otherwise.

Activity: `{id, references: [{id, met, code, proxy, label: {en,zh}, description: {en,zh}, source: {en,zh}}]}`.

Source: `{label: {en,zh}, url, accessed}`.

## Validation

- `node tests/wellife.test.cjs`: 11/11 passed, deterministic models, gravity/velocity consistency, distinguishing features, identity-independent classifier, stable Softmax, actual convolution/pooling, MET/fuel/portion arithmetic, unknown values, diary persistence/edit/clear, storage failures.
- `NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/wellife-browser.cjs`: 20 fixture UI contexts (375,390,430,768,1440 × en/zh × light/dark), all passed. Includes six activity choices/inference, channel readout, portion scaling, add/edit/delete, persistence without duplication, overview arithmetic, document width. Additional tests cover the ten supplied production demo records, actual portion/log persistence, unknown sugar, optional photographs, no fabricated USDA links and waveform playback. Empty catalogs still disable logging.
- `NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node --test tests/*.test.cjs`: 128 tests, 125 passed, 3 existing Blog fixture/taxonomy failures (pinned listing, article count and stale generated metadata), matching pre-existing SNA baseline. No unrelated Blog data changed.
- `node dev/build-lab-pages.js`: passed, 18 generated pages. Only Lab listings and Wellife detail pages change.
- `node dev/build-vercel.js`: passed; no deployment configuration changes.
- Mobile screenshot inspected with isolated fixture data; section-number wrapping and unknown nutrient totals corrected. Real food image composition awaits uploaded photographs. Food/MET workflows now use explicitly labeled demo data.

No backend, Worker, D1, comments/likes or deployment settings modified. No merge, PR or manual deployment.
