// Password utility functions for Ya Hala E-Portal

/* ─────────────────────────────────────────────────────────
   PBKDF2 Hashing  (Web Crypto API — native in Deno)
   v2 Format: "pbkdf2v2:<saltHex>:<hashHex>"  ← NEW (raw salt bytes, correct)
   v1 Format: "pbkdf2v1:<saltHex>:<hashHex>"  ← LEGACY (salt mis-encoded, kept for backward compat)
   Plain text: anything not starting with a prefix → legacy plaintext

   Migration path:
     v1 → v2 upgrade happens automatically on successful login.
     Plain → v2 upgrade happens automatically on successful login.
───────────────────────────────────────────────────────── */
const HASH_PREFIX_V1 = 'pbkdf2v1:';   // Legacy: salt used as hex string UTF-8 bytes
const HASH_PREFIX_V2 = 'pbkdf2v2:';   // Current: salt used as raw bytes (correct)
const ITERATIONS     = 100_000;

/* ── Internal helpers ─────────────────────────────────── */

function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g);
  if (!pairs) return new Uint8Array(0);
  return new Uint8Array(pairs.map(b => parseInt(b, 16)));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2Hash(password: string, saltBytes: Uint8Array): Promise<string> {
  const enc         = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return bytesToHex(new Uint8Array(bits));
}

/* ─────────────────────────────────────────────────────────
   Public API
───────────────────────────────────────────────────────── */

/**
 * Hash a password using PBKDF2-SHA-256 with a cryptographically random 16-byte salt.
 * Returns a prefixed string so we can detect hashed vs. legacy.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex   = bytesToHex(saltBytes);
  const hashHex   = await pbkdf2Hash(password, saltBytes);
  return `${HASH_PREFIX_V2}${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored value.
 * Supports v2 (correct), v1 (legacy mis-encoded salt), and plaintext (legacy).
 * Callers should upgrade plaintext / v1 passwords to v2 on successful verification.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;

  // ── v2 — raw salt bytes (current, correct) ──────────────────────────────
  if (stored.startsWith(HASH_PREFIX_V2)) {
    const inner    = stored.slice(HASH_PREFIX_V2.length);
    const colonIdx = inner.indexOf(':');
    if (colonIdx === -1) return false;
    const saltHex      = inner.slice(0, colonIdx);
    const expectedHash = inner.slice(colonIdx + 1);
    const saltBytes    = hexToBytes(saltHex);
    const hashHex      = await pbkdf2Hash(password, saltBytes);
    return timingSafeEqual(hashHex, expectedHash);
  }

  // ── v1 — legacy mis-encoded salt (backward compat) ──────────────────────
  if (stored.startsWith(HASH_PREFIX_V1)) {
    const inner    = stored.slice(HASH_PREFIX_V1.length);
    const colonIdx = inner.indexOf(':');
    if (colonIdx === -1) return false;
    const saltHex      = inner.slice(0, colonIdx);
    const expectedHash = inner.slice(colonIdx + 1);
    // V1 mistakenly encoded the saltHex string as UTF-8 and passed that as the salt
    const enc       = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(saltHex), iterations: ITERATIONS, hash: 'SHA-256' },
      keyMaterial, 256
    );
    const hashHex = bytesToHex(new Uint8Array(bits));
    return timingSafeEqual(hashHex, expectedHash);
  }

  // ── Legacy plaintext — constant-time compare ─────────────────────────────
  return timingSafeEqual(password, stored);
}

/**
 * Returns true if the stored password is already a PBKDF2 hash (v1 or v2).
 */
export function isHashed(stored: string): boolean {
  return typeof stored === 'string' &&
    (stored.startsWith(HASH_PREFIX_V1) || stored.startsWith(HASH_PREFIX_V2));
}

/**
 * Returns true if the stored password is v1 (legacy, should be upgraded to v2).
 */
export function isLegacyHash(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith(HASH_PREFIX_V1);
}

/**
 * Constant-time string comparison to mitigate timing attacks.
 * Even when lengths differ the function still iterates to avoid leaking timing info.
 */
function timingSafeEqual(a: string, b: string): boolean {
  let diff = 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
  }
  // Also flag if lengths differ — ensures different-length strings never match
  diff |= a.length ^ b.length;
  return diff === 0;
}

/* ─────────────────────────────────────────────────────────
   Temporary password generator
   Uses crypto.getRandomValues() — cryptographically secure.
   Format: 3 uppercase + 3 digits + 3 lowercase
   Ambiguous chars removed (I/O/l/0/1)
───────────────────────────────────────────────────────── */
export function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const digits    = '23456789';

  function pickRandom(charset: string): string {
    // crypto.getRandomValues gives uniform distribution; use rejection sampling
    const arr = new Uint8Array(1);
    let ch: number;
    do {
      crypto.getRandomValues(arr);
      ch = arr[0] % charset.length;
    } while (arr[0] >= Math.floor(256 / charset.length) * charset.length); // rejection sampling
    return charset[ch];
  }

  let password = '';
  for (let i = 0; i < 3; i++) password += pickRandom(uppercase);
  for (let i = 0; i < 3; i++) password += pickRandom(digits);
  for (let i = 0; i < 3; i++) password += pickRandom(lowercase);
  return password;
}

/* ─────────────────────────────────────────────────────────
   Password strength validation
   Requirements: ≥8 chars, 1 uppercase, 1 lowercase, 1 digit
───────────────────────────────────────────────────────── */
export function validatePassword(password: string): { valid: boolean; message: string; messageAr: string } {
  if (password.length < 8) return {
    valid: false,
    message:   'Password must be at least 8 characters long',
    messageAr: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل'
  };
  if (!/[A-Z]/.test(password)) return {
    valid: false,
    message:   'Password must contain at least one uppercase letter',
    messageAr: 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل'
  };
  if (!/[a-z]/.test(password)) return {
    valid: false,
    message:   'Password must contain at least one lowercase letter',
    messageAr: 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل'
  };
  if (!/[0-9]/.test(password)) return {
    valid: false,
    message:   'Password must contain at least one digit',
    messageAr: 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل'
  };
  return { valid: true, message: 'Password is valid', messageAr: 'كلمة المرور صالحة' };
}
