import { useState, useRef, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceArea } from "recharts";
import { Button } from "@/components/ui/button";
import { X, Maximize2, ArrowUpDown } from "lucide-react";
import { FullscreenOverlay } from "./FullscreenOverlay";

interface TopCountriesChartProps {
  data: CountryData[];
  limit?: number;
  metric: keyof CountryData;
  activeCountry?: CountryData | null;
  onCountrySelect?: (country: CountryData) => void;
  highlightedCountries?: Set<string>;
  onBrushSelection?: (countryCodes: Set<string>) => void;
  // Support coordinated views with brushing and linking
  brushEnabled?: boolean;
  brushMode?: "select" | "hover";
}

const metricLabels: Partial<Record<keyof CountryData, string>> = {
  // Basic info
  Mean_Temp: "Mean Temperature",
  Median_Age: "Median Age",
  
  // Economy
  Real_GDP_PPP_billion_USD: "GDP (PPP)",
  Real_GDP_per_Capita_USD: "GDP per Capita",
  Real_GDP_Growth_Rate_percent: "GDP Growth Rate",
  Youth_Unemployment_Rate_percent: "Youth Unemployment",
  
  // Demographics
  Population_Growth_Rate: "Population Growth",
  Total_Literacy_Rate: "Literacy Rate",
  
  // Energy & Infrastructure
  electricity_access_percent: "Electricity Access",
  electricity_capacity_per_capita: "Electric Capacity",
  
  // Connectivity
  internet_users_per_100: "Internet Users",
  broadband_subs_per_100: "Broadband Subscribers",
  mobile_subs_per_100: "Mobile Subscribers",
  
  // Demographics & Geography
  population_density: "Population Density",
  road_density_per_1000km2: "Road Density",
  rail_density_per_1000km2: "Rail Density",
  airports_per_million: "Airports per Million",
  
  // Environmental
  co2_per_capita_tonnes: "CO₂ per Capita",
  co2_per_gdp_tonnes_per_billion: "CO₂ per GDP",
  fossil_intensity_index: "Fossil Intensity Index",
  
  // Geography & Environment
  water_share: "Water Share",
  coastline_per_1000km2: "Coastline Density",
  
  // No Z-score variants in this component
  // Keeping only attributes that exist in the CountryData interface
};

const defaultAttributes: Array<keyof CountryData> = [
  "Real_GDP_per_Capita_USD",
  "electricity_capacity_per_capita",
  "internet_users_per_100",
  "co2_per_capita_tonnes",
  "electricity_access_percent",
];

const attributeOptions: Array<keyof CountryData> = [
  // Basic info
  "Mean_Temp",
  "Median_Age",
  
  // Economy
  "Real_GDP_PPP_billion_USD",
  "Real_GDP_per_Capita_USD",
  "Real_GDP_Growth_Rate_percent",
  "Youth_Unemployment_Rate_percent",
  
  // Demographics
  "Population_Growth_Rate",
  "Total_Literacy_Rate",
  
  // Energy & Infrastructure
  "electricity_access_percent",
  "electricity_capacity_per_capita",
  
  // Connectivity
  "internet_users_per_100",
  "broadband_subs_per_100",
  "mobile_subs_per_100",
  
  // Demographics & Geography
  "population_density",
  "road_density_per_1000km2",
  "rail_density_per_1000km2",
  "airports_per_million",
  
  // Environmental
  "co2_per_capita_tonnes",
  "co2_per_gdp_tonnes_per_billion",
  "fossil_intensity_index",
  
  // Geography & Environment
  "water_share",
  "coastline_per_1000km2",
  
  // No Z-score variants in this component
];

