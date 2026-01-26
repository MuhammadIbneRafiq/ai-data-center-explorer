import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  // Determine number of thumbs based on value array length
  const thumbCount = Array.isArray(value) ? value.length : 1;
  
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center group", className)}
      value={value}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary/50">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {/* Render a thumb for each value in the array */}
      {Array.from({ length: thumbCount }).map((_, index) => (
        <SliderPrimitive.Thumb 
          key={index}
          className="block h-4 w-4 rounded-md border border-primary/50 bg-primary shadow-md transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 hover:scale-105 hover:bg-primary/90 hover:border-primary hover:shadow-lg cursor-ew-resize active:scale-95"
        >
          {/* Modern button indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-background rounded-sm" />
          </div>
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
