import { useState, useMemo } from "react";
import { CountryData } from "@/types/country-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Zap, 
  Thermometer, 
  DollarSign, 
  Wifi, 
  Droplets,
  Building2,
  Leaf,
  TrendingUp,
  Users,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DecisionTreeProps {
  data: CountryData[];
  onCountrySelect?: (country: CountryData) => void;
  selectedCountry?: CountryData | null;
}

interface DecisionStep {
  id: string;
  question: string;
  icon: React.ComponentType<{ className?: string }>;
  metric: keyof CountryData;
  options: {
    label: string;
    description: string;
    filter: (value: number | undefined) => boolean;
    priority: "high" | "medium" | "low";
  }[];
}

const decisionSteps: DecisionStep[] = [
  {
    id: "renewable",
    question: "How important is renewable energy for your datacenter?",
    icon: Leaf,
    metric: "renewableEnergyPercent",
    options: [
      { label: "Critical", description: "> 60% renewable", filter: (v) => v !== undefined && v > 60, priority: "high" },
      { label: "Important", description: "30-60% renewable", filter: (v) => v !== undefined && v >= 30 && v <= 60, priority: "medium" },
      { label: "Not a priority", description: "Any level acceptable", filter: () => true, priority: "low" },
    ],
  },
  {
    id: "electricity",
    question: "What's your budget for electricity costs?",
    icon: Zap,
    metric: "electricityCost",
    options: [
      { label: "Low cost priority", description: "< $0.10/kWh", filter: (v) => v !== undefined && v < 0.1, priority: "high" },
      { label: "Moderate", description: "$0.10-$0.20/kWh", filter: (v) => v !== undefined && v >= 0.1 && v <= 0.2, priority: "medium" },
      { label: "Flexible budget", description: "Any cost acceptable", filter: () => true, priority: "low" },
    ],
  },
  {
    id: "temperature",
    question: "Do you need natural cooling capabilities?",
    icon: Thermometer,
    metric: "averageTemperature",
    options: [
      { label: "Yes, cold climate", description: "< 15°C average", filter: (v) => v !== undefined && v < 15, priority: "high" },
      { label: "Moderate climate", description: "15-25°C average", filter: (v) => v !== undefined && v >= 15 && v <= 25, priority: "medium" },
      { label: "No preference", description: "Any temperature", filter: () => true, priority: "low" },
    ],
  },
  {
    id: "connectivity",
    question: "How critical is internet infrastructure?",
    icon: Wifi,
    metric: "internetSpeed",
    options: [
      { label: "World-class required", description: "> 100 Mbps avg", filter: (v) => v !== undefined && v > 100, priority: "high" },
      { label: "Good connectivity", description: "50-100 Mbps avg", filter: (v) => v !== undefined && v >= 50 && v <= 100, priority: "medium" },
      { label: "Basic is fine", description: "Any speed", filter: () => true, priority: "low" },
    ],
  },
  {
    id: "gdp",
    question: "What economic development level do you prefer?",
    icon: TrendingUp,
    metric: "gdpPerCapita",
    options: [
      { label: "Developed economy", description: "> $30,000 GDP/capita", filter: (v) => v !== undefined && v > 30000, priority: "high" },
      { label: "Emerging market", description: "$10,000-$30,000", filter: (v) => v !== undefined && v >= 10000 && v <= 30000, priority: "medium" },
      { label: "Developing market", description: "Any level", filter: () => true, priority: "low" },
    ],
  },
];

