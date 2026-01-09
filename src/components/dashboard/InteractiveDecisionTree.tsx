import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TreeDeciduous, Leaf, Zap, Thermometer, Wifi, DollarSign, RotateCcw, ZoomIn, ZoomOut, Move, Hand } from 'lucide-react';

interface CountryData {
  country: string;
  country_code: string;
  renewable_energy_percent: number | null;
  electricity_cost: number | null;
  average_temperature: number | null;
  connectivity_score: number | null;
  gdp_per_capita: number | null;
  overall_datacenter_score: number | null;
}

interface DecisionCriteria {
  id: string;
  label: string;
  icon: React.ReactNode;
  field: keyof CountryData;
  options: { label: string; value: string; isGreen?: boolean }[];
}

interface TreeNode {
  id: string;
  label: string;
  x: number;
  y: number;
  children: TreeNode[];
  countries?: CountryData[];
  isHighlighted?: boolean;
  isGreen?: boolean;
  level: number;
  countryCode?: string;
}

interface InteractiveDecisionTreeProps {
  data: CountryData[];
  selectedCountryCodes?: Set<string>;
  onCountrySelect?: (countryCode: string) => void;
  onCountriesFilter?: (countryCodes: string[]) => void;
}

const CRITERIA: DecisionCriteria[] = [
  {
    id: 'renewable',
    label: 'Renewable Energy',
    icon: <Leaf className="w-4 h-4" />,
    field: 'renewable_energy_percent',
    options: [
      { label: 'High (>50%)', value: 'high', isGreen: true },
      { label: 'Medium (20-50%)', value: 'medium', isGreen: true },
      { label: 'Low (<20%)', value: 'low' },
    ],
  },
  {
    id: 'electricity',
    label: 'Electricity Cost',
    icon: <Zap className="w-4 h-4" />,
    field: 'electricity_cost',
    options: [
      { label: 'Low (<$0.10)', value: 'low' },
      { label: 'Medium ($0.10-0.20)', value: 'medium' },
      { label: 'High (>$0.20)', value: 'high' },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    icon: <Thermometer className="w-4 h-4" />,
    field: 'average_temperature',
    options: [
      { label: 'Cool (<15°C)', value: 'cool', isGreen: true },
      { label: 'Moderate (15-25°C)', value: 'moderate' },
      { label: 'Hot (>25°C)', value: 'hot' },
    ],
  },
  {
    id: 'connectivity',
    label: 'Connectivity',
    icon: <Wifi className="w-4 h-4" />,
    field: 'connectivity_score',
    options: [
      { label: 'Excellent (>80)', value: 'excellent' },
      { label: 'Good (50-80)', value: 'good' },
      { label: 'Basic (<50)', value: 'basic' },
    ],
  },
  {
    id: 'gdp',
    label: 'GDP per Capita',
    icon: <DollarSign className="w-4 h-4" />,
    field: 'gdp_per_capita',
    options: [
      { label: 'High (>$30k)', value: 'high' },
      { label: 'Medium ($10-30k)', value: 'medium' },
      { label: 'Low (<$10k)', value: 'low' },
    ],
  },
];

const InteractiveDecisionTree: React.FC<InteractiveDecisionTreeProps> = ({ 
  data, 
  selectedCountryCodes = new Set(),
  onCountrySelect,
  onCountriesFilter,
}) => {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [greenLevel, setGreenLevel] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<'pan' | 'node'>('pan');
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const SVG_WIDTH = 1200;
  const SVG_HEIGHT = 800;

  // Calculate green level based on selections
  useEffect(() => {
    let green = 0;
    Object.entries(selections).forEach(([criteriaId, value]) => {
      const criteria = CRITERIA.find(c => c.id === criteriaId);
      const option = criteria?.options.find(o => o.value === value);
      if (option?.isGreen) green++;
    });
    setGreenLevel(green);
  }, [selections]);

  // Filter countries based on selections
  const filterCountry = useCallback((country: CountryData): boolean => {
    for (const [criteriaId, value] of Object.entries(selections)) {
      const criteria = CRITERIA.find(c => c.id === criteriaId);
      if (!criteria) continue;

      const fieldValue = country[criteria.field];
      if (fieldValue === null || fieldValue === undefined) continue;

      switch (criteriaId) {
        case 'renewable':
          if (value === 'high' && (fieldValue as number) <= 50) return false;
          if (value === 'medium' && ((fieldValue as number) < 20 || (fieldValue as number) > 50)) return false;
          if (value === 'low' && (fieldValue as number) >= 20) return false;
          break;
        case 'electricity':
          if (value === 'low' && (fieldValue as number) >= 0.10) return false;
          if (value === 'medium' && ((fieldValue as number) < 0.10 || (fieldValue as number) > 0.20)) return false;
          if (value === 'high' && (fieldValue as number) <= 0.20) return false;
          break;
        case 'temperature':
          if (value === 'cool' && (fieldValue as number) >= 15) return false;
          if (value === 'moderate' && ((fieldValue as number) < 15 || (fieldValue as number) > 25)) return false;
          if (value === 'hot' && (fieldValue as number) <= 25) return false;
          break;
        case 'connectivity':
          if (value === 'excellent' && (fieldValue as number) <= 80) return false;
          if (value === 'good' && ((fieldValue as number) < 50 || (fieldValue as number) > 80)) return false;
          if (value === 'basic' && (fieldValue as number) >= 50) return false;
          break;
        case 'gdp':
          if (value === 'high' && (fieldValue as number) <= 30000) return false;
          if (value === 'medium' && ((fieldValue as number) < 10000 || (fieldValue as number) > 30000)) return false;
          if (value === 'low' && (fieldValue as number) >= 10000) return false;
          break;
      }
    }
    return true;
  }, [selections]);

  // Use external selection if provided, otherwise filter by criteria
  const baseCountries = useMemo(() => {
    if (selectedCountryCodes.size > 0) {
      return data.filter(c => selectedCountryCodes.has(c.country_code));
    }
    return data;
  }, [data, selectedCountryCodes]);

  const filteredCountries = useMemo(() => {
    return baseCountries.filter(filterCountry).sort((a, b) => 
      (b.overall_datacenter_score || 0) - (a.overall_datacenter_score || 0)
    );
  }, [baseCountries, filterCountry]);

  // Notify parent of filtered countries
  useEffect(() => {
    if (onCountriesFilter && Object.keys(selections).length > 0) {
      onCountriesFilter(filteredCountries.map(c => c.country_code));
    }
  }, [filteredCountries, onCountriesFilter, selections]);

  const winner = filteredCountries[0];

  // Build tree structure
  const buildTree = useMemo((): TreeNode => {
    const rootX = SVG_WIDTH / 2;
    const levelHeight = 120;
    
    // Root node (winner)
    const root: TreeNode = {
      id: 'root',
      label: winner ? winner.country : 'Select Criteria',
      x: rootX,
      y: 80,
      children: [],
      isHighlighted: true,
      isGreen: greenLevel > 0,
      level: 0,
      countryCode: winner?.country_code,
    };

    // Create criteria level nodes
    const allCriteria = CRITERIA;
    
    const criteriaSpacing = SVG_WIDTH / (allCriteria.length + 1);
    
    allCriteria.forEach((criteria, idx) => {
      const isSelected = selections[criteria.id];
      const selectedOption = criteria.options.find(o => o.value === selections[criteria.id]);
      
      const criteriaNode: TreeNode = {
        id: criteria.id,
        label: isSelected ? `${criteria.label}: ${selectedOption?.label}` : criteria.label,
        x: criteriaSpacing * (idx + 1),
        y: 200,
        children: [],
        isHighlighted: !!isSelected,
        isGreen: selectedOption?.isGreen,
        level: 1,
      };
      
      // Add option nodes
      const optionSpacing = 80;
      const startX = criteriaNode.x - ((criteria.options.length - 1) * optionSpacing) / 2;
      
      criteria.options.forEach((option, optIdx) => {
        const isOptionSelected = selections[criteria.id] === option.value;
        const optionNode: TreeNode = {
          id: `${criteria.id}-${option.value}`,
          label: option.label,
          x: startX + optIdx * optionSpacing,
          y: 320,
          children: [],
          isHighlighted: isOptionSelected,
          isGreen: option.isGreen && isOptionSelected,
          level: 2,
        };
        criteriaNode.children.push(optionNode);
      });
      
      root.children.push(criteriaNode);
    });

    // Country layer at bottom
    const countriesToShow = filteredCountries.slice(0, 20);
    const countrySpacing = SVG_WIDTH / (countriesToShow.length + 1);
    
    countriesToShow.forEach((country, idx) => {
      const isExternallySelected = selectedCountryCodes.has(country.country_code);
      const countryNode: TreeNode = {
        id: country.country_code,
        label: country.country,
        x: countrySpacing * (idx + 1),
        y: SVG_HEIGHT - 100,
        children: [],
        countries: [country],
        isHighlighted: country === winner || isExternallySelected,
        isGreen: (country.renewable_energy_percent || 0) > 50,
        level: 4,
        countryCode: country.country_code,
      };
      
      // Connect to a random criteria child for visual effect
      if (root.children.length > 0) {
        const randomCriteria = root.children[idx % root.children.length];
        if (randomCriteria.children.length > 0) {
          const randomOption = randomCriteria.children[idx % randomCriteria.children.length];
          randomOption.children.push(countryNode);
        }
      }
    });

    return root;
  }, [selections, filteredCountries, winner, greenLevel, selectedCountryCodes]);

  const handleSelect = (criteriaId: string, value: string) => {
    setSelections(prev => {
      if (prev[criteriaId] === value) {
        const newSelections = { ...prev };
        delete newSelections[criteriaId];
        return newSelections;
      }
      return { ...prev, [criteriaId]: value };
    });
  };

  const handleReset = () => {
    setSelections({});
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNodeOffsets({});
  };

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.5));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragMode === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragMode === 'pan') {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (draggedNode && dragMode === 'node') {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (svgRect) {
        const x = (e.clientX - svgRect.left - pan.x) / zoom;
        const y = (e.clientY - svgRect.top - pan.y) / zoom;
        setNodeOffsets(prev => ({
          ...prev,
          [draggedNode]: { dx: x, dy: y }
        }));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.5, Math.min(3, z * delta)));
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (dragMode === 'node') {
      e.stopPropagation();
      setDraggedNode(nodeId);
    }
  };

  const handleNodeClick = (nodeId: string, countryCode?: string) => {
    if (dragMode === 'node') return;
    if (countryCode && onCountrySelect) {
      onCountrySelect(countryCode);
    }
  };

  // Get node position with offset
  const getNodePosition = (node: TreeNode) => {
    const offset = nodeOffsets[node.id] || { dx: 0, dy: 0 };
    if (offset.dx !== 0 || offset.dy !== 0) {
      return { x: offset.dx, y: offset.dy };
    }
    return { x: node.x, y: node.y };
  };

  // Render tree connections
  const renderConnections = (node: TreeNode): React.ReactNode[] => {
    const connections: React.ReactNode[] = [];
    const nodePos = getNodePosition(node);
    
    node.children.forEach((child) => {
      const childPos = getNodePosition(child);
      const isHighlightedPath = node.isHighlighted && child.isHighlighted;
      const isGreenPath = node.isGreen || child.isGreen;
      
      connections.push(
        <g key={`conn-${node.id}-${child.id}`}>
          {/* Glow effect for green paths */}
          {isGreenPath && (
            <line
              x1={nodePos.x}
              y1={nodePos.y + 20}
              x2={childPos.x}
              y2={childPos.y - 20}
              stroke="url(#greenGlow)"
              strokeWidth={isHighlightedPath ? 8 : 4}
              className="animate-pulse"
              style={{ filter: 'blur(4px)' }}
            />
          )}
          <line
            x1={nodePos.x}
            y1={nodePos.y + 20}
            x2={childPos.x}
            y2={childPos.y - 20}
            stroke={isGreenPath ? 'hsl(var(--chart-2))' : isHighlightedPath ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
            strokeWidth={isHighlightedPath ? 3 : 1}
            strokeOpacity={isHighlightedPath ? 1 : 0.3}
            className={isHighlightedPath ? 'transition-all duration-500' : ''}
          />
        </g>
      );
      
      connections.push(...renderConnections(child));
    });
    
    return connections;
  };

  // Render tree nodes
  const renderNodes = (node: TreeNode): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    const nodePos = getNodePosition(node);
    
    const nodeRadius = node.level === 0 ? 40 : node.level === 4 ? 25 : 30;
    const isGlowing = node.isGreen || (node.level === 0 && greenLevel > 0);
    const isExternallySelected = node.countryCode && selectedCountryCodes.has(node.countryCode);
    const isInteractive = node.level === 4 || node.level === 0;
    
    nodes.push(
      <g 
        key={`node-${node.id}`} 
        className={`${isInteractive ? 'cursor-pointer' : ''} ${draggedNode === node.id ? 'opacity-70' : ''}`}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        onClick={() => handleNodeClick(node.id, node.countryCode)}
        style={{ cursor: dragMode === 'node' ? 'grab' : isInteractive ? 'pointer' : 'default' }}
      >
        {/* Outer glow for green nodes */}
        {isGlowing && (
          <>
            <circle
              cx={nodePos.x}
              cy={nodePos.y}
              r={nodeRadius + 15}
              fill="url(#greenRadialGlow)"
              className="animate-pulse"
            />
            <circle
              cx={nodePos.x}
              cy={nodePos.y}
              r={nodeRadius + 8}
              fill="none"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              strokeOpacity={0.5}
              className="animate-pulse"
            />
          </>
        )}

        {/* External selection highlight */}
        {isExternallySelected && !isGlowing && (
          <circle
            cx={nodePos.x}
            cy={nodePos.y}
            r={nodeRadius + 10}
            fill="none"
            stroke="hsl(var(--chart-3))"
            strokeWidth={3}
            strokeDasharray="5,5"
            className="animate-pulse"
          />
        )}
        
        {/* Node circle */}
        <circle
          cx={nodePos.x}
          cy={nodePos.y}
          r={nodeRadius}
          fill={
            isGlowing 
              ? 'url(#greenGradient)' 
              : isExternallySelected 
                ? 'hsl(var(--chart-3))' 
                : node.isHighlighted 
                  ? 'hsl(var(--primary))' 
                  : 'hsl(var(--muted))'
          }
          stroke={
            isGlowing 
              ? 'hsl(142, 76%, 50%)' 
              : isExternallySelected
                ? 'hsl(var(--chart-3))'
                : node.isHighlighted 
                  ? 'hsl(var(--primary))' 
                  : 'hsl(var(--border))'
          }
          strokeWidth={node.isHighlighted || isExternallySelected ? 3 : 1}
          className={`transition-all duration-300 ${node.isHighlighted || isExternallySelected ? 'drop-shadow-lg' : ''}`}
        />
        
        {/* Leaf icon for green nodes */}
        {isGlowing && node.level === 0 && (
          <g transform={`translate(${nodePos.x - 12}, ${nodePos.y - 25})`}>
            <Leaf className="w-6 h-6 text-white animate-bounce" />
          </g>
        )}
        
        {/* Node label */}
        <text
          x={nodePos.x}
          y={node.level === 4 ? nodePos.y + nodeRadius + 15 : nodePos.y + 4}
          textAnchor="middle"
          fontSize={node.level === 0 ? 14 : node.level === 4 ? 10 : 11}
          fontWeight={node.isHighlighted || isExternallySelected ? 'bold' : 'normal'}
          fill={node.level === 4 || (node.level !== 0 && !node.isHighlighted) ? 'hsl(var(--foreground))' : 'white'}
          className="pointer-events-none"
        >
          {node.label.length > 15 ? node.label.slice(0, 15) + '...' : node.label}
        </text>
      </g>
    );
    
    node.children.forEach(child => {
      nodes.push(...renderNodes(child));
    });
    
    return nodes;
  };

  // Background gradient based on green level
  const bgGradient = greenLevel > 0 
    ? `linear-gradient(180deg, hsla(142, 76%, 36%, ${greenLevel * 0.1}) 0%, transparent 100%)`
    : 'none';

  return (
    <Card className="relative overflow-hidden" style={{ background: bgGradient }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full transition-all duration-500 ${greenLevel > 0 ? 'bg-green-500/20 shadow-lg shadow-green-500/30' : 'bg-muted'}`}>
              <TreeDeciduous className={`w-6 h-6 transition-colors duration-500 ${greenLevel > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
            </div>
            <CardTitle className="text-xl">Decision Tree Explorer</CardTitle>
            {greenLevel > 0 && (
              <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/50 animate-pulse">
                <Leaf className="w-3 h-3 mr-1" />
                {greenLevel} Green Choice{greenLevel > 1 ? 's' : ''}
              </Badge>
            )}
            {selectedCountryCodes.size > 0 && (
              <Badge variant="outline" className="bg-chart-3/20 text-chart-3 border-chart-3/50">
                {selectedCountryCodes.size} selected from charts
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={dragMode === 'node' ? 'default' : 'outline'} 
              size="icon" 
              onClick={() => setDragMode(dragMode === 'node' ? 'pan' : 'node')}
              title={dragMode === 'node' ? 'Node drag mode' : 'Pan mode'}
            >
              <Hand className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Criteria Selection */}
        <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg backdrop-blur-sm">
          {CRITERIA.map(criteria => (
            <div key={criteria.id} className="flex flex-wrap items-center gap-1">
              <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground mr-1">
                {criteria.icon}
                {criteria.label}:
              </span>
              {criteria.options.map(option => {
                const isSelected = selections[criteria.id] === option.value;
                return (
                  <Button
                    key={option.value}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelect(criteria.id, option.value)}
                    className={`text-xs transition-all duration-300 ${
                      isSelected && option.isGreen 
                        ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/50' 
                        : ''
                    }`}
                  >
                    {option.isGreen && <Leaf className="w-3 h-3 mr-1" />}
                    {option.label}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Mode indicator */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={dragMode === 'node' ? 'default' : 'secondary'}>
            {dragMode === 'node' ? '🖐️ Drag nodes to move them' : '🗺️ Pan mode - drag to navigate'}
          </Badge>
          <span className="text-muted-foreground">
            Click country nodes to select • Select in charts to filter tree
          </span>
        </div>

        {/* Interactive Tree Visualization */}
        <div
          ref={containerRef}
          className={`relative h-[500px] border rounded-lg overflow-hidden bg-background/50 backdrop-blur-sm ${
            dragMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging || draggedNode ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(142, 76%, 45%)" />
                <stop offset="100%" stopColor="hsl(142, 76%, 30%)" />
              </linearGradient>
              <linearGradient id="greenGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(142, 76%, 50%)" stopOpacity="0" />
                <stop offset="50%" stopColor="hsl(142, 76%, 50%)" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(142, 76%, 50%)" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="greenRadialGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(142, 76%, 50%)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(142, 76%, 50%)" stopOpacity="0" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Tree structure labels */}
            <text x="50" y="80" fontSize="14" fill="hsl(var(--muted-foreground))" fontWeight="bold">
              🏆 WINNER
            </text>
            <text x="50" y="200" fontSize="12" fill="hsl(var(--muted-foreground))">
              📊 CRITERIA
            </text>
            <text x="50" y="320" fontSize="12" fill="hsl(var(--muted-foreground))">
              ⚙️ OPTIONS
            </text>
            <text x="50" y={SVG_HEIGHT - 100} fontSize="12" fill="hsl(var(--muted-foreground))">
              🌍 COUNTRIES
            </text>

            {/* Render connections first (behind nodes) */}
            {renderConnections(buildTree)}
            
            {/* Render nodes on top */}
            {renderNodes(buildTree)}
          </svg>

          {/* Zoom indicator */}
          <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-muted-foreground">
            <Move className="w-4 h-4 inline mr-2" />
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Winner Display */}
        {winner && (
          <div className={`p-6 rounded-xl text-center transition-all duration-500 ${
            greenLevel > 0 
              ? 'bg-gradient-to-r from-green-500/20 via-green-500/30 to-green-500/20 border-2 border-green-500/50 shadow-lg shadow-green-500/20' 
              : 'bg-primary/10 border border-primary/30'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {greenLevel > 0 && <Leaf className="w-6 h-6 text-green-500 animate-bounce" />}
              <span className="text-3xl">{winner.country_code}</span>
              {greenLevel > 0 && <Leaf className="w-6 h-6 text-green-500 animate-bounce" />}
            </div>
            <h3 className={`text-2xl font-bold ${greenLevel > 0 ? 'text-green-500' : 'text-primary'}`}>
              {winner.country}
            </h3>
            <p className="text-muted-foreground mt-1">
              Score: {winner.overall_datacenter_score?.toFixed(1)} | 
              Renewable: {winner.renewable_energy_percent?.toFixed(0)}%
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {filteredCountries.length} countries match your criteria
              {selectedCountryCodes.size > 0 && ` (from ${selectedCountryCodes.size} selected in charts)`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InteractiveDecisionTree;
