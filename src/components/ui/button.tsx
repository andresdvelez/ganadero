"use client";

import { Button as HeroButton } from "@heroui/button";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ComponentProps<typeof HeroButton> & {
  className?: string;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <HeroButton
        ref={ref}
        className={cn(
          "font-medium transition-all",
          "hover:scale-105 active:scale-95",
          className
        )}
        {...(props as any)}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
