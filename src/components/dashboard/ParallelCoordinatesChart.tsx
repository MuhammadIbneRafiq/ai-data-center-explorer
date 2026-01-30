import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  X, Maximize2, Link2, Unlink, LayoutGrid, LayoutList, 
  ArrowLeftRight, Plus, ChevronDown, ChevronUp 
} from "lucide-react";

interface ParallelCoordinatesChartProps {
  data: CountryData[];
  selectedCountry?: CountryData | null;
  onCountrySelect?: (country: CountryData) => void;
  highlightedCountries?: Set<string>;
  onMultiSelect?: (countryCodes: Set<string>) => void;
  compact?: boolean;
}

interface Dimension {
  key: keyof CountryData;
  label: string;
  category: string;
}

interface AxisLink {
  id: string;
  sourceAxis: string;
  targetAxis: string;
}

const availableDimensions: Dimension[] = [
  { key: "Real_GDP_per_Capita_USD", label: "GDP per Capita", category: "Economic" },
  { key: "Real_GDP_Growth_Rate_percent", label: "GDP Growth %", category: "Economic" },
  { key: "Unemployment_Rate_percent", label: "Unemployment %", category: "Economic" },
  { key: "electricity_access_percent", label: "Electricity Access %", category: "Energy" },
  { key: "electricity_capacity_per_capita", label: "Electric Capacity", category: "Energy" },
  { key: "internet_users_per_100", label: "Internet Users", category: "Connectivity" },
  { key: "broadband_subs_per_100", label: "Broadband", category: "Connectivity" },
  { key: "mobile_subs_per_100", label: "Mobile Subs", category: "Connectivity" },
  { key: "co2_per_capita_tonnes", label: "CO₂ per Capita", category: "Environmental" },
  { key: "Mean_Temp", label: "Temperature", category: "Geography" },
  { key: "Median_Age", label: "Median Age", category: "Demographics" },
  { key: "population_density", label: "Pop. Density", category: "Demographics" },
  { key: "road_density_per_1000km2", label: "Road Density", category: "Transportation" },
  { key: "airports_per_million", label: "Airports/Million", category: "Transportation" },
];

type ViewMode = "standard" | "flexible" | "radial";

