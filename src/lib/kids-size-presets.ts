export type KidsSizePreset = {
  value: string;
  label: string;
  sizeLabel: string;
  ageGuide: string;
  heightCm: string;
  chestIn: string;
  waistIn: string;
  hipIn: string;
};

export const KIDS_SIZE_PRESETS: KidsSizePreset[] = [
  { value: "0-3M", label: "0–3 Months", sizeLabel: "0-3M", ageGuide: "0-3M", heightCm: "50-62", chestIn: "16-17", waistIn: "16-17", hipIn: "17-18" },
  { value: "3-6M", label: "3–6 Months", sizeLabel: "3-6M", ageGuide: "3-6M", heightCm: "62-68", chestIn: "17-18", waistIn: "17-18", hipIn: "18-19" },
  { value: "6-9M", label: "6–9 Months", sizeLabel: "6-9M", ageGuide: "6-9M", heightCm: "68-74", chestIn: "18-19", waistIn: "18-19", hipIn: "19-20" },
  { value: "9-12M", label: "9–12 Months", sizeLabel: "9-12M", ageGuide: "9-12M", heightCm: "74-80", chestIn: "19-20", waistIn: "18-19", hipIn: "20-21" },
  { value: "12-18M", label: "12–18 Months", sizeLabel: "12-18M", ageGuide: "12-18M", heightCm: "80-86", chestIn: "20-21", waistIn: "19-20", hipIn: "21-22" },
  { value: "18-24M", label: "18–24 Months", sizeLabel: "18-24M", ageGuide: "18-24M", heightCm: "86-92", chestIn: "21-22", waistIn: "20-21", hipIn: "22-23" },
  { value: "2-3Y", label: "2–3 Years", sizeLabel: "2-3Y", ageGuide: "2-3Y", heightCm: "92-98", chestIn: "21-22", waistIn: "20-21", hipIn: "22-23" },
  { value: "3-4Y", label: "3–4 Years", sizeLabel: "3-4Y", ageGuide: "3-4Y", heightCm: "98-104", chestIn: "22-23", waistIn: "21-22", hipIn: "23-24" },
  { value: "4-5Y", label: "4–5 Years", sizeLabel: "4-5Y", ageGuide: "4-5Y", heightCm: "104-110", chestIn: "23-24", waistIn: "22-23", hipIn: "24-25" },
  { value: "5-6Y", label: "5–6 Years", sizeLabel: "5-6Y", ageGuide: "5-6Y", heightCm: "110-116", chestIn: "24-25", waistIn: "22-23", hipIn: "25-26" },
  { value: "6-7Y", label: "6–7 Years", sizeLabel: "6-7Y", ageGuide: "6-7Y", heightCm: "116-122", chestIn: "25-26", waistIn: "23-24", hipIn: "26-27" },
  { value: "7-8Y", label: "7–8 Years", sizeLabel: "7-8Y", ageGuide: "7-8Y", heightCm: "122-128", chestIn: "26-27", waistIn: "24-25", hipIn: "27-28" },
  { value: "8-9Y", label: "8–9 Years", sizeLabel: "8-9Y", ageGuide: "8-9Y", heightCm: "128-134", chestIn: "27-28", waistIn: "24-25", hipIn: "28-29" },
  { value: "9-10Y", label: "9–10 Years", sizeLabel: "9-10Y", ageGuide: "9-10Y", heightCm: "134-140", chestIn: "28-29", waistIn: "25-26", hipIn: "29-30" },
  { value: "10-11Y", label: "10–11 Years", sizeLabel: "10-11Y", ageGuide: "10-11Y", heightCm: "140-146", chestIn: "29-30", waistIn: "25-26", hipIn: "30-31" },
  { value: "11-12Y", label: "11–12 Years", sizeLabel: "11-12Y", ageGuide: "11-12Y", heightCm: "146-152", chestIn: "30-31", waistIn: "26-27", hipIn: "31-32" },
  { value: "12-13Y", label: "12–13 Years", sizeLabel: "12-13Y", ageGuide: "12-13Y", heightCm: "152-158", chestIn: "31-32", waistIn: "27-28", hipIn: "32-33" },
  { value: "13-14Y", label: "13–14 Years", sizeLabel: "13-14Y", ageGuide: "13-14Y", heightCm: "158-164", chestIn: "32-33", waistIn: "28-29", hipIn: "33-34" },
  { value: "14-15Y", label: "14–15 Years", sizeLabel: "14-15Y", ageGuide: "14-15Y", heightCm: "164-168", chestIn: "33-34", waistIn: "29-30", hipIn: "34-35" },
  { value: "15-16Y", label: "15–16 Years", sizeLabel: "15-16Y", ageGuide: "15-16Y", heightCm: "168-172", chestIn: "34-35", waistIn: "30-31", hipIn: "35-36" },
  { value: "16-17Y", label: "16–17 Years", sizeLabel: "16-17Y", ageGuide: "16-17Y", heightCm: "172-176", chestIn: "35-36", waistIn: "31-32", hipIn: "36-37" },
];

export const KIDS_SIZE_REFERENCE_NOTE =
  "Reference guide only. Compare the child's actual body measurements before selecting. If measurements fall between two sizes, choose the larger size.";

export function kidsHeightCmToInches(heightCm: string) {
  const parts = heightCm
    .split("-")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));

  if (parts.length !== 2) {
    return "";
  }

  return `${Math.round(parts[0] / 2.54)}-${Math.round(parts[1] / 2.54)} in`;
}

export function getKidsSizePreset(value: string) {
  return KIDS_SIZE_PRESETS.find(
    (preset) => preset.value === value,
  );
}
