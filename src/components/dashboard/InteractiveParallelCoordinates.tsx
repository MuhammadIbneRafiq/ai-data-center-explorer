import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { CountryData } from "@/types/country-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Maximize2, Focus, Link2, Unlink, LayoutList, LayoutGrid, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

interface AxisLink {
  id: string;
  sourceAxis: string;
  targetAxis: string;
}

type ViewMode = "standard" | "flexible" | "radial";

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
  
  // Focus/Select mode state
  const [localBrushMode, setLocalBrushMode] = useState<"select" | "hover">(brushMode);
  const [focusMode, setFocusMode] = useState(false);
  
  // View mode: standard, flexible (linked axes), or radial
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  
  // Flexible linked axes state
  const [axisLinks, setAxisLinks] = useState<AxisLink[]>([]);
  const [linkingMode, setLinkingMode] = useState(false);
  const [selectedAxisForLink, setSelectedAxisForLink] = useState<string | null>(null);
  
  // Central axis for flexible linked view (Claessen paper style)
  const [centralAxisKey, setCentralAxisKey] = useState<string>(selectedAttributes[0]?.key || '');
  
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

  // Handle axis click for swapping or linking
  const handleAxisClick = useCallback((attrKey: string, index: number) => {
    if (linkingMode) {
      if (selectedAxisForLink === null) {
        setSelectedAxisForLink(attrKey);
      } else if (selectedAxisForLink !== attrKey) {
        // Create new link
        const newLink: AxisLink = {
          id: `${selectedAxisForLink}-${attrKey}`,
          sourceAxis: selectedAxisForLink,
          targetAxis: attrKey,
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
      if (index < selectedAttributes.length - 1) {
        const newAttrs = [...selectedAttributes];
        [newAttrs[index], newAttrs[index + 1]] = [newAttrs[index + 1], newAttrs[index]];
        setSelectedAttributes(newAttrs);
      }
    }
  }, [linkingMode, selectedAxisForLink, axisLinks, selectedAttributes]);

  // Remove a link
  const removeLink = useCallback((linkId: string) => {
    setAxisLinks(axisLinks.filter(l => l.id !== linkId));
  }, [axisLinks]);

  // Generate flexible link path between two non-adjacent axes
  const generateLinkPath = useCallback((
    normalized: Record<string, number>,
    sourceKey: string,
    targetKey: string,
    axisPositions: number[],
    height: number
  ) => {
    const sourceIdx = selectedAttributes.findIndex(a => a.key === sourceKey);
    const targetIdx = selectedAttributes.findIndex(a => a.key === targetKey);
    if (sourceIdx === -1 || targetIdx === -1) return "";

    const sourceX = axisPositions[sourceIdx];
    const targetX = axisPositions[targetIdx];
    const sourceY = height * (1 - normalized[sourceKey]);
    const targetY = height * (1 - normalized[targetKey]);

    // Create a curved path for non-adjacent connections
    const midX = (sourceX + targetX) / 2;
    const curveOffset = Math.abs(targetIdx - sourceIdx) * 25;
    
    return `M ${sourceX},${sourceY} Q ${midX},${sourceY - curveOffset} ${targetX},${targetY}`;
  }, [selectedAttributes]);

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
    if (focusMode && effectiveSelection.has(countryCode)) return 4; // Thicker in focus mode
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
  
  // Claessen paper: Flexible Linked Axes layout
  // Central axis in middle, peripheral axes arranged around it with mini-PCPs
  const getFlexibleLinkedLayout = (w: number, h: number) => {
    const centerX = w / 2;
    const centerY = h / 2;
    const centralAxisLength = Math.min(w, h) * 0.18; // Slightly larger central axis
    const radius = Math.min(w, h) * 0.42; // Increased distance to fill more space
    const peripheralAxisLength = Math.min(w, h) * 0.16; // Longer peripheral axes
    
    // Get peripheral axes (all except the central one)
    const centralAttr = selectedAttributes.find(a => a.key === centralAxisKey) || selectedAttributes[0];
    const peripheralAttrs = selectedAttributes.filter(a => a.key !== centralAxisKey);
    const numPeripheral = peripheralAttrs.length;
    
    // Calculate positions for peripheral axes arranged in a circle
    const peripheralPositions = peripheralAttrs.map((attr, i) => {
      const angle = (i * 2 * Math.PI) / numPeripheral - Math.PI / 2;
      const cx = centerX + radius * Math.cos(angle);
      const cy = centerY + radius * Math.sin(angle);
      
      // Peripheral axis is perpendicular to the line from center
      const perpAngle = angle + Math.PI / 2;
      return {
        attr,
        centerX: cx,
        centerY: cy,
        startX: cx - peripheralAxisLength * Math.cos(perpAngle) / 2,
        startY: cy - peripheralAxisLength * Math.sin(perpAngle) / 2,
        endX: cx + peripheralAxisLength * Math.cos(perpAngle) / 2,
        endY: cy + peripheralAxisLength * Math.sin(perpAngle) / 2,
        angle,
        // Mini-PCP connection points to center
        toCenterAngle: angle + Math.PI, // Points back to center
      };
    });
    
    return {
      centerX,
      centerY,
      centralAxisLength,
      centralAttr,
      peripheralPositions,
    };
  };

  // Get position on a peripheral axis based on normalized value
  const getPeripheralPointPosition = (peripheral: any, value: number) => {
    const t = value; // 0 to 1
    return {
      x: peripheral.startX + (peripheral.endX - peripheral.startX) * t,
      y: peripheral.startY + (peripheral.endY - peripheral.startY) * t,
    };
  };

  // Get position on central axis based on normalized value  
  const getCentralPointPosition = (centerX: number, centerY: number, axisLength: number, value: number, angle: number) => {
    // Central axis points toward the peripheral axis
    const t = value; // 0 to 1
    const halfLen = axisLength / 2;
    // Axis runs perpendicular to the angle to center
    const perpAngle = angle + Math.PI / 2;
    const startX = centerX - halfLen * Math.cos(perpAngle);
    const startY = centerY - halfLen * Math.sin(perpAngle);
    const endX = centerX + halfLen * Math.cos(perpAngle);
    const endY = centerY + halfLen * Math.sin(perpAngle);
    return {
      x: startX + (endX - startX) * t,
      y: startY + (endY - startY) * t,
    };
  };

  const generatePath = (normalized: Record<string, number>, axisPos: number[], h: number, w: number, mode: ViewMode) => {
    // Standard parallel coordinates path only (radial uses different rendering)
    const points = selectedAttributes.map((attr, i) => {
      const x = axisPos[i];
      const y = h * (1 - normalized[attr.key]);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };
  
  // Click handler for moving axis to center in radial view
  const handleAxisToCenter = useCallback((attrKey: string) => {
    if (viewMode === 'radial') {
      setCentralAxisKey(attrKey);
    }
  }, [viewMode]);

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
    // Fullscreen uses more aggressive space usage
    const contentDimensions = fullscreen 
      ? { width: window.innerWidth - 60, height: window.innerHeight - 100 }
      : dimensions;

    // Recalculate layout dimensions for this content
    // Reduced margins to fill more space
    const margin = { top: 40, right: 20, bottom: 20, left: 20 };
    const width = contentDimensions.width - margin.left - margin.right;
    const height = contentDimensions.height - margin.top - margin.bottom;
    
    // Calculate axis positions with flexible scaling
    let totalScale = selectedAttributes.reduce((sum, attr) => 
      sum + (axisScales[attr.key] || 1), 0);
    
    if (totalScale === 0) totalScale = selectedAttributes.length;
    
    const baseSpacing = width / (totalScale - 1 || 1);
    let currentPosition = 0;
    const axisPositions = selectedAttributes.map((attr, idx) => {
      if (idx === 0) return 0;
      const scale = axisScales[selectedAttributes[idx - 1].key] || 1;
      currentPosition += baseSpacing * scale;
      return currentPosition;
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
            {/* Draw axes - Standard/Flexible mode */}
            {viewMode !== 'radial' && selectedAttributes.map((attr, i) => {
              const x = axisPositions[i];
              const scale = axisScales[attr.key] || 1;
              const isLinkSource = selectedAxisForLink === attr.key;
              
              return (
                <g key={attr.key}>
                  {/* Axis line */}
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={height}
                    stroke={isLinkSource ? "hsl(var(--primary))" : isDraggingAxis === attr.key ? "hsl(var(--chart-3))" : "hsl(var(--border))"}
                    strokeWidth={isLinkSource ? 4 : scale > 1.2 ? 3 : 2}
                    style={{ cursor: linkingMode ? "pointer" : "ns-resize" }}
                    onMouseDown={(e) => !linkingMode && handleAxisMouseDown(attr.key, e)}
                    onClick={() => handleAxisClick(attr.key, i)}
                  />
                  
                  {/* Axis label */}
                  <text
                    x={x}
                    y={-10}
                    textAnchor="middle"
                    fill={isLinkSource ? "hsl(var(--primary))" : scale > 1.2 ? "hsl(var(--chart-3))" : "hsl(var(--foreground))"}
                    fontSize={fullscreen ? 14 * Math.sqrt(scale) : 11 * Math.sqrt(scale)}
                    fontWeight="600"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleAxisClick(attr.key, i)}
                  >
                    {attr.label}
                  </text>
                  
                  {/* Min/Max labels */}
                  <text x={x} y={height + 20} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={fullscreen ? 12 : 10}>Min</text>
                  <text x={x} y={-25} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={fullscreen ? 12 : 10}>Max</text>
                  
                  {/* Click hint for swapping */}
                  {!linkingMode && i < selectedAttributes.length - 1 && (
                    <g 
                      className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                      onClick={() => handleAxisClick(attr.key, i)}
                    >
                      <rect x={x - 12} y={height / 2 - 12} width={24} height={24} fill="hsl(var(--primary) / 0.15)" rx={4} />
                      <text x={x} y={height / 2 + 4} textAnchor="middle" fontSize={10} fill="hsl(var(--primary))">⇄</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Claessen Paper: Flexible Linked Axes - Central axis with mini-PCPs */}
            {viewMode === 'radial' && (() => {
              const layout = getFlexibleLinkedLayout(width, height);
              const { centerX, centerY, centralAxisLength, centralAttr, peripheralPositions } = layout;
              
              return (
                <g>
                  {/* Central axis label */}
                  <text
                    x={centerX}
                    y={centerY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="hsl(var(--primary))"
                    fontSize={fullscreen ? 14 : 11}
                    fontWeight="700"
                    className="cursor-pointer"
                    onClick={() => {}}
                  >
                    {centralAttr?.label || 'Center'}
                  </text>
                  
                  {/* Peripheral axes and mini-PCPs */}
                  {peripheralPositions.map((peripheral, i) => {
                    const { attr, startX, startY, endX, endY, centerX: px, centerY: py, angle } = peripheral;
                    
                    // Calculate mini-PCP center axis position (closer to center)
                    const miniCenterDist = Math.min(width, height) * 0.12;
                    const miniCenterX = centerX + miniCenterDist * Math.cos(angle);
                    const miniCenterY = centerY + miniCenterDist * Math.sin(angle);
                    
                    // Mini center axis perpendicular to angle
                    const perpAngle = angle + Math.PI / 2;
                    const miniAxisLen = centralAxisLength * 0.8;
                    const miniStartX = miniCenterX - miniAxisLen * Math.cos(perpAngle) / 2;
                    const miniStartY = miniCenterY - miniAxisLen * Math.sin(perpAngle) / 2;
                    const miniEndX = miniCenterX + miniAxisLen * Math.cos(perpAngle) / 2;
                    const miniEndY = miniCenterY + miniAxisLen * Math.sin(perpAngle) / 2;
                    
                    return (
                      <g key={attr.key}>
                        {/* Mini center axis (for this peripheral) */}
                        <line
                          x1={miniStartX} y1={miniStartY}
                          x2={miniEndX} y2={miniEndY}
                          stroke="hsl(var(--primary) / 0.5)"
                          strokeWidth={2}
                        />
                        
                        {/* Peripheral axis */}
                        <line
                          x1={startX} y1={startY}
                          x2={endX} y2={endY}
                          stroke="hsl(var(--border))"
                          strokeWidth={2}
                          className="cursor-pointer"
                          onClick={() => handleAxisToCenter(attr.key)}
                        />
                        
                        {/* Peripheral axis label */}
                        <text
                          x={px + (px - centerX) * 0.35}
                          y={py + (py - centerY) * 0.35}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="hsl(var(--foreground))"
                          fontSize={fullscreen ? 11 : 9}
                          fontWeight="600"
                          className="cursor-pointer"
                          onClick={() => handleAxisToCenter(attr.key)}
                        >
                          {attr.label}
                        </text>
                        
                        {/* Mini-PCP lines connecting center axis value to peripheral axis value */}
                        {normalizedData.map(({ country, normalized }) => {
                          const centralVal = normalized[centralAttr.key];
                          const peripheralVal = normalized[attr.key];
                          
                          // Position on mini center axis
                          const cPos = {
                            x: miniStartX + (miniEndX - miniStartX) * centralVal,
                            y: miniStartY + (miniEndY - miniStartY) * centralVal,
                          };
                          
                          // Position on peripheral axis
                          const pPos = {
                            x: startX + (endX - startX) * peripheralVal,
                            y: startY + (endY - startY) * peripheralVal,
                          };
                          
                          const isHighlighted = effectiveSelection.has(country.countryCode);
                          const isHovered = hoveredCountry === country.countryCode;
                          
                          return (
                            <line
                              key={`${attr.key}-${country.countryCode}`}
                              x1={cPos.x} y1={cPos.y}
                              x2={pPos.x} y2={pPos.y}
                              stroke={getLineColor(country.countryCode)}
                              strokeWidth={isHovered ? 2 : isHighlighted ? 1.5 : 0.5}
                              opacity={hoveredCountry && !isHovered ? 0.1 : isHighlighted ? 0.9 : 0.4}
                              onMouseEnter={() => {
                                setHoveredCountry(country.countryCode);
                                if (focusMode) onMultiSelect?.(new Set([country.countryCode]));
                              }}
                              onMouseLeave={() => setHoveredCountry(null)}
                              onClick={() => handleLineClick(country)}
                              style={{ cursor: 'pointer' }}
                            >
                              <title>{country.country}: {centralAttr.label} vs {attr.label}</title>
                            </line>
                          );
                        })}
                      </g>
                    );
                  })}
                </g>
              );
            })()}

            {/* Draw flexible links (curved connections between non-adjacent axes) */}
            {viewMode === 'flexible' && axisLinks.map(link => (
              <g key={`link-bg-${link.id}`}>
                {normalizedData.map(({ country, normalized }) => {
                  const linkPath = generateLinkPath(normalized, link.sourceAxis, link.targetAxis, axisPositions, height);
                  if (!linkPath) return null;
                  
                  return (
                    <path
                      key={`${link.id}-${country.countryCode}`}
                      d={linkPath}
                      fill="none"
                      stroke={getLineColor(country.countryCode)}
                      strokeWidth={getLineWidth(country.countryCode)}
                      strokeDasharray="4,2"
                      opacity={hoveredCountry && hoveredCountry !== country.countryCode ? 0.1 : 0.7}
                      onMouseEnter={() => setHoveredCountry(country.countryCode)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => handleLineClick(country)}
                      style={{ cursor: 'pointer' }}
                    >
                      <title>{country.country} (linked)</title>
                    </path>
                  );
                })}
              </g>
            ))}

            {/* Draw lines for each country - Standard/Flexible modes only */}
            {viewMode !== 'radial' && normalizedData.map(({ country, normalized }) => {
              const pathD = generatePath(normalized, axisPositions, height, width, viewMode);
              
              return (
                <path
                  key={country.countryCode}
                  d={pathD}
                  fill="none"
                  stroke={getLineColor(country.countryCode)}
                  strokeWidth={getLineWidth(country.countryCode)}
                  opacity={hoveredCountry && hoveredCountry !== country.countryCode ? 0.15 : 1}
                  onMouseEnter={() => {
                    setHoveredCountry(country.countryCode);
                    if (focusMode || localBrushMode === "hover") {
                      const newSelection = new Set<string>();
                      newSelection.add(country.countryCode);
                      if (onMultiSelect) {
                        onMultiSelect(newSelection);
                      }
                    }
                  }}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onClick={() => {
                    if (localBrushMode === "select" && !focusMode) {
                      handleLineClick(country);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{country.country}</title>
                </path>
              );
            })}

            {/* Data points on axes for hovered country */}
            {hoveredCountry && viewMode !== 'radial' && (
              normalizedData
                .filter(d => d.country.countryCode === hoveredCountry)
                .map(({ country, normalized }) => (
                  selectedAttributes.map((attr, i) => {
                    const x = axisPositions[i];
                    const y = height * (1 - normalized[attr.key]);
                    const rawValue = country[attr.key] as number;
                    
                    return (
                      <g key={`point-${attr.key}`}>
                        <circle cx={x} cy={y} r={5} fill="hsl(var(--chart-3))" stroke="white" strokeWidth={2} />
                        <text x={x + 8} y={y + 3} fill="hsl(var(--foreground))" fontSize={9} fontWeight="500">
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
                title="Flexible linked axes - compare any dimensions"
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

            {/* Brush mode toggle - Focus and Hover are the same (like ScatterPlotMatrix) */}
            <div className="flex items-center border rounded overflow-hidden">
              <Button
                variant={localBrushMode === "select" && !focusMode ? "default" : "ghost"}
                size="sm"
                onClick={() => { setLocalBrushMode("select"); setFocusMode(false); }}
                className="rounded-none px-2 h-6 text-xs"
                title="Select Mode - Click to select"
              >
                Select
              </Button>
              <Button
                variant={localBrushMode === "hover" || focusMode ? "default" : "ghost"}
                size="sm"
                onClick={() => { setLocalBrushMode("hover"); setFocusMode(true); }}
                className="rounded-none px-2 h-6 text-xs"
                title="Focus/Hover Mode - Select on hover"
              >
                <Focus className="h-3 w-3 mr-1" />Focus
              </Button>
            </div>

            <Select onValueChange={addAttribute}>
              <SelectTrigger className="w-[80px] h-6 text-xs">
                <SelectValue placeholder="+ Axis" />
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

        {/* Active links display */}
        {viewMode === "flexible" && axisLinks.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            <span className="text-xs text-muted-foreground">Links:</span>
            {axisLinks.map(link => {
              const source = selectedAttributes.find(a => a.key === link.sourceAxis);
              const target = selectedAttributes.find(a => a.key === link.targetAxis);
              return (
                <Badge
                  key={link.id}
                  variant="outline"
                  className="text-xs px-1.5 py-0 bg-primary/10 cursor-pointer"
                  onClick={() => removeLink(link.id)}
                >
                  {source?.label.slice(0, 6)} ↔ {target?.label.slice(0, 6)}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              );
            })}
          </div>
        )}

        {/* Help text for linking mode */}
        {linkingMode && (
          <p className="text-xs text-muted-foreground mb-1">
            {selectedAxisForLink 
              ? `Click another axis to link with "${selectedAttributes.find(a => a.key === selectedAxisForLink)?.label}"`
              : "Click an axis to start linking"}
          </p>
        )}

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
              onClick={() => !linkingMode && handleAxisClick(attr.key, index)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-grab active:cursor-grabbing transition-all ${
                selectedAxisForLink === attr.key
                  ? 'bg-primary text-primary-foreground'
                  : draggedIndex === index 
                    ? 'bg-primary/30 scale-105' 
                    : dragOverIndex === index 
                      ? 'bg-primary/20 ring-1 ring-primary' 
                      : linkingMode
                        ? 'bg-primary/10 hover:bg-primary/30 cursor-pointer'
                        : 'bg-primary/10'
              }`}
            >
              <span className="select-none">{attr.label.slice(0, 12)}</span>
              {selectedAttributes.length > 2 && (
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeAttribute(attr.key); }} />
              )}
            </div>
          ))}
        </div>

        <div ref={containerRef} className="flex-1 min-h-0 w-full overflow-hidden">
          {parallelContent()}
        </div>
      </Card>
      
      <FullscreenOverlay isOpen={isFullscreen} onClose={() => setIsFullscreen(false)} title="Interactive Parallel Coordinates">
        <div className="w-full h-full flex flex-col">
          {/* Legend for selected countries */}
          {effectiveSelection.size > 0 && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg flex-shrink-0">
              <span className="text-xs font-semibold">Selected:</span>
              <div className="flex flex-wrap gap-1">
                {Array.from(effectiveSelection).slice(0, 8).map((code, index) => {
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
                {effectiveSelection.size > 8 && (
                  <span className="text-[10px] text-muted-foreground">+{effectiveSelection.size - 8} more</span>
                )}
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0">
            {parallelContent(true)}
          </div>
        </div>
      </FullscreenOverlay>
    </>
  );
};
