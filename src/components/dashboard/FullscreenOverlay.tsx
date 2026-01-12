import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface FullscreenOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const FullscreenOverlay = ({ isOpen, onClose, title, children }: FullscreenOverlayProps) => {
  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1">
          <X className="h-4 w-4" />
          Close (Esc)
        </Button>
      </div>
      
      {/* Content - fills remaining space */}
      <div className="flex-1 p-4 overflow-auto">
        {children}
      </div>
    </div>
  );
};
