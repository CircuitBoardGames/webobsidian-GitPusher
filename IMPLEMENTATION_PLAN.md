# IMPLEMENTATION PLAN — WebObsidian

> Track tiến độ phát triển. Tham chiếu thiết kế: [PRD.md](PRD.md).
> Quy ước: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong.
> Cập nhật file này **mỗi khi** một mục thay đổi trạng thái.

Cập nhật lần cuối: 2026-06-10

---

## Phase 0 — Foundation & scaffolding
- [x] M0.1 Khởi tạo monorepo (root `package.json` + workspaces)
- [x] M0.2 Server scaffold: Express + TS, `tsconfig`, dev script (tsx), build (tsc)
- [x] M0.3 Web scaffold: Vite + React + TS
- [x] M0.4 Cấu trúc thư mục theo PRD §2.2
- [x] M0.5 `.gitignore`, `.env.example` (ESLint/Prettier: để sau, không chặn build)

## Phase 1 — Settings store (JSON db) — FR-5
- [x] M1.1 Module `settings` đọc/ghi `data/settings.json` (atomic write + backup)
- [x] M1.2 Schema validate bằng zod, default settings, migration `version`
- [x] M1.3 Route `GET/PUT /api/settings`

## Phase 2 — Auth gate — FR-3
- [x] M2.1 Hash password (scrypt), JWT secret tự sinh
- [x] M2.2 `POST /auth/setup`, `/auth/login`, `/auth/logout`, `GET /auth/me`
- [x] M2.3 Middleware auth guard (httpOnly cookie), bảo vệ route
- [x] M2.4 First-run setup flow (UI + env seed `WEBOBSIDIAN_PASSWORD`)

## Phase 3 — Vault filesystem — FR-1
- [x] M3.1 Service vault: list tree, read, write, create, rename/move, delete→trash
- [x] M3.2 Path traversal guard + allowedRoots
- [x] M3.3 Upload attachments (binary), serve binary với mime
- [x] M3.4 Folder browser an toàn để chọn vault path
- [x] M3.5 Filesystem watcher (chokidar) → events qua WebSocket

## Phase 4 — QMD Search engine — FR-7
- [x] M4.1 Module QMD trên MiniSearch: index content/title/headings/tags/path/frontmatter
- [x] M4.2 Build index lúc khởi động + persist `data/qmd-index.json`
- [x] M4.3 Incremental update qua watcher + sau mỗi write
- [x] M4.4 Query: full-text, prefix, fuzzy, fielded (`tag:`,`path:`,`title:`)
- [x] M4.5 Route `GET /api/search`

## Phase 5 — Links graph — FR-2
- [x] M5.1 Parser wikilinks/embeds/tags → link index
- [x] M5.2 Backlinks `GET /api/backlinks`
- [x] M5.3 Graph data endpoint `GET /api/graph`

## Phase 6 — GitHub sync — FR-4
- [x] M6.1 Service git (simple-git): init/clone, status, pull, commit, push
- [x] M6.2 Git LFS: detect, `.gitattributes`, track patterns (verified lfsAvailable)
- [x] M6.3 Auth bằng PAT nhúng remote URL
- [x] M6.4 Auto-sync interval (service autosync)
- [x] M6.5 Conflict detection cơ bản + báo người dùng
- [x] M6.6 Routes `/api/git/{status,init,clone,pull,commit,push,sync}`

## Phase 7 — API Gate (Agent) — FR-6
- [x] M7.1 API key model: tạo/list/revoke, hash lưu trong settings, scopes
- [x] M7.2 Middleware apikey guard + scope check + rate limit + audit log
- [x] M7.3 `/api/v1`: notes list/read/write/append/delete, search, backlinks, tags
- [x] M7.4 Route quản lý key `GET/POST/DELETE /api/keys`
- [x] M7.5 Tài liệu agent API (`docs/AGENT_API.md`)

## Phase 8 — Community plugins — FR-8
- [x] M8.1 Đọc `.obsidian/plugins/*` (manifest + main.js)
- [x] M8.2 Obsidian API shim (App, Vault, Workspace, Plugin, Notice, Setting…)
- [x] M8.3 Plugin loader (eval main.js) + enable/disable
- [x] M8.4 Browse + install từ community (GitHub releases)

## Phase 9 — Web frontend — FR-2
- [x] M9.1 API client + auth flow + app shell (ribbon/sidebar/tabs/statusbar)
- [x] M9.2 File tree (context menu CRUD, new note/folder)
- [x] M9.3 CodeMirror 6 editor (markdown, keymap, autosave)
- [x] M9.4 Reading view (remark/rehype, wikilinks, embeds, callouts, tasks, properties)
- [x] M9.5 Search panel + command palette
- [x] M9.6 Backlinks/outline/tags panels
- [x] M9.7 Graph view (mở trong tab + panel Filters kiểu Obsidian)
- [x] M9.8 Settings UI (vault/git/api keys/plugins/theme)
- [x] M9.9 Theme Obsidian-like (dark/light)
- [x] M9.10 Navigation back/forward (toolbar ←/→ trên mọi view, history stack)
- [x] M9.11 Search: filter/sort (match case, collapse, more context, sort) + sticky query box

