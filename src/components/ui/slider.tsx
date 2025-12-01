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
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {/* Render a thumb for each value in the array */}
      {Array.from({ length: thumbCount }).map((_, index) => (
        <SliderPrimitive.Thumb 
          key={index}
          className="block h-6 w-6 rounded-full border-2 border-primary bg-background ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 hover:border-primary/80 cursor-ew-resize shadow-md"
        >
          {/* Arrow indicators */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-0.5">
              <span className="text-[8px] text-primary font-bold">◀</span>
              <span className="text-[8px] text-primary font-bold">▶</span>
            </div>
          </div>
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