export const ParallelCoordinatesChart = ({
  data,
  selectedCountry,
  onCountrySelect,
  highlightedCountries,
  onMultiSelect,
  compact = false,
}: ParallelCoordinatesChartProps) => {
  // State for selected dimensions (axes)
  const [dimensions, setDimensions] = useState<Dimension[]>([
    availableDimensions.find(d => d.key === "Real_GDP_per_Capita_USD")!,
    availableDimensions.find(d => d.key === "electricity_capacity_per_capita")!,
    availableDimensions.find(d => d.key === "internet_users_per_100")!,
    availableDimensions.find(d => d.key === "co2_per_capita_tonnes")!,
  ]);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("standard");
  const [isExpanded, setIsExpanded] = useState(!compact);
  
  // Flexible linked axes state
  const [axisLinks, setAxisLinks] = useState<AxisLink[]>([]);
  const [linkingMode, setLinkingMode] = useState(false);
  const [selectedAxisForLink, setSelectedAxisForLink] = useState<string | null>(null);
  
  // Interaction state
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [localSelection, setLocalSelection] = useState<Set<string>>(new Set());
  const [draggedAxisIndex, setDraggedAxisIndex] = useState<number | null>(null);
  
  // Refs and dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 600, height: 300 });

  // Resize observer
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const height = isExpanded ? Math.max(rect.height, 300) : 200;
        setSvgDimensions({ width: rect.width || 600, height });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, [isExpanded]);

  // Sync with external selection
  useEffect(() => {
    if (highlightedCountries) {
      setLocalSelection(new Set(highlightedCountries));
    }
  }, [highlightedCountries]);

  // Filter valid data
  const validData = useMemo(() => {
    return data.filter(country =>
      dimensions.every(dim => {
        const val = country[dim.key];
        return typeof val === 'number' && !isNaN(val);
      })
    ).slice(0, 50); // Limit for performance
  }, [data, dimensions]);

  // Calculate normalized values
  const { normalizedData, ranges } = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};
    
    dimensions.forEach(dim => {
      const values = validData
        .map(d => d[dim.key] as number)
        .filter(v => typeof v === 'number' && !isNaN(v));
      
      if (values.length > 0) {
        ranges[dim.key] = {
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    });

    const normalizedData = validData.map(country => {
      const normalized: Record<string, number> = {};
      dimensions.forEach(dim => {
        const value = country[dim.key] as number;
        const range = ranges[dim.key];
        if (range) {
          const span = range.max - range.min;
          normalized[dim.key] = span === 0 ? 0.5 : (value - range.min) / span;
        } else {
          normalized[dim.key] = 0.5;
        }
      });
      return { country, normalized };
    });

    return { normalizedData, ranges };
  }, [validData, dimensions]);

  // Colors
  const colors = [
    "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
    "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(210, 70%, 50%)",
    "hsl(280, 60%, 55%)", "hsl(30, 80%, 55%)"
  ];

  const effectiveSelection = highlightedCountries?.size ? highlightedCountries : localSelection;

  const getLineColor = (countryCode: string, index: number) => {
    if (hoveredCountry === countryCode) return "hsl(var(--chart-3))";
    if (effectiveSelection.size > 0) {
      if (effectiveSelection.has(countryCode)) {
        const selArr = Array.from(effectiveSelection);
        return colors[selArr.indexOf(countryCode) % colors.length];
      }
      return "hsl(var(--muted-foreground) / 0.1)";
    }
    if (selectedCountry?.countryCode === countryCode) return "hsl(var(--chart-3))";
    return colors[index % colors.length] + " / 0.4)";
  };

  const getLineWidth = (countryCode: string) => {
    if (hoveredCountry === countryCode) return 3;
    if (effectiveSelection.has(countryCode)) return 2.5;
    if (selectedCountry?.countryCode === countryCode) return 2.5;
    return 1;
  };

  // Handle line click
  const handleLineClick = useCallback((country: CountryData) => {
    const newSelection = new Set(localSelection);
    if (newSelection.has(country.countryCode)) {
      newSelection.delete(country.countryCode);
    } else {
      newSelection.add(country.countryCode);
    }
    setLocalSelection(newSelection);
    onMultiSelect?.(newSelection);
    onCountrySelect?.(country);
  }, [localSelection, onMultiSelect, onCountrySelect]);

  // Handle axis click for swapping or linking
  const handleAxisClick = useCallback((dimKey: string, index: number) => {
    if (linkingMode) {
      if (selectedAxisForLink === null) {
        setSelectedAxisForLink(dimKey);
      } else if (selectedAxisForLink !== dimKey) {
        // Create new link
        const newLink: AxisLink = {
          id: `${selectedAxisForLink}-${dimKey}`,
          sourceAxis: selectedAxisForLink,
          targetAxis: dimKey,
        };
        // Don't add duplicate links
        if (!axisLinks.some(l => 
          (l.sourceAxis === newLink.sourceAxis && l.targetAxis === newLink.targetAxis) ||
          (l.sourceAxis === newLink.targetAxis && l.targetAxis === newLink.sourceAxis)
        )) {
          setAxisLinks([...axisLinks, newLink]);
        }
        setSelectedAxisForLink(null);
      }
    } else {
      // Swap with next axis (standard PCP behavior)
      if (index < dimensions.length - 1) {
        const newDims = [...dimensions];
        [newDims[index], newDims[index + 1]] = [newDims[index + 1], newDims[index]];
        setDimensions(newDims);
      }
    }
  }, [linkingMode, selectedAxisForLink, axisLinks, dimensions]);

  // Remove a link
  const removeLink = useCallback((linkId: string) => {
    setAxisLinks(axisLinks.filter(l => l.id !== linkId));
  }, [axisLinks]);

  // Add dimension
  const addDimension = useCallback((dimKey: string) => {
    const dim = availableDimensions.find(d => d.key === dimKey);
    if (dim && !dimensions.some(d => d.key === dimKey)) {
      setDimensions([...dimensions, dim]);
    }
  }, [dimensions]);

  // Remove dimension
  const removeDimension = useCallback((dimKey: string) => {
    if (dimensions.length > 2) {
      setDimensions(dimensions.filter(d => d.key !== dimKey));
      // Also remove associated links
      setAxisLinks(axisLinks.filter(l => l.sourceAxis !== dimKey && l.targetAxis !== dimKey));
    }
  }, [dimensions, axisLinks]);

  // Layout calculations
  const margin = { top: 50, right: 30, bottom: 30, left: 30 };
  const width = svgDimensions.width - margin.left - margin.right;
  const height = svgDimensions.height - margin.top - margin.bottom;

  // Standard PCP axis positions
  const axisSpacing = width / (dimensions.length - 1 || 1);
  const getAxisX = (index: number) => index * axisSpacing;

  // Radial layout calculations
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.4;

  const getRadialPosition = (index: number, value: number = 1) => {
    const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
    const r = radius * value;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  // Generate path for a country
  const generatePath = (normalized: Record<string, number>, mode: ViewMode) => {
    if (mode === "radial") {
      const points = dimensions.map((dim, i) => {
        const value = normalized[dim.key];
        const { x, y } = getRadialPosition(i, 0.2 + 0.8 * value);
        return `${x},${y}`;
      });
      return `M ${points.join(' L ')} Z`;
    } else {
      const points = dimensions.map((dim, i) => {
        const x = getAxisX(i);
        const y = height * (1 - normalized[dim.key]);
        return `${x},${y}`;
      });
      return `M ${points.join(' L ')}`;
    }
  };

  // Generate flexible link path between two non-adjacent axes
  const generateLinkPath = (
    normalized: Record<string, number>, 
    sourceKey: string, 
    targetKey: string
  ) => {
    const sourceIdx = dimensions.findIndex(d => d.key === sourceKey);
    const targetIdx = dimensions.findIndex(d => d.key === targetKey);
    if (sourceIdx === -1 || targetIdx === -1) return "";

    const sourceX = getAxisX(sourceIdx);
    const targetX = getAxisX(targetIdx);
    const sourceY = height * (1 - normalized[sourceKey]);
    const targetY = height * (1 - normalized[targetKey]);

    // Create a curved path for non-adjacent connections
    const midX = (sourceX + targetX) / 2;
    const curveOffset = Math.abs(targetIdx - sourceIdx) * 20;
    
    return `M ${sourceX},${sourceY} Q ${midX},${sourceY - curveOffset} ${targetX},${targetY}`;
  };

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setLocalSelection(new Set());
    onMultiSelect?.(new Set());
  }, [onMultiSelect]);

  // No data fallback
  if (validData.length === 0) {
    return (
      <Card className="glass-panel p-4">
        <h3 className="text-lg font-bold">Flexible Linked Axes PCP</h3>
        <p className="text-sm text-muted-foreground">
          Not enough data to display this view.
        </p>
      </Card>
    );
  }

  return (
    <Card className={`glass-panel p-3 ${isExpanded ? 'h-full' : ''} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Flexible Linked Axes PCP</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {effectiveSelection.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearSelection} className="h-6 text-xs px-2">
              <X className="h-3 w-3 mr-1" />{effectiveSelection.size}
            </Button>
          )}

          {/* View mode selector */}
          <div className="flex items-center border rounded overflow-hidden">
            <Button
              variant={viewMode === "standard" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("standard")}
              className="rounded-none px-2 h-6 text-xs"
              title="Standard parallel coordinates"
            >
              <LayoutList className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === "flexible" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("flexible")}
              className="rounded-none px-2 h-6 text-xs"
              title="Flexible linked axes - compare any two dimensions"
            >
              <Link2 className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === "radial" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("radial")}
              className="rounded-none px-2 h-6 text-xs"
              title="Radial/Star layout"
            >
              <LayoutGrid className="h-3 w-3" />
            </Button>
          </div>

          {/* Link mode toggle for flexible mode */}
          {viewMode === "flexible" && (
            <Button
              variant={linkingMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setLinkingMode(!linkingMode);
                setSelectedAxisForLink(null);
              }}
              className="h-6 text-xs px-2"
              title="Click two axes to create a link"
            >
              {linkingMode ? <Unlink className="h-3 w-3 mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
              {linkingMode ? "Done" : "Link"}
            </Button>
          )}

          {/* Add dimension */}
          <Select onValueChange={addDimension}>
            <SelectTrigger className="w-[90px] h-6 text-xs">
              <SelectValue placeholder="+ Axis" />
            </SelectTrigger>
            <SelectContent>
              {availableDimensions
                .filter(d => !dimensions.some(dim => dim.key === d.key))
                .map(d => (
                  <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="Maximize"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Dimension chips with drag-to-reorder */}
      <div className="flex flex-wrap gap-1 mb-2">
        {dimensions.map((dim, index) => (
          <Badge
            key={dim.key}
            variant={selectedAxisForLink === dim.key ? "default" : "secondary"}
            className={`cursor-pointer text-xs px-2 py-0.5 ${
              linkingMode ? 'hover:bg-primary hover:text-primary-foreground' : ''
            }`}
            onClick={() => handleAxisClick(dim.key, index)}
          >
            <span className="mr-1">{dim.label}</span>
            {dimensions.length > 2 && (
              <X
                className="h-3 w-3 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeDimension(dim.key);
                }}
              />
            )}
          </Badge>
        ))}
      </div>

      {/* Active links display */}
      {viewMode === "flexible" && axisLinks.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs text-muted-foreground mr-1">Links:</span>
          {axisLinks.map(link => {
            const source = dimensions.find(d => d.key === link.sourceAxis);
            const target = dimensions.find(d => d.key === link.targetAxis);
            return (
              <Badge
                key={link.id}
                variant="outline"
                className="text-xs px-1.5 py-0 bg-primary/10"
              >
                {source?.label.slice(0, 8)} ↔ {target?.label.slice(0, 8)}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                  onClick={() => removeLink(link.id)}
                />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Help text for linking mode */}
      {linkingMode && (
        <p className="text-xs text-muted-foreground mb-2">
          {selectedAxisForLink 
            ? `Click another axis to link with "${dimensions.find(d => d.key === selectedAxisForLink)?.label}"`
            : "Click an axis to start linking. Links allow comparing non-adjacent dimensions."}
        </p>
      )}

      {/* SVG visualization */}
      <div 
        ref={containerRef} 
        className={`flex-1 min-h-0 w-full ${isExpanded ? '' : 'h-48'}`}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="overflow-visible"
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Draw axes */}
            {viewMode !== "radial" ? (
              // Standard/Flexible axes
              dimensions.map((dim, i) => {
                const x = getAxisX(i);
                const isLinkSource = selectedAxisForLink === dim.key;
                
                return (
                  <g key={dim.key}>
                    <line
                      x1={x} y1={0} x2={x} y2={height}
                      stroke={isLinkSource ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={isLinkSource ? 3 : 2}
                      className={linkingMode ? "cursor-pointer" : "cursor-ew-resize"}
                      onClick={() => handleAxisClick(dim.key, i)}
                    />
                    <text
                      x={x} y={-15}
                      textAnchor="middle"
                      fill={isLinkSource ? "hsl(var(--primary))" : "hsl(var(--foreground))"}
                      fontSize={11}
                      fontWeight="600"
                      className={linkingMode ? "cursor-pointer" : "cursor-ew-resize"}
                      onClick={() => handleAxisClick(dim.key, i)}
                    >
                      {dim.label}
                    </text>
                    <text x={x} y={height + 15} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={9}>
                      Min
                    </text>
                    <text x={x} y={-28} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={9}>
                      Max
                    </text>
                    {/* Click hint for swapping */}
                    {!linkingMode && i < dimensions.length - 1 && (
                      <g 
                        className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                        onClick={() => handleAxisClick(dim.key, i)}
                      >
                        <rect x={x - 10} y={height / 2 - 10} width={20} height={20} fill="hsl(var(--primary) / 0.1)" rx={4} />
                        <ArrowLeftRight className="h-3 w-3" x={x - 6} y={height / 2 - 6} />
                      </g>
                    )}
                  </g>
                );
              })
            ) : (
              // Radial axes
              dimensions.map((dim, i) => {
                const inner = getRadialPosition(i, 0.2);
                const outer = getRadialPosition(i, 1);
                const labelPos = getRadialPosition(i, 1.15);
                
                return (
                  <g key={dim.key}>
                    <line
                      x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                      stroke="hsl(var(--border))"
                      strokeWidth={2}
                    />
                    <text
                      x={labelPos.x} y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="hsl(var(--foreground))"
                      fontSize={10}
                      fontWeight="600"
                    >
                      {dim.label}
                    </text>
                  </g>
                );
              })
            )}

            {/* Draw flexible links (curved connections between non-adjacent axes) */}
            {viewMode === "flexible" && axisLinks.map(link => (
              <g key={`link-bg-${link.id}`}>
                {normalizedData.map(({ country, normalized }, idx) => {
                  const linkPath = generateLinkPath(normalized, link.sourceAxis, link.targetAxis);
                  if (!linkPath) return null;
                  
                  return (
                    <path
                      key={`${link.id}-${country.countryCode}`}
                      d={linkPath}
                      fill="none"
                      stroke={getLineColor(country.countryCode, idx)}
                      strokeWidth={getLineWidth(country.countryCode)}
                      strokeDasharray="4,2"
                      opacity={hoveredCountry && hoveredCountry !== country.countryCode ? 0.1 : 0.7}
                      onMouseEnter={() => setHoveredCountry(country.countryCode)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => handleLineClick(country)}
                      className="cursor-pointer"
                    >
                      <title>{country.country} (linked)</title>
                    </path>
                  );
                })}
              </g>
            ))}

            {/* Draw country lines */}
            {normalizedData.map(({ country, normalized }, index) => {
              const pathD = generatePath(normalized, viewMode);
              
              return (
                <path
                  key={country.countryCode}
                  d={pathD}
                  fill={viewMode === "radial" ? getLineColor(country.countryCode, index).replace(')', ' / 0.1)') : "none"}
                  stroke={getLineColor(country.countryCode, index)}
                  strokeWidth={getLineWidth(country.countryCode)}
                  opacity={hoveredCountry && hoveredCountry !== country.countryCode ? 0.15 : 1}
                  onMouseEnter={() => setHoveredCountry(country.countryCode)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onClick={() => handleLineClick(country)}
                  className="cursor-pointer transition-opacity"
                >
                  <title>{country.country}</title>
                </path>
              );
            })}

            {/* Data points on axes for hovered country */}
            {hoveredCountry && viewMode !== "radial" && (
              normalizedData
                .filter(d => d.country.countryCode === hoveredCountry)
                .map(({ country, normalized }) => (
                  dimensions.map((dim, i) => {
                    const x = getAxisX(i);
                    const y = height * (1 - normalized[dim.key]);
                    const rawValue = country[dim.key] as number;
                    
                    return (
                      <g key={`point-${dim.key}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r={6}
                          fill="hsl(var(--chart-3))"
                          stroke="white"
                          strokeWidth={2}
                        />
                        <text
                          x={x + 10}
                          y={y + 4}
                          fill="hsl(var(--foreground))"
                          fontSize={10}
                          fontWeight="500"
                        >
                          {typeof rawValue === 'number' ? rawValue.toLocaleString(undefined, { maximumFractionDigits: 1 }) : ''}
                        </text>
                      </g>
                    );
                  })
                ))
            )}
          </g>
        </svg>
      </div>

      {/* Legend for selected countries */}
      {effectiveSelection.size > 0 && effectiveSelection.size <= 8 && (
        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
          {Array.from(effectiveSelection).slice(0, 8).map((code, idx) => {
            const country = validData.find(c => c.countryCode === code);
            return country ? (
              <div key={code} className="flex items-center gap-1 text-xs">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
                <span>{country.country}</span>
              </div>
            ) : null;
          })}
        </div>
      )}
    </Card>
  );
}
