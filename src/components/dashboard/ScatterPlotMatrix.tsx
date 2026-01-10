import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Grid2X2, Grid3X3, Square } from "lucide-react";

interface ScatterPlotMatrixProps {
  data: CountryData[];
  activeCountry?: CountryData | null;
  onCountrySelect?: (country: CountryData) => void;
  highlightedCountries?: Set<string>;
  onBrushSelection?: (countryCodes: Set<string>) => void;
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
  { key: "Mean_Temp", label: "Temperature" },
  { key: "Median_Age", label: "Median Age" },
];

type MatrixSize = "1x1" | "2x2" | "3x3";

export const ScatterPlotMatrix = ({
  data,
  activeCountry,
  onCountrySelect,
  highlightedCountries,
  onBrushSelection,
}: ScatterPlotMatrixProps) => {
  const [matrixSize, setMatrixSize] = useState<MatrixSize>("1x1");
  const [selectedAttributes, setSelectedAttributes] = useState<(keyof CountryData)[]>([
    "Real_GDP_per_Capita_USD",
    "co2_per_capita_tonnes",
    "internet_users_per_100",
  ]);

  const gridSize = matrixSize === "1x1" ? 1 : matrixSize === "2x2" ? 2 : 3;
  const requiredAttributes = gridSize;

  // Ensure we have enough attributes selected
  const activeAttributes = useMemo(() => {
    const attrs = [...selectedAttributes];
    while (attrs.length < requiredAttributes) {
      const available = attributeOptions.find(a => !attrs.includes(a.key));
      if (available) attrs.push(available.key);
    }
    return attrs.slice(0, requiredAttributes);
  }, [selectedAttributes, requiredAttributes]);

  const handleAttributeChange = (index: number, value: keyof CountryData) => {
    const newAttrs = [...selectedAttributes];
    newAttrs[index] = value;
    setSelectedAttributes(newAttrs);
  };

  const getPointColor = (countryCode: string) => {
    if (activeCountry && activeCountry.countryCode === countryCode) {
      return "hsl(var(--chart-3))";
    }
    if (highlightedCountries && highlightedCountries.size > 0) {
      return highlightedCountries.has(countryCode)
        ? "hsl(var(--chart-1))"
        : "hsl(var(--muted-foreground) / 0.2)";
    }
    return "hsl(var(--chart-2))";
  };

  const handlePointClick = (country: CountryData) => {
    if (onBrushSelection) {
      const newSet = new Set(highlightedCountries);
      if (newSet.has(country.countryCode)) {
        newSet.delete(country.countryCode);
      } else {
        newSet.add(country.countryCode);
      }
      onBrushSelection(newSet);
    }
    if (onCountrySelect) {
      onCountrySelect(country);
    }
  };

  const handleClearSelection = () => {
    if (onBrushSelection) {
      onBrushSelection(new Set());
    }
  };

  const hasSelection = highlightedCountries && highlightedCountries.size > 0;

  // Generate scatter data for a given pair of attributes
  const getScatterData = (xAttr: keyof CountryData, yAttr: keyof CountryData) => {
    return data
      .filter(country => {
        const x = country[xAttr];
        const y = country[yAttr];
        return typeof x === "number" && !isNaN(x) && typeof y === "number" && !isNaN(y);
      })
      .map(country => ({
        country,
        x: country[xAttr] as number,
        y: country[yAttr] as number,
        name: country.country,
      }));
  };

  const getLabel = (key: keyof CountryData) => {
    return attributeOptions.find(a => a.key === key)?.label || String(key);
  };

  // Generate matrix cells
  const renderMatrix = () => {
    const cells: JSX.Element[] = [];
    const cellHeight = matrixSize === "1x1" ? 350 : matrixSize === "2x2" ? 200 : 160;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const xAttr = activeAttributes[col];
        const yAttr = activeAttributes[row];
        
        // Diagonal: show attribute name
        if (row === col) {
          cells.push(
            <div
              key={`${row}-${col}`}
              className="flex items-center justify-center bg-muted/30 rounded-lg border border-border/50"
              style={{ height: cellHeight }}
            >
              <span className="text-sm font-medium text-center px-2">{getLabel(xAttr)}</span>
            </div>
          );
        } else {
          const scatterData = getScatterData(xAttr, yAttr);
          cells.push(
            <div
              key={`${row}-${col}`}
              className="relative"
              style={{ height: cellHeight }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 5, right: 5, bottom: 20, left: 25 }}>
                  <XAxis
                    type="number"
                    dataKey="x"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 8 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    label={row === gridSize - 1 ? {
                      value: getLabel(xAttr).slice(0, 10),
                      position: "bottom",
                      fontSize: 9,
                      fill: "hsl(var(--muted-foreground))",
                    } : undefined}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 8 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    label={col === 0 ? {
                      value: getLabel(yAttr).slice(0, 10),
                      angle: -90,
                      position: "left",
                      fontSize: 9,
                      fill: "hsl(var(--muted-foreground))",
                    } : undefined}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [value.toFixed(2)]}
                    labelFormatter={(_, payload) => payload[0]?.payload?.name || ""}
                  />
                  <Scatter
                    data={scatterData}
                    onClick={(data) => {
                      const entry = data as typeof scatterData[0];
                      if (entry?.country) handlePointClick(entry.country);
                    }}
                  >
                    {scatterData.map((entry) => (
                      <Cell
                        key={entry.country.countryCode}
                        fill={getPointColor(entry.country.countryCode)}
                        style={{ cursor: "pointer" }}
                        r={matrixSize === "3x3" ? 3 : matrixSize === "2x2" ? 4 : 6}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          );
        }
      }
    }
    return cells;
  };

  return (
    <Card className="glass-panel p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold">Scatter Plot Matrix (SPLOM)</h3>
          <p className="text-sm text-muted-foreground">
            Compare multiple attribute pairs. Click points to select countries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasSelection && (
            <Button variant="outline" size="sm" onClick={handleClearSelection} className="gap-1">
              <X className="h-4 w-4" />
              Clear ({highlightedCountries?.size})
            </Button>
          )}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={matrixSize === "1x1" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMatrixSize("1x1")}
              className="rounded-none px-3"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant={matrixSize === "2x2" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMatrixSize("2x2")}
              className="rounded-none px-3"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              variant={matrixSize === "3x3" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMatrixSize("3x3")}
              className="rounded-none px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Attribute selectors */}
      <div className="flex flex-wrap gap-2">
        {activeAttributes.map((attr, index) => (
          <Select
            key={index}
            value={attr}
            onValueChange={(value) => handleAttributeChange(index, value as keyof CountryData)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
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
        ))}
      </div>

      {/* Matrix grid */}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {renderMatrix()}
      </div>
    </Card>
  );
};
