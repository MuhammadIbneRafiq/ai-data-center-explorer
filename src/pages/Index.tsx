import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { WorldMap } from "@/components/dashboard/WorldMap";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CountryDetail } from "@/components/dashboard/CountryDetail";
import { TopCountriesChart } from "@/components/dashboard/TopCountriesChart";
import { MetricsDistribution } from "@/components/dashboard/MetricsDistribution";
import { ParallelCoordinatesChart } from "@/components/dashboard/ParallelCoordinatesChart";
import { ScoreBreakdown } from "@/components/dashboard/ScoreBreakdown";
import { CountryData, FilterState } from "@/types/country-data";
import { Database, Globe, Zap, TrendingUp, Upload } from "lucide-react";
import { fetchCountryData } from "@/lib/supabase-data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [filters, setFilters] = useState<FilterState>({
    renewableEnergy: [0, 100],
    electricityCost: [0, 100],
    temperature: [-20, 50],
    gdp: [0, 100000],
    internetSpeed: [0, 1000],
    selectedMetric: "renewableEnergyPercent",
  });

  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch data from Lovable Cloud
  useEffect(() => {
    loadCountryData();
  }, []);

  const loadCountryData = async () => {
    try {
      setLoading(true);
      const data = await fetchCountryData();
      setCountryData(data);

      if (data.length === 0) {
        toast({
          title: "No data available",
          description: "No country metrics were found from Supabase or local CSV files.",
        });
      }
    } catch (error) {
      console.error("Error loading country data:", error);
      toast({
        title: "Error loading data",
        description: "Failed to fetch country data from database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const safeAverage = (values: Array<number | undefined>): number | undefined => {
    const nums = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
    if (nums.length === 0) return undefined;
    return nums.reduce((sum, v) => sum + v, 0) / nums.length;
  };

  const avgRenewable = safeAverage(filteredData.map((c) => c.renewableEnergyPercent));
  const avgInternetMetric = safeAverage(filteredData.map((c) => c.internetSpeed));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-lg text-muted-foreground">Loading datacenter analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-10 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-chart-2 bg-clip-text text-transparent">
            AI Datacenter Location Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Strategic site selection for sustainable and profitable AI infrastructure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCountryData}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Refresh Data
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Countries Analyzed"
          value={countryData.length}
          icon={Globe}
          subtitle="Loaded from database / CSV"
        />
        <StatsCard
          title="Filtered Results"
          value={filteredData.length}
          icon={Database}
          subtitle="Matching current filters"
        />
        <StatsCard
          title="Avg Renewable Energy %"
          value={
            avgRenewable !== undefined ? `${avgRenewable.toFixed(1)}%` : "N/A"
          }
          icon={TrendingUp}
          subtitle="Across filtered countries"
        />
        <StatsCard
          title="Avg Internet Metric"
          value={
            avgInternetMetric !== undefined ? avgInternetMetric.toFixed(1) : "N/A"
          }
          icon={Zap}
          subtitle="Higher means better connectivity"
        />
      </div>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-20rem)]">
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
              activeCountry={selectedCountry}
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
        <TopCountriesChart
          data={filteredData}
          metric={filters.selectedMetric as keyof CountryData}
          activeCountry={selectedCountry}
          onCountrySelect={setSelectedCountry}
        />
        <ScoreBreakdown data={filteredData} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsDistribution data={filteredData} />
        <ParallelCoordinatesChart
          data={filteredData}
          selectedCountry={selectedCountry}
          onCountrySelect={setSelectedCountry}
        />
      </div>
    </div>
  );
};

export default Index;
