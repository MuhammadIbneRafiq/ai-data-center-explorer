export interface CountryData {
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  
  // Power & Energy metrics
  renewableEnergyPercent?: number;
  electricityCost?: number;
  energyStability?: number;
  
  // Water metrics
  waterAvailability?: number;
  
  // Climate metrics
  averageTemperature?: number;
  coolingRequirement?: number;
  naturalDisasterRisk?: number;
  
  // Economic metrics
  gdpPerCapita?: number;
  corporateTaxRate?: number;
  laborCost?: number;
  landPrice?: number;
  employmentRate?: number;
  
  // Infrastructure metrics
  internetSpeed?: number;
  connectivityScore?: number;
  transportationScore?: number;
  availableLand?: number;
  
  // Regulatory & Stability
  politicalStability?: number;
  regulatoryEase?: number;
  
  // Component scores
  powerScore?: number;
  sustainabilityScore?: number;
  economicScore?: number;
  infrastructureScore?: number;
  riskScore?: number;
  
  // Overall computed score
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
