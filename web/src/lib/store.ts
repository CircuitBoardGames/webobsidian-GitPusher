import { create } from 'zustand';
import { api, type TreeNode } from './api';

/** Per-tab id so we can ignore the echo of our own server-pushed state change. */
export const CLIENT_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export type ViewMode = 'live' | 'source' | 'reading';

/** Sentinel tab path for the Graph view (it lives in a tab, like Obsidian). */
export const GRAPH_PATH = 'graph://view';

export interface Tab {
  path: string;
  title: string;
}

/** A color group in the graph (nodes matching `query` are tinted `color`). */
export interface GraphGroup {
  query: string;
  color: string;
}

/** Persisted Graph view filters/display/forces — mirrors Obsidian's graph panel. */
export interface GraphSettings {
  // filters
  search: string;
  tags: boolean;
  attachments: boolean;
  existingOnly: boolean;
  orphans: boolean;
  // groups
  groups: GraphGroup[];
  // display
  arrows: boolean;
  textFade: number; // 0..1, higher = labels show at lower zoom
  nodeSize: number; // 0..1
  linkThickness: number; // 0..1
  // forces (all normalized 0..1)
  centerForce: number;
  repelForce: number;
  linkForce: number;
  linkDistance: number;
}

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
  search: '',
  tags: false,
  attachments: false,
  existingOnly: false,
  orphans: true,
  groups: [],
  arrows: false,
  textFade: 0.5,
  nodeSize: 0.5,
  linkThickness: 0.5,
  centerForce: 0.5,
  repelForce: 0.5,
  linkForce: 0.5,
  linkDistance: 0.5,
};

export interface ContextMenuItem {
  label: string;
  danger?: boolean;
  separator?: boolean;
  icon?: string;
  onClick?: () => void;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface AppState {
  authed: boolean;
  setAuthed: (v: boolean) => void;

  tree: TreeNode | null;
  loadTree: () => Promise<void>;

  tabs: Tab[];
  activePath: string | null;
  /** Back/forward navigation stack of visited paths (incl. GRAPH_PATH). */
  history: string[];
  histIndex: number;
  goBack: () => void;
  goForward: () => void;
  content: string;
  dirty: boolean;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;

  // expanded folders in the file tree (persisted)
  expanded: string[];
  toggleFolder: (path: string) => void;

  // split pane (open to the side)
  splitPath: string | null;
  splitContent: string;
  openToSide: (path: string) => Promise<void>;
  closeSplit: () => void;

  recent: string[];
  bookmarks: string[];
  toggleBookmark: (path: string) => void;

  leftPanel: 'files' | 'search' | 'tags' | 'bookmarks';
  setLeftPanel: (p: 'files' | 'search' | 'tags' | 'bookmarks') => void;
  /** Query pushed into the search panel (e.g. clicking a tag node in the graph). */
  searchQuery: string;
  searchFor: (q: string) => void;
  leftOpen: boolean;
  rightOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;

  paletteOpen: boolean;
  paletteMode: 'all' | 'commands' | 'files';
  setPalette: (v: boolean, mode?: 'all' | 'commands' | 'files') => void;
  settingsOpen: boolean;
  setSettings: (v: boolean) => void;
  /** Open (true) or close (false) the Graph view tab. */
  setGraph: (v: boolean) => void;
  openGraph: () => Promise<void>;
  graphSettings: GraphSettings;
  setGraphSettings: (patch: Partial<GraphSettings>) => void;
  resetGraphSettings: () => void;

  contextMenu: ContextMenuState | null;
  openContextMenu: (m: ContextMenuState) => void;
  closeContextMenu: () => void;

  toast: string;
  notify: (msg: string) => void;

  openFile: (path: string) => Promise<void>;
  openWikilink: (target: string) => Promise<void>;
  closeTab: (path: string) => void;
  setContent: (c: string) => void;
  save: () => Promise<void>;
  createNote: (path: string, body?: string) => Promise<void>;
  openDailyNote: () => Promise<void>;
  /** Re-fetch content for the active/split tabs (after reload or remote sync). */
  hydrate: () => Promise<void>;
  /** Load persisted workspace state from the server and apply it. */
  loadUiState: () => Promise<void>;
  /** Apply a workspace state pushed from another tab/device. */
  applyRemoteState: (state: any, originId: string) => Promise<void>;
}

const TEXT_RE = /\.(md|markdown|txt|json|csv|canvas|css|js|ya?ml)$/i;

// ---- server-side workspace persistence (shared across browsers/devices) ----
const PERSIST_KEYS = [
  'tabs', 'activePath', 'viewMode', 'expanded', 'splitPath',
  'recent', 'bookmarks', 'leftPanel', 'leftOpen', 'rightOpen', 'graphSettings',
] as const;

function pickPersisted(s: any): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of PERSIST_KEYS) o[k] = s[k];
  return o;
}

