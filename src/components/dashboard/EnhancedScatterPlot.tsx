import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ZAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface EnhancedScatterPlotProps {
  data: CountryData[];
  activeCountry?: CountryData | null;
  onCountrySelect?: (country: CountryData) => void;
  highlightedCountries?: Set<string>;
}

interface AttributeOption {
  key: keyof CountryData;
  label: string;
}

const attributeOptions: AttributeOption[] = [
  { key: "Real_GDP_per_Capita_USD", label: "GDP per Capita" },
  { key: "electricity_capacity_per_capita", label: "Electric Capacity" },
  { key: "internet_users_per_100", label: "Internet Users" },
  { key: "co2_per_capita_tonnes", label: "CO₂ per Capita" },
  { key: "co2_per_gdp_tonnes_per_billion", label: "CO₂ per GDP" },
  { key: "Unemployment_Rate_percent", label: "Unemployment Rate" },
  { key: "Population_Growth_Rate", label: "Population Growth" },
  { key: "electricity_access_percent", label: "Electricity Access" },
  { key: "broadband_subs_per_100", label: "Broadband Subs" },
  { key: "road_density_per_1000km2", label: "Road Density" },
];

export const EnhancedScatterPlot = ({
  data,
  activeCountry,
  onCountrySelect,
  highlightedCountries,
}: EnhancedScatterPlotProps) => {
  const [xAxis, setXAxis] = useState<keyof CountryData>("Real_GDP_per_Capita_USD");
  const [yAxis, setYAxis] = useState<keyof CountryData>("co2_per_capita_tonnes");
  const [sizeAxis, setSizeAxis] = useState<keyof CountryData>("electricity_capacity_per_capita");

  const scatterData = data
    .filter(country => {
      const x = country[xAxis];
      const y = country[yAxis];
      const z = country[sizeAxis];
      return (
        typeof x === "number" && !isNaN(x) &&
        typeof y === "number" && !isNaN(y) &&
        typeof z === "number" && !isNaN(z)
      );
    })
    .map(country => ({
      country,
      x: country[xAxis] as number,
      y: country[yAxis] as number,
      z: country[sizeAxis] as number,
      name: country.country,
    }));

  const getPointColor = (countryCode: string) => {
    if (activeCountry && activeCountry.countryCode === countryCode) {
      return "hsl(var(--chart-3))";
    }
    if (highlightedCountries && highlightedCountries.size > 0) {
      return highlightedCountries.has(countryCode)
        ? "hsl(var(--chart-1))"
        : "hsl(var(--muted-foreground) / 0.3)";
    }
    return "hsl(var(--chart-2))";
  };

  const getPointSize = (countryCode: string) => {
    if (activeCountry && activeCountry.countryCode === countryCode) {
      return 200;
    }
    return 100;
  };

  const xLabel = attributeOptions.find(a => a.key === xAxis)?.label || String(xAxis);
  const yLabel = attributeOptions.find(a => a.key === yAxis)?.label || String(yAxis);
  const sizeLabel = attributeOptions.find(a => a.key === sizeAxis)?.label || String(sizeAxis);

  return (
    <Card className="glass-panel p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold">Multi-Dimensional Scatter Plot</h3>
        <p className="text-sm text-muted-foreground">
          Click on points to select countries. Bubble size represents {sizeLabel}.
        </p>
      </div>

      {/* Axis selectors */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">X-Axis</label>
          <Select value={xAxis} onValueChange={(value) => setXAxis(value as keyof CountryData)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {attributeOptions.map(opt => (
                <SelectItem key={opt.key} value={opt.key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Y-Axis</label>
          <Select value={yAxis} onValueChange={(value) => setYAxis(value as keyof CountryData)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {attributeOptions.map(opt => (
                <SelectItem key={opt.key} value={opt.key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Bubble Size</label>
          <Select value={sizeAxis} onValueChange={(value) => setSizeAxis(value as keyof CountryData)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {attributeOptions.map(opt => (
                <SelectItem key={opt.key} value={opt.key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel}
              stroke="hsl(var(--muted-foreground))"
              label={{
                value: xLabel,
                position: "bottom",
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel}
              stroke="hsl(var(--muted-foreground))"
              label={{
                value: yLabel,
                angle: -90,
                position: "left",
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 400]} name={sizeLabel} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => [value.toFixed(2), name]}
            />
            <Scatter
              data={scatterData}
              onClick={(data) => {
                if (data && data.country && onCountrySelect) {
                  onCountrySelect(data.country);
                }
              }}
            >
              {scatterData.map((entry) => (
                <Cell
                  key={entry.country.countryCode}
                  fill={getPointColor(entry.country.countryCode)}
                  style={{ cursor: "pointer" }}
                  r={getPointSize(entry.country.countryCode) / 20}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
