export const RETAILER_STATES = [
  "Andhra Pradesh",
  "Telangana",
] as const;

export type RetailerState =
  (typeof RETAILER_STATES)[number];

export const RETAILER_CITIES: Record<
  RetailerState,
  string[]
> = {
  "Andhra Pradesh": [
    "Adoni",
    "Amalapuram",
    "Anakapalle",
    "Anantapur",
    "Bapatla",
    "Bhimavaram",
    "Chilakaluripet",
    "Chirala",
    "Chittoor",
    "Dharmavaram",
    "Eluru",
    "Gooty",
    "Gudivada",
    "Gudur",
    "Guntakal",
    "Guntur",
    "Hindupur",
    "Jaggayyapeta",
    "Kadapa",
    "Kadiri",
    "Kakinada",
    "Kandukur",
    "Kavali",
    "Kovvur",
    "Kurnool",
    "Machilipatnam",
    "Madanapalle",
    "Mangalagiri",
    "Markapur",
    "Nandyal",
    "Narasaraopet",
    "Narsipatnam",
    "Nellore",
    "Nidadavole",
    "Nuzvid",
    "Ongole",
    "Palakollu",
    "Palasa",
    "Parvathipuram",
    "Piduguralla",
    "Pithapuram",
    "Proddatur",
    "Punganur",
    "Rajahmundry",
    "Rajam",
    "Rajampet",
    "Ramachandrapuram",
    "Rayachoti",
    "Repalle",
    "Samalkot",
    "Sattenapalle",
    "Srikakulam",
    "Srikalahasti",
    "Tadepalligudem",
    "Tadipatri",
    "Tanuku",
    "Tenali",
    "Tirupati",
    "Tuni",
    "Vijayawada",
    "Vinukonda",
    "Visakhapatnam",
    "Vizianagaram",
    "Yemmiganur",
  ],
  Telangana: [
    "Adilabad",
    "Armoor",
    "Asifabad",
    "Bhadrachalam",
    "Bhainsa",
    "Bhongir",
    "Bodhan",
    "Devarakonda",
    "Gadwal",
    "Huzurabad",
    "Hyderabad",
    "Jagtial",
    "Jangaon",
    "Jayashankar Bhupalpally",
    "Jogulamba Gadwal",
    "Kamareddy",
    "Karimnagar",
    "Khammam",
    "Kodad",
    "Koratla",
    "Kothagudem",
    "Mahabubabad",
    "Mahbubnagar",
    "Mancherial",
    "Mandamarri",
    "Medak",
    "Medchal",
    "Metpally",
    "Miryalaguda",
    "Nagar Kurnool",
    "Nalgonda",
    "Narayanpet",
    "Nirmal",
    "Nizamabad",
    "Palwancha",
    "Peddapalli",
    "Ramagundam",
    "Sadasivpet",
    "Sangareddy",
    "Secunderabad",
    "Siddipet",
    "Sircilla",
    "Suryapet",
    "Tandur",
    "Vikarabad",
    "Wanaparthy",
    "Warangal",
    "Zaheerabad",
  ],
};

export function normalizeRetailerState(
  value: string,
): RetailerState | "" {
  const normalized =
    value.trim().toLowerCase();

  if (
    normalized ===
      "andhra pradesh" ||
    normalized ===
      "andhra-pradesh" ||
    normalized === "ap"
  ) {
    return "Andhra Pradesh";
  }

  if (
    normalized ===
      "telangana" ||
    normalized === "tg" ||
    normalized === "ts"
  ) {
    return "Telangana";
  }

  return "";
}
