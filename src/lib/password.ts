import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

const PREFIX = "scrypt";
const KEY_LENGTH = 64;

export function hashPassword(
  password: string,
) {
  if (password.length < 8) {
    throw new Error(
      "Password must be at least 8 characters.",
    );
  }

  const salt =
    randomBytes(16).toString(
      "base64url",
    );

  const derivedKey =
    scryptSync(
      password,
      salt,
      KEY_LENGTH,
    ).toString("base64url");

  return [
    PREFIX,
    salt,
    derivedKey,
  ].join("$");
}

export function verifyPassword(
  password: string,
  storedHash: string,
) {
  try {
    const [
      prefix,
      salt,
      savedKey,
    ] = storedHash.split("$");

    if (
      prefix !== PREFIX ||
      !salt ||
      !savedKey
    ) {
      return false;
    }

    const saved =
      Buffer.from(
        savedKey,
        "base64url",
      );

    const supplied =
      scryptSync(
        password,
        salt,
        saved.length,
      );

    return (
      saved.length ===
        supplied.length &&
      timingSafeEqual(
        saved,
        supplied,
      )
    );
  } catch {
    return false;
  }
}
