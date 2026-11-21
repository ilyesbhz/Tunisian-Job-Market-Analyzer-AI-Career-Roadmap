// Must match the country value stored in your JobOffer table
export const LOCAL_COUNTRY = "Tunisia";

// Model-estimated salaries (offers that state no salary) are shown only from this confidence on.
// The model is right about 62% of the time overall and ~93% within one bracket.
export const ESTIMATE_MIN_CONFIDENCE = 0.5;

// Tanitjobs-style monthly TND brackets used by the salary model, in display order
export const SALARY_BRACKETS = ["<1000", "1000-1500", "1500-2000", ">=2000"] as const;
export type SalaryBracket = (typeof SALARY_BRACKETS)[number];

// Country name (as stored in JobOffer.country) -> ISO3 code and local currency.
// Used by the "Compare to Tunisia" converter. Add a line here when a new country is scraped.
export const COUNTRY_INFO: Record<string, { iso3: string; currency: string }> = {
  Tunisia: { iso3: "TUN", currency: "TND" },
  France: { iso3: "FRA", currency: "EUR" },
  "United Kingdom": { iso3: "GBR", currency: "GBP" },
  Germany: { iso3: "DEU", currency: "EUR" },
  "United States": { iso3: "USA", currency: "USD" },
  Canada: { iso3: "CAN", currency: "CAD" },
};
