import { useState, useMemo, useCallback, memo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceArea, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Grid2X2, Grid3X3, Grid, Maximize2, BarChart3 } from "lucide-react";
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
  // Support coordinated views with brushing and linking
  brushEnabled?: boolean;
  brushMode?: "select" | "hover";
  // Support geometric zooming
  zoomLevel?: number;
  onZoomChange?: (level: number) => void;
}

interface AttributeOption {
  key: keyof CountryData;
  label: string;
  useLogScale?: boolean;
}

const attributeOptions: AttributeOption[] = [
  // Basic info
  { key: "Mean_Temp", label: "Mean Temperature" },
  { key: "Median_Age", label: "Median Age" },
  
  // Economy
  { key: "Real_GDP_PPP_billion_USD", label: "GDP (PPP)", useLogScale: true },
  { key: "Real_GDP_per_Capita_USD", label: "GDP per Capita", useLogScale: true },
  { key: "Real_GDP_Growth_Rate_percent", label: "GDP Growth Rate" },
  { key: "Youth_Unemployment_Rate_percent", label: "Youth Unemployment" },
  
  // Demographics
  { key: "Population_Growth_Rate", label: "Population Growth" },
  { key: "Total_Literacy_Rate", label: "Literacy Rate" },
  
  // Energy & Infrastructure
  { key: "electricity_access_percent", label: "Electricity Access" },
  { key: "electricity_capacity_per_capita", label: "Electric Capacity", useLogScale: true },
  
  // Connectivity
  { key: "internet_users_per_100", label: "Internet Users" },
  { key: "broadband_subs_per_100", label: "Broadband Subscribers" },
  { key: "mobile_subs_per_100", label: "Mobile Subscribers" },
  
  // Demographics & Geography
  { key: "population_density", label: "Population Density", useLogScale: true },
  { key: "road_density_per_1000km2", label: "Road Density", useLogScale: true },
  { key: "rail_density_per_1000km2", label: "Rail Density", useLogScale: true },
  { key: "airports_per_million", label: "Airports per Million" },
  
  // Environmental
  { key: "co2_per_capita_tonnes", label: "CO₂ per Capita", useLogScale: true },
  { key: "co2_per_gdp_tonnes_per_billion", label: "CO₂ per GDP", useLogScale: true },
  { key: "fossil_intensity_index", label: "Fossil Intensity Index" },
  
  // Geography & Environment
  { key: "water_share", label: "Water Share" },
  { key: "coastline_per_1000km2", label: "Coastline Density" },
  
  // Z-score variants
  { key: "z_electricity_capacity_per_capita", label: "Z-Electric Capacity" },
  { key: "z_real_gdp_ppp", label: "Z-GDP (PPP)" },
  { key: "z_co2_per_capita", label: "Z-CO₂ per Capita" },
];

type MatrixSize = "2x2" | "3x3" | "4x4";

