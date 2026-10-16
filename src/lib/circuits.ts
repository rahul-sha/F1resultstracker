import type { Race } from "./ergast";

// Grand Prix name -> short column code, matching the abbreviations used on
// F1 broadcast graphics and season-overview charts (BHR, SAU, AUS, ...).
const ABBREVIATION_BY_RACE_NAME: Record<string, string> = {
  "bahrain grand prix": "BHR",
  "saudi arabian grand prix": "SAU",
  "australian grand prix": "AUS",
  "japanese grand prix": "JPN",
  "chinese grand prix": "CHN",
  "miami grand prix": "MIA",
  "emilia romagna grand prix": "EMI",
  "monaco grand prix": "MON",
  "canadian grand prix": "CAN",
  "spanish grand prix": "ESP",
  "austrian grand prix": "AUT",
  "british grand prix": "GBR",
  "hungarian grand prix": "HUN",
  "belgian grand prix": "BEL",
  "dutch grand prix": "NED",
  "italian grand prix": "ITA",
  "azerbaijan grand prix": "AZE",
  "singapore grand prix": "SIN",
  "united states grand prix": "USA",
  "mexico city grand prix": "MXC",
  "mexican grand prix": "MXC",
  "são paulo grand prix": "SAP",
  "sao paulo grand prix": "SAP",
  "brazilian grand prix": "SAP",
  "las vegas grand prix": "LVG",
  "qatar grand prix": "QAT",
  "abu dhabi grand prix": "ABU",
  "70th anniversary grand prix": "70A",
  "sakhir grand prix": "SKH",
  "styrian grand prix": "STY",
  "eifel grand prix": "EIF",
  "tuscan grand prix": "TUS",
  "russian grand prix": "RUS",
  "turkish grand prix": "TUR",
  "portuguese grand prix": "POR",
  "french grand prix": "FRA",
  "german grand prix": "GER",
  "korean grand prix": "KOR",
  "indian grand prix": "IND",
  "malaysian grand prix": "MAL",
};

// ISO 3166-1 alpha-2 codes, used as `flag-icons` CSS classes (fi-<code>).
// Unicode flag emoji used to live here, but most OS/browser combinations
// (notably Windows Chrome) don't have emoji-flag glyphs installed and fall
// back to rendering the two-letter country code in a generic box, so every
// column looked identical. Real flag icons render consistently everywhere.
const FLAG_ISO_BY_ABBREVIATION: Record<string, string> = {
  BHR: "bh",
  SAU: "sa",
  AUS: "au",
  JPN: "jp",
  CHN: "cn",
  MIA: "us",
  EMI: "it",
  MON: "mc",
  CAN: "ca",
  ESP: "es",
  AUT: "at",
  GBR: "gb",
  HUN: "hu",
  BEL: "be",
  NED: "nl",
  ITA: "it",
  AZE: "az",
  SIN: "sg",
  USA: "us",
  MXC: "mx",
  SAP: "br",
  LVG: "us",
  QAT: "qa",
  ABU: "ae",
  SKH: "bh",
  STY: "at",
  EIF: "de",
  TUS: "it",
  RUS: "ru",
  TUR: "tr",
  POR: "pt",
  FRA: "fr",
  GER: "de",
  KOR: "kr",
  IND: "in",
  MAL: "my",
  "70A": "gb",
};

export function raceAbbreviation(race: Race): string {
  const key = race.raceName.trim().toLowerCase();
  const known = ABBREVIATION_BY_RACE_NAME[key];
  if (known) return known;
  const letters = race.Circuit.Location.country.replace(/[^a-zA-Z]/g, "");
  return letters.slice(0, 3).toUpperCase() || "GP";
}

// Returns the ISO 3166-1 alpha-2 code for the `flag-icons` `fi-<code>` CSS
// class, or null when the circuit's country isn't mapped.
export function raceFlagIso(race: Race): string | null {
  return FLAG_ISO_BY_ABBREVIATION[raceAbbreviation(race)] ?? null;
}
