import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

interface TutorialStep {
  title: string;
  description: string;
  image?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to AI Data Center Explorer",
    description: "This interactive visualization helps potential investors identify optimal locations for building AI data centers based on comprehensive country-level metrics from the CIA World Factbook.",
  },
  {
    title: "Scatter Plot Matrix (SPLOM)",
    description: "Explore correlations between multiple attributes. Use the brush tool to draw a lasso selection around points - this highlights matching countries across all views. Toggle between 2x2, 3x3, and 4x4 matrix sizes. Enable log scales for better distribution visualization.",
  },
  {
    title: "Parallel Coordinates Plot",
    description: "Compare multiple attributes simultaneously. Drag axes to reorder them. Click on lines to select countries. Use the multi-select button to build selections. Drag axis endpoints to rescale individual axes.",
  },
  {
    title: "Filter Panel",
    description: "Use the left sidebar to filter countries by electricity cost, temperature, GDP, internet speed, and CO₂ emissions. The scented widgets show data distribution. Select specific countries from the country list tab.",
  },
  {
    title: "Linking & Brushing",
    description: "All visualizations are linked: hover over any element to highlight that country everywhere. Use the brush tool in the SPLOM to draw polygon selections - selected points will be highlighted in the bar charts, radar plot, and parallel coordinates.",
  },
  {
    title: "Bar Charts & Radar Plot",
    description: "The top countries chart shows rankings for the selected metric. Click bars to select countries. The radar plot compares selected countries across multiple dimensions simultaneously.",
  },
];

export const IntroTutorial = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen the tutorial before
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    if (!hasSeenTutorial) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const currentStepData = tutorialSteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] backdrop-blur-xl bg-background/95">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{currentStepData.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-base pt-4">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "w-8 bg-primary"
                    : index < currentStep
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {tutorialSteps.length}
            </span>

            <Button onClick={handleNext} className="gap-2">
              {currentStep === tutorialSteps.length - 1 ? "Get Started" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Skip button */}
          {currentStep < tutorialSteps.length - 1 && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip Tutorial
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
