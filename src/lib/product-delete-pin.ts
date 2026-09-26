import "server-only";

import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(nodeScrypt);
const KEY_LENGTH = 64;
const SETTINGS_KEY = "product_delete_pin_v1";

export function validateProductDeletePin(pin: string) {
  if (!/^\d{4,8}$/.test(pin)) {
    return "Delete PIN must be 4 to 8 digits.";
  }

  return null;
}

async function hashPin(pin: string) {
  const validation = validateProductDeletePin(pin);

  if (validation) {
    throw new Error(validation);
  }

  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(
    pin,
    salt,
    KEY_LENGTH,
  )) as Buffer;

  return [
    "scrypt-pin-v1",
    salt,
    derived.toString("hex"),
  ].join("$");
}

async function verifyPinHash(
  pin: string,
  storedHash: string,
) {
  try {
    const [version, salt, storedKey] =
      storedHash.split("$");

    if (
      version !== "scrypt-pin-v1" ||
      !salt ||
      !storedKey
    ) {
      return false;
    }

    const supplied = (await scrypt(
      pin,
      salt,
      KEY_LENGTH,
    )) as Buffer;

    const expected = Buffer.from(
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

export async function hasProductDeletePin() {
  const row =
    await prisma.siteSetting.findUnique({
      where: {
        key: SETTINGS_KEY,
      },
      select: {
        value: true,
      },
    });

  return Boolean(row?.value);
}

export async function verifyProductDeletePin(
  pin: string,
) {
  const row =
    await prisma.siteSetting.findUnique({
      where: {
        key: SETTINGS_KEY,
      },
      select: {
        value: true,
      },
    });

  if (!row?.value) {
    return {
      configured: false,
      valid: false,
    };
  }

  return {
    configured: true,
    valid: await verifyPinHash(
      pin,
      row.value,
    ),
  };
}

export async function setProductDeletePin(
  pin: string,
) {
  const value = await hashPin(pin);

  await prisma.siteSetting.upsert({
    where: {
      key: SETTINGS_KEY,
    },
    update: {
      value,
    },
    create: {
      key: SETTINGS_KEY,
      value,
    },
  });
}
