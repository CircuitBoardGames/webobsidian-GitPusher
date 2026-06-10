import { useStore, GRAPH_PATH } from '../lib/store';
import { api } from '../lib/api';
import Editor from './Editor';
import Preview from './Preview';
import GraphView from './GraphView';
import Icon from './Icon';
import StatusBar from './StatusBar';

function EditorPane() {
  const activePath = useStore((s) => s.activePath);
  const viewMode = useStore((s) => s.viewMode);
  const isMd = activePath ? /\.(md|markdown)$/i.test(activePath) : false;
  const isImage = activePath ? /\.(png|jpe?g|gif|svg|webp)$/i.test(activePath) : false;

  if (activePath && isImage) {
    return (
      <div className="markdown-preview">
        <div className="preview-inner">
          <img src={api.rawUrl(activePath)} alt={activePath} />
        </div>
      </div>
    );
  }
  if (activePath && isMd && viewMode === 'reading') return <Preview />;
  return <Editor />;
}

export default function Workspace() {
  const tabs = useStore((s) => s.tabs);
  const activePath = useStore((s) => s.activePath);
  const openFile = useStore((s) => s.openFile);
  const closeTab = useStore((s) => s.closeTab);
  const dirty = useStore((s) => s.dirty);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const bookmarks = useStore((s) => s.bookmarks);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const openToSide = useStore((s) => s.openToSide);
  const splitPath = useStore((s) => s.splitPath);
  const splitContent = useStore((s) => s.splitContent);
  const closeSplit = useStore((s) => s.closeSplit);
  const content = useStore((s) => s.content);
  const setContent = useStore((s) => s.setContent);
  const notify = useStore((s) => s.notify);
  const toggleLeft = useStore((s) => s.toggleLeft);
  const toggleRight = useStore((s) => s.toggleRight);
  const createNote = useStore((s) => s.createNote);
  const goBack = useStore((s) => s.goBack);
  const goForward = useStore((s) => s.goForward);
  const histIndex = useStore((s) => s.histIndex);
  const historyLen = useStore((s) => s.history.length);
  const canGoBack = histIndex > 0;
  const canGoForward = histIndex < historyLen - 1;

  const isMd = activePath ? /\.(md|markdown)$/i.test(activePath) : false;

  // Paste / drop image → upload to attachments and insert an embed.
  const handleFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const { path } = await api.upload(file);
        setContent(`${content}\n![[${path}]]\n`);
        notify(`Inserted ${path}`);
      } catch (e: any) {
        notify(e.message);
      }
    }
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (imgs.length) {
      e.preventDefault();
      handleFiles(imgs);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.files.length) {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="workspace" onPaste={onPaste} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <div className="tab-bar">
        <span className="tab-new" title="Toggle left sidebar (⌘\)" onClick={toggleLeft}>
          <Icon name="panel-left" size={16} />
        </span>
        {tabs.map((t) => (
          <div
            key={t.path}
            className={`tab ${activePath === t.path ? 'active' : ''}`}
            onClick={() => openFile(t.path)}
            onAuxClick={(e) => e.button === 1 && closeTab(t.path)}
            title={t.path}
          >
            {t.path === GRAPH_PATH && (
              <Icon name="graph" size={13} style={{ marginRight: 4, flexShrink: 0 }} />
            )}
            <span className="title">{t.title.replace(/\.(md|markdown)$/, '')}</span>
            {dirty && activePath === t.path ? (
              <span className="dot">●</span>
            ) : (
              <span
                className="close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.path);
                }}
              >
                <Icon name="x" size={14} />
              </span>
            )}
          </div>
        ))}
        <span
          className="tab-new"
          title="New note (⌘N)"
          onClick={async () => {
            const n = prompt('Note name', 'Untitled.md');
            if (n) await createNote(n.endsWith('.md') ? n : `${n}.md`, `# ${n.replace(/\.md$/, '')}\n`);
          }}
        >
          <Icon name="plus" size={16} />
        </span>
        <span className="grow" style={{ flex: 1 }} />
        <span className="tab-new" title="Toggle right sidebar" onClick={toggleRight}>
          <Icon name="panel-right" size={16} />
        </span>
      </div>

      {activePath && (
        <div className="view-header">
          <button className="tool-btn" title="Back" disabled={!canGoBack} onClick={goBack}>
            <Icon name="arrow-left" size={18} />
          </button>
          <button className="tool-btn" title="Forward" disabled={!canGoForward} onClick={goForward}>
            <Icon name="arrow-right" size={18} />
          </button>
          <span className="grow" />
          <span className="crumbs">
            {activePath === GRAPH_PATH
              ? 'Graph view'
              : activePath.split('/').map((seg, i) => (
                  <span key={i}>
                    {i > 0 && <span className="sep">/</span>}
                    {seg.replace(/\.(md|markdown)$/, '')}
                  </span>
                ))}
          </span>
          <span className="grow" />
          {isMd && (
            <>
              <button className={`tool-btn ${bookmarks.includes(activePath) ? 'active' : ''}`} title="Bookmark" onClick={() => toggleBookmark(activePath)}>
                <Icon name="bookmark" size={16} />
              </button>
              <button className="tool-btn" title="Open to the right" onClick={() => openToSide(activePath)}>
                <Icon name="columns" size={16} />
              </button>
              <div className="seg">
                <button className={viewMode === 'source' ? 'active' : ''} onClick={() => setViewMode('source')} title="Source">
                  Source
                </button>
                <button className={viewMode === 'live' ? 'active' : ''} onClick={() => setViewMode('live')} title="Live preview">
                  Live
                </button>
                <button className={viewMode === 'reading' ? 'active' : ''} onClick={() => setViewMode('reading')} title="Reading">
                  Reading
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="editor-area">
        {!activePath && (
          <div className="empty-state">
            <div>
              <div className="big">
                <Icon name="file-text" size={48} />
              </div>
              <p>No file is open — pick a note, or press ⌘O</p>
            </div>
          </div>
        )}
        {activePath === GRAPH_PATH && (
          <div className="pane main-pane">
            <GraphView />
          </div>
        )}
        {activePath && activePath !== GRAPH_PATH && (
          <div className="pane main-pane">
            <EditorPane />
          </div>
        )}
        {splitPath && (
          <div className="pane split-pane">
            <div className="split-head">
              <span className="crumbs">{splitPath}</span>
              <span className="grow" />
              <button className="tool-btn" onClick={closeSplit} title="Close split">
                <Icon name="x" size={16} />
              </button>
            </div>
            <Preview source={splitContent} />
          </div>
        )}
      </div>
      <StatusBar />
    </div>
  );
}
