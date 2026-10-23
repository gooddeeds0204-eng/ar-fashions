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
