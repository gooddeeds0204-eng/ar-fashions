export type GarmentMeasurementField =
  | "chestIn"
  | "waistIn"
  | "hipIn"
  | "shoulderIn"
  | "armholeIn"
  | "sleeveLengthIn"
  | "topLengthIn"
  | "garmentLengthIn"
  | "bottomWaistMinIn"
  | "bottomWaistMaxIn"
  | "bottomLengthIn";

export type GarmentMeasurementValues = Record<
  GarmentMeasurementField,
  string
>;

export const EMPTY_GARMENT_MEASUREMENTS: GarmentMeasurementValues = {
  chestIn: "",
  waistIn: "",
  hipIn: "",
  shoulderIn: "",
  armholeIn: "",
  sleeveLengthIn: "",
  topLengthIn: "",
  garmentLengthIn: "",
  bottomWaistMinIn: "",
  bottomWaistMaxIn: "",
  bottomLengthIn: "",
};

export const GARMENT_MEASUREMENT_FIELDS: Array<{
  key: GarmentMeasurementField;
  label: string;
  shortLabel: string;
  group: "TOP" | "BOTTOM" | "GENERAL";
  placeholder: string;
}> = [
  { key: "chestIn", label: "Chest / Bust", shortLabel: "Chest", group: "TOP", placeholder: "e.g. 30" },
  { key: "waistIn", label: "Top Waist", shortLabel: "Top Waist", group: "TOP", placeholder: "e.g. 28" },
  { key: "shoulderIn", label: "Shoulder", shortLabel: "Shoulder", group: "TOP", placeholder: "e.g. 12" },
  { key: "armholeIn", label: "Armhole", shortLabel: "Armhole", group: "TOP", placeholder: "e.g. 14" },
  { key: "sleeveLengthIn", label: "Sleeve Length", shortLabel: "Sleeve", group: "TOP", placeholder: "e.g. 16" },
  { key: "topLengthIn", label: "Top / Kurti Length", shortLabel: "Top Length", group: "TOP", placeholder: "e.g. 18" },
  { key: "hipIn", label: "Hip", shortLabel: "Hip", group: "GENERAL", placeholder: "e.g. 32" },
  { key: "garmentLengthIn", label: "Full Garment Length", shortLabel: "Full Length", group: "GENERAL", placeholder: "e.g. 44" },
  { key: "bottomWaistMinIn", label: "Bottom Waist Min", shortLabel: "Waist Min", group: "BOTTOM", placeholder: "e.g. 24" },
  { key: "bottomWaistMaxIn", label: "Bottom Waist Max", shortLabel: "Waist Max", group: "BOTTOM", placeholder: "e.g. 28" },
  { key: "bottomLengthIn", label: "Bottom / Lehenga Length", shortLabel: "Bottom Length", group: "BOTTOM", placeholder: "e.g. 35" },
];

export function mergeGarmentMeasurements(
  value?: Partial<GarmentMeasurementValues> | null,
): GarmentMeasurementValues {
  return {
    ...EMPTY_GARMENT_MEASUREMENTS,
    ...(value ?? {}),
  };
}

/**
 * Product-type-aware admin measurement fields.
 * Existing stored values are never deleted when a template changes:
 * the editor exposes the remaining fields under "Additional fields".
 */
export function getGarmentMeasurementTemplate(
  categoryName: string,
  productName = "",
) {
  const type = `${categoryName} ${productName}`.toLowerCase();
  const matches = (pattern: RegExp) => pattern.test(type);
  const allKeys = GARMENT_MEASUREMENT_FIELDS.map((field) => field.key);

  let title = "Garment";
  let keys: GarmentMeasurementField[] = allKeys;

  const multiPiece = matches(/coat|ghagra|lehenga|set|co-ord|coord|suit|tracksuit|ethnic|punjabi/);

  if (matches(/saree|dupatta|scarf|shawl/)) {
    title = "Fabric / drape measurements";
    keys = ["garmentLengthIn", "topLengthIn"];
  } else if (multiPiece) {
    title = "Top & bottom — separate garment measurements";
    keys = [
      "chestIn", "waistIn", "shoulderIn", "armholeIn",
      "sleeveLengthIn", "topLengthIn", "garmentLengthIn",
      "bottomWaistMinIn", "bottomWaistMaxIn", "bottomLengthIn", "hipIn",
    ];
  } else if (matches(/jean|trouser|pant|legging|jegging|palazzo|short|skirt/)) {
    title = "Bottom wear measurements";
    keys = ["bottomWaistMinIn", "bottomWaistMaxIn", "hipIn", "bottomLengthIn"];
  } else if (matches(/shirt|t-shirt|t shirt|kurti|tunic|tops?|sweatshirt|shrug|jacket/)) {
    title = "Top wear measurements";
    keys = ["chestIn", "waistIn", "shoulderIn", "armholeIn", "sleeveLengthIn", "topLengthIn"];
  } else if (matches(/frock|dress|gown/)) {
    title = "Dress / frock measurements";
    keys = ["chestIn", "waistIn", "shoulderIn", "sleeveLengthIn", "garmentLengthIn", "hipIn"];
  }

  const primaryFields = keys
    .map((key) => GARMENT_MEASUREMENT_FIELDS.find((field) => field.key === key))
    .filter((field): field is (typeof GARMENT_MEASUREMENT_FIELDS)[number] => Boolean(field));
  const additionalFields = GARMENT_MEASUREMENT_FIELDS.filter(
    (field) => !keys.includes(field.key),
  );

  return { title, primaryFields, additionalFields };
}
