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
import { loadCiaFinalData } from "@/lib/cia-finaldata-loader";
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
    electricityCost: [0, 1],
    temperature: [-50, 50],
    gdp: [0, 100000],
    internetSpeed: [0, 1000],
    co2PerCapita: [0, 30], // 0-30 tonnes range for CO2 per capita
    selectedMetric: "Real_GDP_per_Capita_USD",
    selectedCountries: [],
  });

  // Item reduction via slice controls
  const [sliceControls, setSliceControls] = useState({
    enabled: false,
    attribute: "Real_GDP_per_Capita_USD" as keyof CountryData,
    min: 0,
    max: 100000,
    appliedMin: 0,
    appliedMax: 100000,
  });

  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedCountries, setHighlightedCountries] = useState<Set<string>>(new Set());
  const [compareCountries, setCompareCountries] = useState<CountryData[]>([]);
  const [showLegend, setShowLegend] = useState(false);
  // Brush and linking settings
  const [brushConfig, setBrushConfig] = useState({
    // Which visualizations participate in brushing
    enabledVisualizations: {
      barchart: true,
      scatter: true, 
      parallel: true
    },
    // Brushing mode
    mode: "select" as "select" | "hover",
    // Geometric zoom level (only applies to SPLOM)
    zoomLevel: 1
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
      console.log("🔍 Starting country data load...");
      const data = await loadCiaFinalData();
      console.log("✅ Country data loaded:", { count: data.length, sample: data.slice(0, 3) });
      setCountryData(data);

      if (data.length === 0) {
        toast({
          title: "No data available",
          description: "No country metrics were found in the CIA dataset.",
        });
      }
    } catch (error) {
      console.error("Error loading country data:", error);
      toast({
        title: "Error loading data",
        description: "Failed to load country data from CSV file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredData = countryData.filter((country) => {
    // Filter by CO2 per capita
    if (
      country.co2_per_capita_tonnes !== undefined &&
      (country.co2_per_capita_tonnes < filters.co2PerCapita[0] ||
        country.co2_per_capita_tonnes > filters.co2PerCapita[1])
    ) {
      return false;
    }

    if (
      country.Mean_Temp !== undefined &&
      (country.Mean_Temp < filters.temperature[0] ||
        country.Mean_Temp > filters.temperature[1])
    ) {
      return false;
    }

    if (
      country.Real_GDP_per_Capita_USD !== undefined &&
      (country.Real_GDP_per_Capita_USD < filters.gdp[0] ||
        country.Real_GDP_per_Capita_USD > filters.gdp[1])
    ) {
      return false;
    }

    if (
      country.internet_users_per_100 !== undefined &&
      (country.internet_users_per_100 < filters.internetSpeed[0] ||
        country.internet_users_per_100 > filters.internetSpeed[1])
    ) {
      return false;
    }

    // Filter by selected countries if any
    if (
      filters.selectedCountries.length > 0 &&
      !filters.selectedCountries.includes(country.countryCode)
    ) {
      return false;
    }
    
    // Apply item reduction by slicing on the selected attribute
    if (sliceControls.enabled && country[sliceControls.attribute] !== undefined) {
      const value = country[sliceControls.attribute] as number;
      if (value < sliceControls.appliedMin || value > sliceControls.appliedMax) {
        return false;
      }
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
        onFiltersChange={setFilters}
        countryData={countryData}
        onHighlightedCountriesChange={setHighlightedCountries}
        highlightedCountries={highlightedCountries}
        isOpen={isSidebarOpen}
        onToggle={setIsSidebarOpen}
      >
        {/* Item reduction by slicing/cutting */}
        <div className="border rounded-md p-4 mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Item Reduction</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs">Enable Slicing</span>
              <input
                type="checkbox"
                checked={sliceControls.enabled}
                onChange={(e) => setSliceControls(prev => ({
                  ...prev,
                  enabled: e.target.checked
                }))}
                className="h-4 w-4"
              />
            </div>
          </div>
          
          {sliceControls.enabled && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium">Attribute</label>
                <select
                  className="w-full bg-background border rounded px-2 py-1 text-xs"
                  value={sliceControls.attribute as string}
                  onChange={(e) => {
                    const attr = e.target.value as keyof CountryData;
                    const values = countryData
                      .map(c => c[attr])
                      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
                    
                    if (values.length > 0) {
                      const min = Math.min(...values);
                      const max = Math.max(...values);
                      setSliceControls(prev => ({
                        ...prev,
                        attribute: attr,
                        min,
                        max,
                        appliedMin: min,
                        appliedMax: max
                      }));
                    }
                  }}
                >
                  {/* Economic */}
                  <optgroup label="Economic">
                    <option value="Real_GDP_PPP_billion_USD">GDP (PPP)</option>
                    <option value="Real_GDP_per_Capita_USD">GDP per Capita</option>
                    <option value="Real_GDP_Growth_Rate_percent">GDP Growth Rate</option>
                  </optgroup>
                  
                  {/* Energy */}
                  <optgroup label="Energy">
                    <option value="electricity_access_percent">Electricity Access</option>
                    <option value="electricity_capacity_per_capita">Electric Capacity</option>
                  </optgroup>
                  
                  {/* Environment */}
                  <optgroup label="Environment">
                    <option value="co2_per_capita_tonnes">CO₂ per Capita</option>
                    <option value="co2_per_gdp_tonnes_per_billion">CO₂ per GDP</option>
                  </optgroup>
                  
                  {/* Connectivity */}
                  <optgroup label="Connectivity">
                    <option value="internet_users_per_100">Internet Users</option>
                    <option value="mobile_subs_per_100">Mobile Subscribers</option>
                  </optgroup>
                </select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Range: {sliceControls.appliedMin.toFixed(0)} - {sliceControls.appliedMax.toFixed(0)}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="range" 
                    min={sliceControls.min} 
                    max={sliceControls.max} 
                    value={sliceControls.appliedMin}
                    onChange={(e) => setSliceControls(prev => ({
                      ...prev,
                      appliedMin: Math.min(Number(e.target.value), prev.appliedMax - 1)
                    }))}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="range" 
                    min={sliceControls.min} 
                    max={sliceControls.max} 
                    value={sliceControls.appliedMax}
                    onChange={(e) => setSliceControls(prev => ({
                      ...prev,
                      appliedMax: Math.max(Number(e.target.value), prev.appliedMin + 1)
                    }))}
                    className="w-full"
                  />
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <button 
                    onClick={() => setSliceControls(prev => ({
                      ...prev,
                      appliedMin: prev.min,
                      appliedMax: prev.max
                    }))}
                    className="bg-primary text-primary-foreground rounded px-2 py-1"
                  >
                    Reset Range
                  </button>
                  <span>{filteredData.length} / {countryData.length} items</span>
                </div>
              </div>
            </>
          )}
        </div>
      </CollapsibleFilterPanel>
      <div className={`h-screen flex flex-col bg-background p-2 overflow-hidden transition-all duration-300 ${
        isSidebarOpen ? 'pl-[384px]' : 'pl-2'
      }`}>
        {/* Color Legend for highlighted countries */}
        {highlightedCountries.size > 0 && (
          <div className="absolute top-14 right-4 z-50 bg-card/95 backdrop-blur border rounded-lg p-2 shadow-lg max-w-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">Selected Countries</span>
              <button
                onClick={() => setHighlightedCountries(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from(highlightedCountries).slice(0, 8).map((code, index) => {
                const country = countryData.find(c => c.countryCode === code);
                const colors = [
                  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", 
                  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))",
                  "hsl(var(--chart-7))", "hsl(var(--chart-8))"
                ];
                return (
                  <div key={code} className="flex items-center gap-1 bg-muted/50 rounded px-1 py-0.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="text-[10px]">{country?.country || code}</span>
                  </div>
                );
              })}
              {highlightedCountries.size > 8 && (
                <span className="text-[10px] text-muted-foreground">+{highlightedCountries.size - 8} more</span>
              )}
            </div>
          </div>
        )}
        
        {/* Compact Header */}
        <header className="flex items-center justify-between flex-shrink-0 mb-2">
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-chart-2 bg-clip-text text-transparent">
              AI Datacenter Location Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-1">
              <span className="text-xs font-medium">Brush Mode:</span>
              <Button 
                variant={brushConfig.mode === "select" ? "default" : "outline"} 
                size="sm" 
                className="h-6 text-xs px-2 rounded-full" 
                onClick={() => setBrushConfig(prev => ({...prev, mode: "select"}))}
              >
                Select
              </Button>
              <Button 
                variant={brushConfig.mode === "hover" ? "default" : "outline"} 
                size="sm" 
                className="h-6 text-xs px-2 rounded-full" 
                onClick={() => setBrushConfig(prev => ({...prev, mode: "hover"}))}
              >
                Hover
              </Button>
            </div>
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
                      brushEnabled={brushConfig.enabledVisualizations.barchart}
                      brushMode={brushConfig.mode}
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
                      highlightedCountries={highlightedCountries}
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
                      brushEnabled={brushConfig.enabledVisualizations.scatter}
                      brushMode={brushConfig.mode}
                      zoomLevel={brushConfig.zoomLevel}
                      onZoomChange={(level) => setBrushConfig(prev => ({...prev, zoomLevel: level}))}
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
                      brushEnabled={brushConfig.enabledVisualizations.parallel}
                      brushMode={brushConfig.mode}
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
