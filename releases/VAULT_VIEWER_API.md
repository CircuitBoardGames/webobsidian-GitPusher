# vault-viewer.html — API & internals guide

`vault-viewer.html` is the compiled [WebObsidian](https://github.com/xnohat/webobsidian) React app
(from the [`webobsidian-GitPusher`](https://github.com/CircuitBoardGames/webobsidian-GitPusher)
fork) plus an injected **shim** — a `<script>` prepended to the app bundle that runs before it
mounts. The app is unchanged; the shim just fakes its network layer. This guide documents that
shim: the "API" the app thinks it's talking to, and how the shim answers it with **no server**.

> There is no HTTP server and no backend. Everything below is a client-side `window.fetch` override
> inside a single static HTML file. "Endpoints" are URL patterns the shim recognizes and answers
> from whatever data source you connected (a GitHub repo, or a local folder).

---

## 1. Architecture

On load, the shim:

1. Overrides `window.fetch`. Requests to `https://api.github.com/**` pass straight through to the
   real network; the app's own relative `/api/...` and `/auth/...` calls are matched against a route
   table and answered locally. Anything unmatched returns `{}`.
2. Overrides `window.WebSocket` with a stub (the app opens one for live updates). The stub keeps the
   instance so the shim can deliver a synthetic `uistate` message after a lazy graph build (to apply
   community colors) — see §6.
3. Shows a **connect gate** (unless a same-tab session is being resumed — see §7). You pick a data
   source; the app's initial `/api/*` calls block on an internal `dataReady` promise until you do,
   exactly like a slow network request.

Two data-source modes:

- **GitHub** (`mode = 'github'`) — live-fetches file trees and blobs via the GitHub REST API.
  Edits accumulate in an in-memory `pendingChanges` ledger and are pushed as a **pull request**
  (never a direct commit).
- **Local folder** (`mode = 'local'`) — uses the browser's File System Access API
  (`showDirectoryPicker()`). Reads and **writes go straight to disk**; there is no PR flow.

---

## 2. Auth endpoints (`/auth/*`)

All inert — there is no auth. They exist only so the compiled app's boot sequence succeeds.

| Endpoint | Method | Response | Notes |
|---|---|---|---|
| `/auth/status` | GET | `{ passwordSet: true, mustChangePassword: false }` | |
| `/auth/me` | GET | `{ authenticated: true, mustChangePassword: false }` | app treats you as signed in |
| `/auth/login` | POST | `{ ok: true, mustChangePassword: false }` | |
| `/auth/logout` | POST | `{ ok: true }` | **also clears the saved login** (session + local storage), so the app's "Log out" returns you to the connect gate |
| `/auth/change-password` | POST | `{ ok: true }` | no-op (password change is server-only; the pane is hidden) |
| `/auth/setup` | POST | `{ ok: true }` | |

---

## 3. Files endpoints (`/api/files/*`)

| Endpoint | Method | Behavior |
|---|---|---|
| `/api/files/` | GET | Returns the vault tree (`TreeNode`). GitHub: built from the repo tree or a pre-built `vault-index.json`. Local: built by walking the picked folder. |
| `/api/files/` | DELETE (`?path=`) | Deletes a file/folder. With delete-mode **trash** (default), a file's content is captured into the virtual trash (§8) first; folders always delete outright. GitHub stages the deletion in `pendingChanges`; local removes from disk. Returns `{ trashed }` or `{ deleted }`. |
| `/api/files/content` | GET (`?path=`) | Returns `{ path, content }`. Content is fetched lazily (GitHub blob or local file read) and cached. |
| `/api/files/content` | PUT | Writes a note. Body `{ path, content }`. GitHub stages a create/modify in `pendingChanges`; local writes to disk immediately. |
| `/api/files/folder` | POST | Creates a folder. Body `{ path }`. |
| `/api/files/rename` | PATCH | Renames/moves. Body `{ from, to }`. A GitHub folder rename is expanded into per-file delete+create (folders aren't real git objects). |
| `/api/files/trash` | GET | Lists virtual-trash items (§8). |
| `/api/files/trash` | DELETE | Empties the virtual trash. |
| `/api/files/trash/restore` | POST | Restores a trashed item (`{ path }`) — re-creates the file from captured content. |
| `/api/files/trash/item` | DELETE (`?path=`) | Permanently forgets one trash item. |
| `/api/files/*` (any other) | any | `{ ok: true }` catch-all. |

Writes never hit a server. **GitHub mode:** every edit/delete/rename updates the `pendingChanges`
ledger; nothing leaves the browser until you push (§5). **Local mode:** every write is a real
`FileSystemWritableFileStream` write to the chosen folder.

---

## 4. Read / graph endpoints

| Endpoint | Method | Behavior |
|---|---|---|
| `/api/search` | GET (`?q=&limit=`) | Local: substring scan of cached note content. GitHub: proxies GitHub's code-search API (or a client-side tag scan for `tag:` queries). |
| `/api/search/matches` | POST | `{ matches: [] }` (per-note highlight contexts — not implemented; search still works). |
| `/api/tags` | GET | `{ tags }` from the built graph. Triggers a lazy graph build if needed. |
| `/api/backlinks` | GET (`?path=`) | `{ path, backlinks }` from the built graph. |
| `/api/resolve` | GET (`?target=`) | `{ target, path }` — resolves a `[[wikilink]]` to a real path. |
| `/api/graph` | GET | The full note graph `{ nodes, edges }`. Built from a pre-built index (instant) or lazily by scanning markdown (browse-all). |
| `/api/properties`, `/api/property-types` | GET | Empty stubs (frontmatter-property browser — not implemented). |
| `/api/reindex` | POST | `{ ok: true }` no-op ("Rebuild search index" is cosmetic here). |

**Graph building.** With a pre-built `*vault-index.json`, the graph/backlinks/tags/community colors
load instantly. Without one ("browse all files"), the shim scans markdown for `[[wikilinks]]` and
frontmatter tags to build the graph lazily on first use, detects communities via label propagation,
and assigns each a distinct color. In GitHub mode the browse-all scan is capped (large repos should
load a pre-built index instead).

---

## 5. Writing back (GitHub mode) — the Changes / Push-PR flow

Edits, creates, deletes, and renames in GitHub mode are staged in `pendingChanges` (a
`path → { type, content }` map). A single floating **Changes button** (bottom-right) is the one
control for this:

- **"✓ No changes to push"** when the ledger is empty.
- **"⬆ Push N change(s)…"** (highlighted) when edits are waiting — click to open the panel.

The panel lists every pending change (with discard buttons) and a commit-message box. **Push & open
PR** creates a branch (`vault-viewer/edits-<timestamp>`), a tree, a commit, and a pull request via
the GitHub Git Data + Pulls APIs — it **never** commits directly to the branch you connected to.
Requires a token with Contents **write** access. The status bar is informational only (it shows the
connected repo or "Local folder — saved to disk"); it is not a second push control.

---

## 6. Workspace state (`/api/uistate/`)

| Method | Behavior |
|---|---|
| GET | Returns the app's last-saved workspace (active note, tabs, graph settings), plus community-color groups if the graph is already built. Awaits connect but **not** the graph build, so first navigation isn't blocked. |
| PUT/other | Stores the app's posted workspace in memory (echoed back on GET). |

After a lazy (browse-all) graph build finishes, the shim delivers the community groups to the app
through a synthetic `uistate` **WebSocket** message (merged into the app's own last-saved state so
it doesn't reset your open tabs) — the same path a second browser tab would use.

---

## 7. Settings & session (`/api/settings/*`)

| Endpoint | Method | Behavior |
|---|---|---|
| `/api/settings/` | GET | Returns the full settings object (the app reads nested fields unguarded, so the shape must be complete), overlaid with your persisted choices. |
| `/api/settings/` | PUT | Merges the patch into **localStorage** (`vault-viewer-settings`) and applies it. This is how the **theme** and **delete mode** actually persist. |
| `/api/settings/browse` | GET | Empty stub (server folder-browser). |

**Theme** persists across reloads: a change writes to localStorage and is re-served on next load.
Because the app calls `location.reload()` after a theme change, the shim **auto-reconnects** on a
same-tab reload (from `sessionStorage`) so you land back in your vault with the new theme — not at
the connect gate. A fresh browser session still shows the gate (pre-filled if "Remember me" was on),
so you can switch vaults. **Log out** (its own Settings tab, or the app's About pane) clears the
saved login and returns to the gate.

Storage keys used by the shim:

| Key | Store | Contents |
|---|---|---|
| `vault-viewer-config` | sessionStorage (always) + localStorage (if "Remember me") | connection: `{ mode, owner, repo, branch, token, indexPath, prefix }` |
| `vault-viewer-settings` | localStorage | persisted app settings (theme, delete mode) |

The GitHub token is stored only in the browser (never in a cookie, never in the URL, never sent
anywhere but `api.github.com`).

---

## 8. Version history & virtual trash

- **Version history** (`/api/git/log`, `/api/git/show`) — GitHub mode only. `log` lists the commits
  that touched a note (GitHub Commits API); `show` returns the note's content at a given commit
  (Contents API at a ref). Local mode returns empty and the "Open version history" menu item is
  hidden there.
- **Virtual trash** — deleting a file with delete-mode **trash** captures its content into an
  in-memory store (survives until reload; there is no server `.trash` folder). The Trash view lists
  items and restores them (re-creating the file, which re-stages it in GitHub mode / rewrites it in
  local mode).

---

## 9. Deliberately-stubbed (server-only) endpoints

These features need a running WebObsidian server, so the shim returns empty results **and the app UI
that opens them is hidden** (so nothing presents fake success):

| Endpoint | Response | Hidden UI |
|---|---|---|
| `/api/git/*` (status, init, clone, pull, commit, push, sync) | `{}` | Settings "GitHub Sync" pane; the dead git status bar (replaced by an honest one) |
| `/api/keys/*` | `{ keys: [] }` | Settings "API Keys" pane |
| `/api/shares/*` | `{ shares: [] }` | Settings "Sharing" pane; the "Share…" context-menu items |
| `/api/plugins/*` | `{ plugins: [] }` | Settings "Community Plugins" pane |

Also hidden because they have no serverless equivalent: **"Open in new window"** (context menu), the
**password-change / Account** Settings pane. **"Download vault (.zip)"** is *not* stubbed — the shim
intercepts the download click and builds a valid ZIP client-side (uncompressed store entries with
per-file CRC-32; text notes only).

---

## 10. URL parameters

The connect gate autofills from query params for scripted/shared setups:

```
?mode=github&owner=<o>&repo=<r>&branch=<b>&index=<path-to-vault-index.json>&prefix=<content-prefix>
?mode=local
```

The **token is never read from the URL** (query strings leak via history/proxies). Params are
stripped from the address bar after autofill.

---

## 11. Extending the shim

The shim is one self-contained IIFE. To add or change behavior, edit the shim source and re-splice
it into the app bundle — see the "webobsidian vault-viewer.html" section of the `ClaudeCode` repo's
`CLAUDE.md` for the rebuild/splice/verify procedure. The route table is a simple
`[RegExp, handler(url, init)]` array; a handler returns a `Response` (via the `json()` helper) or a
promise of one. Add new routes **before** the broader catch-alls (`/^\/api\/files\//`,
`/^\/api\/git\//`, etc.), which match first-wins in array order.
