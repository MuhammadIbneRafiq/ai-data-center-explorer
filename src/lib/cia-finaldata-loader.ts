import Papa from "papaparse";
import { CountryData } from "@/types/country-data";
import { getComprehensiveCountryCoordinates } from "./comprehensive-country-coordinates";

interface CiaFinalDataRow {
  Country: string;
  Government_Type?: string;
  Capital?: string;
  Mean_Temp?: number;
  electricity_access_percent?: number;
  Real_GDP_per_Capita_USD?: number;
  Real_GDP_Growth_Rate_percent?: number;
  Unemployment_Rate_percent?: number;
  Youth_Unemployment_Rate_percent?: number;
  Public_Debt_percent_of_GDP?: number;
  Population_Growth_Rate?: number;
  Median_Age?: number;
  Total_Literacy_Rate?: string;
  population_density?: number;
  electricity_capacity_per_capita?: number;
  internet_users_per_100?: number;
  broadband_subs_per_100?: number;
  mobile_subs_per_100?: number;
  road_density_per_1000km2?: number;
  rail_density_per_1000km2?: number;
  airports_per_million?: number;
  co2_per_capita_tonnes?: number;
  co2_per_gdp_tonnes_per_billion?: number;
  fossil_intensity_index?: number;
  water_share?: number;
  coastline_per_1000km2?: number;
  Real_GDP_PPP_billion_USD?: number;
  [key: string]: any;
}

function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseLiteracyRate(value: any): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

/**
 * Calculate z-scores for selected metrics across all countries
 * Z-score = (value - mean) / standardDeviation
 */
function calculateZScores(countries: CountryData[]): void {
  // Helper function to calculate mean of a numeric array
  const calculateMean = (values: number[]): number => {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };
  
  // Helper function to calculate standard deviation
  const calculateStdDev = (values: number[], mean: number): number => {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  };
  
  // Calculate z-scores for electricity capacity per capita
  const electricityCapValues = countries
    .map(c => c.electricity_capacity_per_capita)
    .filter((val): val is number => val !== undefined && !isNaN(val));
    
  if (electricityCapValues.length > 0) {
    const mean = calculateMean(electricityCapValues);
    const stdDev = calculateStdDev(electricityCapValues, mean);
    
    countries.forEach(country => {
      if (country.electricity_capacity_per_capita !== undefined) {
        country.z_electricity_capacity_per_capita = 
          (country.electricity_capacity_per_capita - mean) / (stdDev || 1);
      }
    });
  }
  
  // Calculate z-scores for GDP (PPP)
  const gdpValues = countries
    .map(c => c.Real_GDP_PPP_billion_USD)
    .filter((val): val is number => val !== undefined && !isNaN(val));
    
  if (gdpValues.length > 0) {
    const mean = calculateMean(gdpValues);
    const stdDev = calculateStdDev(gdpValues, mean);
    
    countries.forEach(country => {
      if (country.Real_GDP_PPP_billion_USD !== undefined) {
        country.z_real_gdp_ppp = 
          (country.Real_GDP_PPP_billion_USD - mean) / (stdDev || 1);
      }
    });
  }
  
  // Calculate z-scores for CO2 per capita
  const co2Values = countries
    .map(c => c.co2_per_capita_tonnes)
    .filter((val): val is number => val !== undefined && !isNaN(val));
    
  if (co2Values.length > 0) {
    const mean = calculateMean(co2Values);
    const stdDev = calculateStdDev(co2Values, mean);
    
    countries.forEach(country => {
      if (country.co2_per_capita_tonnes !== undefined) {
        country.z_co2_per_capita = 
          (country.co2_per_capita_tonnes - mean) / (stdDev || 1);
      }
    });
  }
}

