"use client";

import {
  Card as HeroCard,
  CardHeader as HeroCardHeader,
  CardBody as HeroCardBody,
  CardFooter as HeroCardFooter,
} from "@heroui/card";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef<any, any>(
  (
    { className, isBlurred = true, shadow = "md", radius = "lg", ...props },
    ref
  ) => (
    <HeroCard
      ref={ref}
      isBlurred={isBlurred}
      shadow={shadow}
      radius={radius}
      className={cn("island animate-scale-in", className)}
      {...(props as any)}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<any, any>(({ className, ...props }, ref) => (
  <HeroCardHeader
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...(props as any)}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<any, any>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-heading font-semibold leading-none tracking-tight",
      className
    )}
    {...(props as any)}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<any, any>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-caption text-neutral-500", className)}
    {...(props as any)}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<any, any>(({ className, ...props }, ref) => (
  <HeroCardBody
    ref={ref}
    className={cn("p-6 pt-0", className)}
    {...(props as any)}
  />
));
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<any, any>(({ className, ...props }, ref) => (
  <HeroCardFooter
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...(props as any)}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
