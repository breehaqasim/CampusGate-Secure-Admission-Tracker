"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "./utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="block h-full w-full overflow-hidden rounded-full transition-all"
      >
        <svg
          className="h-full w-full"
          viewBox="0 0 100 4"
          preserveAspectRatio="none"
          aria-hidden
        >
          <rect
            x="0"
            y="0"
            height="4"
            rx="2"
            width={Math.min(100, Math.max(0, value ?? 0))}
            className="fill-primary"
          />
        </svg>
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
