import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterState, CountryData } from "@/types/country-data";
import { RotateCcw, ChevronLeft, ChevronRight, Filter, X, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
        "fixed right-0 top-0 h-full z-50 transition-all duration-300 ease-in-out flex",
        isOpen ? "translate-x-0" : "translate-x-[calc(100%-40px)]"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-32 w-10 bg-primary text-primary-foreground rounded-l-lg flex items-center justify-center self-center hover:bg-primary/90 transition-colors shadow-lg"
      >
        {isOpen ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Filter className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4" />
          </div>
        )}
      </button>

      {/* Filter panel */}
      <Card className="w-80 h-full rounded-none border-l shadow-2xl bg-card/95 backdrop-blur-md">
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
              "flex-1 py-2 px-4 text-sm font-medium transition-colors relative",
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
                    <Label className="text-sm font-medium">Renewable Energy %</Label>
                    <span className="text-xs font-semibold text-primary">
                      {filters.renewableEnergy[0]}% - {filters.renewableEnergy[1]}%
                    </span>
                  </div>
                  <Slider
                    value={filters.renewableEnergy}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, renewableEnergy: value as [number, number] })
                    }
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Electricity Cost ($/kWh)</Label>
                    <span className="text-xs font-semibold text-primary">
                      ${filters.electricityCost[0]} - ${filters.electricityCost[1]}
                    </span>
                  </div>
                  <Slider
                    value={filters.electricityCost}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, electricityCost: value as [number, number] })
                    }
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Avg Temperature (°C)</Label>
                    <span className="text-xs font-semibold text-primary">
                      {filters.temperature[0]}°C - {filters.temperature[1]}°C
                    </span>
                  </div>
                  <Slider
                    value={filters.temperature}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, temperature: value as [number, number] })
                    }
                    min={-20}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">GDP per Capita ($)</Label>
                    <span className="text-xs font-semibold text-primary">
                      ${filters.gdp[0].toLocaleString()} - ${filters.gdp[1].toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={filters.gdp}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, gdp: value as [number, number] })
                    }
                    min={0}
                    max={100000}
                    step={5000}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Internet Speed (Mbps)</Label>
                    <span className="text-xs font-semibold text-primary">
                      {filters.internetSpeed[0]} - {filters.internetSpeed[1]} Mbps
                    </span>
                  </div>
                  <Slider
                    value={filters.internetSpeed}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, internetSpeed: value as [number, number] })
                    }
                    min={0}
                    max={1000}
                    step={50}
                    className="w-full"
                  />
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-3 block">Display Metric</Label>
                  <div className="space-y-2">
                    {[
                      { value: "renewableEnergyPercent", label: "Renewable Energy %" },
                      { value: "electricityCost", label: "Electricity Cost ($/kWh)" },
                      { value: "internetSpeed", label: "Internet Metric" },
                      { value: "gdpPerCapita", label: "GDP per Capita" },
                    ].map((metric) => (
                      <Button
                        key={metric.value}
                        variant={filters.selectedMetric === metric.value ? "default" : "outline"}
                        className="w-full justify-start"
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
    </div>
  );
};
