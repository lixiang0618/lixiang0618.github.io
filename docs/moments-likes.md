# Moments likes

Both language pages mount `js/moments-likes.js` after rendering cards from
`/data/moments.json`. Timeline, Snapshots, media and Lightbox retain their existing
code. `script.js` does not manage Moments and does not need changes.

## Stable content IDs

IDs are stored in JSON, never derived from position or date at runtime.
`moment-001` permanently identifies the graduation Moment (2026-05-08 17:27).
The other existing records have IDs `moment-002` through `moment-009`.
For a new record, assign the next unused ID (`moment-010` next); never renumber
on sorting, and never reuse an ID from a deleted record. Preserve IDs when editing
text, dates or media. A record without a valid ID remains visible without likes.

`sync.js` currently attempts to replace an embedded `const moments = [...]`.
Neither language page has that embedded array: both load JSON at runtime. Tests
run the existing sync script twice in a temporary copy and verify that both
pages and all IDs stay intact. No sync or blog behavior was changed.

## Identity and requests

`lx_visitor_id` in same-origin localStorage contains a UUID v4. Both language
paths share it; it is not authentication. UUID generation uses randomUUID with
a getRandomValues fallback. If localStorage is blocked, content remains visible
but likes are disabled with a localized explanation, avoiding unstable identities
and duplicate votes after reload. Clearing storage or using another browser
creates another visitor; the server is responsible for abuse protection.

GET, PUT and DELETE use `https://api.lxiang.cc/api/likes?type=moment&id=...`, with
`X-Visitor-ID`, CORS mode and omitted cookies. No visitor UUID enters the URL.
No backend secret is used. The server owns count and liked state.

A button is disabled while its request runs (10-second timeout). No optimistic
count is shown. Failures show an unknown count and localized retry message; the
next click performs GET before allowing another write, since a failed response
may follow a successful server commit. Refresh, restored pages and returning to
a visible tab query the server. Repeated mounting does not add duplicate buttons
or listeners. Backend composite uniqueness remains necessary for idempotent PUT.

## Validation

Run from the repository root, installing test-only dependencies outside it:

```sh
npm install --prefix /tmp/lx-likes-tests --no-audit --no-fund jsdom@26
NODE_PATH=/tmp/lx-likes-tests/node_modules node --test tests/moments-likes.test.cjs
node --check js/moments-likes.js
git diff --check
```

The DOM tests use full English/Chinese HTML and a mock API. They cover initial
GET, PUT/DELETE, refresh and cross-language identity, duplicate clicks, failed
requests, invalid responses, unavailable storage, UUID fallback, additional
Moments, Lightbox clicks, video presence and sync preservation. Mock idempotency
tests the frontend contract; it does not verify the deployed Worker or D1.

The live OPTIONS request was blocked by the cloud egress proxy (CONNECT 403).
Live GET/PUT/DELETE, D1 persistence and browser CORS remain unverified. To validate
in production, use browser DevTools from https://lxiang.cc. Worker preflight must
allow origin https://lxiang.cc, methods GET/PUT/DELETE/OPTIONS, and request header
X-Visitor-ID; actual responses, including errors, must include the appropriate
Access-Control-Allow-Origin. No Worker changes were made. Do not use no-cors.

Before release, check desktop Chrome, Android Chrome and iPhone Safari, keyboard
focus/Space/Enter, mobile layout, Timeline/Snapshots, offline recovery and real
cross-language persistence. DOM tests do not prove visual layout or device
compatibility. Controls use a 44px minimum touch target, local SVG, focus-visible
outline and reduced-motion support. Deploy both HTML files, shared JS/CSS and JSON
together; stale cached JSON without IDs will show content without likes. Deployment
configuration is unchanged; nothing was pushed or deployed automatically.
