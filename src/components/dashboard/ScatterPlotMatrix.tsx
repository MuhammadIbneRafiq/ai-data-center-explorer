import { useState, useMemo, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceArea, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Grid2X2, Grid3X3, Grid, MousePointer2, Maximize2, BarChart3 } from "lucide-react";
import { FullscreenOverlay } from "./FullscreenOverlay";

// Define histogram bin data interface for TypeScript
interface HistogramBin {
  bin: number;
  count: number;
  highlighted: number;
  originalBin: number;
}

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
  useLogScale?: boolean;
}

const attributeOptions: AttributeOption[] = [
  { key: "Real_GDP_per_Capita_USD", label: "GDP per Capita", useLogScale: true },
  { key: "electricity_capacity_per_capita", label: "Electric Capacity", useLogScale: true },
  { key: "internet_users_per_100", label: "Internet Users" },
  { key: "co2_per_capita_tonnes", label: "CO₂ per Capita", useLogScale: true },
  { key: "co2_per_gdp_tonnes_per_billion", label: "CO₂ per GDP", useLogScale: true },
  { key: "Unemployment_Rate_percent", label: "Unemployment Rate" },
  { key: "Population_Growth_Rate", label: "Population Growth" },
  { key: "electricity_access_percent", label: "Electricity Access" },
  { key: "broadband_subs_per_100", label: "Broadband Subs" },
  { key: "road_density_per_1000km2", label: "Road Density", useLogScale: true },
  { key: "Mean_Temp", label: "Temperature" },
  { key: "Median_Age", label: "Median Age" },
];

type MatrixSize = "2x2" | "3x3" | "4x4";

