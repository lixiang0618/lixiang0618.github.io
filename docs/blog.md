# Blog categories, likes and discussion

## Architecture and content

English and Chinese listing pages use `js/blog.js` and `blog.css`. Article pages
retain their Markdown/PDF rendering and load the same files from `blogs/` in both
languages. Titles/categories/excerpts are rendered as text; generated Markdown passes a
small DOM allowlist that strips active elements, event attributes and unsafe URL
schemes. Both article pages use the same local Marked 18.1.2 CommonMark/GFM parser
and `js/blog-markdown.js`; no parser CDN or runtime dependency install is needed.

## Markdown rendering

The article loader still validates the requested file against `data/blog.json`,
then fetches that file from `blogs/`. `BlogMarkdown.parseDocument` normalizes
BOM/CRLF and separates the existing front-matter fields from the body. Metadata
continues to supply the displayed title, date, categories and permanent article
identity; the front-matter PDF attachment is preserved.

`BlogMarkdown.render` parses the body with an isolated Marked instance configured
with `gfm: true`, `breaks: false`, `pedantic: false` and synchronous rendering.
This replaces the old duplicated regular-expression substitutions, which never
implemented tables, tasks, ordered/nested lists or Markdown block boundaries.
The resulting HTML passes the existing DOM allowlist before insertion. Only
disabled checkbox inputs, validated table alignment, numeric list starts and
restricted code-language classes are additionally allowed; active HTML, event
handlers, arbitrary CSS and unsafe URL schemes remain blocked.

Relative links and images resolve against the source Markdown file, consistently
in EN/ZH; absolute URLs remain absolute, and fragment links stay in the current
HTML article. Safe tables receive a keyboard-focusable horizontal-scroll wrapper
via DOM operations. Task boxes are read-only. Article CSS keeps table borders,
lists, quotes, separators and scrollable code in the existing Paper & Ink palette.
The TOC still mounts after content insertion and uses the same stable anchors,
scroll/highlight logic and resize measurements, now covering heading levels 1–6.

Standard Markdown blank lines and list indentation are significant. A horizontal
rule must occupy its own line (`---`); `--- A/B测试` is literal prose, not a valid
rule or list marker, and is deliberately not rewritten by a special-case regex.
Use separate lines/blank lines and `- A/B测试` when authoring an actual list.
No article body or generated metadata is changed by this rendering fix. The
independent regression fixture lives under `tests/fixtures/`, not `blogs/`.

Vendored parser: `js/vendor/marked.js`, MIT/Markdown license in
`js/vendor/marked.LICENSE.txt`. It is copied from the integrity-verified npm
`marked@18.1.2` browser UMD build; only the unavailable source-map URL comment is
removed. To update, inspect the npm release, copy the matching UMD/license, and
rerun both the sanitizer and browser regressions.

```sh
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node --test tests/*.test.cjs
python3 -m http.server 8091 --bind 127.0.0.1
# In another terminal:
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/blog-markdown-browser.cjs
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/blog-reading-browser.cjs
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/blog-browser.cjs
```

The Markdown browser test routes only fixture metadata and the fixture Markdown
in memory; existing articles load from disk. It checks EN/ZH at 1600, 1024, 390
and 320px, table/code horizontal scrolling, tasks, all heading levels, TOC anchors
and active tracking, maximum font size, dark theme and all six existing articles
on desktop/mobile. `SITE_TEST_URL` can target a local Vercel `dist/` server, and
`MARKDOWN_ARTIFACT_DIR` optionally saves screenshots to an existing directory.

The shared taxonomy is `notes`, `research`, `projects`, `life`. Only visible labels
are translated. Lists filter categories, not tags; tags retain their original
meaning. Migrated MSMS experience and hello-world to life, algorithms/Python/data
structures/C exercises to notes. Markdown bodies were not edited. `Hot100` CRLF
Front Matter now parses correctly, restoring its actual title, date and pin.

`blogs/*.md` is the canonical source. Run `node sync-blog.js` to regenerate
`data/blog.json`. `node sync.js` delegates Blog generation to it; this fixes the
previous CI path that overwrote the directory with the lone legacy `_posts` file.
The legacy hello-world Front Matter was also categorized but is no longer the
listing source. New posts must choose one of the four category IDs. Keep their
filename stable: `post.file` is the permanent Blog API content_id. Renaming a file
would associate the page with different likes/comments; don't rename casually.

## API and storage reuse

The existing Moments likes module now exposes `mountControl` with a content type
and ID. Article likes and listing GETs use its existing `lx_visitor_id`; no new
visitor identity is introduced. Listing cards only display statistics. A queue
limits statistics to four concurrent requests and retains results across filter
changes. Failed statistics are hidden, rather than displayed as zero.