## Phase 10 — Docker & docs — FR-9
- [x] M10.1 Multi-stage `Dockerfile` (web build → server runtime, git+git-lfs)
- [x] M10.2 `docker-compose.yml` (vault + data volumes, env secrets, healthcheck)
- [x] M10.3 `README.md` quickstart + `docs/AGENT_API.md`

## Phase 11 — QA & DoD
- [x] M11.1 Smoke test end-to-end (login → edit → search → backlinks → agent API CRUD)
- [x] M11.2 Seed vault mẫu để demo (`sample-vault/`)
- [x] M11.3 Kiểm tra Definition of Done (PRD §8) — verified qua curl + screenshot UI

## Phase 12 — Parity & UI fidelity (đợt 2)
- [x] M12.1 Live Preview WYSIWYG (CM6): ẩn dấu định dạng, scale heading, widget wikilink/checkbox/ảnh
- [x] M12.2 Frontmatter → Properties block trong cả Live preview (StateField) lẫn Reading
- [x] M12.3 Embeds/transclusion `![[note]]` + ảnh `![[img]]` trong Reading
- [x] M12.4 Context menu chuột phải thật (new/rename/delete/open-to-side/bookmark)
- [x] M12.5 Kéo-thả di chuyển file trong tree + dán/drop ảnh → upload attachments + chèn embed
- [x] M12.6 Quick switcher (⌘O) + command palette commands + hotkeys (⌘P/⌘O/⌘N/⌘E/⌘⇧F/⌘\\/⌘S)
- [x] M12.7 Bookmarks + Recent panel; Daily note command; split pane (open to the right)
- [x] M12.8 Git auto-commit-on-save (debounced) + toggle trong Settings
- [x] M12.9 Code-split bundle (react/codemirror/markdown chunks)

## Phase 13 — Obsidian look & feel (theo phản hồi người dùng)
- [x] M13.1 Bộ icon Lucide flat (component `Icon`) thay toàn bộ emoji
- [x] M13.2 Theme mặc định = Light (đúng Obsidian), palette/spacing/borders bám Obsidian
- [x] M13.3 File tree chỉ chevron (markdown không icon), active highlight tinh tế
- [x] M13.4 Vault footer (tên vault + settings); status bar nhỏ góc phải
- [x] M13.5 Right sidebar "Linked mentions" + "Outline" giống ảnh tham chiếu
- [x] M13.6 Tab bar có toggle sidebar trái/phải + nút new tab

## Phase 14 — WYSIWYG editor & context menus (theo phản hồi người dùng)
- [x] M14.1 Live Preview render đúng kiểu Obsidian: heading sạch (ẩn `#`), bold→đậm,
      italic→nghiêng, `code`→nền mono, strikethrough, bullet→•, tag→pill
- [x] M14.2 Lộ raw syntax **theo từng token tại con trỏ** (không lộ cả đoạn) — soạn thảo mượt
- [x] M14.3 Sửa lỗi áp theme tối (oneDark) lên giao diện sáng → highlight theo theme
- [x] M14.4 Callout/blockquote render inline trong Live Preview
- [x] M14.5 Frontmatter → Properties widget (block) trong Live Preview
- [x] M14.6 Menu chuột phải editor: Format/Paragraph/Insert (submenu) + Cut/Copy/Paste/Select all + Search
- [x] M14.7 Menu chuột phải file tree mở rộng: Open/Open to right/Bookmark/Make a copy/Rename/Move/Copy path/Delete
- [x] M14.8 Menu chuột phải reading view: Copy/Search/Select all; ContextMenu hỗ trợ submenu + icon

### Còn lại / cải tiến tương lai (không chặn)
- [ ] Resolve conflict UI nâng cao cho git
- [ ] Lazy-load cây thư mục cực lớn; canvas/whiteboard
- [ ] ESLint/Prettier CI; live-preview render bảng/danh sách lồng sâu nhiều cấp

---

## Phase 15 — Persist & sync workspace state (theo yêu cầu người dùng)
- [x] M15.1 Lưu UI/workspace state **xuống file server** `data/uistate.json` (không dùng localStorage)
      — tab đang mở, note active, viewMode, folder mở, split, recent, bookmarks, layout panel
- [x] M15.2 Khôi phục state khi load (F5 không mất note; mở trình duyệt/thiết bị khác vẫn giữ)
- [x] M15.3 **Sync real-time** giữa các tab/thiết bị qua WebSocket: tab này đổi → broadcast →
      tab kia apply (bỏ echo theo `originId`, lưu nội dung đang sửa trước khi chuyển, re-hydrate)
- [x] M15.4 Click-to-edit heading 1 lần (posAtCoords precise=false); heading bỏ underline

## Phase 16 — Deep-link URL & Public share — FR-10 (theo yêu cầu người dùng)
- [x] M16.1 URL `/note/<path>` đồng bộ với note đang mở (pushState/popstate, mở deep-link sau login,
      Graph = `/graph`)
