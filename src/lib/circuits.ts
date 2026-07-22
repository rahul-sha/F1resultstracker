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

const FLAG_BY_ABBREVIATION: Record<string, string> = {
  BHR: "\u{1F1E7}\u{1F1ED}",
  SAU: "\u{1F1F8}\u{1F1E6}",
  AUS: "\u{1F1E6}\u{1F1FA}",
  JPN: "\u{1F1EF}\u{1F1F5}",
  CHN: "\u{1F1E8}\u{1F1F3}",
  MIA: "\u{1F1FA}\u{1F1F8}",
  EMI: "\u{1F1EE}\u{1F1F9}",
  MON: "\u{1F1F2}\u{1F1E8}",
  CAN: "\u{1F1E8}\u{1F1E6}",
  ESP: "\u{1F1EA}\u{1F1F8}",
  AUT: "\u{1F1E6}\u{1F1F9}",
  GBR: "\u{1F1EC}\u{1F1E7}",
  HUN: "\u{1F1ED}\u{1F1FA}",
  BEL: "\u{1F1E7}\u{1F1EA}",
  NED: "\u{1F1F3}\u{1F1F1}",
  ITA: "\u{1F1EE}\u{1F1F9}",
  AZE: "\u{1F1E6}\u{1F1FF}",
  SIN: "\u{1F1F8}\u{1F1EC}",
  USA: "\u{1F1FA}\u{1F1F8}",
  MXC: "\u{1F1F2}\u{1F1FD}",
  SAP: "\u{1F1E7}\u{1F1F7}",
  LVG: "\u{1F1FA}\u{1F1F8}",
  QAT: "\u{1F1F6}\u{1F1E6}",
  ABU: "\u{1F1E6}\u{1F1EA}",
  SKH: "\u{1F1E7}\u{1F1ED}",
  STY: "\u{1F1E6}\u{1F1F9}",
  EIF: "\u{1F1E9}\u{1F1EA}",
  TUS: "\u{1F1EE}\u{1F1F9}",
  RUS: "\u{1F1F7}\u{1F1FA}",
  TUR: "\u{1F1F9}\u{1F1F7}",
  POR: "\u{1F1F5}\u{1F1F9}",
  FRA: "\u{1F1EB}\u{1F1F7}",
  GER: "\u{1F1E9}\u{1F1EA}",
  KOR: "\u{1F1F0}\u{1F1F7}",
  IND: "\u{1F1EE}\u{1F1F3}",
  MAL: "\u{1F1F2}\u{1F1FE}",
  "70A": "\u{1F1EC}\u{1F1E7}",
};

export function raceAbbreviation(race: Race): string {
  const key = race.raceName.trim().toLowerCase();
  const known = ABBREVIATION_BY_RACE_NAME[key];
  if (known) return known;
  const letters = race.Circuit.Location.country.replace(/[^a-zA-Z]/g, "");
  return letters.slice(0, 3).toUpperCase() || "GP";
}

export function raceFlag(race: Race): string {
  return FLAG_BY_ABBREVIATION[raceAbbreviation(race)] ?? "\u{1F3C1}";
}
