# CCHAN Research Playground — refinement

## Scope and routes

Work remains on `lab`. Routes are `/lab/projects/cchan/` and `/zh/lab/projects/cchan/`. This refinement changes only the CCHAN frontend, its page-generation script inclusion, source provenance, and applicable tests. No backend, deployment configuration or other Playground implementation is changed.

The page keeps the pale-green palette and four sections. The heading is reduced to `CCHAN Playground` and one research sentence. The former editable record builder, step-by-step reveal controls and 24-case ranking interface are replaced by the requested presentation. The existing `CchanEngine.lossBatch` and its paper-equation implementation are reused for the optional sample-loss explorer. Existing graph/engine utilities remain independently testable.

## Four sections

1. **Why Coupling**: both Case A and Case B are visible as SVGs, followed by joint/group semantic descriptions. An automatic conversion cycles through basic path, highlighted H/D context, semantic-copy fusion into HD, and the explicit shared context. Original H and D nodes remain in the SVG. D′ is outside the highlighted context. The conversion depicts the shared-diagnosis case; the separate Case B explains why sharing only a hospital can mismatch the intended diagnosis. Pause/play/replay and reduced-motion are supported.
2. **Graph Construction**: three-column workflow from the two original Figure 3 example triplets through joint/group contexts to the complete final graph. The final illustration has 13 nodes and 16 strokes (4 solid basic, 12 dashed coupling); all node positions and endpoints are transcribed from the supplied manuscript image, including DD. Nodes and context chips support hover, focus, tap and keyboard activation. Mobile stacks the final graph below the first two panels.
3. **Cost-Sensitive Learning**: compact Patient A/B examples (90%/$300 selected versus 65%/$10,000 not selected) explain the limitation of risk-only selection. These are clearly illustrative, not actual patient records. Table 3 is shown with TN=0, FP=Ccheck, FN=claim amount, TP=λCcheck. Requested existing teaching parameters Ccheck=280.9 and λ=0.8 give TP=224.72. A new SVG follows Figure 4 with two colored neighbor-attention branches, per-path Z, global β semantic fusion, MLP/prediction, cost matrix/normalized weight, and weighted BCE. Main flow and dashed label/BCE dependencies are explicit. The diagram states that the cost factor depends on y, prediction and financial costs; it does not imply that the matrix is generated from prediction alone. Stage hover/focus reveals formulas. The loss explorer reuses the existing exact cohort-normalized loss engine.
4. **Top-K Investigation**: a fixed-height viewport renders at most eight illustrative rows out of 100. Processing takes 4.8 seconds of active visible playback, then a 350ms completion transition reveals the manuscript figure in the same region. Rows move continuously using transforms; the chart is initially hidden and the queue is hidden when the chart is revealed. Replay returns to the queue. Pause/play, background suspension, navigation cleanup, and reduced-motion are supported. Reduced-motion directly reveals the stable result on entering the section.

## Research sources and experiment settings

Source: supplied `healthcare fraud detection-DSS(1)(1).docx`, Figures 1/3/4/7, Table 3, Sections 3.1–3.3, and the resource-constrained inspection experiment. `lab/cchan/research-sources.json` records the manuscript SHA-256 and embedded-figure hashes.

The complete research corpus has 20,000 patients, including 1,000 fraudulent patients (5%), and 1,830,386 claims. The Top-K experiment is a distinct 1,000-patient subset: 900 normal and 100 fraudulent patients (10% fraud), with 20 high-claim and 80 relatively low-claim fraudulent patients. Figure 7 uses K from 0 to 100. These values are displayed separately from the 100-case interactive queue.

No original per-K numeric arrays for all eight models were found in the repository. Accordingly, `assets/lab/cchan/figure-7.png` is the **unchanged original embedded image** `word/media/image7.png`, not a traced, fitted or simulated reconstruction. It retains LR/RF/SVM/XGB/GCN/GAT/GraphSAGE/CCHAN colors and the red CCHAN curve. A source-hash test verifies the original pixels. The diagram and caption explicitly keep the illustrative queue independent of the paper results.

### Source distinctions preserved

- Figure 3 draws DD–P1 and DD–P2 connections as well as DD–H1. Applying a strict common-neighbor rule to just the two displayed triplets would yield only DD–H1. The exact source illustration is therefore held in a separate figure fixture in `research.js`; it is **not** presented as the output of the existing generic common-neighbor graph builder, and those extra strokes are not inferred as new observed clinical relationships. The manuscript's illustrated endpoints are reproduced as requested rather than silently corrected.
- Figure 4 labels the classifier MLP, while Equation 9 describes a linear map followed by sigmoid. The diagram follows Figure 4 and the stage explanation preserves the text distinction; no model architecture is executed or claimed.
- β follows the paper's global semantic-attention interpretation; no numeric attention coefficients are invented. Neighbors, α and β are conceptual symbols, not estimated model outputs.
- Ccheck=280.9 and λ=0.8 are the requested existing teaching settings. The table's four cost definitions come from the manuscript. No currency rescaling is inferred for Figure 7.

## Files

- `lab/cchan/page.js`: shared bilingual four-section markup and paper-based SVG content.
- `lab/cchan/research.js`: source-figure topology, positions, SVG renderers and pure illustrative queue/timing helpers.
- `lab/cchan/app.js`: node/stage interactions, existing loss-engine integration and visibility-aware timelines.
- `lab/cchan/cchan.css`: scoped green theme, responsive layouts and motion handling.
- `lab/cchan/research-sources.json`, `assets/lab/cchan/figure-7.png`: provenance and unchanged research result figure.
- `dev/build-lab-pages.js`: load the CCHAN research helper before its controller.
- Generated English/Chinese CCHAN `index.html` files only.
- CCHAN unit/browser tests and the applicable Lab shell disclosure assertion.

## Verification

Targeted checks cover the figure's node/edge fixture, original image hash, paper settings, the unchanged Cost-BCE engine, 100-case timeline boundaries, static generation, mobile/desktop overflow, focus/tap interactions, initial chart hiding, queue virtualization, completion/replay, conversion controls, reduced motion, language anchors and background pause/resume. Screenshots are inspected for English desktop and Chinese mobile. Diagram/image panels may scroll internally on small screens to keep mathematical labels readable. Chromium is used; physical iPhone Safari is not claimed tested.

```sh
node dev/build-lab-pages.js
NODE_PATH=/path/to/test/dependencies node --test tests/cchan.test.cjs tests/lab-shell.test.cjs
SITE_TEST_URL=http://127.0.0.1:8118 NODE_PATH=/path/to/test/dependencies node tests/cchan-browser.cjs
node dev/build-vercel.js
```