- [x] M16.2 Server: service `shares` (`data/shares.json`, atomic write) + routes `/api/shares`
      (list/create/toggle/delete, auth) + `/public/shares/:id{,/file}` (không auth, guard chỉ
      serve file note đó nhúng, không serve `.md`)
- [x] M16.3 Trang public `/share/<token>` readonly (render Reading view, không cần login)
- [x] M16.4 UI: context menu note "Copy public link"; Settings → tab "Sharing" quản lý tập trung
      (search, toggle enable/disable nhanh, copy link, xoá)
- [x] M16.5 Password tuỳ chọn cho từng share: đặt/xoá ở tab Sharing (scrypt hash, chỉ trả
      `hasPassword`); public 401 `{passwordRequired}` → form nhập password → unlock JWT cookie
      (httpOnly, scope `/public/shares/{id}`, 12h)
- [x] M16.6 SSR trang `/share/{id}`: server render HTML hoàn chỉnh (Google indexable) + SEO meta
      (title, description, canonical, Open Graph + og:image, Twitter card); locked → form password
      noindex; thay thế trang React /share (web bỏ PublicNote, dev proxy /share về server)

### Nhật ký tiến độ
- 2026-06-03: Khởi tạo PRD.md, IMPLEMENTATION_PLAN.md, CLAUDE.md.
- 2026-06-03: Hoàn tất Phase 0–10. Backend (auth, vault, QMD search, links/graph, git+LFS,
  API gate, plugins) + frontend Obsidian-like (ribbon/sidebar/tabs/editor/reading/search/
  backlinks/outline/graph/settings/command-palette). Build web+server sạch, typecheck pass.
- 2026-06-03: Smoke test pass — login, file tree, full-text + fielded search, backlinks,
  tags, agent API (list/read/write/append/search, 401 no-key, 403 sai scope), SPA served,
  git status (LFS available). Screenshot UI xác nhận editor + reading view + callout +
  properties + wikilinks render đúng.
- 2026-06-04: Phase 12 — Live Preview WYSIWYG, embeds/transclusion, context menu, drag&drop +
  paste image, quick switcher + hotkeys, bookmarks/recent/daily note, split pane,
  git auto-commit-on-save, code-split bundle.
- 2026-06-04: Phase 13 — đại tu UI theo phản hồi: bộ icon Lucide flat thay emoji, default Light
  theme, file tree chevron-only, vault footer, status bar góc phải, "Linked mentions". Screenshot
  đối chiếu ảnh Obsidian thật: editor light + properties block + linked mentions khớp.
- 2026-06-04: Resolve attachment/ảnh kiểu Obsidian: thêm file index toàn vault (basename→path,
  shortest-path); route /content fallback theo basename khi path không khớp. Image generic theo
  protocol — URL trình duyệt load được (http(s)/data/blob/file) load thẳng, còn lại (path tương đối
  hoặc bất kỳ scheme nào) resolve theo basename qua file index. Áp cho cả Live preview lẫn Reading.
  Verify: ảnh hiển thị inline (naturalWidth>0). Watcher cập nhật index khi add/unlink.
- 2026-06-04: Khắc phục OOM trên vault lớn (5.9k note): build index không giữ toàn bộ doc, cap body
  100k, debounce link-graph + loadTree, NODE_OPTIONS=--max-old-space-size=4096 (Dockerfile).
- 2026-06-04: Live Preview render Markdown chuẩn còn thiếu: link `[text](url)` (ẩn URL, click mở
  external/internal), ảnh `![alt](url)` (http/relative → <img>, scheme lạ như trilium-att:// →
  placeholder "🖼 tên"), URL có dấu cách. Thêm overlap-guard cho replace decoration (chống crash).
- 2026-06-04: Viết lại Graph view: canvas 2D + d3-force (Barnes-Hut), pan/zoom, hover/zoom mới hiện
  label, click mở note, mặc định ẩn orphan (689/5929 node có liên kết) + toggle. Hết lag. Sửa layout
  full-height (theme wrapper) + status bar neo vào đáy workspace (không đè right sidebar).
- 2026-06-04: Trỏ WebObsidian vào vault Obsidian thật `/Users/xnohat/ObsidianVault-Trilium`
  (5928 md, 27k files, 5.5GB). Ẩn dotfiles trong tree, folder mặc định thu gọn, con trỏ khởi tạo
  sau frontmatter, Properties render YAML list thành pill. Screenshot khớp ảnh Obsidian thật.
- 2026-06-04: Phase 14 — viết lại Live Preview thành WYSIWYG thật (heading/bold/italic/code/tag/
  callout render, ẩn syntax, chỉ lộ token tại con trỏ; sửa lỗi oneDark trên light). Thêm menu
  chuột phải editor (Format/Paragraph/Insert submenu + clipboard + search), mở rộng menu file tree,
  menu reading view. Screenshot xác nhận: bold render đậm khi con trỏ ở đoạn khác, submenu Format hiện đúng.
