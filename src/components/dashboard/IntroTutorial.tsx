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
    title: "Interactive World Map",
    description: "Click on any country to view detailed information. Countries are color-coded based on the selected metric. The map uses full country polygons for better visualization and supports zoom and pan.",
  },
  {
    title: "Parallel Coordinates Plot",
    description: "Compare multiple attributes simultaneously. Click and drag on the axes to reorder them. Click on lines to highlight specific countries. Use this to identify trade-offs between different factors.",
  },
  {
    title: "Filter Panel",
    description: "Use the left sidebar to filter countries based on various criteria. Selected countries will be highlighted in a distinct color while others fade to gray for easy comparison.",
  },
  {
    title: "Visualization Tasks",
    description: "The dashboard addresses three key questions: Accessibility (infrastructure, climate, connectivity), Profitability (economic indicators, workforce), and Efficiency (energy systems, environmental impact).",
  },
  {
    title: "Interactive Features",
    description: "Click on any chart element (bars, scatter points, parallel coordinate lines) to focus on that country across all visualizations. The map will automatically zoom to the selected country.",
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
