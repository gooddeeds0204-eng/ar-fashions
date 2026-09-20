const COLOR_PREFIX =
  "[AS_COLOR:";

const COLOR_SUFFIX = "]";

export function encodeProductMediaAlt(
  colorId: string | null | undefined,
  altText: string | null | undefined,
) {
  const cleanColor =
    String(colorId ?? "")
      .trim()
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );

  const cleanAlt =
    String(altText ?? "")
      .replace(
        /^\[AS_COLOR:[^\]]+\]\s*/i,
        "",
      )
      .trim();

  if (!cleanColor) {
    return cleanAlt || null;
  }

  return `${COLOR_PREFIX}${cleanColor}${COLOR_SUFFIX}${cleanAlt ? ` ${cleanAlt}` : ""}`;
}

export function decodeProductMediaAlt(
  value: string | null | undefined,
) {
  const raw =
    String(value ?? "");

  const match =
    raw.match(
      /^\[AS_COLOR:([^\]]+)\]\s*/i,
    );

  return {
    colorId:
      match?.[1]?.trim() ||
      null,
    altText:
      match
        ? raw
            .slice(
              match[0].length,
            )
            .trim() ||
          null
        : raw.trim() ||
          null,
  };
}

export function publicProductMedia<
  T extends {
    altText?:
      | string
      | null;
  },
>(item: T) {
  const decoded =
    decodeProductMediaAlt(
      item.altText,
    );

  return {
    ...item,
    colorId:
      decoded.colorId,
    altText:
      decoded.altText,
  };
}
