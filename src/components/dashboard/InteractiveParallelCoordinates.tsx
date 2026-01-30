import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, MousePointer2, Maximize2, Search, GitBranch } from "lucide-react";
import { FullscreenOverlay } from "./FullscreenOverlay";

interface InteractiveParallelCoordinatesProps {
  data: CountryData[];
  selectedCountries?: CountryData[];
  onCountrySelect?: (country: CountryData) => void;
  highlightedCountries?: Set<string>;
  onMultiSelect?: (countryCodes: Set<string>) => void;
  // Support coordinated views with brushing and linking
  brushEnabled?: boolean;
  brushMode?: "select" | "hover";
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
  onMultiSelect,
  brushEnabled = true,
  brushMode = "select",
}: InteractiveParallelCoordinatesProps) => {
  const [selectedAttributes, setSelectedAttributes] = useState<Attribute[]>([
    availableAttributes.find(a => a.key === "Real_GDP_per_Capita_USD")!,
    availableAttributes.find(a => a.key === "electricity_capacity_per_capita")!,
    availableAttributes.find(a => a.key === "internet_users_per_100")!,
    availableAttributes.find(a => a.key === "co2_per_capita_tonnes")!,
  ]);
  
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(true);
  const [localSelection, setLocalSelection] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // PCP variant: standard or flexible (radial)
  const [pcpVariant, setPcpVariant] = useState<'standard' | 'flexible'>('standard');
  
  // Flexible axis scaling - for distorted zooming on specific axes
  const [axisScales, setAxisScales] = useState<Record<string, number>>({});
  // Track dragging state for axis scaling
  const [isDraggingAxis, setIsDraggingAxis] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  
  // Fisheye magnification for edge bundling areas
  const [fisheyeEnabled, setFisheyeEnabled] = useState(false);
  const [fisheyeCenter, setFisheyeCenter] = useState<{ x: number; y: number } | null>(null);
  const [fisheyeRadius] = useState(100);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Set a minimum height to prevent collapse
        const height = Math.max(rect.height, 250);
        setDimensions({ width: rect.width || 800, height });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    // Also update on initial render after a short delay to get correct dimensions
    const timeout = setTimeout(updateDimensions, 100);
    
    // Create a ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeout);
      resizeObserver.disconnect();
    };
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

  // Drag and drop handlers for reordering axes
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newAttributes = [...selectedAttributes];
    const [removed] = newAttributes.splice(draggedIndex, 1);
    newAttributes.splice(index, 0, removed);
    setSelectedAttributes(newAttributes);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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

  // Sync local selection with external highlighted countries
  useEffect(() => {
    if (highlightedCountries) {
      setLocalSelection(new Set(highlightedCountries));
    }
  }, [highlightedCountries]);

  const handleLineClick = useCallback((country: CountryData) => {
    if (isMultiSelectMode) {
      const newSelection = new Set(localSelection);
      if (newSelection.has(country.countryCode)) {
        newSelection.delete(country.countryCode);
      } else {
        newSelection.add(country.countryCode);
      }
      setLocalSelection(newSelection);
      onMultiSelect?.(newSelection);
    }
    onCountrySelect?.(country);
  }, [isMultiSelectMode, localSelection, onMultiSelect, onCountrySelect]);

  const handleClearSelection = useCallback(() => {
    setLocalSelection(new Set());
    onMultiSelect?.(new Set());
  }, [onMultiSelect]);

  const margin = { top: 60, right: 40, bottom: 40, left: 40 };
  const width = dimensions.width - margin.left - margin.right;
  const height = dimensions.height - margin.top - margin.bottom;
  
  // Calculate axis positions with flexible scaling
  let totalScale = selectedAttributes.reduce((sum, attr) => 
    sum + (axisScales[attr.key] || 1), 0);
  
  if (totalScale === 0) totalScale = selectedAttributes.length;
  
  const baseSpacing = width / totalScale;
  let currentPosition = 0;
  const axisPositions = selectedAttributes.map(attr => {
    const scale = axisScales[attr.key] || 1;
    const position = currentPosition;
    currentPosition += baseSpacing * scale;
    return position;
  });

  const effectiveSelection = highlightedCountries && highlightedCountries.size > 0 
    ? highlightedCountries 
    : localSelection;

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
    if (effectiveSelection.size > 0 && effectiveSelection.has(countryCode)) {
      // Convert to array to get stable indices
      const selectionArray = Array.from(effectiveSelection);
      const index = selectionArray.indexOf(countryCode);
      return index % colorPalette.length;
    }
    // For selected countries
    if (selectedCountries) {
      const index = selectedCountries.findIndex(c => c.countryCode === countryCode);
      if (index !== -1) return index % colorPalette.length;
    }
    return 0;
  };

  const getLineColor = (countryCode: string) => {
    if (hoveredCountry === countryCode) {
      return "hsl(var(--chart-3))";
    }
    if (effectiveSelection.size > 0) {
      return effectiveSelection.has(countryCode) 
        ? colorPalette[getColorIndex(countryCode)] 
        : "hsl(var(--muted-foreground) / 0.1)";
    }
    if (selectedCountries && selectedCountries.some(c => c.countryCode === countryCode)) {
      return colorPalette[getColorIndex(countryCode)];
    }
    return "hsl(var(--muted-foreground) / 0.3)";
  };

  const getLineWidth = (countryCode: string) => {
    if (hoveredCountry === countryCode) return 3;
    if (effectiveSelection.has(countryCode)) return 2;
    if (selectedCountries && selectedCountries.some(c => c.countryCode === countryCode)) return 2;
    return 1;
  };

  // Handle axis drag for scaling
  const handleAxisMouseDown = useCallback((attrKey: string, e: React.MouseEvent) => {
    setIsDraggingAxis(attrKey);
    setDragStartY(e.clientY);
  }, []);
  
  const handleAxisMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingAxis || dragStartY === null) return;
    
    // Calculate drag distance and convert to scale factor
    const dragDelta = dragStartY - e.clientY;
    const scaleFactor = Math.max(0.5, Math.min(3, 1 + (dragDelta / 200)));
    
    setAxisScales(prev => ({
      ...prev,
      [isDraggingAxis]: scaleFactor
    }));
  }, [isDraggingAxis, dragStartY]);
  
  const handleAxisMouseUp = useCallback(() => {
    setIsDraggingAxis(null);
    setDragStartY(null);
  }, []);
  
  useEffect(() => {
    if (isDraggingAxis) {
      window.addEventListener('mousemove', handleAxisMouseMove as any);
      window.addEventListener('mouseup', handleAxisMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleAxisMouseMove as any);
        window.removeEventListener('mouseup', handleAxisMouseUp);
      };
    }
  }, [isDraggingAxis, handleAxisMouseMove, handleAxisMouseUp]);
  
  const generatePath = (normalized: Record<string, number>) => {
    if (pcpVariant === 'flexible') {
      // Generate curved path for flexible/radial layout
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.35;
      const angleStep = (2 * Math.PI) / selectedAttributes.length;
      
      const points = selectedAttributes.map((attr, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const value = normalized[attr.key];
        const r = radius * (0.2 + 0.8 * value);
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        return { x, y };
      });
      
      // Create smooth curve through points
      let path = `M ${points[0].x},${points[0].y}`;
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const cp1x = p1.x + (p2.x - p1.x) * 0.3;
        const cp1y = p1.y + (p2.y - p1.y) * 0.3;
        const cp2x = p2.x - (p2.x - p1.x) * 0.3;
        const cp2y = p2.y - (p2.y - p1.y) * 0.3;
        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }
      return path;
    } else {
      // Standard parallel coordinates path
      const points = selectedAttributes.map((attr, i) => {
        const x = axisPositions[i];
        const y = height * (1 - normalized[attr.key]);
        return `${x},${y}`;
      });
      return `M ${points.join(' L ')}`;
    }
  };

  // Apply fisheye distortion to coordinates
  const applyFisheye = (x: number, y: number) => {
    if (!fisheyeEnabled || !fisheyeCenter) return { x, y };
    
    const dx = x - fisheyeCenter.x;
    const dy = y - fisheyeCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < fisheyeRadius) {
      const distortionFactor = 2.5;
      const scale = (1 - Math.pow(distance / fisheyeRadius, 2)) * distortionFactor + 1;
      return {
        x: fisheyeCenter.x + dx * scale,
        y: fisheyeCenter.y + dy * scale
      };
    }
    return { x, y };
  };
  
  const parallelContent = (fullscreen = false) => {
    // Calculate dimensions based on whether we're in fullscreen
  const contentDimensions = fullscreen 
    ? { width: window.innerWidth * 0.95, height: window.innerHeight * 0.85 }
    : dimensions;

  // Recalculate layout dimensions for this content
  const margin = { top: 60, right: 40, bottom: 40, left: 40 };
  const width = contentDimensions.width - margin.left - margin.right;
  const height = contentDimensions.height - margin.top - margin.bottom;
  
  // Calculate axis positions with flexible scaling
  let totalScale = selectedAttributes.reduce((sum, attr) => 
    sum + (axisScales[attr.key] || 1), 0);
  
  if (totalScale === 0) totalScale = selectedAttributes.length;
  
  const baseSpacing = width / totalScale;
  let currentPosition = 0;
  const axisPositions = selectedAttributes.map(attr => {
    const scale = axisScales[attr.key] || 1;
    const position = currentPosition;
    currentPosition += baseSpacing * scale;
    return position;
  });

    return (
      <div className={`relative w-full ${fullscreen ? "h-full" : "flex-1 min-h-0"}`}>
        <svg
          ref={!fullscreen ? svgRef : undefined}
          width="100%"
          height="100%"
          className="overflow-visible"
          viewBox={`0 0 ${contentDimensions.width} ${contentDimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={(e) => {
            if (fisheyeEnabled) {
              const rect = e.currentTarget.getBoundingClientRect();
              setFisheyeCenter({
                x: ((e.clientX - rect.left) / rect.width) * contentDimensions.width,
                y: ((e.clientY - rect.top) / rect.height) * contentDimensions.height
              });
            }
          }}
          onMouseLeave={() => {
            if (fisheyeEnabled) {
              setFisheyeCenter(null);
            }
          }}
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Draw axes */}
            {selectedAttributes.map((attr, i) => {
              const x = axisPositions[i];
              const scale = axisScales[attr.key] || 1;
              
              return (
                <g key={attr.key}>
                  {/* Axis line - thicker when emphasized */}
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={height}
                    stroke={isDraggingAxis === attr.key ? "hsl(var(--primary))" : "hsl(var(--border))"}
                    strokeWidth={scale > 1.2 ? 3 : 2}
                    style={{ cursor: "ns-resize" }}
                    onMouseDown={(e) => handleAxisMouseDown(attr.key, e)}
                  />
                  
                  {/* Axis label - emphasized when scaled */}
                  <text
                    x={x}
                    y={-10}
                    textAnchor="middle"
                    fill={scale > 1.2 ? "hsl(var(--primary))" : "hsl(var(--foreground))"}
                    fontSize={fullscreen ? 14 * Math.sqrt(scale) : 12 * Math.sqrt(scale)}
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
                    fontSize={fullscreen ? 12 : 10}
                  >
                    Min
                  </text>
                  <text
                    x={x}
                    y={-25}
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                    fontSize={fullscreen ? 12 : 10}
                  >
                    Max
                  </text>
                  
                  {/* Scale indicator */}
                  {scale !== 1 && (
                    <text
                      x={x}
                      y={-40}
                      textAnchor="middle"
                      fill="hsl(var(--primary))"
                      fontSize={fullscreen ? 12 : 10}
                    >
                      {scale.toFixed(1)}×
                    </text>
                  )}
                </g>
              );
            })}

            {/* Draw lines for each country */}
            {normalizedData.map(({ country, normalized }) => {
              // Generate path using local axisPositions for fullscreen
              const pathPoints = selectedAttributes.map((attr, i) => {
                const x = axisPositions[i];
                const y = height * (1 - normalized[attr.key]);
                return `${x},${y}`;
              });
              const pathD = `M ${pathPoints.join(' L ')}`;
              
              return (
                <path
                  key={country.countryCode}
                  d={pathD}
                  fill="none"
                  stroke={getLineColor(country.countryCode)}
                  strokeWidth={getLineWidth(country.countryCode)}
                  opacity={hoveredCountry && hoveredCountry !== country.countryCode ? 0.2 : 1}
                  onMouseEnter={() => setHoveredCountry(country.countryCode)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onClick={() => handleLineClick(country)}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{country.country}</title>
                </path>
              );
            })}
          </g>
        </svg>
    </div>
    );
  };

  return (
    <>
      <Card className="glass-panel p-3 h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-1 mb-1 flex-shrink-0 flex-wrap">
          <h3 className="text-sm font-semibold">Parallel Coords</h3>
          <div className="flex items-center gap-1">
            {effectiveSelection.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearSelection} className="h-6 text-xs px-2">
                <X className="h-3 w-3 mr-1" />{effectiveSelection.size}
              </Button>
            )}
            <Button
              variant={isMultiSelectMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              className="h-6 text-xs px-2"
            >
              <MousePointer2 className="h-3 w-3" />
            </Button>
            <Select onValueChange={addAttribute}>
              <SelectTrigger className="w-[100px] h-6 text-xs">
                <SelectValue placeholder="Add..." />
              </SelectTrigger>
              <SelectContent>
                {availableAttributes
                  .filter(attr => !selectedAttributes.find(a => a.key === attr.key))
                  .map(attr => (
                    <SelectItem key={attr.key} value={attr.key}>{attr.label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(true)} className="h-6 w-6 p-0">
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Compact draggable attribute chips */}
        <div className="flex flex-wrap gap-1 mb-1 flex-shrink-0">
          {selectedAttributes.map((attr, index) => (
            <div
              key={attr.key}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-grab active:cursor-grabbing transition-all ${
                draggedIndex === index 
                  ? 'bg-primary/30 scale-105' 
                  : dragOverIndex === index 
                    ? 'bg-primary/20 ring-1 ring-primary' 
                    : 'bg-primary/10'
              }`}
            >
              <span className="select-none">{attr.label.slice(0, 12)}</span>
              {selectedAttributes.length > 2 && (
                <X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeAttribute(attr.key); }} />
              )}
            </div>
          ))}
        </div>

        <div ref={containerRef} className="flex-1 min-h-0 w-full overflow-hidden">
          {parallelContent()}
        </div>
      </Card>
      
      <FullscreenOverlay isOpen={isFullscreen} onClose={() => setIsFullscreen(false)} title="Interactive Parallel Coordinates">
        <div className="w-full h-full">
          {parallelContent(true)}
        </div>
      </FullscreenOverlay>
    </>
  );
};
