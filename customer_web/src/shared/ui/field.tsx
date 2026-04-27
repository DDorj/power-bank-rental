import type { ReactNode } from "react";
import {
  Field as ShadcnField,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

export function Field({
  label,
  error,
  hint,
  children,
}: Readonly<{
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}>) {
  return (
    <ShadcnField>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        {hint ? <FieldDescription>{hint}</FieldDescription> : null}
      </div>
      {children}
      <FieldContent>
        {error ? <FieldError>{error}</FieldError> : null}
      </FieldContent>
    </ShadcnField>
  );
}
