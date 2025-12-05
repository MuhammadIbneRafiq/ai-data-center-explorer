import { useState, useEffect, useCallback, ReactNode } from "react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { EnhancedWorldMap } from "@/components/dashboard/EnhancedWorldMap";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CountryDetail } from "@/components/dashboard/CountryDetail";
import { TopCountriesChart } from "@/components/dashboard/TopCountriesChart";
import { SpiderChart } from "@/components/dashboard/SpiderChart";
import { InteractiveParallelCoordinates } from "@/components/dashboard/InteractiveParallelCoordinates";
import { EnhancedScatterPlot } from "@/components/dashboard/EnhancedScatterPlot";
import { IntroTutorial } from "@/components/dashboard/IntroTutorial";
import { DraggableSection } from "@/components/dashboard/DraggableSection";
import { CountryData, FilterState } from "@/types/country-data";
import { Database, Globe, Zap, TrendingUp, Upload, RotateCcw, Move } from "lucide-react";
import { fetchCountryData } from "@/lib/supabase-data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Section IDs for drag and drop
type SectionId = "map" | "filters" | "details" | "barchart" | "spider" | "scatter" | "parallel";

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
  const [highlightedCountries, setHighlightedCountries] = useState<Set<string>>(new Set());
  const [compareCountries, setCompareCountries] = useState<CountryData[]>([]);
  const { toast } = useToast();

  // Draggable layout state - unified grid with all sections same size
  const defaultSectionOrder: SectionId[] = ["filters", "map", "details", "barchart", "spider", "scatter", "parallel"];
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(defaultSectionOrder);
  const [draggedSection, setDraggedSection] = useState<SectionId | null>(null);
  const [dragOverSection, setDragOverSection] = useState<SectionId | null>(null);

  // Drag handlers for reordering sections
  const handleDragStart = useCallback((id: SectionId) => {
    setDraggedSection(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: SectionId) => {
    e.preventDefault();
    if (draggedSection && draggedSection !== id) {
      setDragOverSection(id);
    }
  }, [draggedSection]);

  const handleDrop = useCallback((targetId: SectionId) => {
    if (!draggedSection || draggedSection === targetId) {
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    // Unified grid - any section can swap with any other
    setSectionOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      const draggedIndex = newOrder.indexOf(draggedSection);
      const targetIndex = newOrder.indexOf(targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Swap the two sections
        newOrder[draggedIndex] = targetId;
        newOrder[targetIndex] = draggedSection;
      }
      
      return newOrder;
    });

    setDraggedSection(null);
    setDragOverSection(null);
  }, [draggedSection]);

  const resetLayout = useCallback(() => {
    setSectionOrder(defaultSectionOrder);
    toast({
      title: "Layout Reset",
      description: "Dashboard layout has been reset to default.",
    });
  }, [toast]);

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

  const handleSpiderCountrySelect = (
    country: CountryData,
    options?: { toggleCompare?: boolean }
  ) => {
    setSelectedCountry(country);
    if (options?.toggleCompare === false) {
      return;
    }

    setCompareCountries((prev) => {
      const exists = prev.some((c) => c.countryCode === country.countryCode);
      if (exists) {
        return prev.filter((c) => c.countryCode !== country.countryCode);
      }
      return [...prev, country];
    });
  };

  const handleCompareCountriesChange = (countries: CountryData[]) => {
    setCompareCountries(countries);
  };

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
    <>
      <IntroTutorial />
      <div className="min-h-screen bg-background p-4 pb-10 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-chart-2 bg-clip-text text-transparent">
              AI Datacenter Location Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Group 13 Visualization group present
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={resetLayout}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Layout
            </Button>
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
        
        {/* Layout hint */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Move className="h-4 w-4" />
          <span>Drag charts by their left handle to rearrange the layout</span>
        </div>

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

        {/* Unified Draggable Grid - All sections same size */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sectionOrder.map((sectionId) => {
            const allComponents: Record<SectionId, ReactNode> = {
              filters: (
                <div className="h-full min-h-[420px]">
                  <FilterPanel filters={filters} onFilterChange={setFilters} />
                </div>
              ),
              map: (
                <div className="h-full glass-panel rounded-xl overflow-hidden min-h-[420px]">
                  <EnhancedWorldMap
                    data={filteredData}
                    selectedMetric={filters.selectedMetric}
                    onCountryClick={setSelectedCountry}
                    activeCountry={selectedCountry}
                    highlightedCountries={highlightedCountries}
                  />
                </div>
              ),
              details: (
                <div className="h-full min-h-[420px]">
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
              ),
              barchart: (
                <TopCountriesChart
                  data={filteredData}
                  metric={filters.selectedMetric as keyof CountryData}
                  activeCountry={selectedCountry}
                  onCountrySelect={setSelectedCountry}
                  highlightedCountries={highlightedCountries}
                  onBrushSelection={setHighlightedCountries}
                />
              ),
              spider: (
                <SpiderChart
                  data={filteredData}
                  selectedCountry={selectedCountry}
                  compareCountries={compareCountries}
                  onCountrySelect={handleSpiderCountrySelect}
                  onClearComparison={() => setCompareCountries([])}
                  onCompareCountriesChange={handleCompareCountriesChange}
                />
              ),
              scatter: (
                <EnhancedScatterPlot
                  data={filteredData}
                  activeCountry={selectedCountry}
                  onCountrySelect={setSelectedCountry}
                  highlightedCountries={highlightedCountries}
                />
              ),
              parallel: (
                <InteractiveParallelCoordinates
                  data={filteredData}
                  selectedCountries={selectedCountry ? [selectedCountry] : []}
                  onCountrySelect={setSelectedCountry}
                  highlightedCountries={highlightedCountries}
                />
              ),
            };

            return (
              <DraggableSection
                key={sectionId}
                id={sectionId}
                onDragStart={(id) => handleDragStart(id as SectionId)}
                onDragOver={(e, id) => handleDragOver(e, id as SectionId)}
                onDrop={(id) => handleDrop(id as SectionId)}
                isDragging={draggedSection === sectionId}
                isDragOver={dragOverSection === sectionId}
              >
                {allComponents[sectionId]}
              </DraggableSection>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Index;