export const ScatterPlotMatrix = ({
  data,
  activeCountry,
  onCountrySelect,
  highlightedCountries,
  onBrushSelection,
  brushEnabled = true,
  brushMode = "select",
  zoomLevel = 1,
  onZoomChange,
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
  const [useLogScales, setUseLogScales] = useState(true);
  // Brush state for each cell (hover-based brushing)
  const [brushingCell, setBrushingCell] = useState<string | null>(null);
  const [brushCenter, setBrushCenter] = useState<{ x: number; y: number } | null>(null);
  // Brushing is available for matrix layouts (3x3, 4x4) when enabled
  const isBrushingEnabled = brushEnabled && matrixSize !== "2x2";
  // Track currently selected cell for zooming
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  // Ref for cell content to enable zooming
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // For throttling brush operations
  const lastBrushTime = useRef<number>(0);
  
  // Register cell ref for zooming
  const registerCellRef = useCallback((el: HTMLDivElement | null, key: string) => {
    if (el) {
      cellRefs.current.set(key, el);
    } else {
      cellRefs.current.delete(key);
    }
  }, []);
  
  // Handle cell click for zooming and selection
  const handleCellClick = useCallback((cellKey: string) => {
    // Toggle cell selection for zooming
    setSelectedCell(prev => prev === cellKey ? null : cellKey);
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

  // Geometric zoom control - changes apply to all cells
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoomLevel + 0.25, 3);
    onZoomChange?.(newZoom);
  }, [zoomLevel, onZoomChange]);
  
  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoomLevel - 0.25, 0.5);
    onZoomChange?.(newZoom);
  }, [zoomLevel, onZoomChange]);

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
  const getScatterData = useCallback((xAttr: keyof CountryData, yAttr: keyof CountryData) => {
    const xConfig = getAttributeConfig(xAttr);
    const yConfig = getAttributeConfig(yAttr);
    
    return data
      // Limit points processed based on matrix size for better performance
      .slice(0, matrixSize === "4x4" ? 150 : 300)
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
  }, [data, useLogScales, matrixSize, getAttributeConfig]);

  // Memoize reference area to avoid re-creating on each render
  const renderReferenceArea = useMemo(() => {
    if (!brushingCell || !brushCenter) return null;
    
    const hoverBox = 8; // half-size of hover selection box
    return (
      <ReferenceArea
        x1={brushCenter.x - hoverBox}
        x2={brushCenter.x + hoverBox}
        y1={brushCenter.y - hoverBox}
        y2={brushCenter.y + hoverBox}
        strokeOpacity={0.8}
        stroke="hsl(var(--primary))"
        fill="hsl(var(--primary))"
        fillOpacity={0.2}
      />
    );
  }, [brushingCell, brushCenter]);

  const getLabel = (key: keyof CountryData) => {
    return attributeOptions.find(a => a.key === key)?.label || String(key);
  };

  // Memoize tooltip styles for reuse
  const tooltipStyle = useMemo(() => ({
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  }), []);
  
  // Handle brush selection for a cell (hover-only, replace selection)
  const handleBrushSelect = useCallback((cellKey: string, xAttr: keyof CountryData, yAttr: keyof CountryData, x1: number, y1: number, x2: number, y2: number) => {
    if (!onBrushSelection || !isBrushingEnabled) return;
    
    // Skip intensive calculations if we have too many countries
    if (data.length > 500) {
      // Sample countries for large datasets
      const sampleRate = Math.max(0.1, 100 / data.length);
      if (Math.random() > sampleRate) return;
    }
    
    // Skip brushing if it's happening too frequently
    const now = Date.now();
    if (now - lastBrushTime.current < 20) return; // Limit to ~50fps
    lastBrushTime.current = now;
    
    // Only update selection cell when in select mode (not hover)
    if (brushMode === "select") {
      setSelectedCell(cellKey);
    }
    
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    // Always replace selection for hover brushing
    const selectedCodes = new Set<string>();
    
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
    
    // Replace existing selection with brushed countries
    brushedCountries.forEach(code => selectedCodes.add(code));
    
    onBrushSelection(selectedCodes);
  }, [data, highlightedCountries, onBrushSelection, useLogScales, getAttributeConfig]);

  // Memoize matrix cells - use 100% height since parent is flex
  const renderMatrix = useMemo(() => {
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
              return typeof value === "number" && !isNaN(value as number) &&
                    (!useLogScales || !getAttributeConfig(xAttr).useLogScale || (value as number) > 0);
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
                      contentStyle={tooltipStyle}
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
          // Non-diagonal cells show scatter plots
          const scatterData = getScatterData(xAttr, yAttr);
          const isBrushingThisCell = brushingCell === cellKey;
          const hoverBox = 8; // half-size of hover selection box
          
          // Apply zoom effect if this cell is selected
          const isZoomed = selectedCell === cellKey;
          const cellScale = isZoomed ? zoomLevel : 1;
          
          cells.push(
            <div
              key={cellKey}
              ref={(el) => registerCellRef(el, cellKey)}
              className={`relative h-full ${isZoomed ? 'ring-2 ring-primary' : ''}`}
              style={{
                transform: isZoomed ? `scale(${cellScale})` : 'none',
                zIndex: isZoomed ? 10 : 'auto',
                transition: 'transform 0.3s ease'
              }}
              onClick={() => handleCellClick(cellKey)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart 
                  margin={{ top: 5, right: 5, bottom: 20, left: 25 }}
                  onMouseMove={(e) => {
                    if (e?.xValue !== undefined && e?.yValue !== undefined && isBrushingEnabled) {
                      // Throttle mouse events for better performance
                      const now = Date.now();
                      if (now - lastBrushTime.current < 30) return; // ~33fps throttle
                      lastBrushTime.current = now;
                      
                      setBrushingCell(cellKey);
                      setBrushCenter({ x: e.xValue, y: e.yValue });
                      
                      // Only process brushing in hover mode or if cell is clicked in select mode
                      if (brushMode === "hover" || (brushMode === "select" && selectedCell === cellKey)) {
                        handleBrushSelect(
                          cellKey,
                          xAttr,
                          yAttr,
                          e.xValue - hoverBox,
                          e.yValue - hoverBox,
                          e.xValue + hoverBox,
                          e.yValue + hoverBox
                        );
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    if (isBrushingThisCell) {
                      setBrushingCell(null);
                      setBrushCenter(null);
                      onBrushSelection?.(new Set());
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
                  {isBrushingEnabled && isBrushingThisCell && renderReferenceArea}
                  
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={tooltipStyle}
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
                      const entry = data as typeof scatterData[0];
                      if (entry?.country) handlePointClick(entry.country);
                    }}
                  >
                    {scatterData.map((entry) => {
                      // Base radius depends on matrix size - smaller for larger matrices
                      const baseR = matrixSize === "3x3" ? 3 : matrixSize === "2x2" ? 4 : 2;
                      const isHovered = hoveredCountry === entry.country.countryCode;
                      const isHighlighted = highlightedCountries?.has(entry.country.countryCode);
                      
                      // Semantic zoom: Add more detail when cell is zoomed
                      // - Larger points
                      // - Labels for highlighted or hovered points
                      // - Stroke outlines 
                      const zoomedCell = isZoomed || cellScale > 1;
                      const semanticR = zoomedCell ? baseR * 1.5 : baseR;
                      
                      return (
                        <g key={entry.country.countryCode}>
                          <Cell
                            key={`cell-${entry.country.countryCode}`}
                            fill={getPointColor(entry.country.countryCode)}
                            style={{
                              cursor: isBrushingEnabled ? "crosshair" : "pointer",
                              opacity: hoveredCountry && !isHovered ? 0.55 : 1,
                              filter: isHovered ? "drop-shadow(0 0 6px hsla(var(--primary),0.6))" : 
                                    (zoomedCell && isHighlighted) ? "drop-shadow(0 0 4px hsla(var(--primary),0.4))" : "none",
                              stroke: zoomedCell && isHighlighted ? "hsl(var(--primary))" : "none",
                              strokeWidth: zoomedCell && isHighlighted ? 1 : 0,
                            }}
                            r={isHovered ? semanticR * 1.8 : semanticR}
                          />
                          
                          {/* Show labels when zoomed in and point is highlighted or hovered */}
                          {zoomedCell && (isHighlighted || isHovered) && (
                            <text 
                              x={entry.x} 
                              y={entry.y - semanticR - 2}
                              textAnchor="middle"
                              fill={isHovered ? "hsl(var(--primary))" : "hsl(var(--foreground))"}
                              style={{ fontSize: semanticR * 2, fontWeight: isHovered ? "bold" : "normal" }}
                              pointerEvents="none"
                            >
                              {entry.country.country.slice(0, 6)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              
              {/* Brush mode overlay indicator */}
              {isBrushingEnabled && (
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-primary/30 rounded" />
              )}
            </div>
          );
        }
      }
    }
    return cells;
  }, [gridSize, activeAttributes, useLogScales, data.length, brushMode, brushingCell, brushCenter, highlightedCountries?.size, zoomLevel, selectedCell, registerCellRef, handleCellClick]);

  // Render normal scatter plot for 2x2
  const renderNormalScatter = useMemo(() => {
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
              contentStyle={tooltipStyle}
              formatter={(value: number) => [value.toFixed(2)]}
              labelFormatter={(_, payload) => payload[0]?.payload?.name || ""}
            />
            <Scatter
              data={scatterData}
              onClick={(data) => {
                if (!isBrushingEnabled) {
                  const entry = data as typeof scatterData[0];
                  if (entry?.country) handlePointClick(entry.country);
                }
              }}
            >
              {scatterData.map((entry) => {
                const isHovered = hoveredCountry === entry.country.countryCode;
                return (
                  <Cell
                    key={entry.country.countryCode}
                    fill={getPointColor(entry.country.countryCode)}
                    style={{
                      cursor: isBrushingEnabled ? "crosshair" : "pointer",
                      opacity: hoveredCountry && !isHovered ? 0.55 : 1,
                    }}
                    r={isHovered ? 6 : 4}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }, [activeAttributes, getScatterData, isBrushingEnabled, getLabel, getPointColor, handlePointClick, setHoveredCountry, hoveredCountry, tooltipStyle]);

  const matrixContent = (fullscreen = false) => {
    // For 2x2, show normal scatter plot
    if (matrixSize === "2x2") {
      return renderNormalScatter;
    }
    
    // For 3x3 and 4x4, show matrix
    return (
      <div className={`grid gap-1 ${fullscreen ? "h-full" : "flex-1 min-h-0"}`} style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
        {renderMatrix}
      </div>
    );
  }

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
            {/* Hover brushing is always on; no toggle needed */}
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
              {/* Log scale toggle */}
              <Button
                variant={useLogScales ? "default" : "outline"}
                size="sm"
                onClick={() => setUseLogScales(!useLogScales)}
                className="h-6 text-xs px-2"
                title="Toggle Log Scales"
              >
                <BarChart3 className="h-3 w-3 mr-1" />Log
              </Button>
              
              {/* Zoom controls for geometric zooming */}
              <div className="flex items-center border rounded overflow-hidden">
                <Button 
                  variant="ghost"
                  size="sm" 
                  onClick={handleZoomOut}
                  className="rounded-none px-2 h-6"
                  disabled={zoomLevel <= 0.5}
                  title="Zoom Out"
                >
                  -
                </Button>
                <span className="px-2 text-xs font-medium">{Math.round(zoomLevel * 100)}%</span>
                <Button 
                  variant="ghost"
                  size="sm" 
                  onClick={handleZoomIn}
                  className="rounded-none px-2 h-6"
                  disabled={zoomLevel >= 3}
                  title="Zoom In"
                >
                  +
                </Button>
              </div>
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