- 2026-06-04: Sửa render Markdown lệch Obsidian: (1) syntax Obsidian/wikilink/embed nằm trong inline
  code/code block (vd `` `![[file]]` ``) bị biến thành link — nay giữ literal ở cả Live (skip regex khi
  trùng node InlineCode/FencedCode/CodeBlock từ syntaxTree) lẫn Reading (stash code span trước khi
  preprocess, restore sau). (2) Bảng Markdown chưa render ở Live — thêm scanTables + TableWidget qua
  StateField `tableField` (block widget như frontmatter), inline render trong cell (code/bold/italic/
  link), lộ raw khi con trỏ trong bảng; plugin skip dòng thuộc bảng đã render để tránh chồng decoration.
  Verify: typecheck + build sạch, scanTables nhận đúng bảng README (header Type/Count, 10 dòng).
- 2026-06-05: Live Preview khớp Obsidian thêm: (1) external link http(s) có icon ↗ (SVG lucide) +
  gạch dưới; internal link/wikilink gạch dưới; link widget `inline-block` để text dính sau `]]` vẫn
  wrap được như Obsidian. (2) List: thu gọn khoảng trắng thừa sau marker (`-   Item`→`• Item`,
  `1.  x`→`1. x`). (3) Blockquote dùng màu chữ normal (trước bị muted). (4) Render HTML block thô
  (bảng CKEditor/Trilium `<table>`) qua StateField `htmlBlockField` + sanitize (bỏ script/on*/js: URL),
  click link trong HTML mở external/internal; plugin skip dòng trong HTML block đã render. Verify bằng
  Chrome DevTools trên vault thật: icon ↗ + gạch dưới link, list 1-space, blockquote chữ đậm, bảng HTML
  "Điểm Mạnh/Điểm Yếu" render kèm bullet + link tiktok/Google. Lưu ý: app Obsidian đang mở trên cùng
  vault tự convert vài bảng HTML→markdown và xoá file scratch giữa session — không phải do WebObsidian
  (server read/write nguyên văn, code chỉ thêm decoration).
- 2026-06-05: Tinh chỉnh theo phản hồi: (1) Bảng markdown render `<br>` trong cell thành xuống dòng
  (appendInline thêm token `<br>`), header căn trái + valign top + style theo Obsidian table CSS vars
  (cả Live lẫn Reading). (2) Blockquote: viền trái màu tím `--interactive-accent` + padding-left 24px;
  fix bug padding bị CodeMirror `.cm-line` override bằng selector chuyên biệt `.cm-line.cm-blockquote`
  (tương tự `.cm-callout`) → chữ không còn dính vào viền. Verify Chrome DevTools: br=3 trong cell, th
  căn trái, blockquote border rgb(120,82,238) + padding 24px. Phải restart server 2 lần (minisearch
  vacuuming crash + OOM khi reindex lúc reload) — bug có sẵn, không liên quan thay đổi này.
- 2026-06-05: Table editor tương tác kiểu Obsidian (TableWidget viết lại). Cell click-to-edit
  (contenteditable lồng trong widget, focus hiện raw, blur/Enter commit; Escape huỷ), mỗi thao tác
  re-serialize model → replace range nguồn → tableField rebuild (DOM luôn đồng bộ). Hover hiện nút
  +column (cạnh phải) / +row (đáy). Chuột phải cell mở menu format (inject openContextMenu của store qua
  setLivePreviewMenuHandler): insert column trái/phải, insert row trên/dưới, move column/row, align
  column trái/giữa/phải (submenu), delete column/row. Bảng giờ LUÔN render widget (bỏ reveal-raw khi
  chọn) giống Obsidian — sửa nội dung qua cell, sửa raw qua Source mode. Verify Chrome DevTools trên
  note "Test Table": edit cell ghi đúng GFM ra file, +column 4→5, context menu đủ mục, delete column 5→4.
- 2026-06-05: Inline title (tên note) kiểu Obsidian hiện đầu thân note ở Live (block widget `inlineTitleField`
  ở pos 0, title bơm qua `setNoteTitle` từ Editor) lẫn Reading (Preview prepend `.inline-title`). Dedup:
  bỏ qua nếu note mở đầu bằng `# <tên>` trùng title (note Trilium lặp tiêu đề thành heading) → không hiện 2
  lần. Verify: "Test Table" (không heading) hiện title; "Trilium System Notes" (có `# Trilium System Notes`)
  KHÔNG hiện inline title (chỉ còn heading).
