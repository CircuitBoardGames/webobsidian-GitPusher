import { promises as fs } from 'node:fs';
import path from 'node:path';
import { simpleGit, type SimpleGit, type StatusResult } from 'simple-git';
import { getSettings } from './settings.js';
import { getVaultRoot } from './vault.js';

/** GitHub-native sync with Git LFS support (PRD FR-4). */

export interface GitStatus {
  enabled: boolean;
  isRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  notAdded: number;
  conflicted: string[];
  lfsAvailable: boolean;
  remote: string;
  clean: boolean;
}

async function git(): Promise<SimpleGit> {
  const root = await getVaultRoot();
  await fs.mkdir(root, { recursive: true });
  return simpleGit({ baseDir: root, trimmed: true });
}

/** Compose an authenticated remote URL from settings (PAT embedded). */
async function authedRemote(): Promise<string> {
  const s = await getSettings();
  const url = s.git.remote.trim();
  if (!url) return '';
  if (s.git.token && url.startsWith('https://')) {
    // https://<token>@github.com/owner/repo.git
    const without = url.replace(/^https:\/\//, '');
    if (without.includes('@')) return url; // already has creds
    return `https://${s.git.token}@${without}`;
  }
  return url;
}

async function isRepo(g: SimpleGit): Promise<boolean> {
  try {
    return await g.checkIsRepo();
  } catch {
    return false;
  }
}

export async function lfsAvailable(): Promise<boolean> {
  try {
    const g = await git();
    await g.raw(['lfs', 'version']);
    return true;
  } catch {
    return false;
  }
}

async function configureIdentity(g: SimpleGit): Promise<void> {
  const s = await getSettings();
  await g.addConfig('user.name', s.git.authorName || 'WebObsidian');
  await g.addConfig('user.email', s.git.authorEmail || 'webobsidian@localhost');
}

/** Write/refresh .gitattributes so LFS patterns are tracked. */
export async function ensureLfsAttributes(): Promise<void> {
  const s = await getSettings();
  if (!s.git.lfsPatterns.length) return;
  const root = await getVaultRoot();
  const file = path.join(root, '.gitattributes');
  let existing = '';
  try {
    existing = await fs.readFile(file, 'utf8');
  } catch {
    /* none */
  }
  const lines = new Set(existing.split('\n').map((l) => l.trim()).filter(Boolean));
  for (const p of s.git.lfsPatterns) {
    lines.add(`${p} filter=lfs diff=lfs merge=lfs -text`);
  }
  await fs.writeFile(file, [...lines].join('\n') + '\n');

  if (await lfsAvailable()) {
    const g = await git();
    try {
      await g.raw(['lfs', 'install', '--local']);
      await g.raw(['lfs', 'track', ...s.git.lfsPatterns]);
    } catch {
      /* lfs track best-effort */
    }
  }
}

export async function init(): Promise<void> {
  const g = await git();
  const s = await getSettings();
  if (!(await isRepo(g))) {
    await g.init();
    await g.checkoutLocalBranch(s.git.branch || 'main').catch(() => {});
  }
  await configureIdentity(g);
  const remote = await authedRemote();
  if (remote) {
    const remotes = await g.getRemotes(true);
    if (remotes.find((r) => r.name === 'origin')) {
      await g.remote(['set-url', 'origin', remote]);
    } else {
      await g.addRemote('origin', remote);
    }
  }
  await ensureLfsAttributes();
}

/** Clone the configured remote into the (empty) vault dir. */
export async function clone(): Promise<void> {
  const s = await getSettings();
  const remote = await authedRemote();
  if (!remote) throw new Error('No remote configured');
  const root = await getVaultRoot();
  const entries = await fs.readdir(root).catch(() => []);
  if (entries.filter((e) => e !== '.git').length > 0) {
    throw new Error('Vault directory not empty; cannot clone into it');
  }
  const g = simpleGit();
  await g.clone(remote, root, ['--branch', s.git.branch || 'main']);
  const gv = await git();
  await configureIdentity(gv);
  if (await lfsAvailable()) await gv.raw(['lfs', 'pull']).catch(() => {});
}

export async function status(): Promise<GitStatus> {
  const s = await getSettings();
  const g = await git();
  const repo = await isRepo(g);
  if (!repo) {
    return {
      enabled: s.git.enabled,
      isRepo: false,
      branch: s.git.branch,
      ahead: 0,
      behind: 0,
      staged: 0,
      modified: 0,
      notAdded: 0,
      conflicted: [],
      lfsAvailable: await lfsAvailable(),
      remote: s.git.remote,
      clean: true,
    };
  }
  const st = await g.status();
  return {
    enabled: s.git.enabled,
    isRepo: true,
    branch: st.current ?? s.git.branch,
    ahead: st.ahead,
    behind: st.behind,
    staged: st.staged.length,
    modified: st.modified.length,
    notAdded: st.not_added.length,
    conflicted: st.conflicted,
    lfsAvailable: await lfsAvailable(),
    remote: s.git.remote,
    clean: st.isClean(),
  };
}

export async function pull(): Promise<string> {
  const g = await git();
  await ensureLfsAttributes();
  const s = await getSettings();
  // `--allow-unrelated-histories`: a vault that was `git init`'d locally and a
  // remote that already has commits have no common ancestor; without this, the
  // first pull aborts with "refusing to merge unrelated histories" and sync can
  // never converge. Harmless (no-op) once the histories share a base.
  const res = await g.pull('origin', s.git.branch || 'main', {
    '--no-rebase': null,
    '--allow-unrelated-histories': null,
  });
  if (await lfsAvailable()) await g.raw(['lfs', 'pull']).catch(() => {});
  return `Pulled: ${res.summary.changes} changes, +${res.summary.insertions}/-${res.summary.deletions}`;
}

/**
 * Build a human-readable commit message from what `git add .` staged, so the
 * vault history (and the Version History UI) shows exactly which notes synced
 * instead of a generic "WebObsidian auto-sync". Returns a one-line subject that
 * names the notes plus a body listing every changed path grouped by kind.
 */
export function describeChanges(st: StatusResult): { subject: string; body: string } {
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const renamed: string[] = [];
  for (const f of st.files) {
    // `index` is the staged status; fall back to working-tree status. '?' = new
    // untracked file (becomes 'A' after add, but be defensive), 'C' = copied.
    const x = (f.index?.trim() || f.working_dir?.trim() || '').toUpperCase();
    if (x === 'A' || x === '?' || x === 'C') added.push(f.path);
    else if (x === 'D') deleted.push(f.path);
    else if (x === 'R') renamed.push(f.path);
    else modified.push(f.path);
  }
  const all = [...added, ...modified, ...deleted, ...renamed];
  const total = all.length;
  // Display name: basename without the .md extension (notes read best that way).
  const name = (p: string) => (p.split('/').pop() || p).replace(/\.md$/i, '');

  let subject: string;
  if (total === 0) {
    subject = 'Vault sync';
  } else if (total === 1) {
    const verb = added.length ? 'Add' : deleted.length ? 'Delete' : renamed.length ? 'Rename' : 'Update';
    subject = `${verb} ${name(all[0])}`;
  } else {
    const counts = [
      added.length && `${added.length} new`,
      modified.length && `${modified.length} edited`,
      deleted.length && `${deleted.length} deleted`,
      renamed.length && `${renamed.length} renamed`,
    ].filter(Boolean).join(', ');
    const names = all.slice(0, 3).map(name).join(', ');
    const more = total > 3 ? ` +${total - 3} more` : '';
    subject = `Sync ${total} notes (${counts}): ${names}${more}`;
  }
  // Keep the subject a sane git title length.
  if (subject.length > 72) subject = subject.slice(0, 71) + '…';

  const section = (label: string, arr: string[]): string => {
    if (!arr.length) return '';
    const CAP = 100;
    const lines = arr.slice(0, CAP).map((p) => `  ${p}`);
    if (arr.length > CAP) lines.push(`  …and ${arr.length - CAP} more`);
    return `${label} (${arr.length}):\n${lines.join('\n')}`;
  };
  const body = [
    section('Added', added),
    section('Modified', modified),
    section('Deleted', deleted),
    section('Renamed', renamed),
  ].filter(Boolean).join('\n\n');

  return { subject, body };
}

export async function commitAll(message?: string): Promise<string> {
  const g = await git();
  await configureIdentity(g);
  await ensureLfsAttributes();
  await g.add('.');
  const st = await g.status();
  if (st.staged.length === 0 && st.isClean()) return 'Nothing to commit';
  const { subject, body } = describeChanges(st);
  // A caller-supplied message (e.g. a manual commit with a typed message) wins
  // as the subject; otherwise auto-derive one naming the notes. The file list
  // always goes in the body so `git log` shows precisely what was synced.
  const finalSubject = message?.trim() || subject;
  const full = body ? `${finalSubject}\n\n${body}` : finalSubject;
  const res = await g.commit(full);
  return `Committed ${res.commit || ''} (${res.summary.changes} files): ${finalSubject}`;
}

export async function push(): Promise<string> {
  const g = await git();
  const s = await getSettings();
  const remote = await authedRemote();
  if (remote) await g.remote(['set-url', 'origin', remote]);
  await g.push('origin', s.git.branch || 'main', ['--set-upstream']);
  return 'Pushed to origin';
}

// Debounced auto-commit (+push) after saves, when enabled in settings.
let autoCommitTimer: NodeJS.Timeout | null = null;
export function scheduleAutoCommitOnSave(): void {
  if (autoCommitTimer) clearTimeout(autoCommitTimer);
  autoCommitTimer = setTimeout(async () => {
    try {
      const s = await getSettings();
      if (!s.git.enabled || !s.git.autoCommitOnSave) return;
      await commitAll();
      if (s.git.remote) await push().catch(() => {});
    } catch (e: any) {
      console.warn('[git] auto-commit failed:', e.message);
    }
  }, 5000);
}

/** Convenience: stage+commit+pull+push in one go. Reports conflicts. */
export async function sync(message?: string): Promise<{ ok: boolean; log: string[] }> {
  const log: string[] = [];
  const g = await git();
  if (!(await isRepo(g))) {
    await init();
    log.push('Initialized repository');
  }
  log.push(await commitAll(message || ''));
  try {
    log.push(await pull());
  } catch (e: any) {
    const st = await g.status();
    if (st.conflicted.length) {
      return { ok: false, log: [...log, `Conflicts: ${st.conflicted.join(', ')}`] };
    }
    log.push(`Pull skipped: ${e.message}`);
  }
  try {
    log.push(await push());
  } catch (e: any) {
    log.push(`Push failed: ${e.message}`);
    return { ok: false, log };
  }
  return { ok: true, log };
}
