import { useState, useMemo, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface InteractiveParallelCoordinatesProps {
  data: CountryData[];
  selectedCountries?: CountryData[];
  onCountrySelect?: (country: CountryData) => void;
  highlightedCountries?: Set<string>;
}

interface Attribute {
  key: keyof CountryData;
  label: string;
  category: string;
}

const availableAttributes: Attribute[] = [
  // Economic
  { key: "Real_GDP_per_Capita_USD", label: "GDP per Capita", category: "Economic" },
  { key: "Real_GDP_Growth_Rate_percent", label: "GDP Growth Rate %", category: "Economic" },
  { key: "Unemployment_Rate_percent", label: "Unemployment Rate %", category: "Economic" },
  { key: "Youth_Unemployment_Rate_percent", label: "Youth Unemployment %", category: "Economic" },
  
  // Demographics
  { key: "Population_Growth_Rate", label: "Population Growth %", category: "Demographics" },
  { key: "Median_Age", label: "Median Age", category: "Demographics" },
  { key: "population_density", label: "Population Density", category: "Demographics" },
  
  // Energy & Infrastructure
  { key: "electricity_access_percent", label: "Electricity Access %", category: "Energy" },
  { key: "electricity_capacity_per_capita", label: "Electric Capacity per Capita", category: "Energy" },
  
  // Connectivity
  { key: "internet_users_per_100", label: "Internet Users per 100", category: "Connectivity" },
  { key: "broadband_subs_per_100", label: "Broadband per 100", category: "Connectivity" },
  { key: "mobile_subs_per_100", label: "Mobile Subs per 100", category: "Connectivity" },
  
  // Transportation
  { key: "road_density_per_1000km2", label: "Road Density", category: "Transportation" },
  { key: "rail_density_per_1000km2", label: "Rail Density", category: "Transportation" },
  { key: "airports_per_million", label: "Airports per Million", category: "Transportation" },
  
  // Environmental
  { key: "co2_per_capita_tonnes", label: "CO₂ per Capita", category: "Environmental" },
  { key: "co2_per_gdp_tonnes_per_billion", label: "CO₂ per GDP", category: "Environmental" },
  
  // Geography
  { key: "Mean_Temp", label: "Mean Temperature", category: "Geography" },
  { key: "water_share", label: "Water Share", category: "Geography" },
  { key: "coastline_per_1000km2", label: "Coastline Density", category: "Geography" },
];

export const InteractiveParallelCoordinates = ({
  data,
  selectedCountries,
  onCountrySelect,
  highlightedCountries,
}: InteractiveParallelCoordinatesProps) => {
  const [selectedAttributes, setSelectedAttributes] = useState<Attribute[]>([
    availableAttributes.find(a => a.key === "Real_GDP_per_Capita_USD")!,
    availableAttributes.find(a => a.key === "electricity_capacity_per_capita")!,
    availableAttributes.find(a => a.key === "internet_users_per_100")!,
    availableAttributes.find(a => a.key === "co2_per_capita_tonnes")!,
  ]);
  
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: 400 });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const addAttribute = (attrKey: string) => {
    const attr = availableAttributes.find(a => a.key === attrKey);
    if (attr && !selectedAttributes.find(a => a.key === attrKey)) {
      setSelectedAttributes([...selectedAttributes, attr]);
    }
  };

  const removeAttribute = (attrKey: keyof CountryData) => {
    if (selectedAttributes.length > 2) {
      setSelectedAttributes(selectedAttributes.filter(a => a.key !== attrKey));
    }
  };

  // Normalize data for each attribute
  const normalizedData = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};
    
    selectedAttributes.forEach(attr => {
      const values = data
        .map(d => d[attr.key] as number)
        .filter(v => typeof v === 'number' && !isNaN(v));
      
      if (values.length > 0) {
        ranges[attr.key] = {
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    });

    return data.map(country => {
      const normalized: Record<string, number> = {};
      selectedAttributes.forEach(attr => {
        const value = country[attr.key] as number;
        const range = ranges[attr.key];
        
        if (typeof value === 'number' && !isNaN(value) && range) {
          const span = range.max - range.min;
          normalized[attr.key] = span === 0 ? 0.5 : (value - range.min) / span;
        } else {
          normalized[attr.key] = 0.5;
        }
      });
      
      return { country, normalized };
    });
  }, [data, selectedAttributes]);

  const margin = { top: 60, right: 40, bottom: 40, left: 40 };
  const width = dimensions.width - margin.left - margin.right;
  const height = dimensions.height - margin.top - margin.bottom;
  
  const axisSpacing = width / (selectedAttributes.length - 1 || 1);

  const getLineColor = (countryCode: string) => {
    if (hoveredCountry === countryCode) {
      return "hsl(var(--chart-3))";
    }
    if (highlightedCountries && highlightedCountries.size > 0) {
      return highlightedCountries.has(countryCode) 
        ? "hsl(var(--chart-1))" 
        : "hsl(var(--muted-foreground) / 0.1)";
    }
    if (selectedCountries && selectedCountries.some(c => c.countryCode === countryCode)) {
      return "hsl(var(--chart-2))";
    }
    return "hsl(var(--muted-foreground) / 0.3)";
  };

  const getLineWidth = (countryCode: string) => {
    if (hoveredCountry === countryCode) return 3;
    if (highlightedCountries && highlightedCountries.has(countryCode)) return 2;
    if (selectedCountries && selectedCountries.some(c => c.countryCode === countryCode)) return 2;
    return 1;
  };

  const generatePath = (normalized: Record<string, number>) => {
    const points = selectedAttributes.map((attr, i) => {
      const x = i * axisSpacing;
      const y = height * (1 - normalized[attr.key]);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  return (
    <Card className="glass-panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Interactive Parallel Coordinates</h3>
          <p className="text-sm text-muted-foreground">
            Compare multiple attributes. Click lines to select countries.
          </p>
        </div>
        
        <Select onValueChange={addAttribute}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Add attribute..." />
          </SelectTrigger>
          <SelectContent>
            {availableAttributes
              .filter(attr => !selectedAttributes.find(a => a.key === attr.key))
              .map(attr => (
                <SelectItem key={attr.key} value={attr.key}>
                  {attr.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected attributes chips */}
      <div className="flex flex-wrap gap-2">
        {selectedAttributes.map(attr => (
          <div
            key={attr.key}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-sm"
          >
            <span>{attr.label}</span>
            {selectedAttributes.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={() => removeAttribute(attr.key)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="relative" style={{ height: dimensions.height }}>
        <svg
          ref={svgRef}
          width="100%"
          height={dimensions.height}
          className="overflow-visible"
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Draw axes */}
            {selectedAttributes.map((attr, i) => {
              const x = i * axisSpacing;
              
              return (
                <g key={attr.key}>
                  {/* Axis line */}
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={height}
                    stroke="hsl(var(--border))"
                    strokeWidth={2}
                  />
                  
                  {/* Axis label */}
                  <text
                    x={x}
                    y={-10}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize={12}
                    fontWeight="600"
                  >
                    {attr.label}
                  </text>
                  
                  {/* Min/Max labels */}
                  <text
                    x={x}
                    y={height + 20}
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                    fontSize={10}
                  >
                    Min
                  </text>
                  <text
                    x={x}
                    y={-25}
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                    fontSize={10}
                  >
                    Max
                  </text>
                </g>
              );
            })}

            {/* Draw lines for each country */}
            {normalizedData.map(({ country, normalized }) => (
              <path
                key={country.countryCode}
                d={generatePath(normalized)}
                fill="none"
                stroke={getLineColor(country.countryCode)}
                strokeWidth={getLineWidth(country.countryCode)}
                opacity={hoveredCountry && hoveredCountry !== country.countryCode ? 0.2 : 1}
                onMouseEnter={() => setHoveredCountry(country.countryCode)}
                onMouseLeave={() => setHoveredCountry(null)}
                onClick={() => onCountrySelect && onCountrySelect(country)}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <title>{country.country}</title>
              </path>
            ))}
          </g>
        </svg>
      </div>

      {hoveredCountry && (
        <div className="text-sm text-center text-muted-foreground">
          Hovering: <span className="font-semibold text-foreground">
            {normalizedData.find(d => d.country.countryCode === hoveredCountry)?.country.country}
          </span>
        </div>
      )}
    </Card>
  );
};
