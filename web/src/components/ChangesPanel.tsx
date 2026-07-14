import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Icon from './Icon';

/**
 * Floating "pending changes" badge + panel: lists what's changed in the vault
 * since the last commit, and offers the two ways to get those changes out —
 * open a GitHub pull request (when git sync is configured against a
 * github.com remote) or download the whole vault as a zip (always available,
 * the only option for a local-only vault with no git remote).
 */
export default function ChangesPanel() {
  const [status, setStatus] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; url?: string } | null>(null);

  const refresh = () => api.gitStatus().then(setStatus).catch(() => {});
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;
  const pending = status.isRepo ? status.modified + status.notAdded + status.staged : 0;
  const canPR = status.enabled && status.githubRemote;

  const createPR = async () => {
    setBusy(true);
    setResult(null);
    try {
      const pr = await api.gitPullRequest(title.trim() || 'WebObsidian changes');
      setResult({ ok: true, text: `Opened PR #${pr.number}`, url: pr.url });
      setTitle('');
      refresh();
    } catch (e: any) {
      setResult({ ok: false, text: e.message ?? 'Failed to open pull request' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className="btn secondary"
        style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 500, borderRadius: 20 }}
        onClick={() => setOpen((v) => !v)}
      >
        {pending > 0 ? `Changes (${pending})` : 'Changes'}
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 56,
            zIndex: 500,
            width: 320,
            maxHeight: '60vh',
            overflow: 'auto',
            background: 'var(--bg-primary)',
            border: '1px solid var(--bg-modifier-border)',
            borderRadius: 10,
            padding: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,.4)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Changes</strong>
            <button className="nav-action" onClick={() => setOpen(false)}>
              <Icon name="x" size={14} />
            </button>
          </div>

          {status.isRepo ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {pending > 0
                ? `${status.notAdded} new, ${status.modified} modified, ${status.staged} staged on ${status.branch}`
                : 'No pending changes.'}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Not a git repository — download is the only way to get files out.
            </div>
          )}

          {canPR && (
            <>
              <textarea
                className="text-input"
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }}
                placeholder="Pull request title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button className="btn" style={{ width: '100%' }} onClick={createPR} disabled={busy || pending === 0}>
                {busy ? 'Creating…' : 'Create Pull Request'}
              </button>
            </>
          )}

          <a
            className="btn secondary"
            style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', marginTop: 8, display: 'block' }}
            href={api.exportUrl()}
            download
          >
            Download vault (.zip)
          </a>

          {result && (
            <div style={{ marginTop: 8, fontSize: 11, color: result.ok ? 'var(--text-normal)' : '#e5534b' }}>
              {result.url ? (
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  {result.text}
                </a>
              ) : (
                result.text
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
