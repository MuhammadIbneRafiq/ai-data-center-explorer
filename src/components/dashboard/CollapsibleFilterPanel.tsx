import { useState, useMemo, useCallback, memo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface CollapsibleFilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  countryData: CountryData[];
  highlightedCountries?: Set<string>;
  onHighlightedCountriesChange?: (countries: Set<string>) => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const CollapsibleFilterPanel = memo(function CollapsibleFilterPanel({
  filters,
  onFiltersChange,
  countryData,
  highlightedCountries,
  onHighlightedCountriesChange,
  isOpen: externalIsOpen,
  onToggle,
  children
}: CollapsibleFilterPanelProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onToggle || setInternalIsOpen;
  const [countrySearch, setCountrySearch] = useState("");
  const [activeTab, setActiveTab] = useState<"range" | "countries">("range");

  // Memoized data distributions for scented widgets
  const dataDistributions = useMemo(() => {
    const getDistribution = (field: keyof CountryData, bins: number = 10) => {
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
    
    return {
      electricity: getDistribution("electricity_capacity_per_capita"),
      temp: getDistribution("Mean_Temp"),
      gdp: getDistribution("Real_GDP_per_Capita_USD"),
      internet: getDistribution("internet_users_per_100"),
      co2: getDistribution("co2_per_capita_tonnes"),
    };
  }, [countryData]);

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
      electricityCap: getStats("electricity_capacity_per_capita"),
      temp: getStats("Mean_Temp"),
      gdp: getStats("Real_GDP_per_Capita_USD"),
      internet: getStats("internet_users_per_100"),
      co2: getStats("co2_per_capita_tonnes"),
    };
  }, [countryData]);

  const resetFilters = () => {
    onFiltersChange({
      electricityCost: [0, 100],
      temperature: [-20, 50],
      gdp: [0, 100000],
      internetSpeed: [0, 1000],
      selectedMetric: "Real_GDP_per_Capita_USD",
      selectedCountries: [],
      co2PerCapita: [0, 16539924]
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
        "fixed left-0 top-0 h-full z-50 flex",
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%-40px)]"
      )}
      style={{ 
        transition: 'transform 100ms ease-out',
        willChange: 'transform'
      }}
    >
      {/* Filter panel */}
      <Card className="w-96 h-full rounded-none border-r shadow-lg bg-card">
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
            {/* Render custom children components */}
            {children && <div className="mb-4">{children}</div>}
            
            {activeTab === "range" ? (
              <>
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
                  <ScentedWidget data={dataDistributions.electricity} />
                  <Slider
                    value={filters.electricityCost}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, electricityCost: value as [number, number] })
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
                  <ScentedWidget data={dataDistributions.temp} />
                  <Slider
                    value={filters.temperature}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, temperature: value as [number, number] })
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
                  <ScentedWidget data={dataDistributions.gdp} />
                  <Slider
                    value={filters.gdp}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, gdp: value as [number, number] })
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
                  <ScentedWidget data={dataDistributions.internet} />
                  <Slider
                    value={filters.internetSpeed}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, internetSpeed: value as [number, number] })
                    }
                    min={0}
                    max={1000}
                    step={10}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">CO₂ per Capita (tonnes)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">CO₂ per Capita</p>
                            <p className="text-xs font-mono">Range: {dataStats.co2.min.toFixed(2)} - {dataStats.co2.max.toFixed(2)}</p>
                            <p className="text-xs font-mono">Avg: {dataStats.co2.avg.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{dataStats.co2.count} countries</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {filters.co2PerCapita[0]} - {filters.co2PerCapita[1]} tonnes
                    </span>
                  </div>
                  <ScentedWidget data={dataDistributions.co2} />
                  <Slider
                    value={filters.co2PerCapita}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, co2PerCapita: value as [number, number] })
                    }
                    min={0}
                    max={30}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium mb-3 block">Display Metric</Label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {[
                      { value: "Real_GDP_per_Capita_USD", label: "GDP/Capita" },
                      { value: "internet_users_per_100", label: "Internet Users" },
                      { value: "electricity_capacity_per_capita", label: "Electric Capacity" },
                      { value: "co2_per_capita_tonnes", label: "CO₂ per Capita" },
                    ].map((metric) => (
                      <Button
                        key={metric.value}
                        variant={filters.selectedMetric === metric.value ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          onFiltersChange({ ...filters, selectedMetric: metric.value })
                        }
                      >
                        {metric.label}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Custom metric selector */}
                  <div className="space-y-2 border-t pt-2 mt-2">
                    <Label className="text-xs font-medium">Add Custom Metric</Label>
                    <Select 
                      onValueChange={(value) => {
                        onFiltersChange({ ...filters, selectedMetric: value });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Choose metric..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Real_GDP_per_Capita_USD">GDP per Capita</SelectItem>
                        <SelectItem value="Real_GDP_PPP_billion_USD">GDP (PPP)</SelectItem>
                        <SelectItem value="Real_GDP_Growth_Rate_percent">GDP Growth Rate</SelectItem>
                        <SelectItem value="internet_users_per_100">Internet Users</SelectItem>
                        <SelectItem value="broadband_subs_per_100">Broadband Subscribers</SelectItem>
                        <SelectItem value="mobile_subs_per_100">Mobile Subscribers</SelectItem>
                        <SelectItem value="electricity_capacity_per_capita">Electric Capacity</SelectItem>
                        <SelectItem value="co2_per_capita_tonnes">CO₂ per Capita</SelectItem>
                        <SelectItem value="co2_per_gdp_tonnes_per_billion">CO₂ per GDP</SelectItem>
                        <SelectItem value="road_density_per_1000km2">Road Density</SelectItem>
                        <SelectItem value="rail_density_per_1000km2">Rail Density</SelectItem>
                        <SelectItem value="airports_per_million">Airports per Million</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Country filter tab */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filter by Countries</span>
                  </div>
                  
                  <Input
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="h-8 text-xs"
                  />

                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={selectAllVisible} className="flex-1 h-7 text-xs">
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAllCountries} className="flex-1 h-7 text-xs">
                      Clear All
                    </Button>
                  </div>

                  {/* Selected countries badges */}
                  {highlightedCountries && highlightedCountries.size > 0 && (
                    <div className="flex flex-wrap gap-1 p-1.5 bg-muted/50 rounded-lg">
                      {Array.from(highlightedCountries).slice(0, 8).map(code => {
                        const country = countryData.find(c => c.countryCode === code);
                        return (
                          <Badge
                            key={code}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground text-xs h-5"
                            onClick={() => toggleCountry(code)}
                          >
                            {country?.country?.slice(0, 10) || code}
                            <X className="h-2 w-2 ml-1" />
                          </Badge>
                        );
                      })}
                      {highlightedCountries.size > 8 && (
                        <Badge variant="outline" className="text-xs h-5">+{highlightedCountries.size - 8} more</Badge>
                      )}
                    </div>
                  )}

                  {/* Country list with data bars */}
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {filteredCountries.map(country => {
                      // Get a representative data value for the bar (e.g., GDP)
                      const dataValue = country.Real_GDP_per_Capita_USD || 0;
                      const maxValue = Math.max(...filteredCountries.map(c => c.Real_GDP_per_Capita_USD || 0));
                      const barWidth = maxValue > 0 ? (dataValue / maxValue) * 100 : 0;
                      
                      return (
                        <div
                          key={country.countryCode}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer group"
                          onClick={() => toggleCountry(country.countryCode)}
                        >
                          <Checkbox
                            checked={highlightedCountries?.has(country.countryCode) || false}
                            onCheckedChange={() => toggleCountry(country.countryCode)}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium truncate">{country.country}</span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                ${dataValue ? dataValue.toLocaleString(undefined, {maximumFractionDigits: 0}) : 'N/A'}
                              </span>
                            </div>
                            {/* Data bar */}
                            <div className="w-full bg-muted rounded-full h-1.5 mt-0.5 overflow-hidden">
                              <div 
                                className="h-full bg-primary/60 rounded-full transition-all duration-200 group-hover:bg-primary/80"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
});
