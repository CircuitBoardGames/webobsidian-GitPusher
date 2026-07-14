# releases/

`vault-viewer.html` is a standalone, self-contained build of the WebObsidian web app with a
network-layer shim injected before it mounts: instead of talking to a real WebObsidian server, it
answers the app's own API calls from one of two data sources you pick on a connect screen —
nothing is embedded in the file itself, and nothing defaults to any particular person's identity:

- **GitHub repo**: live-fetches from any repo/branch you connect with (owner/repo/branch/token are
  plain form fields, all blank by default). Point it at a pre-built `vault-index.json` for instant
  load with full graph/backlinks/community-color data, or leave that blank and it auto-discovers
  the tree via the GitHub API and builds the note graph lazily by scanning markdown content.
  Editing is supported — a floating Changes panel lists pending edits and "Push & open PR" commits
  them to a new branch and opens a pull request against whatever branch you connected to, never a
  direct commit.
- **Local folder**: pick a folder on your own device via the browser's native folder-picker
  (File System Access API) — reads and writes go straight to disk, no network calls, no server.

Connect-screen fields autofill from URL query params (`?mode=github&owner=&repo=&branch=&index=&
prefix=`, or `?mode=local`) for scripted/shared setups — the token is never accepted via URL.

## Capabilities

Beyond browsing and editing, the shim makes the compiled app behave correctly with no server behind
it:

- **Full app UI**: file tree, live/reading/source views, Properties, tags, backlinks, full graph
  view, and search. Graph communities are auto-colored (via WebObsidian's own Groups mechanism, no
  plugin changes) and the same colors dot the file-tree bullets — for both pre-built-index vaults
  and lazily-scanned ones.
- **Honest about server-only features**: UI that can't work without a WebObsidian server (Sharing,
  API Keys, Community Plugins, Git Sync, password change, "Open in new window") is hidden rather than
  presenting fake success. The status bar shows the real connection state.
- **Client-side extras**: "Download vault (.zip)" builds a real ZIP in the browser; version history
  reads the GitHub commits API (GitHub mode); deletes route through a restorable virtual trash.
- **Persistence**: the theme persists to `localStorage`, and a same-tab reload auto-reconnects to
  the same vault (so a theme change or refresh keeps your place instead of dropping to the connect
  screen). Logout is its own Settings tab and returns you to the gate. The GitHub token lives only
  in the browser — never a cookie, never the URL.
- **One clear push control**: in GitHub mode, edits collect on a single floating button
  ("⬆ Push N change(s)…") that opens the Changes panel and pushes a PR.

**API & internals reference:** [`VAULT_VIEWER_API.md`](VAULT_VIEWER_API.md) documents every endpoint
the shim answers (the app's `/api/*` and `/auth/*` calls), how each maps to GitHub / local / a stub,
the storage keys, and how to extend the route table.

It's a companion artifact, not part of the app's own runtime — the real app is `server/` + `web/`
in this repo. This file is kept here (and as a release asset) rather than referenced from the
README's main install path, since it targets a different use case: browsing/editing a vault with
no server to run, whether that vault lives in a GitHub repo or on your own machine.

Source: `graphify-out/obsidian/vault-viewer.html` in the sibling `ClaudeCode` repo. As of
2026-07-14, `ClaudeCode` vendors **this fork's own `main`** (not upstream `xnohat/webobsidian`) to
build this file, and the connect gate itself was generalized away from that repo's own hardcoded
identity/vaults — see that repo's `CLAUDE.md` ("webobsidian vault-viewer.html" section) for the
rebuild procedure and `wiki-vault/wiki/decisions/Generalize vault-viewer.html's connect gate away
from this repo's own vaults and identity.md` for the rationale. The two copies (here and in
`ClaudeCode`) are kept byte-identical.
