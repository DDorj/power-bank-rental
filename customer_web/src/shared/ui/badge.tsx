import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { cn } from "@/shared/lib/utils";

const toneClasses = {
  neutral: "bg-slate-100 text-slate-700",
  positive: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
  accent: "bg-cyan-50 text-cyan-700",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: Readonly<{
  children: React.ReactNode;
  tone?: keyof typeof toneClasses;
  className?: string;
}>) {
  return (
    <ShadcnBadge
      variant="secondary"
      className={cn(
        "border-transparent px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </ShadcnBadge>
  );
}
