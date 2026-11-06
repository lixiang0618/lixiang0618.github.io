# Wellife implementation status

Branch: `feat/wellife-interactive-playground`.
Created from `origin/lab` (83b1a74), then fast-forwarded to SNA (69d1739) with the user's explicit approval to include SNA. Neither integration branch was modified.

## Implemented

- Bilingual four-section page (Food AI → Motion AI → Daily Overview → Methodology) with existing Lab navigation, theme and warm editorial styling.
- Deterministic six-activity motion generator (`motion.js`), seed 20261106, 16 seconds, 50 Hz. Independent piecewise position trajectories; numerical differentiation produces linear velocity then acceleration. Readout az adds 9.81 m/s²; small independent sensor noise is added only to acceleration.
- Sitting: nonperiodic millimeter posture drift. Walking: asymmetric gait templates, lateral alternating sway and forward progression. Push-ups: slow shallow descent/hold/asymmetric push. Squats: deeper descent and longer bottom hold. Running: support compression/push plus ballistic flight. Frog jumps: crouch, takeoff, ballistic flight, forward travel, landing and recovery.
- Canvas plots actual generated arrays, with six facets, separate scales and explicit units; pointer/time slider readout, channel filtering, play/pause/replay, phase labels. Playback pauses in background; reduced-motion avoids automatic playback and stage delays.
- Fixed untrained az convolution and max pooling are actually computed. Conceptual pipeline animation reveals these traces. Six rule logits use signal features (never selected preset identity); stable Softmax normalizes scores. Not a trained CNN or calibrated model.
- Pure energy/fuel/portion arithmetic, with input bounds, unknown nutrient preservation and explicit gross versus active energy.
- Daily log controller implements add/edit/delete/day-clear, local dates, schema-versioned localStorage, cross-tab refresh, and linked overview. Energy difference is food intake minus active exercise only; no nutrient grams are subtracted.

## Demo catalog and local photographs

The user supplied ten nutrient records with identifiers DEMO-001 through DEMO-010: cooked rice, roasted skinless chicken breast, boiled egg, boiled broccoli, raw banana, raw apple, whole milk, roasted salmon, dry oats and firm tofu. Values were transcribed without alteration. Tofu sugar remains null.

`catalog.json` now uses `mode: "demo"` and `verified: false`. The food selector, portion calculation, daily diary and summaries are enabled. The page identifies these as user-provided examples, not verified USDA records. DEMO identifiers are preserved as local sample identifiers and are never linked to invented FoodData Central record pages.

The user also authorized approximate teaching MET assumptions. Six sample parameters (sitting 1.3, walking 3.5, push-ups 3.8, squats 5, frog jumps 8, running 8.3) are marked DEMO, proxy and unverified; they enable the energy/fuel/log interactions. These are not claimed to be 2024 Compendium entries or individual measurements.

Ten real photographs are now stored in `assets/wellife/foods/`. They were retrieved from Wikimedia Commons after the environment network access was enabled, and every selected image was inspected. `SOURCES.json` preserves the title, author, individual license, source page, original/download URLs, retrieval date and SHA-256; `ATTRIBUTION.md` provides readable attribution. The source files/thumbnails are unmodified. Runtime image URLs are local, not hotlinks. Total JPG size is approximately 1.2 MiB.

Wellife is now **live** as an explicitly labeled educational demo. Its nutrient examples and MET assumptions remain unverified; photograph attribution does not imply nutrition verification. The two existing Wellife experiment metadata entries now describe the implemented demonstrations rather than planned placeholders.

Future official-data upgrade: retrieve source records and metadata, verify preparation states, preserve nulls, cite actual numeric FDC IDs, then switch data provenance. Never relabel DEMO records as verified official data.

## Catalog interface

Top level: `{version: 1, verified, mode, foods, activities, sources}`.

Food: `{id, name: {en,zh}, fdcId, description, state: {en,zh}, portion, per100g: {energy,carbs,protein,fat,sugar,water}, provenance, photo: null | {path,author,license,licenseUrl,source}}`. Values are numeric or null. Units kcal/100g for energy, g/100g otherwise.

Activity: `{id, references: [{id, met, code, proxy, label: {en,zh}, description: {en,zh}, source: {en,zh}}]}`.

Source: `{label: {en,zh}, url, accessed}`.

## Validation

- `node tests/wellife.test.cjs`: 12/12 passed, deterministic models, gravity/velocity consistency, distinguishing features, identity-independent classifier, stable Softmax, actual convolution/pooling, MET/fuel/portion arithmetic, unknown values, diary persistence/edit/clear, storage failures.
- `NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/wellife-browser.cjs`: 20 fixture UI contexts (375,390,430,768,1440 × en/zh × light/dark), all passed. Includes six activity choices/inference, channel readout, portion scaling, add/edit/delete, persistence without duplication, overview arithmetic, document width. Additional tests cover the ten supplied production demo records, actual portion/log persistence, unknown sugar, optional photographs, no fabricated USDA links and waveform playback. Empty catalogs still disable logging.
- `NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node --test tests/*.test.cjs`: 130 tests, 127 passed, 3 existing Blog fixture/taxonomy failures (pinned listing, article count and stale generated metadata), matching pre-existing SNA baseline. No unrelated Blog data changed.
- `node dev/build-lab-pages.js`: passed, 18 generated pages. Only Lab listings and Wellife detail pages change.
- `node dev/build-vercel.js`: passed; no deployment configuration changes.
- Mobile screenshot inspected with isolated fixture data; section-number wrapping and unknown nutrient totals corrected. All ten real photos were inspected individually; browser checks verify local images load and their source/license links remain available. Food/MET workflows use explicitly labeled demo data.

No backend, Worker, D1, comments/likes or deployment settings modified. No PR or manual deployment. The user subsequently authorized integration of all previous work into `lab`; main remains untouched.

## First-visit overview preview

Empty demo diaries now show an explicitly labeled, unsaved example day: 200g rice, 150g chicken, 120g banana and a 30-minute walk at 70kg. The overview displays 614.3 kcal intake, 91.9 kcal active expenditure and 522.4 kcal difference. Example rows have preview badges, not edit/delete actions. No example entries are written to localStorage.

The visitor can start with an empty day (choice persists) or restore the preview. Any real addition/edit/deletion dismisses the preview; real records always take precedence. Clearing actual records leaves the day empty. Existing diary data is never seeded or overwritten.

Validation: 11 Wellife unit tests, 8 Lab template tests, static build, and targeted Chromium tests passed. Targeted tests include preview arithmetic, no storage write, empty-day preference after reload, preview replacement by a real record, supplied catalog calculations/persistence, and 375px/1440px layout screenshots. Mobile overview screenshot was inspected.

Photo acquisition is now complete following network enablement. Early proxy restrictions are resolved.


## Journey and lab integration

The page now follows Food AI (01) → Motion AI (02) → Daily Overview (03) → Methodology (04), in both languages and in the jump navigation. The independent “The story of your day” chapter is removed. Existing diary records, edit/delete/clear controls and accessible edit dialog are retained in the daily overview’s collapsible “Daily records” area; storage keys and entries are unchanged. Food and motion sections include next-step links.

Before integration, fetching all remote branches and `git branch -r --no-merged HEAD` confirmed the Wellife branch already included all existing remote feature branch tips. Origin lab was 83b1a74; SNA and Wellife were the only subsequent commits. The planned lab update is a normal fast-forward including those commits, without rewriting or modifying main.
