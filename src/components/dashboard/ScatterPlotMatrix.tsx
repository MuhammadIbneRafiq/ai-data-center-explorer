import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceArea, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Grid2X2, Grid3X3, Grid, Maximize2, BarChart3, Focus, Search } from "lucide-react";
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
  brushMode: propBrushMode = "select",
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
  // Brush state for drag-select brushing
  const [brushingCell, setBrushingCell] = useState<string | null>(null);
  const [brushStart, setBrushStart] = useState<{ x: number; y: number } | null>(null);
  const [localBrushMode, setLocalBrushMode] = useState<"select" | "hover">(propBrushMode);
  const [brushEnd, setBrushEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const focusLensRef = useRef<{ x: number; y: number } | null>(null);
  const [focusLensState, setFocusLensState] = useState<{ x: number; y: number } | null>(null);
  const focusLensUpdateTimer = useRef<number | null>(null);
  const [selectionLocked, setSelectionLocked] = useState(false);

  
  // Lasso brush state - array of points forming the polygon
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number; screenX: number; screenY: number }[]>([]);
  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoCell, setLassoCell] = useState<{ key: string; xAttr: keyof CountryData; yAttr: keyof CountryData } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Brushing is always available when enabled (removed 2x2 restriction)
  const isBrushingEnabled = brushEnabled;
  // Track currently selected cell for zooming
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  // Ref for cell content to enable zooming
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // For throttling brush operations
  const lastBrushTime = useRef<number>(0);

  const dragDistance = useRef(0);

  
  // Point-in-polygon algorithm (ray casting)
  const pointInPolygon = useCallback((point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }, []);

  // Get attribute config for log scale information
  const getAttributeConfig = (key: keyof CountryData) => {
    return attributeOptions.find(attr => attr.key === key) || { key, label: String(key) };
  };

  // Handle lasso selection - select all points inside the polygon
  const handleLassoSelect = useCallback(() => {
    if (!onBrushSelection || !lassoCell || lassoPoints.length < 3) return;
    
    const { xAttr, yAttr } = lassoCell;
    const selectedCodes = new Set<string>();
    
    // Convert lasso points to data coordinates for comparison
    const lassoDataCoords = lassoPoints.map(p => ({ x: p.x, y: p.y }));
    
    data.forEach(country => {
      let xVal = country[xAttr] as number;
      let yVal = country[yAttr] as number;
      
      if (typeof xVal !== "number" || typeof yVal !== "number" || isNaN(xVal) || isNaN(yVal)) return;
      
      // Apply log transformation if needed
      if (useLogScales && getAttributeConfig(xAttr).useLogScale && xVal > 0) {
        xVal = Math.log10(xVal);
      }
      if (useLogScales && getAttributeConfig(yAttr).useLogScale && yVal > 0) {
        yVal = Math.log10(yVal);
      }
      
      if (pointInPolygon({ x: xVal, y: yVal }, lassoDataCoords)) {
        selectedCodes.add(country.countryCode);
      }
    });
    
    onBrushSelection(selectedCodes);
  }, [data, lassoCell, lassoPoints, onBrushSelection, pointInPolygon, useLogScales, getAttributeConfig]);
  
  // Global mouse up handler to complete lasso when mouse released anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isLassoing && lassoPoints.length >= 3 && lassoCell) {
        // Trigger selection
        handleLassoSelect();
      }
      setIsLassoing(false);
      setLassoPoints([]);
      setLassoCell(null);
    };
    
    if (isLassoing) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isLassoing, lassoPoints.length, lassoCell, handleLassoSelect]);
  
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
    "hsl(var(--chart-8))",
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
    // Use consistent colors matching radar plot
    if (highlightedCountries && highlightedCountries.size > 0) {
      if (highlightedCountries.has(countryCode)) {
        const index = getColorIndex(countryCode);
        return colorPalette[index];
      }
      return "#94a3b8"; // Muted gray for non-highlighted
    }
    if (activeCountry && activeCountry.countryCode === countryCode) {
      return "#3b82f6"; // Blue for active
    }
    return "#3b82f6"; // Default gray
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
    setSelectionLocked(false);
  };

  const getBasePointRadius = (matrixSize: MatrixSize) => {
    switch (matrixSize) {
      case "2x2":
        return 2.2;
      case "3x3":
        return 1.1;
      case "4x4":
        return 0.85;
      default:
        return 1;
    }
  };


  const hasSelection = highlightedCountries && highlightedCountries.size > 0;

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

  // Memoize reference area for drag selection
  const renderReferenceArea = useMemo(() => {
    if (!brushingCell || !brushStart || !brushEnd) return null;
    
    return (
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
    );
  }, [brushingCell, brushStart, brushEnd]);

  const getLabel = (key: keyof CountryData) => {
    return attributeOptions.find(a => a.key === key)?.label || String(key);
  };

  // Memoize tooltip styles for reuse
  const tooltipStyle = useMemo(() => ({
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
    color: "hsl(var(--foreground))",
    padding: "8px 12px",
  }), []);
  
  // Handle brush selection for a cell (hover-only, replace selection)
  const handleBrushSelect = useCallback((cellKey: string, xAttr: keyof CountryData, yAttr: keyof CountryData, x1: number, y1: number, x2: number, y2: number) => {
    

    if (!onBrushSelection || !isBrushingEnabled) return;

    // If selection is locked, do not update it via focus hover
    if (focusMode && selectionLocked && !isDragging) {
      return;
    }
    
    // Skip intensive calculations if we have too many countries
    if (data.length > 500) {
      // Sample countries for large datasets
      const sampleRate = Math.max(0.1, 100 / data.length);
      if (Math.random() > sampleRate) return;
    }
    
    // Skip brushing if it's happening too frequently - increased to 100ms for better performance
    const now = Date.now();
    if (now - lastBrushTime.current < 100) return; // Limit to ~10fps for smoother experience
    lastBrushTime.current = now;
    
    // Only update selection cell when in select mode (not hover)
    if (localBrushMode === "select") {
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
  }, [data, highlightedCountries, onBrushSelection, useLogScales, getAttributeConfig, localBrushMode]);
  
  const ScatterDot = ({
    cx,
    cy,
    payload,
  }: {
    cx?: number;
    cy?: number;
    payload?: any;
  }) => {
    if (cx == null || cy == null || !payload) return null;

    const countryCode = payload.country.countryCode;

    const isHovered = hoveredCountry === countryCode;
    const isHighlighted =
      highlightedCountries?.has(countryCode) ||
      activeCountry?.countryCode === countryCode;

    const hasAnySelection =
      (highlightedCountries && highlightedCountries.size > 0) ||
      !!activeCountry;

    // Base radius by matrix size
    const baseR =
      matrixSize === "2x2"
        ? 5
        : matrixSize === "3x3"
          ? 3
          : 2.5; // 4x4

    let r = baseR;

    // Focus mode magnification
    if (focusMode && isHighlighted) {
      r = baseR * 1.2;
    }
    // Zoomed cell magnification
    else if (selectedCell) {
      r = baseR * 1.2;
    }

    const fillOpacity =
    // Hover always wins in select mode
    (!focusMode && localBrushMode === "select" && isHovered)
      ? 1
      : hasAnySelection
        ? isHighlighted ? 1 : 0.15
        : 0.4;


    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={getPointColor(countryCode)}
        fillOpacity={fillOpacity}
        stroke={
          isHovered
            ? "#333"
            : isHighlighted
              ? getPointColor(countryCode)
              : "none"
        }
        strokeWidth={
          isHovered ? 1.5 : isHighlighted ? 0.5 : 0
        }
        style={{ cursor: "pointer" }}
      />
    );
  };


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
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={histData}
                    margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
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
                    <Bar dataKey="count" fill="hsl(var(--muted-foreground) / 0.5)" radius={0} />
                    {highlightedData.length > 0 && (
                      <Bar dataKey="highlighted" fill="hsl(var(--chart-3))" radius={0} />
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
              className={`relative h-full ${isZoomed ? 'ring-2 ring-primary' : ''} ${focusMode ? 'cursor-zoom-in' : ''}`}
              style={{
                transform: isZoomed ? `scale(${cellScale})` : 'none',
                zIndex: isZoomed ? 10 : 'auto',
                transition: 'none'
              }}
              onClick={() => handleCellClick(cellKey)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart 
                  margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                  onMouseDown={(e, event) => {
                    if (!isBrushingEnabled || e?.xValue === undefined || e?.yValue === undefined) return;

                    dragDistance.current = 0; //  reset

                    setBrushingCell(cellKey);
                    setBrushStart({ x: e.xValue, y: e.yValue });
                    setBrushEnd({ x: e.xValue, y: e.yValue });
                    setIsDragging(true);

                    const nativeEvent = event?.nativeEvent as MouseEvent | undefined;
                    if (focusMode && nativeEvent) {
                      focusLensRef.current = { x: nativeEvent.offsetX, y: nativeEvent.offsetY };
                      setFocusLensState({ x: nativeEvent.offsetX, y: nativeEvent.offsetY });
                    }
                    setSelectionLocked(false);
                  }}

                  onMouseMove={(e, event) => {
                    if (!isBrushingEnabled) return;
                    const nativeEvent = event?.nativeEvent as MouseEvent | undefined;
                    if (focusMode && nativeEvent) {
                      // Use ref + debounced state update for performance
                      focusLensRef.current = { x: nativeEvent.offsetX, y: nativeEvent.offsetY };
                      if (!focusLensUpdateTimer.current) {
                        focusLensUpdateTimer.current = window.setTimeout(() => {
                          setFocusLensState(focusLensRef.current);
                          focusLensUpdateTimer.current = null;
                        }, 50);
                      }
                    }
                    if ((localBrushMode === "hover" || focusMode) && !isDragging && e?.xValue !== undefined && e?.yValue !== undefined) {
                      const dataPoints = getScatterData(xAttr, yAttr);
                      if (dataPoints.length > 0) {
                        const xValues = dataPoints.map(d => d.x);
                        const yValues = dataPoints.map(d => d.y);
                        const xMin = Math.min(...xValues);
                        const xMax = Math.max(...xValues);
                        const yMin = Math.min(...yValues);
                        const yMax = Math.max(...yValues);
                        const xBoxSize = (xMax - xMin) * 0.05;
                        const yBoxSize = (yMax - yMin) * 0.05;
                        handleBrushSelect(
                          cellKey,
                          xAttr,
                          yAttr,
                          e.xValue - xBoxSize,
                          e.yValue - yBoxSize,
                          e.xValue + xBoxSize,
                          e.yValue + yBoxSize
                        );
                      }
                    }
                    if (isDragging && brushingCell === cellKey && brushStart && e?.xValue !== undefined && e?.yValue !== undefined) {
                      dragDistance.current +=
                        Math.abs(e.xValue - brushStart.x) +
                        Math.abs(e.yValue - brushStart.y);

                      setBrushEnd({ x: e.xValue, y: e.yValue });
                      handleBrushSelect(cellKey, xAttr, yAttr, brushStart.x, brushStart.y, e.xValue, e.yValue);
                    }

                  }}
                  onMouseUp={(e) => {
                    if (!brushStart) return;

                    // CLICK (not drag)
                    if (dragDistance.current < 0.02) {
                      const payload = e?.activePayload?.[0]?.payload;
                      if (payload?.country) {
                        handlePointClick(payload.country);
                        setSelectionLocked(true);
                      }
                    } 
                    // DRAG
                    else if (brushEnd) {
                      handleBrushSelect(
                        cellKey,
                        xAttr,
                        yAttr,
                        brushStart.x,
                        brushStart.y,
                        brushEnd.x,
                        brushEnd.y
                      );
                    }

                    setIsDragging(false);
                    setBrushingCell(null);
                    setBrushStart(null);
                    setBrushEnd(null);
                  }}

                  onMouseLeave={() => {
                    setIsDragging(false);
                    setBrushingCell(null);
                    setBrushStart(null);
                    setBrushEnd(null);
                    if (focusMode) {
                      focusLensRef.current = null;
                      setFocusLensState(null);
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
                      value: getLabel(xAttr) + 
                             (useLogScales && getAttributeConfig(xAttr).useLogScale ? ' (log10)' : ''),
                      position: "bottom",
                      dy: 40,
                      fontSize: 9,
                      fill: "hsl(var(--foreground))",
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
                      value: getLabel(yAttr) + 
                             (useLogScales && getAttributeConfig(yAttr).useLogScale ? ' (log10)' : ''),
                      angle: -90,
                      position: "left",
                      dx: 35,
                      dy: -30,
                      fontSize: 9,
                      fill: "hsl(var(--foreground))",
                    } : undefined}
                  />
                  
                  {/* Brush selection rectangle */}
                  {isBrushingEnabled && isBrushingThisCell && renderReferenceArea}
                  
                  {!focusMode && (
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={tooltipStyle}
                      offset={20}
                      position={{ x: undefined, y: undefined }}
                      content={(props) => {
                        if (!props.active || !props.payload?.[0]) return null;
                        const point = props.payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg pointer-events-none" style={{ transform: 'translate(15px, -50%)' }}>
                            <p className="font-semibold text-sm mb-2">{point.name}</p>
                            <div className="space-y-1">
                              <p className="text-xs">
                                <span className="font-medium">{getLabel(xAttr)}:</span>{' '}
                                <span className="text-muted-foreground">{point.originalX.toFixed(2)}</span>
                              </p>
                              <p className="text-xs">
                                <span className="font-medium">{getLabel(yAttr)}:</span>{' '}
                                <span className="text-muted-foreground">{point.originalY.toFixed(2)}</span>
                              </p>
                            </div>
                          </div>
                        );
                      }}
                    />
                  )}
                 <Scatter
                  data={scatterData}
                  shape={<ScatterDot />}
                  onClick={(data) => {
                    const entry = data as typeof scatterData[0];
                    if (entry?.country) handlePointClick(entry.country);
                    setSelectionLocked(true);
                  }}
                />

                </ScatterChart>
              </ResponsiveContainer>
              
              {/* Focus lens overlay */}
              {focusMode && focusLensState && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: focusLensState.x - 30,
                    top: focusLensState.y - 30,
                    width: 60,
                    height: 60,
                    borderRadius: '9999px',
                    border: '2px solid hsl(var(--primary))',
                    boxShadow: '0 0 0 6px rgba(59,130,246,0.1)',
                    background: 'radial-gradient(circle at 30% 30%, rgba(59,130,246,0.08), rgba(59,130,246,0.02))'
                  }}
                />
              )}
              
              {/* Brush mode indicator */}
              {isBrushingEnabled && (
                <div className="absolute inset-0 pointer-events-none border border-dashed border-primary/15 rounded" />
              )}
            </div>
          );
        }
      }
    }
    return cells;
  }, [gridSize, activeAttributes, useLogScales, data.length, localBrushMode, highlightedCountries?.size, zoomLevel, selectedCell, registerCellRef, handleCellClick, isLassoing, lassoCell, lassoPoints, isBrushingEnabled, handleLassoSelect, focusMode, getColorIndex, colorPalette, getPointColor, handleBrushSelect, focusLensState, getScatterData, matrixSize]);

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
              content={(props) => {
                if (!props.active || !props.payload?.[0]) return null;
                const point = props.payload[0].payload;
                return (
                  <div className="bg-popover border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold text-sm mb-2">{point.name}</p>
                    <div className="space-y-1">
                      <p className="text-xs">
                        <span className="font-medium">{getLabel(xAttr)}:</span>{' '}
                        <span className="text-muted-foreground">{point.originalX.toFixed(2)}</span>
                      </p>
                      <p className="text-xs">
                        <span className="font-medium">{getLabel(yAttr)}:</span>{' '}
                        <span className="text-muted-foreground">{point.originalY.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter
              data={scatterData}
              shape={<ScatterDot />}
              onClick={(data) => {
                const entry = data as typeof scatterData[0];
                if (entry?.country) handlePointClick(entry.country);
                setSelectionLocked(true);
              }}
            />

          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }, [activeAttributes, getScatterData, isBrushingEnabled, getLabel, getPointColor, handlePointClick, setHoveredCountry, hoveredCountry, tooltipStyle, highlightedCountries]);

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
              {/* Brush mode toggle - Focus and Hover are the same */}
              <div className="flex items-center border rounded overflow-hidden">
                <Button
                  variant={localBrushMode === "select" && !focusMode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => { setLocalBrushMode("select"); setFocusMode(false); setSelectionLocked(false);}}
                  className="rounded-none px-2 h-6 text-xs"
                  title="Select Mode - Drag to select points"
                >
                  Select
                </Button>
                <Button
                  variant={localBrushMode === "hover" || focusMode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => { setLocalBrushMode("hover"); setFocusMode(true); setSelectionLocked(false); }}
                  className="rounded-none px-2 h-6 text-xs"
                  title="Focus/Hover Mode - Magnify and select on hover"
                >
                  <Focus className="h-3 w-3 mr-1" />Focus
                </Button>
              </div>
              
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
        <div className="h-full flex flex-col">
          {/* Legend for selected countries */}
          {highlightedCountries && highlightedCountries.size > 0 && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg flex-shrink-0">
              <span className="text-xs font-semibold">Selected:</span>
              <div className="flex flex-wrap gap-1">
                {Array.from(highlightedCountries).slice(0, 8).map((code, index) => {
                  const country = data.find(c => c.countryCode === code);
                  return (
                    <div key={code} className="flex items-center gap-1 bg-background rounded px-1.5 py-0.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: colorPalette[index % colorPalette.length] }}
                      />
                      <span className="text-[10px]">{country?.country || code}</span>
                    </div>
                  );
                })}
                {highlightedCountries.size > 8 && (
                  <span className="text-[10px] text-muted-foreground">+{highlightedCountries.size - 8} more</span>
                )}
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0">
            {matrixContent(true)}
          </div>
        </div>
      </FullscreenOverlay>
    </>
  );
};
