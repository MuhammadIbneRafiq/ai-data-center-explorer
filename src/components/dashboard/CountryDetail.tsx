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
    { metric: "Power", value: country.powerScore || 50 },
    { metric: "Sustainability", value: country.sustainabilityScore || 50 },
    { metric: "Economic", value: country.economicScore || 50 },
    { metric: "Infrastructure", value: country.infrastructureScore || 50 },
    { metric: "Risk Profile", value: country.riskScore || 50 },
  ];

  const metrics = [
    { 
      icon: Zap, 
      label: "Power Score", 
      value: country.powerScore ? `${country.powerScore.toFixed(1)}/100` : 'N/A',
      color: "text-region-excellent" 
    },
    { 
      icon: Activity, 
      label: "Sustainability", 
      value: country.sustainabilityScore ? `${country.sustainabilityScore.toFixed(1)}/100` : 'N/A',
      color: "text-chart-3" 
    },
    { 
      icon: DollarSign, 
      label: "Economic Viability", 
      value: country.economicScore ? `${country.economicScore.toFixed(1)}/100` : 'N/A',
      color: "text-chart-1" 
    },
    { 
      icon: Wifi, 
      label: "Infrastructure", 
      value: country.infrastructureScore ? `${country.infrastructureScore.toFixed(1)}/100` : 'N/A',
      color: "text-chart-2" 
    },
    { 
      icon: Shield, 
      label: "Risk Profile", 
      value: country.riskScore ? `${country.riskScore.toFixed(1)}/100` : 'N/A',
      color: "text-accent" 
    },
    { 
      icon: TrendingUp, 
      label: "Overall Score", 
      value: country.aiDatacenterScore ? `${country.aiDatacenterScore.toFixed(1)}/100` : 'N/A',
      color: "text-primary" 
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
            <span className="text-muted-foreground text-xs">Water Availability</span>
            <p className="font-medium text-lg">
              {country.waterAvailability ? `${country.waterAvailability.toFixed(0)}/100` : 'N/A'}
            </p>
          </div>
          <div className="p-3 rounded bg-secondary/10 space-y-1">
            <span className="text-muted-foreground text-xs">Disaster Risk</span>
            <p className="font-medium text-lg">
              {country.naturalDisasterRisk ? `${country.naturalDisasterRisk.toFixed(0)}/100` : 'N/A'}
            </p>
          </div>
          <div className="p-3 rounded bg-secondary/10 space-y-1">
            <span className="text-muted-foreground text-xs">Corporate Tax Rate</span>
            <p className="font-medium text-lg">
              {country.corporateTaxRate ? `${country.corporateTaxRate.toFixed(1)}%` : 'N/A'}
            </p>
          </div>
          <div className="p-3 rounded bg-secondary/10 space-y-1">
            <span className="text-muted-foreground text-xs">Land Availability</span>
            <p className="font-medium text-lg">
              {country.availableLand ? `${country.availableLand.toFixed(0)}/100` : 'N/A'}
            </p>
          </div>
          <div className="p-3 rounded bg-secondary/10 space-y-1">
            <span className="text-muted-foreground text-xs">Transport Infrastructure</span>
            <p className="font-medium text-lg">
              {country.transportationScore ? `${country.transportationScore.toFixed(0)}/100` : 'N/A'}
            </p>
          </div>
          <div className="p-3 rounded bg-secondary/10 space-y-1">
            <span className="text-muted-foreground text-xs">Regulatory Ease</span>
            <p className="font-medium text-lg">
              {country.regulatoryEase ? `${country.regulatoryEase.toFixed(0)}/100` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
