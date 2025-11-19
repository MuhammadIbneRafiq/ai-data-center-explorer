import Papa from "papaparse";
import { CountryData } from "@/types/country-data";

interface CsvRow {
  Country: string;
  [key: string]: any;
}

async function parseCsv(path: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(path, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data as CsvRow[]),
      error: (error) => reject(error),
    });
  });
}

function indexByCountry(rows: CsvRow[]): Record<string, CsvRow> {
  const map: Record<string, CsvRow> = {};
  for (const row of rows) {
    if (row.Country) {
      map[row.Country.trim().toUpperCase()] = row;
    }
  }
  return map;
}

function parseCoordinatePart(part: string): number | undefined {
  const trimmed = part.trim();
  if (!trimmed) return undefined;

  const pieces = trimmed.split(" ");
  if (pieces.length < 2) return undefined;

  const deg = Number(pieces[0]);
  const min = Number(pieces[1]);
  const dir = pieces[2] || "";

  if (Number.isNaN(deg) || Number.isNaN(min)) return undefined;

  let value = deg + min / 60;
  if (/[SW]/i.test(dir)) value = -value;
  return value;
}

function parseLatLong(geoCoord: string | undefined): { lat?: number; lng?: number } {
  if (!geoCoord) return {};

  // CIA strings can look like:
  // "33 00 N, 65 00 E"
  // "metropolitan France: 46 00 N, 2 00 E; ..."
  // so we regex out the first lat/long pair we find.
  const match = geoCoord.match(
    /(\d{1,2})\s+(\d{1,2})\s*([NS])[^0-9A-Z]+(\d{1,3})\s+(\d{1,2})\s*([EW])/i,
  );

  if (!match) return {};

  const [, latDegStr, latMinStr, latDir, lonDegStr, lonMinStr, lonDir] = match;

  const latDeg = Number(latDegStr);
  const latMin = Number(latMinStr);
  const lonDeg = Number(lonDegStr);
  const lonMin = Number(lonMinStr);

  if (
    Number.isNaN(latDeg) ||
    Number.isNaN(latMin) ||
    Number.isNaN(lonDeg) ||
    Number.isNaN(lonMin)
  ) {
    return {};
  }

  let lat = latDeg + latMin / 60;
  let lng = lonDeg + lonMin / 60;

  if (/[S]/i.test(latDir)) lat = -lat;
  if (/[W]/i.test(lonDir)) lng = -lng;

  const result: { lat?: number; lng?: number } = {};
  if (typeof lat === "number" && !Number.isNaN(lat)) result.lat = lat;
  if (typeof lng === "number" && !Number.isNaN(lng)) result.lng = lng;
  return result;
}

function deriveCountryCode(internetCode: string | undefined, country: string): string {
  if (internetCode) {
    const cleaned = internetCode.replace(/[^a-zA-Z]/g, "");
    if (cleaned.length >= 2 && cleaned.length <= 3) {
      return cleaned.toUpperCase();
    }
  }
  return country.slice(0, 2).toUpperCase();
}

export async function fetchCountryDataFromCsv(): Promise<CountryData[]> {
  try {
    console.log("🔍 Starting CSV data fetch...");
    const base = "/cia-data";

    const [energy, economy, comms, geo] = await Promise.all([
      parseCsv(`${base}/energy_data.csv`),
      parseCsv(`${base}/economy_data.csv`),
      parseCsv(`${base}/communications_data.csv`),
      parseCsv(`${base}/geography_data.csv`),
    ]);

    console.log("✅ CSV files loaded:", {
      energy: energy.length,
      economy: economy.length,
      comms: comms.length,
      geo: geo.length
    });

    const energyBy = indexByCountry(energy);
    const economyBy = indexByCountry(economy);
    const commsBy = indexByCountry(comms);
    const geoBy = indexByCountry(geo);

    const countries: CountryData[] = [];

    for (const geoRow of geo) {
      const key = geoRow.Country?.trim().toUpperCase();
      if (!key) continue;

      const country = geoRow.Country.trim();
      const energyRow = energyBy[key];
      const economyRow = economyBy[key];
      const commRow = commsBy[key];

      const coords = parseLatLong(geoRow.Geographic_Coordinates as string | undefined);

      const renewableEnergyPercent = energyRow
        ? Number(energyRow.electricity_access_percent)
        : undefined;

      const gdpPerCapita = economyRow
        ? Number(economyRow.Real_GDP_per_Capita_USD)
        : undefined;

      const internetMetric = commRow
        ? Number(
            commRow.broadband_fixed_subscriptions_total ??
              commRow.internet_users_total,
          )
        : undefined;

      const co2Emissions = energyRow
        ? Number(energyRow.carbon_dioxide_emissions_Mt)
        : undefined;

      const electricityCapacityKw = energyRow
        ? Number(energyRow.electricity_generating_capacity_kW)
        : undefined;

      const internetUsers = commRow
        ? Number(commRow.internet_users_total)
        : undefined;

      if (typeof coords.lat !== "number" || typeof coords.lng !== "number") {
        // Skip countries without usable coordinates so the map does not break
        console.log(
          `⚠️ Skipping ${country} - invalid coordinates:`,
          geoRow.Geographic_Coordinates,
        );
        continue;
      }

      const record: CountryData = {
        country,
        countryCode: deriveCountryCode(commRow?.internet_country_code as string | undefined, country),
        latitude: coords.lat,
        longitude: coords.lng,
        renewableEnergyPercent: Number.isFinite(renewableEnergyPercent)
          ? renewableEnergyPercent
          : undefined,
        gdpPerCapita: Number.isFinite(gdpPerCapita) ? gdpPerCapita : undefined,
        internetSpeed: Number.isFinite(internetMetric) ? internetMetric : undefined,
        co2Emissions: Number.isFinite(co2Emissions) ? co2Emissions : undefined,
        electricityCapacityKw: Number.isFinite(electricityCapacityKw)
          ? electricityCapacityKw
          : undefined,
        internetUsers: Number.isFinite(internetUsers) ? internetUsers : undefined,
      };

      countries.push(record);
    }

    console.log(`✅ Successfully parsed ${countries.length} countries from CSV data`);
    return countries;
  } catch (error) {
    console.error("❌ Error loading CIA CSV data:", error);
    return [];
  }
}
