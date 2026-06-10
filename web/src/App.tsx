import { useEffect, useState } from 'react';
import { api, ApiError } from './lib/api';
import { useStore } from './lib/store';
import Login from './components/Login';
import Ribbon from './components/Ribbon';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import Workspace from './components/Workspace';
import CommandPalette from './components/CommandPalette';
import Settings from './components/Settings';
import ContextMenu from './components/ContextMenu';
import { loadPlugins } from './lib/plugins';
import { initUrlSync } from './lib/urlsync';

export default function App() {
  const authed = useStore((s) => s.authed);
  const setAuthed = useStore((s) => s.setAuthed);
  const loadTree = useStore((s) => s.loadTree);
  const leftOpen = useStore((s) => s.leftOpen);
  const rightOpen = useStore((s) => s.rightOpen);
  const setPalette = useStore((s) => s.setPalette);
  const save = useStore((s) => s.save);
  const toast = useStore((s) => s.toast);
  const [checking, setChecking] = useState(true);
  const [theme, setTheme] = useState<'theme-dark' | 'theme-light'>('theme-light');

  useEffect(() => {
    api
      .me()
      .then(() => setAuthed(true))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e);
      })
      .finally(() => setChecking(false));
  }, [setAuthed]);

  useEffect(() => {
    if (!authed) return;
    loadTree();
    // Deep link (/note/<path>) wins over the restored workspace's active note.
    const deepLink = initUrlSync();
    useStore
      .getState()
      .loadUiState() // restore workspace from server + open note(s)
      .then(() => {
        if (deepLink && deepLink !== useStore.getState().activePath) {
          return useStore.getState().openFile(deepLink);
        }
      })
      .catch(() => {});
    api
      .getSettings()
      .then((s) => setTheme(s?.ui?.theme === 'obsidian-dark' ? 'theme-dark' : 'theme-light'))
      .catch(() => {});
    loadPlugins().catch(() => {});
    // websocket live updates
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    let treeTimer: number | undefined;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'fs') {
          // coalesce bursts of fs events into a single tree refresh
          window.clearTimeout(treeTimer);
          treeTimer = window.setTimeout(() => loadTree(), 800);
        } else if (msg.type === 'uistate') {
          // another tab/device changed the workspace → sync live
          useStore.getState().applyRemoteState(msg.state, msg.originId);
        }
      } catch {
        /* ignore */
      }
    };
    return () => {
      window.clearTimeout(treeTimer);
      ws.close();
    };
  }, [authed, loadTree]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      const s = useStore.getState();
      if (k === 'p') { e.preventDefault(); setPalette(true, e.shiftKey ? 'commands' : 'commands'); }
      else if (k === 'o') { e.preventDefault(); setPalette(true, 'files'); }
      else if (k === 's') { e.preventDefault(); save(); }
      else if (k === 'n') { e.preventDefault();
        const n = prompt('Note name', 'Untitled.md');
        if (n) s.createNote(n.endsWith('.md') ? n : `${n}.md`, `# ${n.replace(/\.md$/, '')}\n`);
      }
      else if (k === 'e') { e.preventDefault(); s.setViewMode(s.viewMode === 'reading' ? 'live' : 'reading'); }
      else if (k === 'f' && e.shiftKey) { e.preventDefault(); s.setLeftPanel('search'); }
      else if (k === '\\') { e.preventDefault(); s.toggleLeft(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPalette, save]);

  if (checking) return <div className={theme} style={{ height: '100%' }} />;
  if (!authed) return <div className={theme}><Login onAuthed={() => setAuthed(true)} /></div>;

  return (
    <div className={theme}>
      <div className={`app ${leftOpen ? '' : 'left-closed'} ${rightOpen ? '' : 'right-closed'}`}>
        <Ribbon onTheme={() => setTheme((t) => (t === 'theme-dark' ? 'theme-light' : 'theme-dark'))} />
        {leftOpen && <Sidebar />}
        <Workspace />
        {rightOpen && <RightSidebar />}
      </div>
      <CommandPalette />
      <Settings />
      <ContextMenu />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
