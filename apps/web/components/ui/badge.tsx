import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-inset text-secondary",
        accent: "border-transparent bg-accent-soft text-accent",
        good: "border-transparent bg-good-soft text-good",
        warning: "border-transparent bg-warning-soft text-[#8a5a00]",
        serious: "border-transparent bg-serious-soft text-serious",
        critical: "border-transparent bg-critical-soft text-critical",
        outline: "border-border-strong text-secondary",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
