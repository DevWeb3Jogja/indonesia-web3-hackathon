import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-theme-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-brand-500 text-black",
        secondary: "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-300",
        destructive: "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400",
        outline: "border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300",
        ghost: "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.06]",
        link: "text-brand-500 underline-offset-4 hover:underline dark:text-brand-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
