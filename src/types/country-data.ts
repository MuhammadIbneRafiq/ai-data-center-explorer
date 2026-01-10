export interface CountryData {
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  
  // Basic Information
  Government_Type?: string;
  Capital?: string;
  Mean_Temp?: number;
  
  // Economic Indicators
  Real_GDP_PPP_billion_USD?: number;
  Real_GDP_per_Capita_USD?: number;
  Real_GDP_Growth_Rate_percent?: number;
  Unemployment_Rate_percent?: number;
  Youth_Unemployment_Rate_percent?: number;
  Public_Debt_percent_of_GDP?: number;
  
  // Demographics
  Population_Growth_Rate?: number;
  Median_Age?: number;
  Total_Literacy_Rate?: string;
  population_density?: number;
  
  // Energy & Infrastructure
  electricity_access_percent?: number;
  electricity_capacity_per_capita?: number;
  
  // Connectivity
  internet_users_per_100?: number;
  broadband_subs_per_100?: number;
  mobile_subs_per_100?: number;
  
  // Transportation Infrastructure
  road_density_per_1000km2?: number;
  rail_density_per_1000km2?: number;
  airports_per_million?: number;
  
  // Environmental
  co2_per_capita_tonnes?: number;
  co2_per_gdp_tonnes_per_billion?: number;
  fossil_intensity_index?: number;
  
  // Geography
  water_share?: number;
  coastline_per_1000km2?: number;
  
  // Legacy fields for backward compatibility
  renewableEnergyPercent?: number;
  electricityCost?: number;
  gdpPerCapita?: number;
  internetSpeed?: number;
  averageTemperature?: number;
  waterAvailability?: number;
  naturalDisasterRisk?: number;
  corporateTaxRate?: number;
  co2Emissions?: number;
  electricityCapacityKw?: number;
  internetUsers?: number;
}

export interface FilterState {
  renewableEnergy: [number, number];
  electricityCost: [number, number];
  temperature: [number, number];
  gdp: [number, number];
  internetSpeed: [number, number];
  selectedMetric: string;
  selectedCountries: string[]; // Country codes for filtering
}
