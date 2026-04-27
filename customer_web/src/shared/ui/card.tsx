import type { HTMLAttributes } from "react";
import { Card as ShadcnCard } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <ShadcnCard
      className={cn("rounded-[16px] border bg-card p-5 shadow-sm md:p-6", className)}
      {...props}
    />
  );
}