- 2026-06-05: Property editor tương tác kiểu Obsidian (FrontmatterWidget viết lại). Header "Properties",
  mỗi prop: icon theo kiểu (text=T / list=≣ / date=🗓 / number=# / checkbox=☑), key + value
  contenteditable (Enter/blur commit), list (tags/aliases/[...]) hiện pill có nút × xoá + nút "+" thêm
  item, nút × xoá prop khi hover, "+ Add property". Mỗi thao tác parse→serialize YAML→replace block
  frontmatter [0,blockEnd]. Frontmatter giờ LUÔN render widget (bỏ reveal-raw) giống Obsidian. Có quoting
  YAML khi value chứa ký tự đặc biệt. Verify Chrome DevTools: README hiện title/created icon đúng, Add
  property ghi `property:` ra file rồi xoá sạch, Trilium System Notes hiện aliases dạng pill + add.
- 2026-06-05: Property name suggester (dropdown) kiểu Obsidian khi Add property. Server: QmdEngine
  gom frontmatter key→type toàn vault (`propMeta` map, persist/restore cùng index), endpoint
  `GET /api/properties` trả {key,type,count} sort theo count; `inferPropType` phân loại
  text/list/number/checkbox/date/datetime, core props (tags/aliases/cssclasses) luôn = list và luôn
  có trong gợi ý. Web: `api.properties()` + inject `setLivePreviewPropertyProvider`; nút "+ Add property"
  mở input + dropdown lọc theo tên (loại key đã có), chọn gợi ý tạo prop đúng kiểu (list→pills). Fix:
  readProps loại trừ `.prop-newrow` (trước bị commit nhầm cả tên đang gõ). Verify Chrome DevTools:
  /api/properties trả 76 key (created 5938, aliases 5937…), dropdown lọc "tag"→tags/tag/taskTagNote,
  chọn "source" thêm đúng 1 prop ra file rồi xoá sạch. Phải xoá data/qmd-index.json + reindex để có propMeta.
- 2026-06-05: Hoàn thiện 3 mục còn lại. (1) Ổn định server: tắt minisearch `autoVacuum` (nguồn crash
  TreeIterator.dive khi discard/replace) ở newIndex + loadJSON; thêm guard process uncaughtException/
  unhandledRejection (log, không chết). (2) Table handle: thanh chọn cột (mép trên th) + hàng (mép trái
  ô đầu) — hover highlight cả cột/hàng (.cm-cell-hl), click mở menu format đúng phạm vi. (3) Property
  type registry kiểu Obsidian: service đọc/ghi `.obsidian/types.json` (format {types:{key:type}},
  text/multitext/number/checkbox/date/datetime/tags/aliases) + route GET/POST `/api/property-types`;
  web inject registry, chuột phải key/icon → menu "Property type" (6 kiểu, ✓ kiểu hiện tại) + Copy value
  + Remove; đổi kiểu persist types.json, nếu đổi list-ness thì convert YAML scalar↔list rồi commit, còn
  lại đổi icon tại chỗ. Verify Chrome DevTools: menu hiện đủ + ✓ Date&time cho created; đổi title→List ghi
  types.json {"title":"multitext"} + YAML thành list, revert→Text sạch; handle highlight 3 ô + mở menu.
- 2026-06-05: Value input theo property type (như Obsidian). `makeScalarField(dt,value)` dựng control
  đúng kiểu: text=span contenteditable, number=`<input type=number>`, checkbox=`<input type=checkbox>`,
  date=`<input type=date>`, datetime=`<input type=datetime-local>`. Mỗi field giữ `dataset.raw` =
  giá trị YAML chuẩn (readProps đọc raw → field không đụng tới không bị ghi đè, vd timestamp
  `…:48.273Z` giữ nguyên khi chỉ hiện `19:23`). Đổi kiểu scalar↔scalar swap control tại chỗ (fix: trước
  chỉ đổi icon). Verify Chrome DevTools: created→datetime picker (raw giữ giây/Z), dateNote (Obsidian set
  datetime trong types.json) cũng ra datetime picker — interop 2 chiều; cycle dateNote qua
  number/checkbox/date/text/datetime input đổi đúng; README sạch, types.json khớp.
- 2026-06-05: List property (tags…) sửa/thêm value kiểu Obsidian. Pill giờ contenteditable (click sửa,
  blur commit) + nút × xoá; nút "+" mở ô gõ + dropdown gợi ý value (tag vault qua `setLivePreviewTagProvider`
  → /api/tags, 1302 tag), lọc realtime, chọn hoặc Enter để thêm. Bỏ cap 12 ở Add-property suggester (giờ
  hiện hết ~72 key, cuộn được) — sửa khiếu nại "props ít". Dropdown value dùng position:fixed append body,
  anchor dưới input bằng getBoundingClientRect (sửa lỗi UI: trước bị đẩy xuống tạo khoảng trống + dropdown
  văng sang phải). flushActive trong mutate để không mất edit dở khi có thao tác khác. Verify Chrome
  DevTools: gap 0px, dropdown thẳng dưới input, lọc "linu"→linux/linuxjournal, chọn→`tags: - linux` ra
  file, sửa pill linux→linuxedit persist, xoá sạch; Add-property dropdown 72 mục.
- 2026-06-05: Graph view chuyển từ modal độc lập → mở trong workspace tab như Obsidian (sentinel
  path `graph://view`, render trong Workspace khi activePath là graph; setGraph/openGraph thêm-hoặc-
  kích-hoạt tab, lưu cùng workspace state). Thêm panel Filters overlay kiểu Obsidian (collapse từng
  section): Filters (search files, Tags/Attachments/Existing files only/Orphans toggle), Groups
  (New group: màu + query → tô node khớp), Display (Arrows, Text fade, Node size, Link thickness,
  Animate), Forces (Center/Repel/Link/Link distance slider 0..1 map sang d3-force). Backend mở rộng
  `graphData()`: trả node kèm `kind` (note/attachment/unresolved) + `tags`, sinh node attachment cho
  embed file đính kèm và node unresolved cho wikilink chưa có file → toggle hoạt động thật;
  buildLinkGraph lưu thêm rawLinks + tags. graphSettings persist qua /api/uistate. typecheck + build
  web sạch (414 modules).
- 2026-06-05: Fix Tags toggle gây trắng trang. Nguyên nhân: server 8787 đang chạy bản dist CŨ
  (chưa có tags) → `n.tags` = undefined; client làm `for (const tag of n.tags)` ném "undefined is not
  iterable" đồng bộ trong useEffect → React unmount cả cây (trắng, refresh không cứu vì tags:true đã
  persist). Sửa client: guard `n.tags ?? []` + bỏ qua node không tags, phân giải link sang tham chiếu
  node-object (loại bỏ khả năng forceLink ném "missing node"), bọc toàn bộ build trong try/catch →
  hiện overlay "Reset filters" thay vì trắng trang. Rebuild server (tsc) + restart `node
  server/dist/index.js` (PORT=8787 DATA_DIR=./data ALLOWED_ROOTS=/Users/xnohat; vault thật từ
  settings.json, log "sample-vault" là defaultVaultPath gây hiểu nhầm). Verify qua CDP (port 9223) trên
  vault thật: /api/graph trả 22718 node kèm kind+tags (3085 node có tag), bật Tags → tagsOn=true, KHÔNG
  lỗi/không crash, orphan 2533→1213 (note nối vào tag node). typecheck + build web+server sạch.
