"use client";

import { Button as HeroButton } from "@heroui/button";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ComponentProps<typeof HeroButton> & {
  className?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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

// Floating Action Button variant
export const FloatingActionButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        isIconOnly
        radius="full"
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-14 h-14",
          "bubble animate-float",
          className
        )}
        {...(props as any)}
      />
    );
  }
);

FloatingActionButton.displayName = "FloatingActionButton";
