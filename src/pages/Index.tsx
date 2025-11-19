import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { WorldMap } from "@/components/dashboard/WorldMap";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CountryDetail } from "@/components/dashboard/CountryDetail";
import { TopCountriesChart } from "@/components/dashboard/TopCountriesChart";
import { MetricsDistribution } from "@/components/dashboard/MetricsDistribution";
import { CountryData, FilterState } from "@/types/country-data";
import { Database, Globe, Zap, TrendingUp } from "lucide-react";
import { getCountryCoordinates } from "@/lib/country-coordinates";

const Index = () => {
  const [filters, setFilters] = useState<FilterState>({
    renewableEnergy: [0, 100],
    electricityCost: [0, 100],
    temperature: [-20, 50],
    gdp: [0, 100000],
    internetSpeed: [0, 1000],
    selectedMetric: "aiDatacenterScore",
  });

  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [countryData, setCountryData] = useState<CountryData[]>([]);

  // Generate mock data (In production, this would come from Supabase)
  useEffect(() => {
    const mockData: CountryData[] = Object.entries(getCountryCoordinates).map(([name, coords]) => ({
      country: name,
      countryCode: coords.code,
      latitude: coords.lat,
      longitude: coords.lng,
      renewableEnergyPercent: Math.random() * 100,
      electricityCost: Math.random() * 0.3,
      energyStability: 50 + Math.random() * 50,
      averageTemperature: -10 + Math.random() * 45,
      coolingRequirement: 30 + Math.random() * 70,
      naturalDisasterRisk: Math.random() * 100,
      gdpPerCapita: Math.random() * 80000,
      corporateTaxRate: 10 + Math.random() * 30,
      laborCost: Math.random() * 100,
      internetSpeed: Math.random() * 500,
      connectivityScore: 50 + Math.random() * 50,
      politicalStability: 40 + Math.random() * 60,
      aiDatacenterScore: 30 + Math.random() * 70,
    }));

    setCountryData(mockData);
  }, []);

  const filteredData = countryData.filter((country) => {
    if (
      country.renewableEnergyPercent !== undefined &&
      (country.renewableEnergyPercent < filters.renewableEnergy[0] ||
        country.renewableEnergyPercent > filters.renewableEnergy[1])
    ) {
      return false;
    }

    if (
      country.electricityCost !== undefined &&
      (country.electricityCost < filters.electricityCost[0] / 100 ||
        country.electricityCost > filters.electricityCost[1] / 100)
    ) {
      return false;
    }

    if (
      country.averageTemperature !== undefined &&
      (country.averageTemperature < filters.temperature[0] ||
        country.averageTemperature > filters.temperature[1])
    ) {
      return false;
    }

    if (
      country.gdpPerCapita !== undefined &&
      (country.gdpPerCapita < filters.gdp[0] || country.gdpPerCapita > filters.gdp[1])
    ) {
      return false;
    }

    if (
      country.internetSpeed !== undefined &&
      (country.internetSpeed < filters.internetSpeed[0] ||
        country.internetSpeed > filters.internetSpeed[1])
    ) {
      return false;
    }

    return true;
  });

  const avgScore =
    filteredData.reduce((acc, c) => acc + (c.aiDatacenterScore || 0), 0) / filteredData.length;
  const topScore = Math.max(...filteredData.map((c) => c.aiDatacenterScore || 0));

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-chart-2 bg-clip-text text-transparent">
            AI Datacenter Location Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Global analysis of optimal datacenter locations based on CIA World Factbook data
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Countries Analyzed"
          value={countryData.length}
          icon={Globe}
          subtitle="With complete data"
        />
        <StatsCard
          title="Filtered Results"
          value={filteredData.length}
          icon={Database}
          subtitle="Matching criteria"
        />
        <StatsCard
          title="Average Score"
          value={avgScore.toFixed(1)}
          icon={TrendingUp}
          subtitle="Out of 100"
        />
        <StatsCard
          title="Top Score"
          value={topScore.toFixed(1)}
          icon={Zap}
          subtitle="Best location"
        />
      </div>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-20rem)]">
        {/* Left Sidebar - Filters */}
        <div className="col-span-12 lg:col-span-3">
          <FilterPanel filters={filters} onFilterChange={setFilters} />
        </div>

        {/* Center - Map */}
        <div className="col-span-12 lg:col-span-6">
          <div className="h-full glass-panel rounded-xl overflow-hidden">
            <WorldMap
              data={filteredData}
              selectedMetric={filters.selectedMetric}
              onCountryClick={setSelectedCountry}
            />
          </div>
        </div>

        {/* Right Sidebar - Details */}
        <div className="col-span-12 lg:col-span-3">
          {selectedCountry ? (
            <CountryDetail
              country={selectedCountry}
              onClose={() => setSelectedCountry(null)}
            />
          ) : (
            <div className="glass-panel p-6 h-full flex items-center justify-center text-center">
              <div className="space-y-3">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">Select a Country</p>
                <p className="text-sm text-muted-foreground">
                  Click on any marker on the map to view detailed analytics
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCountriesChart data={filteredData} />
        <MetricsDistribution data={filteredData} />
      </div>
    </div>
  );
};

export default Index;
