export interface CountryData {
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  
  // Raw metrics from CIA World Factbook
  renewableEnergyPercent?: number;
  electricityCost?: number;
  gdpPerCapita?: number;
  internetSpeed?: number;
  averageTemperature?: number;
  
  // Additional raw metrics (if available from CSVs)
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
}
