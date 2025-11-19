import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { Zap, DollarSign, Wifi, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CountryDetailProps {
  country: CountryData;
  onClose: () => void;
}

export const CountryDetail = ({ country, onClose }: CountryDetailProps) => {
  const metrics = [
    { 
      icon: Zap, 
      label: "Renewable Energy", 
      value: country.renewableEnergyPercent !== undefined
        ? `${country.renewableEnergyPercent.toFixed(1)}%`
        : 'N/A',
      color: "text-region-excellent" 
    },
    { 
      icon: DollarSign, 
      label: "Electricity Cost", 
      value: country.electricityCost !== undefined
        ? `$${country.electricityCost.toFixed(3)}/kWh`
        : 'N/A',
      color: "text-chart-1" 
    },
    { 
      icon: Wifi, 
      label: "Internet Metric", 
      value: country.internetSpeed !== undefined
        ? country.internetSpeed.toFixed(1)
        : 'N/A',
      color: "text-chart-2" 
    },
    { 
      icon: Globe, 
      label: "GDP per Capita", 
      value: country.gdpPerCapita !== undefined
        ? `$${country.gdpPerCapita.toLocaleString()}`
        : 'N/A',
      color: "text-chart-3" 
    },
  ];

  return (
    <Card className="glass-panel p-6 space-y-6 custom-scrollbar overflow-y-auto max-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{country.country}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Key datacenter-related metrics from the CIA World Factbook
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div 
            key={metric.label} 
            className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-2"
          >
            <div className="flex items-center gap-2">
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
            <p className="text-lg font-bold">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Key Investment Factors
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-3 rounded bg-secondary/10 space-y-1">
            <span className="text-muted-foreground text-xs">Renewable Energy</span>
            <p className="font-medium text-lg">
              {country.renewableEnergyPercent ? `${country.renewableEnergyPercent.toFixed(1)}%` : 'N/A'}
            </p>
          </div>
          <div className="p-3 rounded bg-secondary/10 space-y-1">
            <span className="text-muted-foreground text-xs">Electricity Cost</span>
            <p className="font-medium text-lg">
              {country.electricityCost ? `$${country.electricityCost.toFixed(3)}/kWh` : 'N/A'}
            </p>
          </div>
          <div className="p-3 rounded bg-secondary/10 space-y-1">
            <span className="text-muted-foreground text-xs">GDP per Capita</span>
            <p className="font-medium text-lg">
              {country.gdpPerCapita ? `$${country.gdpPerCapita.toLocaleString()}` : 'N/A'}
            </p>
          </div>
          <div className="p-3 rounded bg-secondary/10 space-y-1">
            <span className="text-muted-foreground text-xs">Avg Temperature (°C)</span>
            <p className="font-medium text-lg">
              {country.averageTemperature !== undefined ? `${country.averageTemperature.toFixed(1)}°C` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
