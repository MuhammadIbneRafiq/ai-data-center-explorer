import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceArea } from "recharts";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TopCountriesChartProps {
  data: CountryData[];
  limit?: number;
  metric: keyof CountryData;
  activeCountry?: CountryData | null;
  onCountrySelect?: (country: CountryData) => void;
  highlightedCountries?: Set<string>;
  onBrushSelection?: (countryCodes: Set<string>) => void;
}

const metricLabels: Partial<Record<keyof CountryData, string>> = {
  renewableEnergyPercent: "Renewable Energy %",
  electricityCost: "Electricity Cost ($/kWh)",
  internetSpeed: "Internet Metric",
  gdpPerCapita: "GDP per Capita",
};

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
  
  // Brush selection state
  const [brushStart, setBrushStart] = useState<number | null>(null);
  const [brushEnd, setBrushEnd] = useState<number | null>(null);
  const [isBrushing, setIsBrushing] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const withValues = data.filter((c) => {
    const value = c[metric];
    return typeof value === "number" && !Number.isNaN(value);
  });

  const topCountries = withValues
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
      index, // Add index for brush calculations
    }));

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
    
    return "hsl(var(--chart-1))"; // Default color
  };

  return (
    <Card className="glass-panel p-3 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-1 flex-shrink-0">
        <h3 className="text-sm font-semibold truncate">Top by {metricLabel}</h3>
        {hasSelection && (
          <Button variant="outline" size="sm" onClick={handleClearSelection} className="gap-1 h-6 text-xs px-2">
            <X className="h-3 w-3" />
            {highlightedCountries.size}
          </Button>
        )}
      </div>
      
      <div 
        ref={chartRef}
        className="flex-1 min-h-0 relative cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
            data={topCountries}
            layout="vertical"
            margin={{ left: 80, right: 20 }}
          >
            <XAxis
              type="number"
              dataKey="value"
              domain={[0, "dataMax"]}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))", // fallback
              }}
              labelStyle={{
                color: "hsl(var(--foreground))",
              }}
              itemStyle={{
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number) => [
                value.toFixed(2),
                metricLabel,
              ]}
            />

            <Bar
              dataKey="value"
              radius={[0, 0, 0, 0]}
              onClick={(_, index) => {
                const item = topCountries[index];
                if (item && onCountrySelect) {
                  onCountrySelect(item.country);
                }
              }}
            >
              {topCountries.map((item, index) => (
                <Cell
                  key={item.country.countryCode ?? item.country.country}
                  fill={getBarColor(item.country.countryCode, index)}
                  style={{ 
                    cursor: "pointer",
                    transition: "fill 0.2s ease-in-out",
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