- 2026-06-05: Fix hiệu năng — server ghim ~88% CPU liên tục + Files panel kẹt "Loading...". 3 nguyên
  nhân O(toàn vault) chạy lặp: (1) chokidar KHÔNG ignore `.obsidian` → app Obsidian mở cùng vault ghi
  workspace.json/state liên tục → mỗi event broadcast `fs` → client refetch cả tree. (2) `listTree`
  `fs.stat()` từng file → 27k syscall mỗi lần fetch tree (UI không dùng size/mtime). (3) onChange + API
  reindex gọi `buildLinkGraph()` đọc+parse lại toàn bộ 5938 note mỗi lần 1 file đổi. Sửa: ignore
  `.obsidian` trong watcher; bỏ `fs.stat` trong listTree (chỉ dùng dirent); thêm
  `updateLinkGraphForFile(rel, removed)` cập nhật graph TĂNG TIẾN 1 file (watcher onChange + reindex
  của PUT content/rename/delete đều dùng; agent + /api/reindex vẫn full vì hiếm). Verify CDP trên vault
  thật: CPU 88%→0% idle, /api/files/ ~190ms, Files panel hết "Loading" (38 row). RSS ~1.1GB ổn định
  (MiniSearch + index, không tăng). typecheck + build server sạch.
- 2026-06-05: Graph nâng chất lượng + tương tác theo phản hồi (so Obsidian). (1) Click TAG node →
  search notes: store thêm `searchFor(q)` (set leftPanel=search + searchQuery), SearchPanel adopt
  searchQuery; GraphView onUp: note→openFile, tag→`searchFor('tag:'+name)`. Verify API: tag:license→50
  hits (note đầu "12min Lifetime License" khớp Obsidian), tag:Android→40. (2) Zoom mượt: bỏ React
  onWheel (passive, preventDefault bị bỏ qua) → native listener {passive:false}, scale liên tục
  `exp(-deltaY*speed)` thay vì bước cố định 1.1×; ctrlKey=pinch amplify. (3) Đồ hoạ sắc nét hơn: node
  radius đổi sang sqrt `(1.5+√deg*0.9)*(0.4+size)` (hết blob khổng lồ), thêm viền nền quanh node tách
  bạch, edges nhạt hairline (alpha 0.18+), label có halo nền (strokeText) dễ đọc. (4) Hiệu năng zoom:
  cull edge ngoài viewport (skip nếu 2 đầu cùng phía ngoài màn hình). typecheck + build web sạch.
- 2026-06-05: Graph layout & label fade theo phản hồi: (1) tăng lực đẩy (charge −66→−120), hub đẩy
  mạnh theo √deg, link dài hơn (67→100), distanceMax 480→1400, center nhẹ hơn, collide theo bán kính
  thật → graph nở thoáng, hết "hairball". (2) Line mảnh lại + đậm màu (đổi sang --text-faint, alpha
  ~0.7). (3) Label fade theo zoom (hub hiện trước, note nhỏ chỉ hiện khi zoom gần) thay vì hiện hết.