`js/blog-comments.js` renders permanent inline forms/threads and reuses
`SiteComments.core` for API calls, cryptographic credentials, time/avatar helpers
and local storage keys. `SiteComments.manage` provides existing token-authorized
edit/delete dialogs; it does not display the discussion in a popup. Existing
Moments UI and token formats are unchanged:

- `lx_comments_POST:blog:<post.file>` stores pending/completed POST recovery.
- `lx_comments_token:blog:<comment.id>` stores each independent management token.
- PATCH/DELETE retain the existing operation keys and expected_edit_count logic.

Root POSTs have no parent fields. Reply POSTs add only reply_to_id; the Worker
assigns parent_id. Pending POST retries keep their exact request ID, token and
body, including reload/language switch. Backup UI stays inline after success.
Edit/delete menus depend on a locally held token, never a nickname; backend token
verification remains authoritative. The recovery panel accepts a comment ID and
backed-up token so another device can attempt management. No frontend ownership
claim bypasses the API. No tokens enter public comment markup or request URLs.

Root and reply order follows the API; roots are not re-sorted in the client.
Expected server default is Most Discussed (visible reply count descending, then
newest root), with oldest-first replies. Replies use only one indent regardless of
reply target. First three are shown; expansion can be reversed. New replies expand
their thread. Flat comments are expected; nested replies arrays are also accepted.
Deleted roots with visible replies keep a placeholder and those replies. Deleted
nicknames/body never render and no actions appear on placeholders. Moments keeps
its existing behavior of hiding deleted comments.

## Validation

Test dependencies are installed outside the repository. No package/lock changes:

```sh
npm install --prefix /tmp/lx-blog-tests --no-audit --no-fund jsdom@26 playwright-core@1.56.1
NODE_PATH=/tmp/lx-blog-tests/node_modules node --test tests/blog.test.cjs tests/comments.test.cjs tests/moments-likes.test.cjs
```

36 automated tests passed, including category/ordering/statistics limits, shared
identity, Markdown/PDF paths and bilingual body equality, reply nesting/order and
collapse, deleted-content redaction, independent tokens, backup/recovery,
unauthorized edit rejection and POST retry identity. All 20 Moments regressions
remain passing. Generation is repeatable and body preservation is checked against
the main baseline.

Optional real Chromium test (a local server must be running on port 8091):

```sh
python3 -m http.server 8091 --bind 127.0.0.1
# In another terminal; CHROMIUM_PATH may override the executable:
NODE_PATH=/tmp/lx-blog-tests/node_modules node tests/blog-browser.cjs
```

Real Chromium checks passed in EN/ZH at 1440px and 390px: listing/filter, article
and PDF embedding, like/unlike, reply, edit/delete, deleted placeholder, no horizontal
overflow and no page JavaScript errors. ALL API calls in this test are mocked.
PDF URL/embedding is verified; full PDF viewer rendering is not asserted.

## Manual Preview checklist and limits

- Verify actual API default Most Discussed order, public deleted placeholders,
  reply_count/count semantics, flat/nested response shape and CORS on Preview.
- Like/unlike in both languages, refresh; confirm existing visitor identity and
  counts. Listing statistics unavailable states should not obscure content.
- Create root, reply to root, reply to reply; verify two-level indentation,
  oldest-first reply ordering, three-reply cutoff, expand/collapse and immediate
  visibility of a new reply. Change UI language without translating body/nickname.
- Save each token, refresh/retry after dropped responses, recover token on a
  different browser. Try invalid token and stale edit_count. Confirm delete,
  repeated-delete reconciliation and missing-comment wording.
- Deleted root with live replies and deleted reply should show localized gray
  placeholders, never the old nickname/body or edit/delete controls.
- Verify both guidelines have identical structure, and test actual Chrome,
  Android Chrome, iPhone Safari, keyboard/dialog focus, clipboard permissions,
  PDF viewer and article images. Touch emulation does not prove real iOS behavior.
- Recheck Moments likes, comments, edit/delete, Timeline/Snapshots, language links
  and global navigation/footer on Preview.

No production API mutations, Worker deployment, D1 migration, domain changes or
production deployment are part of this change. Live Worker/D1 integration and
Safari/real-device behavior are not verified by Mock tests. Merge remains manual.


## Paper & Ink reading refinement

Blog pages alone use warm Paper & Ink tokens and coordinated Dark Paper tokens.
Global navigation and Moments styles/behavior are untouched. Legacy Front Matter
and JSON tags remain stored but are not rendered or used for filtering. Excerpts
prefer nonempty authored metadata; generated summaries omit fences, images, code
and HTML. Hot100 has an authored summary; article bodies remain byte-identical.
When no prose is suitable, the listing displays a localized neutral fallback.

