# releases/

`vault-viewer.html` is a standalone, self-contained build of the WebObsidian web app with a
network-layer shim injected before it mounts: instead of talking to a real WebObsidian server, it
answers the app's own API calls from a static `vault-index.json` fetched once from a GitHub repo,
plus per-note content fetched lazily from GitHub on open. Nothing is embedded in the file itself —
open it, point it at a repo/branch, and it browses that repo's vault live, read-only by default
(the Wiki Vault target also supports editing + opening a pull request for the changes).

It's a companion artifact, not part of the app's own runtime — the real app is `server/` + `web/`
in this repo. This file is kept here (and as a release asset) rather than referenced from the
README's main install path, since it targets a different use case: viewing a vault hosted in a
GitHub repo with no server to run, rather than self-hosting WebObsidian.

Source: `graphify-out/obsidian/vault-viewer.html` in the sibling `ClaudeCode` repo (an internal
build for browsing that repo's own knowledge-graph and wiki vaults). The pre-auth login-screen
vault picker, deterministic graph group coloring, and GitHub pull-request flow added to the real
app in this fork (see the README Abstract, `PRD.md` changelog 1.6, `IMPLEMENTATION_PLAN.md` Phase
28) port the *UX pattern* from this shim's gate/changes-panel — not its code, since this file talks
to GitHub's raw Data API directly (it has no filesystem to run git in), while the real app now has
a proper local git clone to work with instead.

As of 2026-07-14, `ClaudeCode` vendors **this fork's own `main`** (not upstream `xnohat/webobsidian`)
to build this file — so it stays current with this repo's own feature work going forward. The two
copies (here and in `ClaudeCode`) are kept byte-identical; see that repo's `CLAUDE.md` ("webobsidian
vault-viewer.html" section) for the rebuild procedure and
`wiki-vault/wiki/decisions/Vendor webobsidian from the CircuitBoardGames fork, not upstream.md` for
the rationale.
