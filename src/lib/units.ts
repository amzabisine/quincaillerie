/** Units a hardware shop sells in. Labels are in messages/*.json under "units". */
export const UNITS = [
  "piece", "bag", "kg", "meter", "sheet", "liter", "box", "bundle", "roll", "tin", "pair", "set", "packet", "ton",
] as const;
export type Unit = (typeof UNITS)[number];