Before changing layout, Chromium measurements showed a 16px body, 1.8 standard
line height and 662px desktop prose width. Those remain the baseline. Three columns
are used only from 90rem, with the original 50rem outer reading column taking
priority. Below that threshold, TOC/settings move above the content, and below
48rem the existing comfortable padding is retained. There is no forced tablet
sidebar layout. Font scaling affects only article content (87.5–137.5%, equivalent
to 14–22px at the measured baseline). Spacing factors are relative to the measured
standard line height; code/tables keep their own line height.

`js/blog-reading.js` extracts H1/H2/H3 from rendered DOM, omits an article-title
H1, and assigns deterministic unique anchors. Fewer than two relevant headings
hide the TOC. Cached heading/content geometry plus passive requestAnimationFrame
scroll updates keep TOC and article-only progress current. ResizeObserver handles
images, settings and header height changes. Sticky offsets use the measured
navigation height; narrow layouts get a thin progress bar below navigation.

`lx_blog_theme` and `lx_blog_reading` store nonsecret local preferences independently
of visitor IDs and management tokens. Storage errors fall back safely. The early
Blog theme script avoids a theme flash. The listing can honor the same preference
without an extra theme control. Native share dialogs restore focus and support
Escape; clipboard failures expose/select a copyable URL/message.

Canonical share links always use https://lxiang.cc and the validated metadata.file,
with the current UI language path. X uses its official Web Intent with encoded
parameters. Xiaohongshu explicitly asks visitors to copy/paste a message; no direct
publishing is claimed. WeChat QR is generated locally with vendored
qrcode-generator 1.4.4 (MIT; js/vendor/qrcode.LICENSE.txt), not a remote QR service.
Images and PDF contents are never inverted or recolored.

Reading-specific tests:

```sh
NODE_PATH=/tmp/lx-blog-tests/node_modules node --test tests/blog-reading.test.cjs tests/blog.test.cjs tests/comments.test.cjs tests/moments-likes.test.cjs
NODE_PATH=/tmp/lx-blog-tests/node_modules node tests/blog-reading-browser.cjs
```

The 36 unit/DOM tests passed. The reading browser matrix passed EN/ZH at 320, 390,
768, 820, 1024, 1200, 1366, 1440 and 1600px (18 cases), including maximum font,
relative spacing, dark theme restoration, TOC active tracking/sticky offsets,
article-only progress, share QR/URLs, clipboard fallback and no horizontal overflow.
The existing four real-Chromium Blog interaction cases also passed after the
layout change. All APIs in browser tests are mocked: no production comments were
created, edited or deleted. Chromium viewport/touch emulation does not validate
real Safari/Android, WeChat scanning, X or Xiaohongshu app behavior. PDF embedding
is checked, not the third-party PDF viewer's raster output.

## Mathematical notation

The existing Marked GFM instance recognizes inline `$...$` / `\(...\)` and
 display `$$...$$` / `\[...\]` tokens, including list and table content. TeX is
captured before Markdown can consume its backslashes. Random, per-render code
placeholders pass through the unchanged HTML sanitizer, then only those generated
nodes are replaced with KaTeX output (`trust: false`, bounded macro expansion).
Code fences, inline code, escaped dollars and ordinary currency remain literal;
malformed TeX falls back visibly without stopping the rest of the article.
No article files, front matter or generated indexes are rewritten.

Both language pages load local KaTeX 0.16.25 JS, CSS and fonts from
`js/vendor/katex/` (MIT license included), copied from the npm integrity-verified
release. No second Markdown parser or external math CDN is used. Display equations
are centered and keyboard-scrollable within the article, without extra decoration.
The positioning context also contains KaTeX's accessible MathML on narrow screens.

```sh
NODE_PATH=/workspace/scratch/blog-math-tools/node_modules node tests/blog-markdown.test.cjs
# With the static server running on port 8091:
NODE_PATH=/workspace/scratch/blog-math-tools/node_modules node tests/blog-math-browser.cjs
```

Math validation covers four delimiter forms, fractions, sums, roots, intersections,
sets, scripts, paragraphs, lists, tables, code preservation, untrusted commands and
malformed formulas. Chromium checks EN/ZH at 1600/390/320px, actual centering and
horizontal scrolling, maximum font size, dark mode, loaded assets and TOC presence.
GFM (8 cases) and reading controls/TOC (18 cases) browser regressions also pass.

At the current main baseline, three `blog.test.cjs` checks already fail: two
assume six posts instead of seven, and one expects regenerated metadata to match
the stale checked-in index. The old interaction browser test similarly assumes
four notes instead of five. These failures were reproduced on an unmodified main
copy. This change preserves all notes and the index instead of regenerating them.
The interaction browser flow was additionally checked using an external temporary
copy whose category-count expectation follows the current index. APIs are mocked;
no production likes or comments are changed.
