// Vantage v1.1.0 — passphrase-encrypted API key storage.
//
// AES-GCM-256 + PBKDF2 (600k iterations, SHA-256). Strict opt-in,
// default off. Keys exported as plaintext only with explicit user
// action — JSON export / share-link paths still call stripSecrets()
// independently of this vault.
//
// SubtleCrypto is fully available in extension pages — no chrome.offscreen
// workaround needed. The derived key is cached in chrome.storage.session
// (auto-cleared on browser restart) so subsequent renders within the
// same session don't re-prompt.

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

/* ── base64 helpers ──────────────────────────────────────────────── */

function bytesToBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function decodeVaultField(value, expectedBytes = null) {
  if (typeof value !== "string" || !value) {
    throw new Error("Wrong passphrase or corrupt vault");
  }
  try {
    const bytes = base64ToBytes(value);
    if (expectedBytes != null && bytes.length !== expectedBytes) {
      throw new Error("invalid length");
    }
    if (expectedBytes == null && bytes.length === 0) {
      throw new Error("empty value");
    }
    return bytes;
  } catch {
    throw new Error("Wrong passphrase or corrupt vault");
  }
}

/* ── key derivation + encrypt / decrypt ──────────────────────────── */

async function deriveAesKey(passphrase, saltBytes) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt the API-key bundle. Returns a payload to merge into
 *  `settings.security` and zeroed-out values to write into
 *  `settings.crypto.apiKey` + `settings.photo.nasaKey`.
 *
 *  Throws on a blank passphrase to keep the UX surface tight —
 *  callers should validate first.
 */
export async function encryptKeys(passphrase, keys) {
  if (!passphrase) throw new Error("Passphrase required");
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv   = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const aes  = await deriveAesKey(passphrase, salt);
  const plaintext = JSON.stringify({
    crypto: keys.cryptoApiKey || "",
    nasa:   keys.photoNasaKey || ""
  });
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aes,
    enc.encode(plaintext)
  );
  return {
    encryptKeys: true,
    salt: bytesToBase64(salt),
    iv:   bytesToBase64(iv),
    encryptedBlob: bytesToBase64(new Uint8Array(ct))
  };
}

/** Decrypt the API-key bundle from `settings.security`. Returns the
 *  decrypted bundle `{crypto, nasa}`. Throws on a wrong passphrase or
 *  corrupt ciphertext (bad-key error from AES-GCM is indistinguishable
 *  from corrupt input — both surface as a generic "failed" message).
 */
export async function decryptKeys(passphrase, security) {
  if (!passphrase) throw new Error("Passphrase required");
  if (!security?.encryptKeys || !security.encryptedBlob) {
    throw new Error("Vault not configured");
  }
  try {
    const salt = decodeVaultField(security.salt, SALT_BYTES);
    const iv   = decodeVaultField(security.iv, IV_BYTES);
    const ct   = decodeVaultField(security.encryptedBlob);
    const aes  = await deriveAesKey(passphrase, salt);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aes, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  } catch {
    throw new Error("Wrong passphrase or corrupt vault");
  }
}

/* ── session-cache helpers (chrome.storage.session = clears on browser restart) ── */

const SESSION_KEY = "vantage_decrypted_keys_v1";

export async function cacheDecrypted(decrypted) {
  const session = globalThis.chrome?.storage?.session;
  if (!session) return; // Firefox + private windows — fine, just no caching
  try { await session.set({ [SESSION_KEY]: decrypted }); } catch {}
}

export async function readCached() {
  const session = globalThis.chrome?.storage?.session;
  if (!session) return null;
  try {
    const out = await session.get(SESSION_KEY);
    return out?.[SESSION_KEY] || null;
  } catch { return null; }
}

export async function clearCached() {
  const session = globalThis.chrome?.storage?.session;
  if (!session) return;
  try { await session.remove(SESSION_KEY); } catch {}
}

/** Apply decrypted bundle to a live settings object — replaces the
 *  zeroed plaintext fields with the real keys, in-memory only. The
 *  caller never re-saves; the on-disk values stay encrypted.
 */
export function applyDecryptedToSettings(settings, decrypted) {
  if (!settings || !decrypted) return;
  if (typeof decrypted.crypto === "string" && settings.crypto) {
    settings.crypto = { ...settings.crypto, apiKey: decrypted.crypto };
  }
  if (typeof decrypted.nasa === "string" && settings.photo) {
    settings.photo = { ...settings.photo, nasaKey: decrypted.nasa };
  }
}
