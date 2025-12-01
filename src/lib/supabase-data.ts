import { supabase } from "@/integrations/supabase/client";
import { CountryData } from "@/types/country-data";
import { loadCiaFinalData } from "@/lib/cia-finaldata-loader";

export async function fetchCountryData(): Promise<CountryData[]> {
  try {
    const { data, error } = await supabase
      .from("country_data")
      .select("*");

    console.log("[CountryData] Supabase query result", {
      hasError: !!error,
      rowCount: data?.length ?? 0,
    });

    if (error || !data || data.length === 0) {
      console.warn(
        "Supabase unavailable or returned no rows, falling back to CSV data",
        error,
      );
      return await loadCiaFinalData();
    }

    // Transform database results to match CountryData type - raw metrics only
    return data.map((row) => ({
      country: row.country,
      countryCode: row.country_code,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      
      // Raw metrics only
      renewableEnergyPercent: row.renewable_energy_percent,
      electricityCost: row.electricity_cost,
      gdpPerCapita: row.gdp_per_capita,
      internetSpeed: row.internet_speed,
      averageTemperature: row.average_temperature,
      waterAvailability: row.water_availability_score,
      naturalDisasterRisk: row.natural_disaster_risk,
      corporateTaxRate: row.corporate_tax_rate,
    }));
  } catch (error) {
    console.error("Error fetching country data from Supabase, falling back to CSV data:", error);
    return await loadCiaFinalData();
  }
}

export async function insertSampleData() {
  // Sample data based on research
  const sampleCountries = [
    {
      country: "Iceland",
      country_code: "IS",
      latitude: 64.9631,
      longitude: -19.0208,
      renewable_energy_percent: 100,
      electricity_cost: 0.05,
      energy_stability_score: 95,
      water_availability_score: 95,
      average_temperature: 4.5,
      natural_disaster_risk: 25,
      gdp_per_capita: 68000,
      corporate_tax_rate: 20,
      labor_cost_index: 85,
      internet_speed: 220,
      connectivity_score: 88,
      transportation_infrastructure_score: 75,
      available_land_score: 90,
      political_stability_score: 95,
      regulatory_ease_score: 85,
    },
    {
      country: "Norway",
      country_code: "NO",
      latitude: 60.472,
      longitude: 8.4689,
      renewable_energy_percent: 98,
      electricity_cost: 0.08,
      energy_stability_score: 92,
      water_availability_score: 92,
      average_temperature: 6.5,
      natural_disaster_risk: 15,
      gdp_per_capita: 82000,
      corporate_tax_rate: 22,
      labor_cost_index: 90,
      internet_speed: 200,
      connectivity_score: 92,
      transportation_infrastructure_score: 88,
      available_land_score: 85,
      political_stability_score: 98,
      regulatory_ease_score: 90,
    },
    {
      country: "Sweden",
      country_code: "SE",
      latitude: 60.1282,
      longitude: 18.6435,
      renewable_energy_percent: 56,
      electricity_cost: 0.09,
      energy_stability_score: 90,
      water_availability_score: 88,
      average_temperature: 7.0,
      natural_disaster_risk: 12,
      gdp_per_capita: 58000,
      corporate_tax_rate: 20.6,
      labor_cost_index: 82,
      internet_speed: 190,
      connectivity_score: 90,
      transportation_infrastructure_score: 92,
      available_land_score: 80,
      political_stability_score: 96,
      regulatory_ease_score: 88,
    },
    {
      country: "Canada",
      country_code: "CA",
      latitude: 56.1304,
      longitude: -106.3468,
      renewable_energy_percent: 67,
      electricity_cost: 0.07,
      energy_stability_score: 88,
      water_availability_score: 90,
      average_temperature: -5.0,
      natural_disaster_risk: 20,
      gdp_per_capita: 52000,
      corporate_tax_rate: 26.5,
      labor_cost_index: 75,
      internet_speed: 180,
      connectivity_score: 85,
      transportation_infrastructure_score: 85,
      available_land_score: 95,
      political_stability_score: 92,
      regulatory_ease_score: 82,
    },
    {
      country: "Finland",
      country_code: "FI",
      latitude: 61.9241,
      longitude: 25.7482,
      renewable_energy_percent: 43,
      electricity_cost: 0.10,
      energy_stability_score: 89,
      water_availability_score: 85,
      average_temperature: 5.5,
      natural_disaster_risk: 10,
      gdp_per_capita: 51000,
      corporate_tax_rate: 20,
      labor_cost_index: 78,
      internet_speed: 185,
      connectivity_score: 89,
      transportation_infrastructure_score: 86,
      available_land_score: 82,
      political_stability_score: 94,
      regulatory_ease_score: 87,
    },
  ];

  const { error } = await supabase.from("country_data").insert(sampleCountries);

  if (error) {
    console.error("Error inserting sample data:", error);
    throw error;
  }

  // Calculate scores for all inserted countries
  const { data: countries } = await supabase.from("country_data").select("id");
  
  if (countries) {
    for (const country of countries) {
      await supabase.rpc("calculate_datacenter_score", { country_id: country.id });
    }
  }
}