export const DecisionTree = ({ data, onCountrySelect, selectedCountry }: DecisionTreeProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, number>>({});

  const progress = ((currentStep + 1) / decisionSteps.length) * 100;
  const isComplete = currentStep >= decisionSteps.length;

  // Filter and score countries based on selections
  const { filteredCountries, scores } = useMemo(() => {
    const countryScores = new Map<string, number>();
    
    let filtered = data.filter((country) => {
      let score = 0;
      let passes = true;

      Object.entries(selections).forEach(([stepId, optionIndex]) => {
        const step = decisionSteps.find((s) => s.id === stepId);
        if (!step) return;

        const option = step.options[optionIndex];
        const value = country[step.metric] as number | undefined;
        const passesFilter = option.filter(value);

        if (option.priority === "high" && !passesFilter) {
          passes = false;
        }

        if (passesFilter) {
          score += option.priority === "high" ? 3 : option.priority === "medium" ? 2 : 1;
        }
      });

      countryScores.set(country.countryCode, score);
      return passes;
    });

    // Sort by score descending
    filtered = filtered.sort((a, b) => {
      const scoreA = countryScores.get(a.countryCode) || 0;
      const scoreB = countryScores.get(b.countryCode) || 0;
      return scoreB - scoreA;
    });

    return { filteredCountries: filtered, scores: countryScores };
  }, [data, selections]);

  const handleOptionSelect = (optionIndex: number) => {
    const step = decisionSteps[currentStep];
    setSelections((prev) => ({ ...prev, [step.id]: optionIndex }));
    
    if (currentStep < decisionSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setCurrentStep(decisionSteps.length); // Mark as complete
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSelections({});
  };

  const maxScore = Object.keys(selections).length * 3;

  const getCountryFlagUrl = (countryCode: string) => {
    return `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`;
  };

  const getMatchPercentage = (countryCode: string) => {
    if (maxScore === 0) return 100;
    return Math.round(((scores.get(countryCode) || 0) / maxScore) * 100);
  };

  const currentStepData = decisionSteps[currentStep];

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Progress Header */}
      <Card className="glass-panel border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Datacenter Location Finder
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {isComplete ? "Complete" : `Step ${currentStep + 1} of ${decisionSteps.length}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <Progress value={isComplete ? 100 : progress} className="h-2" />
          <div className="flex justify-between mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Start Over
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Decision Panel */}
        <Card className="glass-panel border-0 overflow-auto">
          <CardContent className="p-4">
            {!isComplete && currentStepData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <currentStepData.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{currentStepData.question}</h3>
                </div>

                <div className="space-y-3">
                  {currentStepData.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 text-left transition-all duration-200",
                        "hover:border-primary hover:bg-primary/5",
                        selections[currentStepData.id] === idx
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="p-4 rounded-full bg-green-500/10 w-fit mx-auto">
                  <Globe className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold">Analysis Complete!</h3>
                <p className="text-muted-foreground">
                  Found {filteredCountries.length} matching countries based on your criteria.
                </p>
                <Button onClick={handleReset} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Start New Search
                </Button>
              </div>
            )}

            {/* Selection Summary */}
            {Object.keys(selections).length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground mb-2">Your criteria:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selections).map(([stepId, optionIdx]) => {
                    const step = decisionSteps.find((s) => s.id === stepId);
                    if (!step) return null;
                    return (
                      <Badge key={stepId} variant="secondary" className="text-xs">
                        {step.options[optionIdx].label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Panel - Country Cards */}
        <Card className="glass-panel border-0 overflow-hidden flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Matching Countries</span>
              <Badge variant="outline">{filteredCountries.length} found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-4 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredCountries.slice(0, 30).map((country) => {
                const matchPercent = getMatchPercentage(country.countryCode);
                const isSelected = selectedCountry?.countryCode === country.countryCode;
                const isTopMatch = matchPercent >= 80;

                return (
                  <button
                    key={country.countryCode}
                    onClick={() => onCountrySelect?.(country)}
                    className={cn(
                      "relative p-3 rounded-xl border-2 transition-all duration-300 text-left",
                      "hover:scale-105 hover:shadow-lg",
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      isTopMatch && "border-green-500/50 bg-green-500/5",
                      !isTopMatch && matchPercent >= 50 && "border-yellow-500/50 bg-yellow-500/5",
                      !isTopMatch && matchPercent < 50 && "border-border bg-card"
                    )}
                    style={{
                      boxShadow: isTopMatch
                        ? "0 0 20px rgba(34, 197, 94, 0.3)"
                        : undefined,
                    }}
                  >
                    {/* Match Badge */}
                    <div
                      className={cn(
                        "absolute -top-2 -right-2 text-xs font-bold px-2 py-0.5 rounded-full",
                        isTopMatch && "bg-green-500 text-white",
                        !isTopMatch && matchPercent >= 50 && "bg-yellow-500 text-black",
                        !isTopMatch && matchPercent < 50 && "bg-muted text-muted-foreground"
                      )}
                    >
                      {matchPercent}%
                    </div>

                    {/* Flag */}
                    <div className="flex justify-center mb-2">
                      <img
                        src={getCountryFlagUrl(country.countryCode)}
                        alt={country.country}
                        className="h-8 w-auto rounded shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>

                    {/* Country Name */}
                    <p className="text-xs font-medium text-center truncate">
                      {country.country}
                    </p>

                    {/* Key Metrics */}
                    <div className="mt-2 space-y-1">
                      {country.renewableEnergyPercent !== undefined && (
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Leaf className="h-3 w-3" />
                            Renewable
                          </span>
                          <span>{country.renewableEnergyPercent.toFixed(0)}%</span>
                        </div>
                      )}
                      {country.internetSpeed !== undefined && (
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Wifi className="h-3 w-3" />
                            Speed
                          </span>
                          <span>{country.internetSpeed.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredCountries.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Globe className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No countries match your criteria</p>
                <Button variant="link" onClick={handleReset} className="mt-2">
                  Try different options
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
