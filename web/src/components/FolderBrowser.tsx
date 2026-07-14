import { useState } from 'react';
import Icon from './Icon';

interface BrowseResult {
  dir: string;
  parent: string;
  folders: { name: string; path: string }[];
}

/**
 * Folder picker shared by Settings → Vault path (post-auth, `api.browse`) and
 * the login screen's vault picker (pre-auth, `api.authBrowse`) — same UI,
 * different transport depending on whether there's a session yet.
 */
export default function FolderBrowser({
  browse,
  onSelect,
}: {
  browse: (dir?: string) => Promise<BrowseResult>;
  onSelect: (path: string) => void;
}) {
  const [state, setState] = useState<{ ok: true; result: BrowseResult } | { ok: false; error: string } | null>(null);

  const go = async (dir?: string) => {
    try {
      setState({ ok: true, result: await browse(dir) });
    } catch (e: any) {
      setState({ ok: false, error: e.message ?? 'Browse failed' });
    }
  };

  if (!state) {
    return (
      <button type="button" className="btn secondary" onClick={() => go()}>
        Browse…
      </button>
    );
  }

  if (!state.ok) {
    return <div style={{ color: '#e5534b' }}>{state.error}</div>;
  }
  const { dir, parent, folders } = state.result;

  return (
    <div style={{ border: '1px solid var(--bg-modifier-border)', borderRadius: 6, padding: 8, marginTop: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{dir}</div>
      <div className="result" onClick={() => go(parent)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="folder" size={15} /> ..
      </div>
      {folders.map((f) => (
        <div
          className="result"
          key={f.path}
          onClick={() => go(f.path)}
          onDoubleClick={() => onSelect(f.path)}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Icon name="folder" size={15} /> {f.name}
          <button
            type="button"
            className="btn secondary"
            style={{ float: 'right', padding: '2px 8px' }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(f.path);
            }}
          >
            Select
          </button>
        </div>
      ))}
    </div>
  );
}
