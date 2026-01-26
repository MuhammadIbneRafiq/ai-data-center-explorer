import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, MousePointer2, Maximize2 } from "lucide-react";
import { FullscreenOverlay } from "./FullscreenOverlay";

interface InteractiveParallelCoordinatesProps {
  data: CountryData[];
  selectedCountries?: CountryData[];
  onCountrySelect?: (country: CountryData) => void;
  highlightedCountries?: Set<string>;
  onMultiSelect?: (countryCodes: Set<string>) => void;
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

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height || 300 });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    // Also update on initial render after a short delay to get correct dimensions
    const timeout = setTimeout(updateDimensions, 100);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeout);
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
  
  const axisSpacing = width / (selectedAttributes.length - 1 || 1);

  const effectiveSelection = highlightedCountries && highlightedCountries.size > 0 
    ? highlightedCountries 
    : localSelection;

  const getLineColor = (countryCode: string) => {
    if (hoveredCountry === countryCode) {
      return "hsl(var(--chart-3))";
    }
    if (effectiveSelection.size > 0) {
      return effectiveSelection.has(countryCode) 
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
    if (effectiveSelection.has(countryCode)) return 2;
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

  const parallelContent = (fullscreen = false) => {
    // Calculate dimensions based on whether we're in fullscreen
    const contentDimensions = fullscreen 
      ? { width: window.innerWidth * 0.9, height: window.innerHeight * 0.8 }
      : dimensions;

    // Recalculate layout dimensions for this content
    const margin = { top: 60, right: 40, bottom: 40, left: 40 };
    const width = contentDimensions.width - margin.left - margin.right;
    const height = contentDimensions.height - margin.top - margin.bottom;
    const axisSpacing = width / (selectedAttributes.length - 1 || 1);

    return (
      <div className={`relative ${fullscreen ? "h-full" : "flex-1 min-h-0"}`}>
        <svg
          ref={!fullscreen ? svgRef : undefined}
          width={contentDimensions.width}
          height={contentDimensions.height}
          className="overflow-visible"
          viewBox={`0 0 ${contentDimensions.width} ${contentDimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
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
                  fontSize={fullscreen ? 14 : 12}
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
              onClick={() => handleLineClick(country)}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <title>{country.country}</title>
            </path>
          ))}
        </g>
      </svg>
    </div>
    );
  };

  return (
    <>
      <Card className="glass-panel p-3 h-full flex flex-col">
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

        {parallelContent()}
      </Card>
      
      <FullscreenOverlay isOpen={isFullscreen} onClose={() => setIsFullscreen(false)} title="Interactive Parallel Coordinates">
        {parallelContent(true)}
      </FullscreenOverlay>
    </>
  );
};
