import { Router } from 'express';
import path from 'node:path';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getSettings,
  updateSettings,
  redactSettings,
  ensureVaultBrowsable,
  assertVaultPathAllowed,
  browseFolder,
} from '../services/settings.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(redactSettings(await getSettings()));
  }),
);

// Patch a subset of settings. Secret fields are only overwritten when present.
settingsRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    // A changed vault.path turns the whole files API into read/write over that
    // tree, so constrain it to the allowed roots (same gate as Browse…) and
    // require it to be an existing directory before persisting.
    if (body.vault && typeof body.vault.path === 'string' && body.vault.path) {
      await assertVaultPathAllowed(body.vault);
    }
    const updated = await updateSettings((d) => {
      if (body.vault) {
        Object.assign(d.vault, sanitizeVault(body.vault));
        ensureVaultBrowsable(d);
      }
      if (body.git) {
        const { token, ...rest } = body.git;
        Object.assign(d.git, rest);
        if (typeof token === 'string' && token && token !== '••••••••') d.git.token = token;
      }
      if (body.search) Object.assign(d.search, body.search);
      if (body.ui) Object.assign(d.ui, body.ui);
      if (body.api && typeof body.api.rateLimitPerMin === 'number') {
        d.api.rateLimitPerMin = body.api.rateLimitPerMin;
      }
    });
    res.json(redactSettings(updated));
  }),
);

function sanitizeVault(v: any) {
  const out: any = {};
  if (typeof v.path === 'string') out.path = v.path;
  if (typeof v.trash === 'string') out.trash = v.trash;
  if (v.deleteMode === 'trash' || v.deleteMode === 'permanent') out.deleteMode = v.deleteMode;
  if (typeof v.attachmentDir === 'string') out.attachmentDir = v.attachmentDir;
  if (Array.isArray(v.allowedRoots)) {
    // allowedRoots is the gate for vault.path / Browse, so keep it well-formed:
    // only non-empty strings, normalised to absolute paths. Drops anything else
    // instead of persisting garbage (objects/numbers) that later crash path.* .
    out.allowedRoots = v.allowedRoots
      .filter((r: unknown): r is string => typeof r === 'string' && r.trim() !== '')
      .map((r: string) => path.resolve(r));
  }
  return out;
}

/** Safe folder browser for picking a vault path, limited to allowed roots. */
settingsRouter.get(
  '/browse',
  asyncHandler(async (req, res) => {
    res.json(await browseFolder(req.query.dir ? String(req.query.dir) : undefined));
  }),
);
