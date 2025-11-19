import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { 
  Zap, DollarSign, Thermometer, Wifi, TrendingUp, 
  Activity, Globe, Shield, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, ResponsiveContainer, Tooltip 
} from "recharts";

interface CountryDetailProps {
  country: CountryData;
  onClose: () => void;
}

export const CountryDetail = ({ country, onClose }: CountryDetailProps) => {
  const radarData = [
    { metric: "Renewable Energy", value: country.renewableEnergyPercent || 0 },
    { metric: "Cost Efficiency", value: 100 - (country.electricityCost || 50) },
    { metric: "Infrastructure", value: (country.internetSpeed || 0) / 10 },
    { metric: "Climate", value: Math.max(0, 100 - Math.abs((country.averageTemperature || 0) - 10) * 2) },
    { metric: "Economic", value: Math.min(100, (country.gdpPerCapita || 0) / 1000) },
    { metric: "Stability", value: (country.politicalStability || 50) },
  ];

  const metrics = [
    { 
      icon: Zap, 
      label: "Renewable Energy", 
      value: `${country.renewableEnergyPercent?.toFixed(1) || 'N/A'}%`,
      color: "text-region-excellent" 
    },
    { 
      icon: DollarSign, 
      label: "Electricity Cost", 
      value: country.electricityCost ? `$${country.electricityCost.toFixed(2)}/kWh` : 'N/A',
      color: "text-chart-1" 
    },
    { 
      icon: Thermometer, 
      label: "Avg Temperature", 
      value: country.averageTemperature ? `${country.averageTemperature.toFixed(1)}°C` : 'N/A',
      color: "text-chart-4" 
    },
    { 
      icon: Wifi, 
      label: "Internet Speed", 
      value: country.internetSpeed ? `${country.internetSpeed.toFixed(0)} Mbps` : 'N/A',
      color: "text-chart-2" 
    },
    { 
      icon: TrendingUp, 
      label: "GDP per Capita", 
      value: country.gdpPerCapita ? `$${country.gdpPerCapita.toLocaleString()}` : 'N/A',
      color: "text-region-good" 
    },
    { 
      icon: Shield, 
      label: "Political Stability", 
      value: country.politicalStability ? `${country.politicalStability.toFixed(0)}/100` : 'N/A',
      color: "text-accent" 
    },
  ];

  return (
    <Card className="glass-panel p-6 space-y-6 custom-scrollbar overflow-y-auto max-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{country.country}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI Datacenter Suitability Score: {' '}
            <span className="text-lg font-bold text-primary">
              {country.aiDatacenterScore?.toFixed(1) || 'N/A'}/100
            </span>
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

      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Performance Profile
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar 
                name={country.country} 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.3} 
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Additional Information
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center p-2 rounded bg-secondary/10">
            <span className="text-muted-foreground">Cooling Requirement</span>
            <span className="font-medium">
              {country.coolingRequirement ? `${country.coolingRequirement.toFixed(0)} units` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center p-2 rounded bg-secondary/10">
            <span className="text-muted-foreground">Natural Disaster Risk</span>
            <span className="font-medium">
              {country.naturalDisasterRisk ? `${country.naturalDisasterRisk.toFixed(0)}/100` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center p-2 rounded bg-secondary/10">
            <span className="text-muted-foreground">Labor Cost Index</span>
            <span className="font-medium">
              {country.laborCost ? `${country.laborCost.toFixed(0)}` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
