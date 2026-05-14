/** EU-27 member states (post-Brexit, excluding GB). */
const EU27 = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

const EEA_NON_EU = new Set(["IS", "LI", "NO"]);

const HIGH_TIER_OECD = new Set(["AU", "CA", "JP", "KR", "NZ"]);

/**
 * Approximate headline rate for PDF math when native activity is priced in USD.
 * Not tax advice; every jurisdiction has nuance. Unknown ISO codes use the same default as the historical stub (0.2).
 */
export function taxRateForCountry(country: string): number {
  const c = country.toUpperCase();
  if (c === "US") return 0.22;
  if (c === "GB" || c === "UK") return 0.2;
  if (c === "DE" || c === "FR") return 0.25;
  if (c === "SG") return 0.17;
  if (EU27.has(c)) return 0.24;
  if (EEA_NON_EU.has(c)) return 0.24;
  if (HIGH_TIER_OECD.has(c)) return 0.25;
  return 0.2;
}