export async function loadCiaFinalData(): Promise<CountryData[]> {
  return new Promise((resolve, reject) => {
    const csvPath = "/CIA_finaldata.csv";
    
    console.log("🔍 Loading CIA_finaldata.csv...", { csvPath });
    
    Papa.parse<CiaFinalDataRow>(csvPath, {
      download: true,
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        console.log(`✅ Parsed ${results.data.length} rows from CIA_finaldata.csv`);
        
        const countries: CountryData[] = [];
        
        for (const row of results.data) {
          if (!row.Country) continue;
          
          const countryName = row.Country.trim();
          const coords = getComprehensiveCountryCoordinates(countryName);
          
          if (!coords) {
            console.warn(`⚠️ No coordinates found for: ${countryName}`);
            continue;
          }
          
          const countryData: CountryData = {
            country: countryName,
            countryCode: coords.code || countryName.substring(0, 3).toUpperCase(),
            latitude: coords.lat,
            longitude: coords.lng,
            
            Government_Type: row.Government_Type,
            Capital: row.Capital,
            Mean_Temp: parseNumber(row.Mean_Temp),
            
            Real_GDP_PPP_billion_USD: parseNumber(row.Real_GDP_PPP_billion_USD),
            Real_GDP_per_Capita_USD: parseNumber(row.Real_GDP_per_Capita_USD),
            Real_GDP_Growth_Rate_percent: parseNumber(row.Real_GDP_Growth_Rate_percent),
            Unemployment_Rate_percent: parseNumber(row.Unemployment_Rate_percent),
            Youth_Unemployment_Rate_percent: parseNumber(row.Youth_Unemployment_Rate_percent),
            Public_Debt_percent_of_GDP: parseNumber(row.Public_Debt_percent_of_GDP),
            
            Population_Growth_Rate: parseNumber(row.Population_Growth_Rate),
            Median_Age: parseNumber(row.Median_Age),
            Total_Literacy_Rate: parseLiteracyRate(row.Total_Literacy_Rate),
            population_density: parseNumber(row.population_density),
            
            electricity_access_percent: parseNumber(row.electricity_access_percent),
            electricity_capacity_per_capita: parseNumber(row.electricity_capacity_per_capita),
            
            internet_users_per_100: parseNumber(row.internet_users_per_100),
            broadband_subs_per_100: parseNumber(row.broadband_subs_per_100),
            mobile_subs_per_100: parseNumber(row.mobile_subs_per_100),
            
            road_density_per_1000km2: parseNumber(row.road_density_per_1000km2),
            rail_density_per_1000km2: parseNumber(row.rail_density_per_1000km2),
            airports_per_million: parseNumber(row.airports_per_million),
            
            co2_per_capita_tonnes: parseNumber(row.co2_per_capita_tonnes),
            co2_per_gdp_tonnes_per_billion: parseNumber(row.co2_per_gdp_tonnes_per_billion),
            fossil_intensity_index: parseNumber(row.fossil_intensity_index),
            
            water_share: parseNumber(row.water_share),
            coastline_per_1000km2: parseNumber(row.coastline_per_1000km2),
            
            // Z-score fields will be calculated after collecting all data
            z_electricity_capacity_per_capita: undefined,
            z_real_gdp_ppp: undefined,
            z_co2_per_capita: undefined,
            
            // Legacy mappings for backward compatibility
            gdpPerCapita: parseNumber(row.Real_GDP_per_Capita_USD),
            averageTemperature: parseNumber(row.Mean_Temp),
            renewableEnergyPercent: parseNumber(row.electricity_access_percent),
            internetSpeed: parseNumber(row.internet_users_per_100),
            electricityCapacityKw: parseNumber(row.electricity_capacity_per_capita),
            co2Emissions: parseNumber(row.co2_per_capita_tonnes),
          };
          
          countries.push(countryData);
        }
        
        console.log(`✅ Successfully loaded ${countries.length} countries with coordinates`);
        
        // Calculate z-scores for specific metrics
        calculateZScores(countries);
        
        console.log(`✅ Z-scores calculated for all countries`);
        resolve(countries);
      },
      error: (error) => {
        console.error("❌ Error parsing CIA_finaldata.csv:", error);
        reject(error);
      },
    });
  });
}