- 2026-06-05: Đổi renderer graph từ canvas-2D (CPU) sang **PixiJS WebGL (GPU)** như Obsidian (user
  chọn). Pixi v8 dynamic-import (chunk 246KB gzip, chỉ tải khi mở graph; bundle chính vẫn ~40KB).
  Kiến trúc: node = Sprite (texture tròn dùng chung, tint theo màu/nhóm, scale theo bán kính), edges =
  Graphics, label = lớp Text screen-space riêng (pool ≤400, halo nền, fade theo zoom). Pan/zoom = biến
  đổi camera trên world Container (world.position/scale) → KHÔNG vẽ lại hình học, mượt bất kể số node;
  chỉ vẽ lại geometry khi sim tick. Render on-demand (ticker.stop + app.render qua rAF batch). Giữ
  nguyên d3-force + panel Filters/Forces + click tag→search. Verify CDP vault thật: WebGL context sống
  (không lost), 0 lỗi console, scene rebuild đúng khi đổi filter (tags off→1258 node), screenshot xác
  nhận vẽ node/edge/label sắc nét. typecheck + build web sạch.
- 2026-06-06: Tinh chỉnh graph WebGL khớp Obsidian (qua nhiều vòng screenshot CDP): (1) Node size:
  sqrt CÓ CAP `(3+min(√deg,11))*(0.45+size)` → hub tag chỉ ~3.5× note (trước ~9×, blob khổng lồ),
  note có base nhìn rõ. (2) Label: ngưỡng theo bán kính màn hình hạ thấp + **greedy tránh chồng**
  (sort hover→deg, bỏ label nào đè label đã đặt, tối đa 220) → label sạch như Obsidian, hiện đúng tầm
  zoom thay vì hiện muộn/đè nhau. (3) Auto-fit theo VÙNG LÕI (median center + percentile 82% bán kính,
  bỏ outlier cụm orphan bay xa) → mức zoom mặc định hợp lý, không co graph thành chấm giữa màn hình;
  fit định kỳ khi đang dàn, dừng khi user pan/zoom. (4) Edge giữ ĐỘ DÀY CỐ ĐỊNH trên màn hình
  (width=base/k, vẽ lại khi zoom; pan vẫn thuần transform) → hết bị thành thanh xám to khi zoom sâu.
  Verify CDP nhiều mức zoom: line mảnh đều, label rõ không chồng (note+tag), node cân đối, tag cyan
  click→search. typecheck + build web sạch.
- 2026-06-06: Label theo phản hồi "hiện muộn + mờ": hạ ngưỡng rMin (1.1−fade) → label hiện ngay ở mức
  zoom fit mặc định; font 11→13 + fontWeight 600 + màu --text-normal (đậm/đen) + halo width 4 + ramp
  alpha nhanh → hết mờ. Verify CDP: ở cả mức fit lẫn zoom +2, label đậm-đen-to, không chồng (greedy
  vẫn tránh đè), hiện đầy đủ tag + tên note như Obsidian.
- 2026-06-06: Label fade mượt theo zoom như Obsidian: nới vùng ramp alpha (over ~4.5px bán kính màn
  hình) → label hiện mờ ở zoom xa rồi từ từ rõ dần khi zoom vào, hub rõ trước, note nhỏ rõ sau. Verify
  CDP: mức fit label mờ/đa cấp opacity, zoom +4 label rõ-đậm hoàn toàn.
- 2026-06-10: Navigation back/forward kiểu Obsidian (M9.10). Store thêm history stack (`history`/
  `histIndex`, cap 100) + `goBack`/`goForward`; openFile/openGraph push entry qua `pushHistory` (cắt
  nhánh forward, bỏ qua khi đang replay nhờ cờ `navByHistory`). View-header giờ render cho MỌI view
  (trước chỉ markdown) với 2 nút ←/→ góc trái, disabled+mờ khi hết chỗ lùi/tới; Graph view cũng có
  toolbar. Icon thêm arrow-left/arrow-right. typecheck cả 2 workspace + build web sạch.
- 2026-06-10: Search panel thêm filter/sort + sticky (M9.11). Khung query (input + nút match-case
  "Aa" + clear + options) gộp 1 box bo viền, `.search-head` `position: sticky; top:0` trong
  `.sidebar-body` → KHÔNG trôi khi cuộn kết quả (fix khiếu nại). Options panel (toggle qua nút
  sliders): Collapse results (ẩn snippet), Show more context (bỏ line-clamp). Dropdown Sort:
  Relevance (mặc định = thứ tự server) / File name A→Z / Z→A / Path — sort client-side. Match case
  lọc client theo free-text (bỏ operator tag:/path:). Nâng limit 50→100. Lưu ý: sort theo Modified/
  Created time CHƯA làm — search index không lưu mtime/ctime, cần thêm field server + reindex.
  typecheck + build web sạch. Chưa verify live (browser profile CDP đang bị chiếm).