function applyPersisted(s: any, set: (p: any) => void): void {
  set({
    tabs: Array.isArray(s.tabs) ? s.tabs : [],
    activePath: typeof s.activePath === 'string' ? s.activePath : null,
    viewMode: ['live', 'source', 'reading'].includes(s.viewMode) ? s.viewMode : 'live',
    expanded: Array.isArray(s.expanded) ? s.expanded : [],
    splitPath: typeof s.splitPath === 'string' ? s.splitPath : null,
    recent: Array.isArray(s.recent) ? s.recent : [],
    bookmarks: Array.isArray(s.bookmarks) ? s.bookmarks : [],
    leftPanel: ['files', 'search', 'tags', 'bookmarks'].includes(s.leftPanel) ? s.leftPanel : 'files',
    leftOpen: s.leftOpen !== false,
    rightOpen: s.rightOpen !== false,
    graphSettings:
      s.graphSettings && typeof s.graphSettings === 'object'
        ? { ...DEFAULT_GRAPH_SETTINGS, ...s.graphSettings }
        : DEFAULT_GRAPH_SETTINGS,
  });
}

/** When true, openFile/openGraph won't push a new history entry (we're replaying one). */
let navByHistory = false;

/** Push `path` onto the back/forward stack (truncating any forward entries). */
function pushHistory(s: { history: string[]; histIndex: number }, path: string): { history: string[]; histIndex: number } {
  if (navByHistory || s.history[s.histIndex] === path) {
    return { history: s.history, histIndex: s.histIndex };
  }
  let history = [...s.history.slice(0, s.histIndex + 1), path];
  if (history.length > 100) history = history.slice(history.length - 100);
  return { history, histIndex: history.length - 1 };
}

// Only start saving after the initial load; suppress while applying remote/initial state.
let canSave = false;
let suppressSave = false;
let saveTimer: number | undefined;
let lastSaved = '';

function scheduleSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const payload = pickPersisted(useStore.getState());
    const json = JSON.stringify(payload);
    if (json === lastSaved) return;
    lastSaved = json;
    api.putUiState(payload, CLIENT_ID).catch(() => {});
  }, 500);
}

