export interface CountryData {
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  
  // Energy metrics
  renewableEnergyPercent?: number;
  electricityCost?: number;
  energyStability?: number;
  
  // Climate metrics
  averageTemperature?: number;
  coolingRequirement?: number;
  naturalDisasterRisk?: number;
  
  // Economic metrics
  gdpPerCapita?: number;
  corporateTaxRate?: number;
  laborCost?: number;
  
  // Infrastructure metrics
  internetSpeed?: number;
  connectivityScore?: number;
  politicalStability?: number;
  
  // Computed score
  aiDatacenterScore?: number;
}

export interface FilterState {
  renewableEnergy: [number, number];
  electricityCost: [number, number];
  temperature: [number, number];
  gdp: [number, number];
  internetSpeed: [number, number];
  selectedMetric: string;
}
