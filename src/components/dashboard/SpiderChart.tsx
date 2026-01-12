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
import { X, Maximize2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FullscreenOverlay } from "./FullscreenOverlay";

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
  
  // Workforce/Education
  { key: "Total_Literacy_Rate", label: "Literacy", fullLabel: "Total Literacy Rate" },
];

// Default countries to show (Netherlands, Germany + 3 others with literacy data)
const DEFAULT_COUNTRIES = ["UNITED STATES", "BANGLADESH", "FRANCE", "JAPAN", "CANADA"];

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Calculate normalized values for radar chart
  // Track countries with missing literacy data for caption
  const countriesWithMissingLiteracy = useMemo(() => {
    const candidateCountries = selectedCountry 
      ? [selectedCountry, ...compareCountries]
      : compareCountries.length > 0 
        ? compareCountries
        : data.filter(c => DEFAULT_COUNTRIES.includes(c.country.toUpperCase()));
    
    return candidateCountries.filter(c => {
      const raw = c.Total_Literacy_Rate;
      return raw === null || raw === undefined || raw === "";
    }).map(c => c.country);
  }, [data, selectedCountry, compareCountries]);

  const { radarData, ranges } = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};
    
    // Calculate ranges for each attribute
    radarAttributes.forEach(attr => {
      let values: number[];
      
      // Handle Total_Literacy_Rate which is stored as string like "98.4%"
      if (attr.key === "Total_Literacy_Rate") {
        values = data
          .map(d => {
            const raw = d[attr.key];
            if (raw === null || raw === undefined || raw === "") return NaN;
            return parseFloat(String(raw).replace("%", ""));
          })
          .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
      } else {
        values = data
          .map(d => d[attr.key] as number)
          .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
      }
      
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

      // Normalize value for a country - returns null for missing data to show break in polygon
      const normalizeValue = (country: CountryData | null | undefined): number | null => {
        if (!country) return null;
        
        // Handle Total_Literacy_Rate which is stored as string like "98.4%"
        let value: number | undefined;
        if (attr.key === "Total_Literacy_Rate") {
          const rawValue = country[attr.key];
          if (rawValue === null || rawValue === undefined || rawValue === "") {
            return null; // Explicitly return null for missing literacy data
          }
          const parsed = parseFloat(String(rawValue).replace("%", ""));
          value = isNaN(parsed) ? undefined : parsed;
        } else {
          value = country[attr.key] as number;
        }
        
        const range = ranges[attr.key];
        
        if (typeof value !== 'number' || isNaN(value) || !range) return null;
        
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

      // If no countries selected, show default 5 countries
      if (!selectedCountry && compareCountries.length === 0) {
        const defaultCountries = data.filter(c => 
          DEFAULT_COUNTRIES.includes(c.country.toUpperCase())
        );
        
        defaultCountries.forEach(country => {
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
    // Default to 5 countries: Netherlands, Germany + 3 others with literacy data
    return data.filter(c => 
      DEFAULT_COUNTRIES.includes(c.country.toUpperCase())
    );
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

  const radarContent = (fullscreen = false) => (
    <div className={fullscreen ? "h-full" : "flex-1 min-h-0"}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis 
            dataKey="attribute" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--foreground))", fontSize: fullscreen ? 14 : 11 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: fullscreen ? 12 : 10 }}
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
          <Legend wrapperStyle={{ fontSize: fullscreen ? 12 : 10 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <>
      <Card className="glass-panel p-3 h-full flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-1 flex-shrink-0">
          <h3 className="text-sm font-semibold truncate">Radar Comparison</h3>
          <div className="flex items-center gap-1">
            <Select
              value={isSelectOpen ? pendingSelectValue : undefined}
              onValueChange={handleDropdownValueChange}
              onOpenChange={(open) => {
                setIsSelectOpen(open);
                if (!open) setPendingSelectValue(undefined);
              }}
            >
              <SelectTrigger className="w-[120px] h-6 text-xs">
                <SelectValue placeholder="Add..." />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => onClearComparison && onClearComparison()}
              disabled={!compareCountries || compareCountries.length === 0}
              className="h-6 text-xs px-2"
            >
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(true)} className="h-6 w-6 p-0">
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Compact chips */}
        {compareCountries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-1 flex-shrink-0">
            {compareCountries.slice(0, 5).map((country) => (
              <div key={country.countryCode} className="flex items-center gap-1 rounded-full border bg-muted/20 px-2 py-0.5 text-xs">
                <span>{country.country.slice(0, 10)}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeComparisonCountry(country.countryCode)} />
              </div>
            ))}
            {compareCountries.length > 5 && <span className="text-xs text-muted-foreground">+{compareCountries.length - 5}</span>}
          </div>
        )}

        {radarContent()}
      </Card>
      
      <FullscreenOverlay isOpen={isFullscreen} onClose={() => setIsFullscreen(false)} title="Country Profile Comparison">
        {radarContent(true)}
      </FullscreenOverlay>
    </>
  );
};
