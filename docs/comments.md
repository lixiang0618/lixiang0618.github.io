# Anonymous comments

Both Moments pages load `js/comments.js` and mount it after cards and likes.
They use the same `data/moments.json` IDs and API at `https://api.lxiang.cc`.
No Worker, D1, likes module, visitor UUID, deployment or Moment data changes are
needed. Comments use deletion-token authorization rather than the likes UUID.

## Reuse for Blog

Load the shared stylesheet and `js/comments.js` after the body exists, then call:

```js
SiteComments.mount(articleElement, {
  type: 'blog',
  id: 'permanent-post-id',
  actions: existingActionsElement // optional; a row is created if omitted
});
```

Use a permanent content ID and a content type supported by the backend. The module
handles lists, count, compose/edit/delete dialogs and API operations. It prevents
duplicate mounting; user text is only assigned via textContent/input.value.
The `mountMoments` adapter maps existing rendered cards to their data records;
it never assigns or regenerates Moment IDs. The existing sync script is unchanged.

## API contract

GET requires `{success, content_type, content_id, comments}`. Comment objects use
`id`, `nickname`, `body`, `created_at`, nullable `updated_at`, and `edit_count`.
POST returns `{success:true, comment:{id,...}}`. PATCH and DELETE require
`success:true`; the public list is then refreshed. Error codes are accepted in
`code`, string `error`, or `error.code`. SQLite-style timestamps are normalized as
UTC before formatting in the reader's locale (D1 CURRENT_TIMESTAMP convention).
Both UI languages use the same original comment text.

## Credentials, recovery and limits

Before POST, generate a cryptographic UUID request_id and 32 random bytes encoded
as 64 hex characters for deletion_token. Persist the complete pending payload
before fetch. Retrying uses exactly the same request ID, token, nickname and body,
including after reload/language changes; pending fields stay read-only until the
outcome is resolved. A definitive validation/authentication rejection permits
correction. Network errors, timeouts and server errors preserve the pending record.
There is no automatic retry loop and no automatic new request for uncertain POSTs.

After success, associate the token with the returned comment ID and persist the
completed submission. The success dialog displays the token, copy control and
backup warning. Done dismisses the completed-submission reminder; the per-comment
token remains. Closing otherwise retains the reminder for the next opening.
If storage is blocked or full, writes are prevented before the request; content
can still be read. Storage is browser-local convenience, not a backup or login.
Use the token input on another device. Clearing site data loses pending recovery
records and locally saved tokens. Secure HTTPS and cryptographic browser APIs are
required. No secret tokens enter URLs, console logs or public comment markup.

PATCH stores operation_id plus expected_edit_count from the displayed comment.
Uncertain retries retain the operation payload. Conflict responses refresh the
list and stop submission until the editor is reopened with fresh content/count.
DELETE stores its operation_id before sending. Explicit success refreshes the
list. COMMENT_NOT_FOUND, network errors and 12-second timeouts trigger GET:

- If the item is still public, preserve it and explain deletion is unconfirmed.
- If absent, show **Comment is no longer visible**, never authenticated success.
- If GET also fails, keep the operation record and show uncertain status.

Timeout retries retain their operation ID. No DELETE retry loop is used. A
not-found response with an item still visible allows credential correction.
This frontend recovery does not add strict backend DELETE idempotency.

Dialogs use native modal `<dialog>` for keyboard focus containment and Escape;
explicit focus is moved into dialogs and restored on close. Current Chrome,
Android Chrome and Safari support it; older browsers without dialog support are
not included. Requests keep the dialog disabled through reconciliation. Context
menu, touch/pen long press (600ms, movement cancels) and a keyboard accessible
ellipsis button open the same actions. Motion respects reduced-motion preference.

## Tests and manual acceptance

From the repository root (test tools stay outside the checkout):

```sh
npm install --prefix /tmp/lx-comments-tests --no-audit --no-fund jsdom@26
NODE_PATH=/tmp/lx-comments-tests/node_modules node --test tests/comments.test.cjs tests/moments-likes.test.cjs
node --check js/comments.js
git diff --check
```

Automated tests use mock API responses and jsdom. They verify pre-request durable
storage, token format, copyable backup rendering, POST retry identity across
reload/languages, XSS-safe text, editing/count conflict, wrong token, DELETE
ambiguity and reconciliation, AbortController timeout, duplicate mounting,
blocked storage, input validation, read retry, full bilingual page integration,
likes/media preservation and unchanged sync behavior. jsdom polyfills dialog
open/close; it cannot verify native focus trapping, real layout or device gestures.

Manual checklist for a Preview deployment:

1. Open English and Chinese Moments. All lists load without clicking; empty,
   loading, retry and counts are correct. Like/unlike and refresh still work.
2. Open composer, Tab/Shift-Tab through it, Escape/close/cancel and check focus
   returns. Test narrow/mobile screens, scrolling, reduced motion and touch targets.
3. Reject empty/whitespace, 31-character nickname and 501-character body. Publish
   a valid comment, copy/backup its token, Done; list and count update.
4. Refresh and switch language; comment text and ID remain identical. Clearing
   storage should not hide public comments; manually paste the backed-up token.
5. Open actions by right click, long press and ellipsis/keyboard. Edit successfully;
   check Edited/date. Use an incorrect token and ensure no content changes.
6. Open two editors/devices for one comment, edit one, then submit the stale one;
   conflict must not silently overwrite. Reopen and inspect current content.
7. Delete with confirmation; cancel must send nothing. Repeat DELETE or drop its
   response: GET reconciles. Absent means 'no longer visible', not authentication.
8. Simulate network timeout before/after POST commit; reload and retry. Confirm
   same request_id/token and one server record. Do likewise for operation_id on
   PATCH/DELETE; no infinite retries. Make reconciliation GET fail and verify the
   unresolved record remains available.
9. Verify browser CORS for GET/POST/PATCH/DELETE/OPTIONS and Content-Type. No
   no-cors mode or cookies are used. No Worker modification was performed.
10. Check real Chrome/Android/Safari, native clipboard permissions, Lightbox,
    video, Timeline/Snapshots and existing likes. No live mutation test is run by
    the automated suite; use a dedicated test Moment and remove test comments.

The agent has not run real-browser/device or deployed-API comment tests. Supplied
backend response samples were used; passing mock tests do not prove live CORS,
D1 semantics, clipboard permissions or native dialog/long-press behavior.
