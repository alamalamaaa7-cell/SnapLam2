import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "btn-grad",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-white/20 text-foreground",
        success: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
        danger: "bg-red-500/20 text-red-300 border border-red-500/30",
        warning: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
        admin: "bg-gradient-to-r from-amber-400 to-orange-500 text-black",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
