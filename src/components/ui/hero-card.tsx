"use client";

import {
  Card as HeroCard,
  CardHeader,
  CardBody,
  CardFooter,
} from "@heroui/card";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type CardProps = any;

// Main Card component with floating island design
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, shadow = "md", radius = "lg", ...props }, ref) => {
    return (
      <HeroCard
        ref={ref}
        shadow={shadow}
        radius={radius}
        className={cn("island animate-scale-in", className)}
        {...(props as any)}
      />
    );
  }
);

Card.displayName = "Card";

// Export the card sub-components
export { CardHeader, CardBody, CardFooter };

// Floating Island Card variant
export const FloatingIslandCard = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        isBlurred
        className={cn(
          "backdrop-blur-xl bg-white/80 dark:bg-gray-900/80",
          "border border-white/20",
          "hover:shadow-xl transition-all duration-300",
          "animate-float",
          className
        )}
        {...(props as any)}
      >
        {children}
      </Card>
    );
  }
);

FloatingIslandCard.displayName = "FloatingIslandCard";

// Stats Card variant
export const StatsCard = forwardRef<
  HTMLDivElement,
  {
    title: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    className?: string;
  } & CardProps
>(
  (
    { title, value, description, icon, trend, trendValue, className, ...props },
    ref
  ) => {
    return (
      <FloatingIslandCard
        ref={ref}
        isPressable
        className={cn("p-6", className)}
        {...(props as any)}
      >
        <CardBody className="p-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-caption text-neutral-500 mb-2">{title}</p>
              <p className="text-hero mb-1">{value}</p>
              {description && (
                <p className="text-caption text-neutral-400">{description}</p>
              )}
              {trend && trendValue && (
                <div
                  className={cn(
                    "inline-flex items-center gap-1 mt-3 px-2 py-1 rounded-full text-caption",
                    trend === "up" && "bg-green-100 text-green-700",
                    trend === "down" && "bg-red-100 text-red-700",
                    trend === "neutral" && "bg-gray-100 text-gray-700"
                  )}
                >
                  {trend === "up" && "↑"}
                  {trend === "down" && "↓"}
                  {trendValue}
                </div>
              )}
            </div>
            {icon && (
              <div className="p-3 rounded-xl bg-gradient-primary text-white">
                {icon}
              </div>
            )}
          </div>
        </CardBody>
      </FloatingIslandCard>
    );
  }
);

StatsCard.displayName = "StatsCard";
