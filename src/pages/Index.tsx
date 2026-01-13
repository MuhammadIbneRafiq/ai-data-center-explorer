import { useState, useEffect, useCallback } from "react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { CollapsibleFilterPanel } from "@/components/dashboard/CollapsibleFilterPanel";
import { TopCountriesChart } from "@/components/dashboard/TopCountriesChart";
import { SpiderChart } from "@/components/dashboard/SpiderChart";
import { InteractiveParallelCoordinates } from "@/components/dashboard/InteractiveParallelCoordinates";
import { ScatterPlotMatrix } from "@/components/dashboard/ScatterPlotMatrix";
import { IntroTutorial } from "@/components/dashboard/IntroTutorial";
import { CountryData, FilterState } from "@/types/country-data";
import { Upload, RotateCcw, Move } from "lucide-react";
import { fetchCountryData } from "@/lib/supabase-data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

// Section IDs for resizable panels
type SectionId = "barchart" | "spider" | "scatter" | "parallel";

const Index = () => {
  const [filters, setFilters] = useState<FilterState>({
    renewableEnergy: [0, 100],
    electricityCost: [0, 100],
    temperature: [-20, 50],
    gdp: [0, 100000],
    internetSpeed: [0, 1000],
    selectedMetric: "renewableEnergyPercent",
    selectedCountries: [],
  });

  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedCountries, setHighlightedCountries] = useState<Set<string>>(new Set());
  const [compareCountries, setCompareCountries] = useState<CountryData[]>([]);
  const { toast } = useToast();

  // Panel sizes state for resizable panels
  const [panelSizes, setPanelSizes] = useState({
    topRow: [50, 50],
    bottomRow: [50, 50],
  });
  const [rowSizes, setRowSizes] = useState([45, 55]); // top row 45%, bottom row 55%

  const resetLayout = useCallback(() => {
    setPanelSizes({
      topRow: [50, 50],
      bottomRow: [50, 50],
    });
    setRowSizes([45, 55]);
    toast({
      title: "Layout Reset",
      description: "Panel sizes have been reset to default.",
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

  // Handle country selection from charts
  const handleChartCountrySelect = useCallback((country: CountryData) => {
    setSelectedCountry(country);
  }, []);

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
      <CollapsibleFilterPanel
        filters={filters}
        onFilterChange={setFilters}
        countryData={countryData}
        highlightedCountries={highlightedCountries}
        onHighlightedCountriesChange={setHighlightedCountries}
      />
      <div className="h-screen flex flex-col bg-background p-3 pr-14 overflow-hidden">
        {/* Compact Header */}
        <header className="flex items-center justify-between flex-shrink-0 mb-2">
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-chart-2 bg-clip-text text-transparent">
              AI Datacenter Location Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetLayout}
              className="gap-1 h-8 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCountryData}
              className="gap-1 h-8 text-xs"
            >
              <Upload className="h-3 w-3" />
              Refresh
            </Button>
            <ThemeToggle />
          </div>
        </header>
        
        {/* Layout hint - compact */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 flex-shrink-0 mb-2">
          <Move className="h-3 w-3" />
          <span>Drag edges to resize • Click charts to select countries</span>
        </div>

        {/* Resizable Panel Grid - fills remaining viewport */}
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup
            direction="vertical"
            className="h-full rounded-lg border"
          >
            {/* Top Row */}
            <ResizablePanel defaultSize={45} minSize={20}>
              <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel 
                  defaultSize={panelSizes.topRow[0]} 
                  minSize={15}
                  onResize={(size) => setPanelSizes(prev => ({ ...prev, topRow: [size, 100 - size] }))}
                >
                  <div className="h-full p-1 overflow-auto">
                    <TopCountriesChart
                      data={filteredData}
                      metric={filters.selectedMetric as keyof CountryData}
                      activeCountry={selectedCountry}
                      onCountrySelect={handleChartCountrySelect}
                      highlightedCountries={highlightedCountries}
                      onBrushSelection={setHighlightedCountries}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel 
                  defaultSize={panelSizes.topRow[1]} 
                  minSize={15}
                  onResize={(size) => setPanelSizes(prev => ({ ...prev, topRow: [100 - size, size] }))}
                >
                  <div className="h-full p-1 overflow-auto">
                    <SpiderChart
                      data={filteredData}
                      selectedCountry={selectedCountry}
                      compareCountries={compareCountries}
                      onCountrySelect={handleSpiderCountrySelect}
                      onClearComparison={() => setCompareCountries([])}
                      onCompareCountriesChange={handleCompareCountriesChange}
                    />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Bottom Row */}
            <ResizablePanel defaultSize={55} minSize={20}>
              <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel 
                  defaultSize={panelSizes.bottomRow[0]} 
                  minSize={15}
                  onResize={(size) => setPanelSizes(prev => ({ ...prev, bottomRow: [size, 100 - size] }))}
                >
                  <div className="h-full p-1 overflow-auto">
                    <ScatterPlotMatrix
                      data={filteredData}
                      activeCountry={selectedCountry}
                      onCountrySelect={handleChartCountrySelect}
                      highlightedCountries={highlightedCountries}
                      onBrushSelection={setHighlightedCountries}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel 
                  defaultSize={panelSizes.bottomRow[1]} 
                  minSize={15}
                  onResize={(size) => setPanelSizes(prev => ({ ...prev, bottomRow: [100 - size, size] }))}
                >
                  <div className="h-full p-1 overflow-auto">
                    <InteractiveParallelCoordinates
                      data={filteredData}
                      selectedCountries={selectedCountry ? [selectedCountry] : []}
                      onCountrySelect={handleChartCountrySelect}
                      highlightedCountries={highlightedCountries}
                      onMultiSelect={setHighlightedCountries}
                    />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </>
  );
};

export default Index;
