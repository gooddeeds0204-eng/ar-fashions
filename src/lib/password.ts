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
    const [
      version,
      salt,
      storedKey,
    ] = storedHash.split("$");

    if (
      version !== "scrypt-v1" ||
      !salt ||
      !storedKey
    ) {
      return false;
    }

    const supplied =
      (await scrypt(
        password,
        salt,
        KEY_LENGTH,
      )) as Buffer;

    const expected =
      Buffer.from(
        storedKey,
        "hex",
      );

    if (
      supplied.length !==
      expected.length
    ) {
      return false;
    }

    return timingSafeEqual(
      supplied,
      expected,
    );
  } catch {
    return false;
  }
}
