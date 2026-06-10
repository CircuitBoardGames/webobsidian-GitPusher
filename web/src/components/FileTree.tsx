import { useState } from 'react';
import { useStore } from '../lib/store';
import { api, type TreeNode } from '../lib/api';
import Icon from './Icon';

function fileIcon(node: TreeNode): string | null {
  const ext = node.ext ?? '';
  if (/\.(md|markdown)$/.test(ext)) return null; // markdown: text only, like Obsidian
  if (/\.(png|jpe?g|gif|svg|webp)$/.test(ext)) return 'image';
  if (ext === '.pdf') return 'file-pdf';
  return 'paperclip';
}

function parentDir(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

function Node({ node, depth }: { node: TreeNode; depth: number }) {
  const expanded = useStore((s) => s.expanded);
  const toggleFolder = useStore((s) => s.toggleFolder);
  const open = expanded.includes(node.path); // persisted across reloads
  const [dropping, setDropping] = useState(false);
  const activePath = useStore((s) => s.activePath);
  const openFile = useStore((s) => s.openFile);
  const openToSide = useStore((s) => s.openToSide);
  const loadTree = useStore((s) => s.loadTree);
  const closeTab = useStore((s) => s.closeTab);
  const openContextMenu = useStore((s) => s.openContextMenu);
  const createNote = useStore((s) => s.createNote);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const bookmarks = useStore((s) => s.bookmarks);
  const notify = useStore((s) => s.notify);

  const isFolder = node.type === 'folder';

  const doRename = async () => {
    const to = prompt('Rename / move to (vault-relative path):', node.path);
    if (to && to !== node.path) {
      await api.rename(node.path, to);
      closeTab(node.path);
      await loadTree();
    }
  };
  const doDelete = async () => {
    if (confirm(`Move "${node.name}" to trash?`)) {
      await api.remove(node.path);
      closeTab(node.path);
      await loadTree();
      notify('Moved to trash');
    }
  };

  const doCopy = async () => {
    const r = await api.read(node.path).catch(() => null);
    if (!r) return;
    const content = typeof r === 'string' ? r : r.content;
    const dot = node.path.lastIndexOf('.');
    const copyPath = dot > 0 ? `${node.path.slice(0, dot)} copy${node.path.slice(dot)}` : `${node.path} copy`;
    await api.write(copyPath, content);
    await loadTree();
    notify('Made a copy');
  };
  const doMove = async () => {
    const dir = prompt('Move to folder (vault-relative, blank = root):', parentDir(node.path));
    if (dir === null) return;
    const base = node.path.split('/').pop()!;
    const to = dir ? `${dir.replace(/\/$/, '')}/${base}` : base;
    if (to !== node.path) {
      await api.rename(node.path, to);
      closeTab(node.path);
      await loadTree();
    }
  };
  const copyPath = () => {
    navigator.clipboard?.writeText(node.path).catch(() => {});
    notify('Path copied');
  };
  const sharePublic = async () => {
    try {
      const { share } = await api.createShare(node.path);
      await navigator.clipboard?.writeText(`${location.origin}/share/${share.id}`);
      notify('Public link copied');
    } catch (e: any) {
      notify(`Share failed: ${e.message}`);
    }
  };

  const onContext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const items = isFolder
      ? [
          { label: 'New note', onClick: async () => {
              const n = prompt('Note name', 'Untitled.md');
              if (n) await createNote(`${node.path}/${n.endsWith('.md') ? n : n + '.md'}`, `# ${n.replace(/\.md$/, '')}\n`);
            } },
          { label: 'New folder', onClick: async () => {
              const n = prompt('Folder name', 'Folder');
              if (n) { await api.createFolder(`${node.path}/${n}`); await loadTree(); }
            } },
          { label: '', separator: true },
          { label: 'Rename…', onClick: doRename },
          { label: 'Move folder to…', onClick: doMove },
          { label: 'Copy path', onClick: copyPath },
          { label: '', separator: true },
          { label: 'Delete', danger: true, onClick: doDelete },
        ]
      : [
          { label: 'Open', onClick: () => openFile(node.path) },
          { label: 'Open to the right', onClick: () => openToSide(node.path) },
          { label: '', separator: true },
          { label: bookmarks.includes(node.path) ? 'Remove bookmark' : 'Bookmark', onClick: () => toggleBookmark(node.path) },
          ...(/\.(md|markdown)$/i.test(node.path)
            ? [{ label: 'Copy public link', icon: 'link', onClick: sharePublic }]
            : []),
          { label: 'Make a copy', onClick: doCopy },
          { label: 'Rename…', onClick: doRename },
          { label: 'Move file to…', onClick: doMove },
          { label: 'Copy path', onClick: copyPath },
          { label: '', separator: true },
          { label: 'Delete', danger: true, onClick: doDelete },
        ];
    openContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/wo-path', node.path);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropping(false);
    const from = e.dataTransfer.getData('text/wo-path');
    const targetDir = isFolder ? node.path : parentDir(node.path);
    if (!from || from === targetDir) return;
    const base = from.split('/').pop()!;
    const to = targetDir ? `${targetDir}/${base}` : base;
    if (to === from) return;
    await api.rename(from, to).catch((err) => notify(err.message));
    closeTab(from);
    await loadTree();
  };

  if (isFolder) {
    return (
      <div className="tree-item">
        <div
          className={`tree-row folder ${dropping ? 'drop-target' : ''}`}
          onClick={() => toggleFolder(node.path)}
          onContextMenu={onContext}
          onDragOver={(e) => { e.preventDefault(); setDropping(true); }}
          onDragLeave={() => setDropping(false)}
          onDrop={onDrop}
        >
          <span className="twisty">
            <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
          </span>
          <span className="name">{node.name}</span>
        </div>
        {open && (
          <div className="tree-children">
            {(node.children ?? []).map((c) => (
              <Node key={c.path} node={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const fi = fileIcon(node);
  return (
    <div className="tree-item">
      <div
        className={`tree-row ${activePath === node.path ? 'active' : ''}`}
        draggable
        onDragStart={onDragStart}
        onClick={() => openFile(node.path)}
        onContextMenu={onContext}
        title={node.path}
      >
        <span className="twisty leaf" />
        {fi && <span className="twisty"><Icon name={fi} size={14} /></span>}
        <span className="name">{node.name.replace(/\.(md|markdown)$/, '')}</span>
        {bookmarks.includes(node.path) && <Icon name="bookmark" size={12} className="bm-star" />}
      </div>
    </div>
  );
}

export default function FileTree() {
  const tree = useStore((s) => s.tree);
  const loadTree = useStore((s) => s.loadTree);
  const notify = useStore((s) => s.notify);

  const onRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const from = e.dataTransfer.getData('text/wo-path');
    if (!from || !from.includes('/')) return;
    const base = from.split('/').pop()!;
    await api.rename(from, base).catch((err) => notify(err.message));
    await loadTree();
  };

  if (!tree) return <div style={{ padding: 12, color: 'var(--text-faint)' }}>Loading…</div>;
  if (!tree.children?.length)
    return <div style={{ padding: 12, color: 'var(--text-faint)' }}>Vault is empty.</div>;
  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={onRootDrop} style={{ minHeight: '100%' }}>
      {tree.children.map((c) => (
        <Node key={c.path} node={c} depth={0} />
      ))}
    </div>
  );
}
