import { Router, type Request } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { COOKIE_NAME, requireAuth } from '../middleware/auth.js';
import {
  isPasswordSet,
  hasCustomPassword,
  setUserPassword,
  checkPassword,
  changePassword,
  issueToken,
  MIN_PASSWORD_LEN,
} from '../services/auth.js';
import { loginRateLimit } from '../middleware/ratelimit.js';
import { updateSettings, ensureVaultBrowsable, assertVaultPathAllowed, browseFolder } from '../services/settings.js';

export const authRouter = Router();

/**
 * If the login/setup form supplied a vault path, switch the server's (single)
 * active vault to it before completing auth — same containment check as the
 * post-auth Settings picker. No-ops when vaultPath is absent/blank so normal
 * password-only login is unaffected.
 */
async function applyVaultPathIfProvided(vaultPath: unknown): Promise<void> {
  if (typeof vaultPath !== 'string' || !vaultPath.trim()) return;
  await assertVaultPathAllowed({ path: vaultPath });
  await updateSettings((d) => {
    d.vault.path = vaultPath;
    ensureVaultBrowsable(d);
  });
}

// A `Secure` cookie is silently dropped by browsers over plain http://, so tying
// it to NODE_ENV broke HTTP-only self-hosting (every API call 401'd → blank UI).
// Default 'auto' = match the request's actual transport (honours X-Forwarded-Proto
// via `trust proxy`); set COOKIE_SECURE=true/false to force.
const COOKIE_SECURE = (process.env.COOKIE_SECURE ?? 'auto').toLowerCase();

function cookieOpts(req: Request) {
  const secure =
    COOKIE_SECURE === 'true' ? true : COOKIE_SECURE === 'false' ? false : req.secure;
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

authRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    // mustChangePassword=true ⇒ still on the default 123456; the UI forces a change.
    res.json({ passwordSet: await isPasswordSet(), mustChangePassword: !(await hasCustomPassword()) });
  }),
);

authRouter.post(
  '/setup',
  asyncHandler(async (req, res) => {
    if (await isPasswordSet()) {
      res.status(409).json({ error: 'Password already set' });
      return;
    }
    const { password, vaultPath } = req.body ?? {};
    if (typeof password !== 'string') {
      res.status(400).json({ error: 'password required' });
      return;
    }
    await applyVaultPathIfProvided(vaultPath);
    await setUserPassword(password);
    const token = await issueToken();
    res.cookie(COOKIE_NAME, token, cookieOpts(req)).json({ ok: true });
  }),
);

/** Safe folder browser for the login screen's vault picker — pre-auth by
 * necessity (there's no session yet to gate on), scoped to the same
 * ALLOWED_ROOTS containment check as the post-auth Settings browser. */
authRouter.get(
  '/browse',
  asyncHandler(async (req, res) => {
    res.json(await browseFolder(req.query.dir ? String(req.query.dir) : undefined));
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      res.status(400).json({ error: 'currentPassword and newPassword required' });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LEN) {
      res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters` });
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
    } catch {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/login',
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const { password, vaultPath } = req.body ?? {};
    if (typeof password !== 'string' || !(await checkPassword(password))) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }
    await applyVaultPathIfProvided(vaultPath);
    const token = await issueToken();
    res
      .cookie(COOKIE_NAME, token, cookieOpts(req))
      .json({ ok: true, mustChangePassword: !(await hasCustomPassword()) });
  }),
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' }).json({ ok: true });
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ authenticated: true, mustChangePassword: !(await hasCustomPassword()) });
  }),
);