export const TopCountriesChart = ({
  data,
  limit = 10,
  metric,
  activeCountry,
  onCountrySelect,
  highlightedCountries,
  onBrushSelection,
}: TopCountriesChartProps) => {
  const metricLabel = metricLabels[metric] ?? String(metric);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sortBy, setSortBy] = useState<keyof CountryData>(metric);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Array<keyof CountryData>>(defaultAttributes);
  const [attributeToAdd, setAttributeToAdd] = useState<keyof CountryData>(defaultAttributes[0]);
  
  // Brush selection state
  const [brushStart, setBrushStart] = useState<number | null>(null);
  const [brushEnd, setBrushEnd] = useState<number | null>(null);
  const [isBrushing, setIsBrushing] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const withValues = data.filter((c) => {
    const value = c[metric];
    return typeof value === "number" && !Number.isNaN(value);
  });

  // Sort countries by the selected metric (default view)
  const topCountries = useMemo(() => {
    return withValues
      .slice()
      .sort((a, b) => {
        const aValue = (a[metric] as number) ?? 0;
        const bValue = (b[metric] as number) ?? 0;
        return bValue - aValue;
      })
      .slice(0, limit)
      .map((c, index) => ({
        country: c,
        name: c.country.length > 12 ? c.country.slice(0, 12) + "..." : c.country,
        value: c[metric] as number,
        index,
      }));
  }, [withValues, metric, limit]);

  // Multi-attribute data for fullscreen mode
  const multiAttributeData = useMemo(() => {
    if (!isFullscreen) return [];
    
    return data
      .filter(c => selectedAttributes.every(attr => {
        const val = c[attr];
        return typeof val === 'number' && !isNaN(val);
      }))
      .sort((a, b) => {
        const aValue = (a[sortBy] as number) ?? 0;
        const bValue = (b[sortBy] as number) ?? 0;
        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      })
      .slice(0, 30)
      .map((c, index) => ({
        country: c,
        name: c.country,
        ...Object.fromEntries(
          selectedAttributes.map(attr => [attr, c[attr] as number])
        ),
        index,
      }));
  }, [data, isFullscreen, sortBy, sortDirection, selectedAttributes]);

  const handleSort = (attribute: keyof CountryData) => {
    if (sortBy === attribute) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(attribute);
      setSortDirection('desc');
    }
  };

  const handleAddAttribute = () => {
    if (!attributeToAdd) return;
    setSelectedAttributes(prev => prev.includes(attributeToAdd) ? prev : [...prev, attributeToAdd]);
  };

  // Calculate which bars are in the brush selection
  const getSelectedIndices = useCallback(() => {
    if (brushStart === null || brushEnd === null) return new Set<number>();
    const minY = Math.min(brushStart, brushEnd);
    const maxY = Math.max(brushStart, brushEnd);
    const selected = new Set<number>();
    
    // Each bar spans roughly (chartHeight / totalBars) pixels
    const barCount = topCountries.length;
    for (let i = 0; i < barCount; i++) {
      // Approximate bar position (0 is top, increases downward)
      const barTop = (i / barCount) * 100;
      const barBottom = ((i + 1) / barCount) * 100;
      
      // Check if bar overlaps with brush region
      if (barBottom >= minY && barTop <= maxY) {
        selected.add(i);
      }
    }
    return selected;
  }, [brushStart, brushEnd, topCountries.length]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setBrushStart(y);
    setBrushEnd(y);
    setIsBrushing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isBrushing || !chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setBrushEnd(y);
  };

  const handleMouseUp = () => {
    if (!isBrushing) return;
    setIsBrushing(false);
    
    const selectedIndices = getSelectedIndices();
    if (selectedIndices.size > 0 && onBrushSelection) {
      const selectedCodes = new Set(
        topCountries
          .filter((_, i) => selectedIndices.has(i))
          .map((item) => item.country.countryCode)
      );
      onBrushSelection(selectedCodes);
    }
  };

  const handleClearSelection = () => {
    setBrushStart(null);
    setBrushEnd(null);
    if (onBrushSelection) {
      onBrushSelection(new Set());
    }
  };

  const selectedIndices = getSelectedIndices();
  const hasSelection = highlightedCountries && highlightedCountries.size > 0;

  // Determine bar color based on selection state
  const getBarColor = (countryCode: string, index: number) => {
    const isActive = activeCountry && activeCountry.countryCode === countryCode;
    const isHovered = hoveredCountry === countryCode;
    
    if (isActive) {
      return "hsl(var(--chart-3))"; // Active country always highlighted
    }
    
    if (isBrushing) {
      // During brushing, show preview of selection
      return selectedIndices.has(index)
        ? "hsl(var(--chart-1))"
        : "hsl(var(--muted-foreground) / 0.3)";
    }
    
    if (hasSelection) {
      // After brush is complete, use highlightedCountries
      return highlightedCountries.has(countryCode)
        ? "hsl(var(--chart-1))"
        : "hsl(var(--muted-foreground) / 0.3)";
    }
    
    if (isHovered) {
      return "hsl(var(--chart-2))";
    }

    return "hsl(var(--chart-1))"; // Default color
  };

  const chartContent = (fullscreen = false) => {
    const chartData = topCountries;
    return (
      <div 
        ref={!fullscreen ? chartRef : undefined}
        className={`relative cursor-crosshair select-none ${fullscreen ? "h-full" : "flex-1 min-h-0"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoveredCountry(null); }}
      >
        {/* Brush selection overlay */}
        {isBrushing && brushStart !== null && brushEnd !== null && (
          <div
            className="absolute left-0 right-0 bg-primary/20 border-y-2 border-primary pointer-events-none z-10"
            style={{
              top: `${Math.min(brushStart, brushEnd)}%`,
              height: `${Math.abs(brushEnd - brushStart)}%`,
            }}
          />
        )}
        
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 80, right: 20, top: 10, bottom: 10 }}
            onMouseMove={(state) => {
              const payload = state?.activePayload?.[0]?.payload as any;
              setHoveredCountry(payload?.country?.countryCode ?? null);
            }}
          >
            <XAxis
              type="number"
              domain={[0, "dataMax"]}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              width={12}
              tick={{ fontSize: 10 }}
              tickFormatter={() => ""}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [value.toFixed(2), metricLabel]}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              onClick={(_, index) => {
                const item = chartData[index];
                if (item && onCountrySelect) onCountrySelect(item.country);
              }}
            >
              {chartData.map((item, index) => (
                <Cell
                  key={item.country.countryCode ?? item.country.country}
                  fill={getBarColor(item.country.countryCode, index)}
                  style={{
                    cursor: "pointer",
                    transition: "fill 0.2s ease-in-out, transform 0.15s ease",
                    transform: hoveredCountry === item.country.countryCode ? "scale(1.02)" : "scale(1)",
                    filter: hoveredCountry === item.country.countryCode ? "drop-shadow(0 0 6px hsla(var(--primary),0.6))" : "none",
                    opacity: hoveredCountry && hoveredCountry !== item.country.countryCode ? 0.5 : 1,
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const smallMultipleChart = (attribute: keyof CountryData, idx: number) => (
    <div key={attribute} className="flex flex-col gap-1 p-2 rounded-md border bg-card/60">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>{metricLabels[attribute] || String(attribute)}</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={multiAttributeData}
            layout="vertical"
            margin={{ left: 16, right: 8, top: 4, bottom: 4 }}
            barSize={18}
            onMouseMove={(state) => {
              const payload = state?.activePayload?.[0]?.payload as any;
              setHoveredCountry(payload?.country?.countryCode ?? null);
            }}
            onMouseLeave={() => setHoveredCountry(null)}
          >
            <XAxis
              type="number"
              domain={[0, "dataMax"]}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              width={6}
              tick={{ fontSize: 9 }}
              tickFormatter={() => ""}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number, _name, payload: any) => {
                const countryName = payload?.payload?.country?.country;
                const label = countryName ?? (metricLabels[attribute] || String(attribute));
                return [value.toFixed(2), label];
              }}
            />
            <Bar
              dataKey={attribute as string}
              fill="hsl(var(--chart-1))"
              radius={[0, 4, 4, 0]}
              onClick={(_, index) => {
                const item = multiAttributeData[index];
                if (item && onCountrySelect) onCountrySelect(item.country);
              }}
            >
              {multiAttributeData.map((item) => (
                <Cell
                  key={item.country.countryCode}
                  fill={hoveredCountry === item.country.countryCode ? "hsl(var(--chart-3))" : "hsl(var(--chart-1))"}
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.15s ease, opacity 0.15s ease",
                    transform: hoveredCountry === item.country.countryCode ? "scale(1.04)" : "scale(1)",
                    opacity: hoveredCountry && hoveredCountry !== item.country.countryCode ? 0.55 : 1,
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <>
      <Card className="glass-panel p-3 h-full flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-1 flex-shrink-0">
          <h3 className="text-sm font-semibold truncate">Top by {metricLabel}</h3>
          <div className="flex items-center gap-1">
            {hasSelection && (
              <Button variant="outline" size="sm" onClick={handleClearSelection} className="h-6 text-xs px-2">
                <X className="h-3 w-3 mr-1" />{highlightedCountries.size}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(true)} className="h-6 w-6 p-0">
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {chartContent()}
      </Card>
      
      <FullscreenOverlay isOpen={isFullscreen} onClose={() => { setIsFullscreen(false); setHoveredCountry(null); }} title={`Top Countries - Multi-Attribute Comparison`}>
        <div className="h-full flex flex-col">
          {/* Sortable attribute buttons */}
          <div className="flex gap-2 mb-2 flex-wrap">
            {selectedAttributes.map(attr => (
              <Button
                key={attr}
                variant={sortBy === attr ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort(attr)}
                className="h-7 text-xs gap-1"
              >
                {metricLabels[attr] || String(attr)}
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 h-full">
              {selectedAttributes.map((attr, idx) => smallMultipleChart(attr, idx))}
            </div>
          </div>
        </div>
      </FullscreenOverlay>
    </>
  );
};
