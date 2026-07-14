import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import Icon from './Icon';
import FolderBrowser from './FolderBrowser';

/**
 * Non-secret login-screen fields autofillable via URL query args (e.g.
 * `?vaultPath=/mnt/vaults/foo`), for scripted/automated setups. The password
 * field is deliberately never read from the URL — query strings are logged
 * by reverse proxies/CDNs and linger in browser history, so a URL-fillable
 * password would leak credentials in ways a manually-typed one doesn't.
 */
function vaultPathFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const vaultPath = params.get('vaultPath') ?? '';
  if (vaultPath) {
    params.delete('vaultPath');
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
  }
  return vaultPath;
}

export default function Login({ onAuthed }: { onAuthed: () => void }) {
  const setMustChangePassword = useStore((s) => s.setMustChangePassword);
  const [needSetup, setNeedSetup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [vaultPath, setVaultPath] = useState(() => vaultPathFromUrl());
  const [showBrowser, setShowBrowser] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.authStatus().then((s) => setNeedSetup(!s.passwordSet)).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (needSetup && password !== confirm) {
      setErr('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      if (needSetup) {
        await api.setup(password, vaultPath || undefined);
        setMustChangePassword(false); // a freshly-set password is already custom
      } else {
        const r = await api.login(password, vaultPath || undefined);
        setMustChangePassword(Boolean(r.mustChangePassword));
      }
      onAuthed();
    } catch (e: any) {
      setErr(e.message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">
          <Icon name="gem" size={40} />
        </div>
        <h1>WebObsidian</h1>
        <p>{needSetup ? 'Set a master password to secure your vault' : 'Enter your password to unlock'}</p>
        <div className="err">{err}</div>
        <input
          className="text-input"
          type="password"
          placeholder="Password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {needSetup && (
          <input
            className="text-input"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
        <input
          className="text-input"
          type="text"
          placeholder="Vault folder path (optional)"
          value={vaultPath}
          onChange={(e) => setVaultPath(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn secondary" onClick={() => setShowBrowser((v) => !v)}>
            Browse…
          </button>
        </div>
        {showBrowser && (
          <FolderBrowser
            browse={api.authBrowse}
            onSelect={(path) => {
              setVaultPath(path);
              setShowBrowser(false);
            }}
          />
        )}
        <button className="btn" type="submit" disabled={busy}>
          {needSetup ? 'Create & Unlock' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
