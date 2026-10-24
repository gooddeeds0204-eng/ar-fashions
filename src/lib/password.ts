import "server-only";

import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";

const scrypt =
  promisify(nodeScrypt);

const KEY_LENGTH = 64;

export function validatePassword(
  password: string,
) {
  if (password.length < 8) {
    return "Password must contain at least 8 characters.";
  }

  if (password.length > 128) {
    return "Password is too long.";
  }

  return null;
}

export async function hashPassword(
  password: string,
) {
  const validation =
    validatePassword(password);

  if (validation) {
    throw new Error(validation);
  }

  const salt =
    randomBytes(16).toString(
      "hex",
    );

  const derived =
    (await scrypt(
      password,
      salt,
      KEY_LENGTH,
    )) as Buffer;

  return [
    "scrypt-v1",
    salt,
    derived.toString("hex"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string,
) {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;

    const [version, salt, storedKey] = parts;
    if (!salt || !storedKey) return false;

    if (version === "scrypt-v1") {
      // Current password format: hex salt + 64-byte hex digest.
      if (
        !/^[a-f0-9]{32}$/i.test(salt) ||
        !/^[a-f0-9]{128}$/i.test(storedKey)
      ) {
        return false;
      }

      const supplied = (await scrypt(
        password,
        salt,
        KEY_LENGTH,
      )) as Buffer;

      const expected = Buffer.from(storedKey, "hex");
      return timingSafeEqual(supplied, expected);
    }

    if (version === "scrypt") {
      // Legacy administrator credentials were stored with base64url
      // salt and digest. Keep old logins working without changing the
      // saved password or bypassing password verification.
      if (
        !/^[A-Za-z0-9_-]{22}$/.test(salt) ||
        !/^[A-Za-z0-9_-]{86}$/.test(storedKey)
      ) {
        return false;
      }

      const expected = Buffer.from(storedKey, "base64url");
      if (expected.length !== KEY_LENGTH) return false;

      const originalSalt = Buffer.from(salt, "base64url");
      if (originalSalt.length !== 16) return false;

      // The original admin hashing implementation used the
      // base64url-encoded salt STRING as the scrypt salt.
      const supplied = (await scrypt(
        password,
        salt,
        KEY_LENGTH,
      )) as Buffer;

      return timingSafeEqual(supplied, expected);
    }

    return false;
  } catch {
    return false;
  }
}
