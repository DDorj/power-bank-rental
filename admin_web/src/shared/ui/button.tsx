"use client";

import * as React from "react";
import { Button as ShadcnButton, type ButtonProps as ShadcnButtonProps } from "@/components/ui/button";

type LegacyVariant = "primary" | "secondary" | "ghost" | "danger";
type LegacySize = "md" | "sm" | "lg";

const variantMap: Record<LegacyVariant, ShadcnButtonProps["variant"]> = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  danger: "destructive",
};

const sizeMap: Record<LegacySize, ShadcnButtonProps["size"]> = {
  md: "default",
  sm: "sm",
  lg: "lg",
};

export interface ButtonProps
  extends Omit<ShadcnButtonProps, "variant" | "size"> {
  variant?: LegacyVariant;
  size?: LegacySize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", ...props }, ref) => (
    <ShadcnButton
      ref={ref}
      variant={variantMap[variant]}
      size={sizeMap[size]}
      {...props}
    />
  ),
);

Button.displayName = "Button";
