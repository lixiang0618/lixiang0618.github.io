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

## Source verification blocker — not finished

The current cloud network policy denies USDA FoodData Central, the 2024 Adult Compendium and Wikimedia Commons/image hosts. A network configuration draft was saved for user review; saving a draft does not apply or publish it.

Requested hosts: `fdc.nal.usda.gov`, `api.nal.usda.gov`, `pacompendium.com`, `www.pacompendium.com`, `commons.wikimedia.org`, `upload.wikimedia.org`.

Consequently `catalog.json` deliberately has empty food/MET arrays and `verified: false`. No food photos, nutrient records, FDC IDs, MET values or photo licenses have been fabricated. The production page disables food/activity logging and discloses pending verification. Wellife remains **building** in the Lab registry. Motion signal exploration and simulated classification are functional.

The browser test supplies isolated, explicitly fictional fixture records through request interception. These records and its placeholder image are not shipped in the catalog and do not constitute source/photo verification.

To finish after network publication:

1. Retrieve 8–12 official FDC records; preserve response/source metadata and exact preparation states. Map energy, carbohydrate, protein, fat, total sugar and water per 100 g; absent values remain null.
2. Download legally licensed food photos locally; preserve author, original file page, license URL, retrieval date and local file path. Check every image visually and record any resizing.
3. Verify 2024 Compendium activity codes/descriptions/METs. Mark push-ups/squats/frog-jump mappings as proxies where exact entries do not exist; offer only verified intensity references.
4. Populate and validate catalog, run browser tests against real data/photos, promote registry to live only when complete, regenerate pages, commit and push follow-up changes.

## Catalog interface

Top level: `{version: 1, verified, foods, activities, sources}`.

Food: `{id, name: {en,zh}, fdcId, description, state: {en,zh}, portion, per100g: {energy,carbs,protein,fat,sugar,water}, photo: {path,author,license,licenseUrl,source}}`. Values are numeric or null. Units kcal/100g for energy, g/100g otherwise.

Activity: `{id, references: [{id, met, code, proxy, label: {en,zh}, description: {en,zh}, source: {en,zh}}]}`.

Source: `{label: {en,zh}, url, accessed}`.

## Validation

- `node tests/wellife.test.cjs`: 10/10 passed, deterministic models, gravity/velocity consistency, distinguishing features, identity-independent classifier, stable Softmax, actual convolution/pooling, MET/fuel/portion arithmetic, unknown values, diary persistence/edit/clear, storage failures.
- `NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/wellife-browser.cjs`: 20 fixture UI contexts (375,390,430,768,1440 × en/zh × light/dark), all passed. Includes six activity choices/inference, channel readout, portion scaling, add/edit/delete, persistence without duplication, overview arithmetic, document width. Additional actual empty-catalog test confirms disabled logging and working waveform playback.
- `NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node --test tests/*.test.cjs`: 128 tests, 125 passed, 3 existing Blog fixture/taxonomy failures (pinned listing, article count and stale generated metadata), matching pre-existing SNA baseline. No unrelated Blog data changed.
- `node dev/build-lab-pages.js`: passed, 18 generated pages. Only Lab listings and Wellife detail pages change.
- `node dev/build-vercel.js`: passed; no deployment configuration changes.
- Mobile screenshot inspected with isolated fixture data; section-number wrapping and unknown nutrient totals corrected. Real food image composition and production food/MET workflows await source acquisition.

No backend, Worker, D1, comments/likes or deployment settings modified. No merge, PR or manual deployment.
