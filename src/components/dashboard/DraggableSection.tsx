import { ReactNode, useRef } from "react";
import { GripVertical } from "lucide-react";

interface DraggableSectionProps {
  id: string;
  children: ReactNode;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (id: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
  className?: string;
}

export const DraggableSection = ({
  id,
  children,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
  className = "",
}: DraggableSectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    // Set drag data
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(id);
  };

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver(e, id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(id);
      }}
      className={`
        relative transition-all duration-200
        ${isDragging ? "opacity-50 scale-[0.98]" : ""}
        ${isDragOver ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl" : ""}
        ${className}
      `}
    >
      {/* Drag handle - always visible, at top */}
      <div
        draggable
        onDragStart={handleDragStart}
        className="absolute left-2 top-2 z-30 cursor-grab active:cursor-grabbing"
      >
        <div className="bg-muted/95 backdrop-blur-sm rounded-md p-1.5 shadow-lg border border-border hover:bg-muted transition-colors">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      {/* Section content */}
      <div className="h-full">{children}</div>
    </div>
  );
};
