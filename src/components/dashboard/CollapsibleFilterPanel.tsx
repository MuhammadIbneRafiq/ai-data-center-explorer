import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterState, CountryData } from "@/types/country-data";
import { RotateCcw, ChevronLeft, ChevronRight, Filter, X, Users, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CollapsibleFilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  countryData: CountryData[];
  highlightedCountries?: Set<string>;
  onHighlightedCountriesChange?: (countries: Set<string>) => void;
}

export const CollapsibleFilterPanel = ({
  filters,
  onFilterChange,
  countryData,
  highlightedCountries,
  onHighlightedCountriesChange,
}: CollapsibleFilterPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [countrySearch, setCountrySearch] = useState("");
  const [activeTab, setActiveTab] = useState<"range" | "countries">("range");

  // Calculate data distributions for scented widgets
  const getDataDistribution = (field: keyof CountryData, bins: number = 10) => {
    const values = countryData
      .map(c => c[field])
      .filter((v): v is number => typeof v === "number" && !isNaN(v));
    
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    
    const distribution = new Array(bins).fill(0);
    values.forEach(v => {
      const binIndex = Math.min(Math.floor((v - min) / binSize), bins - 1);
      distribution[binIndex]++;
    });
    
    return distribution;
  };

  // Scented widget component
  const ScentedWidget = ({ data, height = 20 }: { data: number[], height?: number }) => {
    if (data.length === 0) return null;
    const maxValue = Math.max(...data);
    return (
      <div className="flex items-end gap-[1px] h-5 w-full mt-1">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/30 rounded-sm transition-all hover:bg-primary/50"
            style={{ height: `${(value / maxValue) * 100}%` }}
          />
        ))}
      </div>
    );
  };

  // Calculate data statistics
  const dataStats = useMemo(() => {
    const getStats = (field: keyof CountryData) => {
      const values = countryData
        .map(c => c[field])
        .filter((v): v is number => typeof v === "number" && !isNaN(v));
      
      if (values.length === 0) return { min: 0, max: 0, avg: 0, count: 0 };
      
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length
      };
    };

    return {
      electricity: getStats("electricity_access_percent"),
      electricityCap: getStats("electricity_capacity_per_capita"),
      temp: getStats("Mean_Temp"),
      gdp: getStats("Real_GDP_per_Capita_USD"),
      internet: getStats("internet_users_per_100"),
    };
  }, [countryData]);

  const resetFilters = () => {
    onFilterChange({
      renewableEnergy: [0, 100],
      electricityCost: [0, 100],
      temperature: [-20, 50],
      gdp: [0, 100000],
      internetSpeed: [0, 1000],
      selectedMetric: "renewableEnergyPercent",
      selectedCountries: [],
    });
    onHighlightedCountriesChange?.(new Set());
  };

  const filteredCountries = countryData
    .filter(c => c.country.toLowerCase().includes(countrySearch.toLowerCase()))
    .sort((a, b) => a.country.localeCompare(b.country));

  const toggleCountry = (countryCode: string) => {
    if (!onHighlightedCountriesChange) return;
    const newSet = new Set(highlightedCountries);
    if (newSet.has(countryCode)) {
      newSet.delete(countryCode);
    } else {
      newSet.add(countryCode);
    }
    onHighlightedCountriesChange(newSet);
  };

  const selectAllVisible = () => {
    if (!onHighlightedCountriesChange) return;
    const newSet = new Set(highlightedCountries);
    filteredCountries.forEach(c => newSet.add(c.countryCode));
    onHighlightedCountriesChange(newSet);
  };

  const clearAllCountries = () => {
    onHighlightedCountriesChange?.(new Set());
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-in-out flex",
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%-40px)]"
      )}
    >
      {/* Filter panel */}
      <Card className="w-80 h-full rounded-none border-r shadow-2xl bg-card/95 backdrop-blur-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </h2>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        {/* Tab buttons */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("range")}
            className={cn(
              "flex-1 py-2 px-4 text-sm font-medium transition-colors",
              activeTab === "range"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Range Filters
          </button>
          <button
            onClick={() => setActiveTab("countries")}
            className={cn(
              "flex-1 py-2 px-4 text-sm font-medium relative",
              activeTab === "countries"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Countries
            {highlightedCountries && highlightedCountries.size > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1">
                {highlightedCountries.size}
              </Badge>
            )}
          </button>
        </div>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-4 space-y-6">
            {activeTab === "range" ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Renewable Energy %</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Electricity Access %</p>
                            <p className="text-xs font-mono">Range: {dataStats.electricity.min.toFixed(1)}% - {dataStats.electricity.max.toFixed(1)}%</p>
                            <p className="text-xs font-mono">Avg: {dataStats.electricity.avg.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">{dataStats.electricity.count} countries</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {filters.renewableEnergy[0]}% - {filters.renewableEnergy[1]}%
                    </span>
                  </div>
                  <ScentedWidget data={getDataDistribution("electricity_access_percent")} />
                  <Slider
                    value={filters.renewableEnergy}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, renewableEnergy: value as [number, number] })
                    }
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Electricity Cost ($/kWh)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Electricity Capacity per Capita</p>
                            <p className="text-xs font-mono">Range: {dataStats.electricityCap.min.toFixed(2)} - {dataStats.electricityCap.max.toFixed(2)}</p>
                            <p className="text-xs font-mono">Avg: {dataStats.electricityCap.avg.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{dataStats.electricityCap.count} countries</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      ${(filters.electricityCost[0] / 100).toFixed(2)} - ${(filters.electricityCost[1] / 100).toFixed(2)}
                    </span>
                  </div>
                  <ScentedWidget data={getDataDistribution("electricity_capacity_per_capita")} />
                  <Slider
                    value={filters.electricityCost}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, electricityCost: value as [number, number] })
                    }
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Avg Temperature (°C)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Mean Temperature</p>
                            <p className="text-xs font-mono">Range: {dataStats.temp.min.toFixed(1)}°C - {dataStats.temp.max.toFixed(1)}°C</p>
                            <p className="text-xs font-mono">Avg: {dataStats.temp.avg.toFixed(1)}°C</p>
                            <p className="text-xs text-muted-foreground">{dataStats.temp.count} countries</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {filters.temperature[0]}°C - {filters.temperature[1]}°C
                    </span>
                  </div>
                  <ScentedWidget data={getDataDistribution("Mean_Temp")} />
                  <Slider
                    value={filters.temperature}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, temperature: value as [number, number] })
                    }
                    min={-20}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">GDP per Capita ($)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Real GDP per Capita (USD)</p>
                            <p className="text-xs font-mono">Range: ${dataStats.gdp.min.toLocaleString()} - ${dataStats.gdp.max.toLocaleString()}</p>
                            <p className="text-xs font-mono">Avg: ${dataStats.gdp.avg.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                            <p className="text-xs text-muted-foreground">{dataStats.gdp.count} countries</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      ${filters.gdp[0].toLocaleString()} - ${filters.gdp[1].toLocaleString()}
                    </span>
                  </div>
                  <ScentedWidget data={getDataDistribution("Real_GDP_per_Capita_USD")} />
                  <Slider
                    value={filters.gdp}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, gdp: value as [number, number] })
                    }
                    min={0}
                    max={200000}
                    step={1000}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Internet Speed (Mbps)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Internet Users per 100 people</p>
                            <p className="text-xs font-mono">Range: {dataStats.internet.min.toFixed(1)} - {dataStats.internet.max.toFixed(1)}</p>
                            <p className="text-xs font-mono">Avg: {dataStats.internet.avg.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">{dataStats.internet.count} countries</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {filters.internetSpeed[0]} - {filters.internetSpeed[1]}
                    </span>
                  </div>
                  <ScentedWidget data={getDataDistribution("internet_users_per_100")} />
                  <Slider
                    value={filters.internetSpeed}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, internetSpeed: value as [number, number] })
                    }
                    min={0}
                    max={1000}
                    step={10}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium mb-3 block">Display Metric</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "renewableEnergyPercent", label: "Renewable %" },
                      { value: "gdpPerCapita", label: "GDP/Capita" },
                      { value: "internetSpeed", label: "Internet" },
                      { value: "electricityCost", label: "Electricity" },
                    ].map((metric) => (
                      <Button
                        key={metric.value}
                        variant={filters.selectedMetric === metric.value ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          onFilterChange({ ...filters, selectedMetric: metric.value })
                        }
                      >
                        {metric.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Country filter tab */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filter by Countries</span>
                  </div>
                  
                  <Input
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="h-9"
                  />

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllVisible} className="flex-1 text-xs">
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAllCountries} className="flex-1 text-xs">
                      Clear All
                    </Button>
                  </div>

                  {/* Selected countries badges */}
                  {highlightedCountries && highlightedCountries.size > 0 && (
                    <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg">
                      {Array.from(highlightedCountries).slice(0, 10).map(code => {
                        const country = countryData.find(c => c.countryCode === code);
                        return (
                          <Badge
                            key={code}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => toggleCountry(code)}
                          >
                            {country?.country?.slice(0, 12) || code}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        );
                      })}
                      {highlightedCountries.size > 10 && (
                        <Badge variant="outline">+{highlightedCountries.size - 10} more</Badge>
                      )}
                    </div>
                  )}

                  {/* Country list */}
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {filteredCountries.map(country => (
                      <label
                        key={country.countryCode}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={highlightedCountries?.has(country.countryCode) || false}
                          onCheckedChange={() => toggleCountry(country.countryCode)}
                        />
                        <span className="text-sm truncate">{country.country}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Toggle button - positioned on the far right edge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-32 w-10 bg-primary text-primary-foreground rounded-r-lg flex items-center justify-center self-center hover:bg-primary/90 transition-colors shadow-lg"
      >
        {isOpen ? (
          <ChevronLeft className="h-5 w-5" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Filter className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
          </div>
        )}
      </button>
    </div>
  );
};
