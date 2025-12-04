import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryData } from "@/types/country-data";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

interface SpiderChartProps {
  data: CountryData[];
  selectedCountry?: CountryData | null;
  compareCountries?: CountryData[];
  onCountrySelect?: (country: CountryData, options?: { toggleCompare?: boolean }) => void;
  onClearComparison?: () => void;
  onCompareCountriesChange?: (countries: CountryData[]) => void;
}

interface RadarAttribute {
  key: keyof CountryData;
  label: string;
  fullLabel: string;
}

// Attributes for the radar chart - covering different task aspects
const radarAttributes: RadarAttribute[] = [
  // T1: Accessibility
  { key: "road_density_per_1000km2", label: "Road", fullLabel: "Road Density" },
  { key: "airports_per_million", label: "Airports", fullLabel: "Airports per Million" },
  { key: "internet_users_per_100", label: "Internet", fullLabel: "Internet Users" },
  
  // T2: Profitability  
  { key: "Real_GDP_per_Capita_USD", label: "GDP", fullLabel: "GDP per Capita" },
  { key: "Unemployment_Rate_percent", label: "Unemp.", fullLabel: "Unemployment Rate (inverted)" },
  
  // T3: Efficiency
  { key: "electricity_access_percent", label: "Elec.", fullLabel: "Electricity Access" },
  { key: "co2_per_gdp_tonnes_per_billion", label: "CO₂/GDP", fullLabel: "CO₂ Efficiency (inverted)" },
];

// Invert these metrics (lower is better)
const invertedMetrics = ["Unemployment_Rate_percent", "co2_per_gdp_tonnes_per_billion"];

export const SpiderChart = ({
  data,
  selectedCountry,
  compareCountries = [],
  onCountrySelect,
  onClearComparison,
  onCompareCountriesChange,
}: SpiderChartProps) => {
  // Calculate normalized values for radar chart
  const { radarData, ranges } = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};
    
    // Calculate ranges for each attribute
    radarAttributes.forEach(attr => {
      const values = data
        .map(d => d[attr.key] as number)
        .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
      
      if (values.length > 0) {
        ranges[attr.key] = {
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    });

    // Create radar data
    const radarData = radarAttributes.map(attr => {
      const result: Record<string, any> = {
        attribute: attr.label,
        fullLabel: attr.fullLabel,
      };

      // Normalize value for a country
      const normalizeValue = (country: CountryData | null | undefined) => {
        if (!country) return 0;
        const value = country[attr.key] as number;
        const range = ranges[attr.key];
        
        if (typeof value !== 'number' || isNaN(value) || !range) return 0;
        
        const span = range.max - range.min;
        let normalized = span === 0 ? 0.5 : (value - range.min) / span;
        
        // Invert if lower is better
        if (invertedMetrics.includes(attr.key)) {
          normalized = 1 - normalized;
        }
        
        return Math.round(normalized * 100);
      };

      // Add selected country
      if (selectedCountry) {
        result[selectedCountry.country] = normalizeValue(selectedCountry);
      }

      // Add comparison countries
      compareCountries.forEach(country => {
        result[country.country] = normalizeValue(country);
      });

      // If no countries selected, show top 3 by GDP
      if (!selectedCountry && compareCountries.length === 0) {
        const topCountries = data
          .filter(c => c.Real_GDP_per_Capita_USD !== undefined)
          .sort((a, b) => (b.Real_GDP_per_Capita_USD || 0) - (a.Real_GDP_per_Capita_USD || 0))
          .slice(0, 3);
        
        topCountries.forEach(country => {
          result[country.country] = normalizeValue(country);
        });
      }

      return result;
    });

    return { radarData, ranges };
  }, [data, selectedCountry, compareCountries]);

  // Get countries to display
  const displayCountries = useMemo(() => {
    if (selectedCountry) {
      return [selectedCountry, ...compareCountries.filter(c => c.countryCode !== selectedCountry.countryCode)];
    }
    if (compareCountries.length > 0) {
      return compareCountries;
    }
    // Default to top 3 by GDP
    return data
      .filter(c => c.Real_GDP_per_Capita_USD !== undefined)
      .sort((a, b) => (b.Real_GDP_per_Capita_USD || 0) - (a.Real_GDP_per_Capita_USD || 0))
      .slice(0, 3);
  }, [data, selectedCountry, compareCountries]);

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const [pendingSelectValue, setPendingSelectValue] = useState<string | undefined>(undefined);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const sortedCountries = useMemo(
    () => [...data].sort((a, b) => a.country.localeCompare(b.country)),
    [data]
  );

  const addComparisonCountry = (countryCode: string) => {
    const country = sortedCountries.find((c) => c.countryCode === countryCode);
    if (!country) return;
    if (compareCountries.some((c) => c.countryCode === country.countryCode)) return;

    const nextCountries = [...compareCountries, country];
    onCompareCountriesChange?.(nextCountries);
    onCountrySelect?.(country, { toggleCompare: false });
  };

  const handleDropdownValueChange = (countryCode: string) => {
    setPendingSelectValue(countryCode);
    addComparisonCountry(countryCode);
  };

  const removeComparisonCountry = (countryCode: string) => {
    const nextCountries = compareCountries.filter((c) => c.countryCode !== countryCode);
    onCompareCountriesChange?.(nextCountries);
  };

  return (
    <Card className="glass-panel p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Country Profile Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Multi-dimensional comparison across Accessibility, Profitability & Efficiency.
            {selectedCountry ? ` Showing: ${selectedCountry.country}` : " Select a country to compare."}
            {" "}Click polygons to add/remove countries from comparison.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onClearComparison && onClearComparison()}
          disabled={!compareCountries || compareCountries.length === 0}
        >
          Clear comparison
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {compareCountries.map((country) => (
          <div
            key={country.countryCode}
            className="flex items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1 text-xs text-foreground"
          >
            <span>{country.country}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 text-muted-foreground"
              onClick={() => removeComparisonCountry(country.countryCode)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Select
          value={isSelectOpen ? pendingSelectValue : undefined}
          onValueChange={handleDropdownValueChange}
          onOpenChange={(open) => {
            setIsSelectOpen(open);
            if (!open) {
              setPendingSelectValue(undefined);
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Add country..." />
          </SelectTrigger>
          <SelectContent>
            {sortedCountries
              .filter((country) => !compareCountries.some((c) => c.countryCode === country.countryCode))
              .map((country) => (
                <SelectItem key={country.countryCode} value={country.countryCode}>
                  {country.country}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="attribute" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            />
            
            {displayCountries.map((country, index) => (
              <Radar
                key={country.countryCode}
                name={country.country}
                dataKey={country.country}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.2}
                strokeWidth={2}
                onClick={() => onCountrySelect && onCountrySelect(country)}
                style={{ cursor: 'pointer' }}
              />
            ))}
            
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value}%`,
                props.payload?.fullLabel || name
              ]}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-muted-foreground">
        <p><strong>Metrics:</strong> Road Density, Airports, Internet Users, GDP, Employment (inverted), Electricity Access, CO₂ Efficiency (inverted)</p>
        <p className="mt-1"><strong>Note:</strong> Higher values are better. Unemployment and CO₂/GDP are inverted so higher = better performance.</p>
      </div>
    </Card>
  );
};