export const useStore = create<AppState>()(
    (set, get) => ({
      authed: false,
      setAuthed: (v) => set({ authed: v }),

      tree: null,
      loadTree: async () => {
        const tree = await api.tree();
        set({ tree });
      },

      tabs: [],
      activePath: null,
      history: [],
      histIndex: -1,
      goBack: () => {
        const { history, histIndex } = get();
        if (histIndex <= 0) return;
        const target = history[histIndex - 1];
        navByHistory = true;
        set({ histIndex: histIndex - 1 });
        Promise.resolve(get().openFile(target))
          .catch(() => {})
          .finally(() => {
            navByHistory = false;
          });
      },
      goForward: () => {
        const { history, histIndex } = get();
        if (histIndex >= history.length - 1) return;
        const target = history[histIndex + 1];
        navByHistory = true;
        set({ histIndex: histIndex + 1 });
        Promise.resolve(get().openFile(target))
          .catch(() => {})
          .finally(() => {
            navByHistory = false;
          });
      },
      content: '',
      dirty: false,
      viewMode: 'live',
      setViewMode: (m) => set({ viewMode: m }),

      expanded: [],
      toggleFolder: (path) =>
        set((s) => ({
          expanded: s.expanded.includes(path)
            ? s.expanded.filter((p) => p !== path)
            : [...s.expanded, path],
        })),

      splitPath: null,
      splitContent: '',
      openToSide: async (path) => {
        if (!TEXT_RE.test(path)) return;
        const r = await api.read(path);
        set({ splitPath: path, splitContent: typeof r === 'string' ? r : r.content });
      },
      closeSplit: () => set({ splitPath: null, splitContent: '' }),

      recent: [],
      bookmarks: [],
      toggleBookmark: (path) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(path)
            ? s.bookmarks.filter((p) => p !== path)
            : [...s.bookmarks, path],
        })),

      leftPanel: 'files',
      setLeftPanel: (p) => set({ leftPanel: p, leftOpen: true }),
      searchQuery: '',
      searchFor: (q) => set({ searchQuery: q, leftPanel: 'search', leftOpen: true }),
      leftOpen: true,
      rightOpen: true,
      toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
      toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),

      paletteOpen: false,
      paletteMode: 'all',
      setPalette: (v, mode = 'all') => set({ paletteOpen: v, paletteMode: mode }),
      settingsOpen: false,
      setSettings: (v) => set({ settingsOpen: v }),
      setGraph: (v) => {
        if (v) get().openGraph();
        else get().closeTab(GRAPH_PATH);
      },
      openGraph: async () => {
        if (get().dirty) await get().save();
        set((s) => ({
          tabs: s.tabs.some((t) => t.path === GRAPH_PATH)
            ? s.tabs
            : [...s.tabs, { path: GRAPH_PATH, title: 'Graph view' }],
          activePath: GRAPH_PATH,
          content: '',
          dirty: false,
          ...pushHistory(s, GRAPH_PATH),
        }));
      },
      graphSettings: DEFAULT_GRAPH_SETTINGS,
      setGraphSettings: (patch) =>
        set((s) => ({ graphSettings: { ...s.graphSettings, ...patch } })),
      resetGraphSettings: () => set({ graphSettings: DEFAULT_GRAPH_SETTINGS }),

      contextMenu: null,
      openContextMenu: (m) => set({ contextMenu: m }),
      closeContextMenu: () => set({ contextMenu: null }),

      toast: '',
      notify: (msg) => {
        set({ toast: msg });
        window.setTimeout(() => set((s) => (s.toast === msg ? { toast: '' } : {})), 2500);
      },

      openFile: async (path) => {
        if (path === GRAPH_PATH) return get().openGraph();
        if (get().dirty) await get().save();
        let content = '';
        if (TEXT_RE.test(path)) {
          const r = await api.read(path);
          content = typeof r === 'string' ? r : r.content;
        }
        const title = path.split('/').pop() ?? path;
        set((s) => {
          const tabs = s.tabs.find((t) => t.path === path) ? s.tabs : [...s.tabs, { path, title }];
          const recent = [path, ...s.recent.filter((p) => p !== path)].slice(0, 20);
          return { tabs, activePath: path, content, dirty: false, recent, ...pushHistory(s, path) };
        });
      },

      openWikilink: async (target) => {
        try {
          const { path } = await api.resolve(target);
          if (path) await get().openFile(path);
          else {
            const newPath = target.endsWith('.md') ? target : `${target}.md`;
            await get().createNote(newPath, `# ${target.replace(/\.md$/, '')}\n`);
          }
        } catch {
          /* ignore */
        }
      },

      closeTab: (path) =>
        set((s) => {
          const tabs = s.tabs.filter((t) => t.path !== path);
          const wasActive = s.activePath === path;
          const activePath = wasActive ? (tabs.at(-1)?.path ?? null) : s.activePath;
          return { tabs, activePath, ...(wasActive ? { content: '', dirty: false } : {}) };
        }),

      setContent: (c) => set({ content: c, dirty: true }),

      save: async () => {
        const { activePath, content, dirty } = get();
        if (!activePath || !dirty) return;
        if (!TEXT_RE.test(activePath)) return;
        await api.write(activePath, content);
        set({ dirty: false });
      },

      createNote: async (path, body) => {
        await api.write(path, body ?? '');
        await get().loadTree();
        await get().openFile(path);
      },

      openDailyNote: async () => {
        const d = new Date();
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`;
        const path = `Daily/${iso}.md`;
        try {
          const { path: existing } = await api.resolve(iso);
          if (existing) {
            await get().openFile(existing);
            return;
          }
        } catch {
          /* none */
        }
        await get().createNote(path, `# ${iso}\n\n`);
        get().notify(`Daily note ${iso} ready`);
      },

      hydrate: async () => {
        // Active tab + split pane content aren't persisted (only the paths) —
        // re-read them from the vault after a reload. Drop tabs whose file is gone.
        const { activePath, splitPath, tabs } = get();
        if (activePath && TEXT_RE.test(activePath)) {
          try {
            const r = await api.read(activePath);
            set({ content: typeof r === 'string' ? r : r.content, dirty: false });
          } catch {
            set({
              tabs: tabs.filter((t) => t.path !== activePath),
              activePath: tabs.filter((t) => t.path !== activePath).at(-1)?.path ?? null,
              content: '',
            });
          }
        }
        if (splitPath && TEXT_RE.test(splitPath)) {
          try {
            const r = await api.read(splitPath);
            set({ splitContent: typeof r === 'string' ? r : r.content });
          } catch {
            set({ splitPath: null, splitContent: '' });
          }
        }
      },

      loadUiState: async () => {
        try {
          const s = await api.getUiState();
          suppressSave = true;
          applyPersisted(s, set);
          lastSaved = JSON.stringify(pickPersisted(get()));
          suppressSave = false;
        } catch {
          /* first run / not authed */
        }
        canSave = true;
        await get().hydrate();
      },

      applyRemoteState: async (state, originId) => {
        if (originId === CLIENT_ID) return; // ignore echo of our own change
        const prevActive = get().activePath;
        const prevSplit = get().splitPath;
        if (get().dirty) await get().save(); // don't lose local edits when switching
        suppressSave = true;
        applyPersisted(state, set);
        lastSaved = JSON.stringify(pickPersisted(get()));
        suppressSave = false;
        if (get().activePath !== prevActive || get().splitPath !== prevSplit) {
          await get().hydrate();
        }
      },
    }),
);

// Save durable workspace state to the server (debounced) whenever it changes.
useStore.subscribe((state, prev) => {
  if (!canSave || suppressSave) return;
  if (JSON.stringify(pickPersisted(state)) !== JSON.stringify(pickPersisted(prev))) {
    scheduleSave();
  }
});