- 2026-06-10: Bỏ cap cứng 100 kết quả search (phản hồi "tại sao luôn 100?"). Server: route bỏ
  Math.min(...,100), `limit<=0`/omitted → trả MỌI match; QmdEngine.search slice chỉ khi limit>0
  (agent API vẫn truyền limit nên không đổi). Client: api.search bỏ default 100 (gọi không limit),
  SearchPanel render TĂNG DẦN 50/lần qua IntersectionObserver (sentinel + rootMargin 300px), reset
  về 50 khi đổi query/sort/match-case, hiện "Showing X of Y…". Đếm giờ đúng tổng thật. Verify API
  trên vault thật: q=nginx → 166 hit (trước cắt 100), limit=100 vẫn cap 100. Restart server dist mới.
  typecheck + build web+server sạch.
- 2026-06-10: Fix khe hở phía trên khung search (kết quả lú ra trên ô tìm). Bỏ `position: sticky`
  trên `.search-head` (sticky trong `.sidebar-body` có padding-top → khe). Thay bằng layout cố định:
  `.search-panel` height 100% flex-column, `.search-head` flex-shrink:0 (đứng yên), `.search-results`
  flex:1 + overflow-y:auto tự cuộn riêng → đầu danh sách không thể đè lên khung. IntersectionObserver
  đổi root sang `.search-results` (ref) thay vì viewport. typecheck + build web sạch.
- 2026-06-10: Phase 16 (FR-10) — deep-link URL + public share. URL `/note/<path>` sync 2 chiều
  với tab đang mở (module `web/src/lib/urlsync.ts`: pushState khi đổi note, popstate → openFile,
  lần sync đầu replaceState; deep-link thắng workspace restore). Share public: `data/shares.json`
  (1 record/note, token 16-byte base64url), `/api/shares` CRUD + toggle enabled, `/public/shares/:id`
  trả {title, content} không lộ path, `/public/shares/:id/file` chỉ serve đúng file note nhúng
  (`![[...]]`/`![](...)`, resolve theo basename như files API, chặn `.md`). Trang `/share/<id>`
  render Reading view standalone (main.tsx branch trước App, không auth), wikilink trơ. UI: context
  menu "Copy public link" (FileTree), Settings → tab Sharing (search, Copy link, Disable/Enable,
  Delete; click path mở note). Rename note tự cập nhật share path. Verify end-to-end qua curl
  (401 file API vs 200 public, allowlist 404, disable→404, re-enable→200) + Chrome (trang share
  render ảnh nhúng trong context cô lập không cookie; deep-link mở đúng note; browser Back đổi note;
  tab Sharing hiển thị đủ controls). Typecheck + build sạch.
- 2026-06-10: M16.5 — password riêng cho từng share link. Server: `ShareRecord.passwordHash`
  (scrypt, tái dùng hash/verify của auth service; không bao giờ trả hash — API trả `hasPassword`),
  PATCH /api/shares/:id nhận {password: string|null} (set/xoá), POST /public/shares/:id/unlock
  đổi password lấy JWT cookie httpOnly scope `/public/shares/:id` TTL 12h (ảnh nhúng tự gửi cookie);
  GET content/file trả 401 {passwordRequired} khi chưa unlock. Web: PublicNote thêm form unlock
  (sai password báo lỗi, đúng → render); tab Sharing thêm nút "Password…/Password ✓" (prompt đặt/
  đổi/xoá) + badge "password-protected". Verify curl (set→401→unlock sai 401→unlock đúng→cookie
  →200 content+file, xoá password→200 lại, shares.json mode 600 chứa scrypt hash) + Chrome context
  cô lập (form hiện, sai báo lỗi, đúng mở note + ảnh load, tab Sharing đúng trạng thái).
- 2026-06-10: M16.6 — SSR + SEO cho trang share public. Server render `GET /share/:id` thành HTML
  hoàn chỉnh (route `sharepage.ts` mount trước static): nội dung note nằm ngay trong HTML (Google
  indexable, không cần JS), head đủ title / meta description (strip markdown ~160 ký tự) / canonical /
  og:type=article + og:site_name + og:title/description/url/image (ảnh đầu tiên note nhúng — URL
  tuyệt đối qua endpoint public, hoặc ảnh web đầu tiên) / twitter:card summary_large_image. Render
  bằng service `renderhtml.ts` — port pipeline unified/remark/rehype+sanitize từ web (giữ sync),
  deps thêm vào server workspace; CSS bundle của SPA được inline nên giao diện khớp Reading view.
  Share có password → SSR form unlock (noindex, không lộ nội dung/metadata; inline JS POST unlock
  rồi reload); cookie unlock đổi path '/' để cả /share/:id lẫn /public/shares/:id đều nhận. Bỏ trang
  React PublicNote (SSR thay thế), vite proxy thêm /share. Verify curl: locked → noindex + không leak,
  mở khoá → đủ meta + content + img + CSS inline, id sai → 404 noindex; Chrome context cô lập: form
  unlock sai báo lỗi, đúng → reload ra note y hệt Reading view. Typecheck + build sạch.
