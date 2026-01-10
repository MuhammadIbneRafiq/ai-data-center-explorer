import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { FilterState } from "@/types/country-data";
import { RotateCcw } from "lucide-react";

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export const FilterPanel = ({ filters, onFilterChange }: FilterPanelProps) => {
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
  };

  return (
    <Card className="glass-panel p-6 space-y-6 custom-scrollbar overflow-y-auto max-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Filters</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-8 gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Renewable Energy %</Label>
            <span className="text-xs font-semibold text-primary">
              {filters.renewableEnergy[0]}% - {filters.renewableEnergy[1]}%
            </span>
          </div>
          <div className="relative pt-1">
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
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">0%</span>
              <span className="text-[10px] text-muted-foreground">100%</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Electricity Cost ($/kWh)</Label>
            <span className="text-xs font-semibold text-primary">
              ${filters.electricityCost[0]} - ${filters.electricityCost[1]}
            </span>
          </div>
          <div className="relative pt-1">
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
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">$0</span>
              <span className="text-[10px] text-muted-foreground">$100</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Avg Temperature (°C)</Label>
            <span className="text-xs font-semibold text-primary">
              {filters.temperature[0]}°C - {filters.temperature[1]}°C
            </span>
          </div>
          <div className="relative pt-1">
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
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">-20°C</span>
              <span className="text-[10px] text-muted-foreground">50°C</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">GDP per Capita ($)</Label>
            <span className="text-xs font-semibold text-primary">
              ${filters.gdp[0].toLocaleString()} - ${filters.gdp[1].toLocaleString()}
            </span>
          </div>
          <div className="relative pt-1">
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
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">$0</span>
              <span className="text-[10px] text-muted-foreground">$100K</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Internet Speed (Mbps)</Label>
            <span className="text-xs font-semibold text-primary">
              {filters.internetSpeed[0]} - {filters.internetSpeed[1]} Mbps
            </span>
          </div>
          <div className="relative pt-1">
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
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">0</span>
              <span className="text-[10px] text-muted-foreground">1000 Mbps</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
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
    </Card>
  );
};