export const ScatterPlotMatrix = ({
  data,
  activeCountry,
  onCountrySelect,
  highlightedCountries,
  onBrushSelection,
}: ScatterPlotMatrixProps) => {
  console.log("🔍 ScatterPlotMatrix render:", { dataLength: data?.length, activeCountry: activeCountry?.country, highlightedCount: highlightedCountries?.size });
  
  const [matrixSize, setMatrixSize] = useState<MatrixSize>("3x3");
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<(keyof CountryData)[]>([
    "Real_GDP_per_Capita_USD",
    "co2_per_capita_tonnes",
    "internet_users_per_100",
    "electricity_capacity_per_capita",
  ]);
  const [brushMode, setBrushMode] = useState(false);
  const [useLogScales, setUseLogScales] = useState(true);
  // State to track keyboard modifiers
  const [keyModifier, setKeyModifier] = useState<'none' | 'add' | 'subtract'>('none');
  
  // Brush state for each cell
  const [brushingCell, setBrushingCell] = useState<string | null>(null);
  const [brushStart, setBrushStart] = useState<{ x: number; y: number } | null>(null);
  const [brushEnd, setBrushEnd] = useState<{ x: number; y: number } | null>(null);

  // Setup keyboard event listeners for selection modifiers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        setKeyModifier('add');
      } else if (e.altKey) {
        setKeyModifier('subtract');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey && !e.altKey) {
        setKeyModifier('none');
      } else if (e.shiftKey) {
        setKeyModifier('add');
      } else if (e.altKey) {
        setKeyModifier('subtract');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const gridSize = matrixSize === "2x2" ? 2 : matrixSize === "3x3" ? 3 : 4;
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

  // Color palette for categorical colors
  const colorPalette = [
    "hsl(var(--chart-1))", 
    "hsl(var(--chart-2))", 
    "hsl(var(--chart-3))", 
    "hsl(var(--chart-4))", 
    "hsl(var(--chart-5))", 
    "hsl(var(--chart-6))", 
    "hsl(var(--chart-7))", 
    "hsl(var(--chart-8))"
  ];

  // Get color index for a country
  const getColorIndex = (countryCode: string) => {
    // If there's a highlighted set, find the index of this country within it
    if (highlightedCountries && highlightedCountries.size > 0 && highlightedCountries.has(countryCode)) {
      // Convert to array to get stable indices
      const selectionArray = Array.from(highlightedCountries);
      const index = selectionArray.indexOf(countryCode);
      return index % colorPalette.length;
    }
    return 0;
  };
  
  const getPointColor = (countryCode: string) => {
    if (activeCountry && activeCountry.countryCode === countryCode) {
      return "hsl(var(--chart-3))";
    }
    if (highlightedCountries && highlightedCountries.size > 0) {
      return highlightedCountries.has(countryCode)
        ? colorPalette[getColorIndex(countryCode)]
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

  // Get attribute config for log scale information
  const getAttributeConfig = (key: keyof CountryData) => {
    return attributeOptions.find(attr => attr.key === key) || { key, label: String(key) };
  };

  // Apply log transform if needed
  const transformValue = (value: number, useLog: boolean) => {
    if (!useLog || value <= 0) return value;
    return Math.log10(value);
  };

  // Generate scatter data for a given pair of attributes
  const getScatterData = (xAttr: keyof CountryData, yAttr: keyof CountryData) => {
    const xConfig = getAttributeConfig(xAttr);
    const yConfig = getAttributeConfig(yAttr);
    
    return data
      .filter(country => {
        const x = country[xAttr];
        const y = country[yAttr];
        // Filter out non-numeric values and, if using log scale, non-positive values
        return typeof x === "number" && !isNaN(x) && typeof y === "number" && !isNaN(y) && 
               (!useLogScales || !xConfig.useLogScale || (x > 0)) &&
               (!useLogScales || !yConfig.useLogScale || (y > 0));
      })
      .map(country => ({
        country,
        x: useLogScales && xConfig.useLogScale ? 
           transformValue(country[xAttr] as number, true) : 
           country[xAttr] as number,
        y: useLogScales && yConfig.useLogScale ? 
           transformValue(country[yAttr] as number, true) : 
           country[yAttr] as number,
        // Store original values for tooltips
        originalX: country[xAttr] as number,
        originalY: country[yAttr] as number,
        name: country.country,
      }));
  };

  const getLabel = (key: keyof CountryData) => {
    return attributeOptions.find(a => a.key === key)?.label || String(key);
  };

  // Handle brush selection for a cell - with mode for add/replace/subtract
  const handleBrushSelect = useCallback((cellKey: string, xAttr: keyof CountryData, yAttr: keyof CountryData, x1: number, y1: number, x2: number, y2: number, mode: 'replace' | 'add' | 'subtract' = 'replace') => {
    if (!onBrushSelection) return;
    
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    // Start with existing selection or empty set based on mode
    const selectedCodes = new Set(
      mode === 'replace' ? [] : 
      Array.from(highlightedCountries || [])
    );
    
    // Get countries in the brushed area
    const brushedCountries = new Set<string>();
    
    data.forEach(country => {
      let xVal = country[xAttr] as number;
      let yVal = country[yAttr] as number;
      
      // Apply log transformation if needed for comparison
      if (useLogScales && getAttributeConfig(xAttr).useLogScale && xVal > 0) {
        xVal = Math.log10(xVal);
      }
      if (useLogScales && getAttributeConfig(yAttr).useLogScale && yVal > 0) {
        yVal = Math.log10(yVal);
      }
      
      if (typeof xVal === "number" && typeof yVal === "number" &&
          !isNaN(xVal) && !isNaN(yVal) &&
          xVal >= minX && xVal <= maxX &&
          yVal >= minY && yVal <= maxY) {
        brushedCountries.add(country.countryCode);
      }
    });
    
    // Apply the appropriate set operation based on mode
    if (mode === 'replace') {
      // Replace existing selection with brushed countries
      brushedCountries.forEach(code => selectedCodes.add(code));
    } else if (mode === 'add') {
      // Add brushed countries to selection
      brushedCountries.forEach(code => selectedCodes.add(code));
    } else if (mode === 'subtract') {
      // Remove brushed countries from selection
      brushedCountries.forEach(code => selectedCodes.delete(code));
    }
    
    onBrushSelection(selectedCodes);
  }, [data, highlightedCountries, onBrushSelection, useLogScales, getAttributeConfig]);

  // Generate matrix cells - use 100% height since parent is flex
  const renderMatrix = () => {
    const cells: JSX.Element[] = [];

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const xAttr = activeAttributes[col];
        const yAttr = activeAttributes[row];
        const cellKey = `${row}-${col}`;
        
        // Diagonal: show attribute name
        if (row === col) {
          // Create a KDE/histogram for diagonal cells
          const values = data
            .filter(country => {
              const value = country[xAttr];
              return typeof value === "number" && !isNaN(value) &&
                    (!useLogScales || !getAttributeConfig(xAttr).useLogScale || value > 0);
            })
            .map(country => {
              const value = country[xAttr] as number;
              return useLogScales && getAttributeConfig(xAttr).useLogScale ? 
                Math.log10(value) : value;
            });
            
          if (values.length === 0) {
            cells.push(
              <div
                key={cellKey}
                className="flex items-center justify-center bg-muted/30 rounded border border-border/50 h-full"
              >
                <span className="text-xs font-medium text-center px-1">{getLabel(xAttr)}</span>
              </div>
            );
          } else {
            // Create a histogram
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min;
            
            // Create bins for histogram
            const numBins = Math.min(15, Math.max(5, Math.floor(Math.sqrt(values.length))));
            const binWidth = range / numBins;
            const bins = Array(numBins).fill(0);
            
            // Fill bins
            values.forEach(value => {
              const binIndex = Math.min(numBins - 1, Math.floor((value - min) / binWidth));
              bins[binIndex]++;
            });
            
            // Create histogram data
            const histData = bins.map((count, i) => ({
              bin: min + (i + 0.5) * binWidth, // use bin center for x-axis
              count,
              highlighted: 0, // Initialize with zero for TypeScript
              // Store original value for tooltip (convert back from log if needed)
              originalBin: useLogScales && getAttributeConfig(xAttr).useLogScale ? 
                Math.pow(10, min + (i + 0.5) * binWidth) : min + (i + 0.5) * binWidth
            }));
            
            // Highlight bins with data from highlighted countries
            const highlightedData = highlightedCountries && highlightedCountries.size > 0 ? 
              data
                .filter(country => highlightedCountries.has(country.countryCode))
                .map(country => {
                  const value = country[xAttr] as number;
                  if (typeof value === "number" && !isNaN(value) &&
                      (!useLogScales || !getAttributeConfig(xAttr).useLogScale || value > 0)) {
                    const transformedValue = useLogScales && getAttributeConfig(xAttr).useLogScale ? 
                      Math.log10(value) : value;
                    return transformedValue;
                  }
                  return null;
                })
                .filter((v): v is number => v !== null) : [];
                
            // Count highlighted values in each bin
            const highlightedBins = Array(numBins).fill(0);
            highlightedData.forEach(value => {
              const binIndex = Math.min(numBins - 1, Math.floor((value - min) / binWidth));
              highlightedBins[binIndex]++;
            });
            
            // Add highlighted counts to histogram data
            histData.forEach((bin, i) => {
              bin.highlighted = highlightedBins[i];
            });
            
            cells.push(
              <div key={cellKey} className="h-full rounded border border-border/50 bg-muted/10 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium bg-background/70 px-1 rounded">
                    {getLabel(xAttr)}{useLogScales && getAttributeConfig(xAttr).useLogScale ? ' (log10)' : ''}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={histData}
                    margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                  >
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'count') return [`${value} countries`];
                        if (name === 'highlighted') return [`${value} selected`];
                        return [value];
                      }}
                      labelFormatter={(label, payload) => {
                        const entry = payload[0]?.payload;
                        if (!entry) return '';
                        const originalValue = entry.originalBin.toFixed(2);
                        return `${getLabel(xAttr)}: ${originalValue}`;
                      }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--muted-foreground) / 0.5)" />
                    {highlightedData.length > 0 && (
                      <Bar dataKey="highlighted" fill="hsl(var(--chart-3))" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          }
        } else {
          const scatterData = getScatterData(xAttr, yAttr);
          const isBrushingThisCell = brushingCell === cellKey;
          
          cells.push(
            <div
              key={cellKey}
              className="relative h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart 
                  margin={{ top: 5, right: 5, bottom: 20, left: 25 }}
                  onMouseDown={(e) => {
                    if (brushMode && e?.xValue !== undefined && e?.yValue !== undefined) {
                      setBrushingCell(cellKey);
                      setBrushStart({ x: e.xValue, y: e.yValue });
                      setBrushEnd({ x: e.xValue, y: e.yValue });
                    }
                  }}
                  onMouseMove={(e) => {
                    if (brushMode && isBrushingThisCell && brushStart && e?.xValue !== undefined && e?.yValue !== undefined) {
                      setBrushEnd({ x: e.xValue, y: e.yValue });
                    }
                  }}
                  onMouseUp={() => {
                    if (brushMode && isBrushingThisCell && brushStart && brushEnd) {
                      // Use keyModifier state to determine brush mode
                      const mode = keyModifier === 'add' ? 'add' : 
                                   keyModifier === 'subtract' ? 'subtract' : 'replace';
                      handleBrushSelect(cellKey, xAttr, yAttr, brushStart.x, brushStart.y, brushEnd.x, brushEnd.y, mode);
                      setBrushingCell(null);
                      setBrushStart(null);
                      setBrushEnd(null);
                    }
                  }}
                  onMouseLeave={() => {
                    if (isBrushingThisCell) {
                      setBrushingCell(null);
                      setBrushStart(null);
                      setBrushEnd(null);
                    }
                  }}
                >
                  <XAxis
                    type="number"
                    dataKey="x"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 8 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    scale={useLogScales && getAttributeConfig(xAttr).useLogScale ? 'linear' : 'auto'}
                    domain={['auto', 'auto']}
                    label={row === gridSize - 1 ? {
                      value: getLabel(xAttr).slice(0, 10) + 
                             (useLogScales && getAttributeConfig(xAttr).useLogScale ? ' (log10)' : ''),
                      position: "bottom",
                      fontSize: 8,
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
                    scale={useLogScales && getAttributeConfig(yAttr).useLogScale ? 'linear' : 'auto'}
                    domain={['auto', 'auto']}
                    label={col === 0 ? {
                      value: getLabel(yAttr).slice(0, 10) + 
                             (useLogScales && getAttributeConfig(yAttr).useLogScale ? ' (log10)' : ''),
                      angle: -90,
                      position: "left",
                      fontSize: 8,
                      fill: "hsl(var(--muted-foreground))",
                    } : undefined}
                  />
                  
                  {/* Brush selection rectangle */}
                  {isBrushingThisCell && brushStart && brushEnd && (
                    <ReferenceArea
                      x1={brushStart.x}
                      x2={brushEnd.x}
                      y1={brushStart.y}
                      y2={brushEnd.y}
                      strokeOpacity={0.8}
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                    />
                  )}
                  
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name, props) => {
                      // Display original values in tooltip
                      const payload = props.payload;
                      if (name === 'x') {
                        return [payload.originalX.toFixed(2)];
                      } else {
                        return [payload.originalY.toFixed(2)];
                      }
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.name || ""}
                  />
                  <Scatter
                    data={scatterData}
                    onClick={(data) => {
                      if (!brushMode) {
                        const entry = data as typeof scatterData[0];
                        if (entry?.country) handlePointClick(entry.country);
                      }
                    }}
                  >
                    {scatterData.map((entry) => {
                      const baseR = matrixSize === "3x3" ? 3 : matrixSize === "2x2" ? 4 : 6;
                      const isHovered = hoveredCountry === entry.country.countryCode;
                      return (
                        <Cell
                          key={entry.country.countryCode}
                          fill={getPointColor(entry.country.countryCode)}
                          style={{
                            cursor: brushMode ? "crosshair" : "pointer",
                            opacity: hoveredCountry && !isHovered ? 0.55 : 1,
                            filter: isHovered ? "drop-shadow(0 0 6px hsla(var(--primary),0.6))" : "none",
                          }}
                          r={isHovered ? baseR * 1.8 : baseR}
                        />
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              
              {/* Brush mode overlay indicator */}
              {brushMode && (
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-primary/30 rounded" />
              )}
            </div>
          );
        }
      }
    }
    return cells;
  };

  // Render normal scatter plot for 2x2
  const renderNormalScatter = () => {
    const xAttr = activeAttributes[0];
    const yAttr = activeAttributes[1];
    const scatterData = getScatterData(xAttr, yAttr);
    
    return (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 10, right: 10, bottom: 30, left: 40 }}
            onMouseMove={(state) => {
              const payload = state?.activePayload?.[0]?.payload as any;
              setHoveredCountry(payload?.country?.countryCode ?? null);
            }}
            onMouseLeave={() => setHoveredCountry(null)}
          >
            <XAxis
              type="number"
              dataKey="x"
              name={getLabel(xAttr)}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              label={{ value: getLabel(xAttr), position: "insideBottom", offset: -5, fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={getLabel(yAttr)}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              label={{ value: getLabel(yAttr), angle: -90, position: "insideLeft", fontSize: 10 }}
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
                if (!brushMode) {
                  const entry = data as typeof scatterData[0];
                  if (entry?.country) handlePointClick(entry.country);
                }
              }}
            >
              {scatterData.map((entry) => (
                <Cell
                  key={entry.country.countryCode}
                  fill={getPointColor(entry.country.countryCode)}
                  style={{ cursor: brushMode ? "crosshair" : "pointer" }}
                  r={4}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const matrixContent = (fullscreen = false) => {
    // For 2x2, show normal scatter plot
    if (matrixSize === "2x2") {
      return renderNormalScatter();
    }
    
    // For 3x3 and 4x4, show matrix
    return (
      <div className={`grid gap-1 ${fullscreen ? "h-full" : "flex-1 min-h-0"}`} style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
        {renderMatrix()}
      </div>
    );
  };

  return (
    <>
      <Card className="glass-panel p-3 h-full flex flex-col">
        <div className="flex items-center justify-between gap-1 mb-1 flex-shrink-0 flex-wrap">
          <h3 className="text-sm font-semibold">SPLOM</h3>
          <div className="flex items-center gap-1">
            {hasSelection && (
              <Button variant="outline" size="sm" onClick={handleClearSelection} className="h-6 text-xs px-2">
                <X className="h-3 w-3 mr-1" />{highlightedCountries?.size}
              </Button>
            )}
            <Button
              variant={brushMode ? "default" : "outline"}
              size="sm"
              onClick={() => setBrushMode(!brushMode)}
              className="h-6 text-xs px-2"
              title="Brush Mode (Hold Shift to add, Alt to subtract)"
            >
              <MousePointer2 className="h-3 w-3" />
            </Button>
            <div className="flex items-center border rounded overflow-hidden">
              <Button variant={matrixSize === "2x2" ? "default" : "ghost"} size="sm" onClick={() => setMatrixSize("2x2")} className="rounded-none px-2 h-6">
                <Grid2X2 className="h-3 w-3" />
              </Button>
              <Button variant={matrixSize === "3x3" ? "default" : "ghost"} size="sm" onClick={() => setMatrixSize("3x3")} className="rounded-none px-2 h-6">
                <Grid3X3 className="h-3 w-3" />
              </Button>
              <Button variant={matrixSize === "4x4" ? "default" : "ghost"} size="sm" onClick={() => setMatrixSize("4x4")} className="rounded-none px-2 h-6">
                <Grid className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={useLogScales ? "default" : "outline"}
                size="sm"
                onClick={() => setUseLogScales(!useLogScales)}
                className="h-6 text-xs px-2"
                title="Toggle Log Scales"
              >
                <BarChart3 className="h-3 w-3 mr-1" />Log
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(true)} className="h-6 w-6 p-0">
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Compact attribute selectors */}
        <div className="flex flex-wrap gap-1 mb-1 flex-shrink-0">
          {activeAttributes.slice(0, matrixSize === "2x2" ? 2 : gridSize).map((attr, index) => (
            <Select key={index} value={attr} onValueChange={(value) => handleAttributeChange(index, value as keyof CountryData)}>
              <SelectTrigger className="w-[100px] h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {attributeOptions.map(opt => (
                  <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        {matrixContent()}
      </Card>
      
      <FullscreenOverlay isOpen={isFullscreen} onClose={() => setIsFullscreen(false)} title="Scatter Plot Matrix">
        {matrixContent(true)}
      </FullscreenOverlay>
    </>
  );
};
