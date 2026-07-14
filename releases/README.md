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
