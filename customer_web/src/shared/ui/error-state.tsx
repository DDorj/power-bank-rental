import { AlertTriangle } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";

export function ErrorState({
  title = "Хуудас ачаалахад алдаа гарлаа",
  description,
  onRetry,
}: Readonly<{
  title?: string;
  description: string;
  onRetry?: () => void;
}>) {
  return (
    <Card className="rounded-[16px] border-rose-200 bg-white px-8 py-10 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-[12px] bg-rose-50 text-rose-700">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-rose-950">{title}</h3>
        <p className="text-sm leading-6 text-rose-900/80">{description}</p>
        {onRetry ? (
          <div className="pt-2">
            <Button variant="secondary" onClick={onRetry}>
              Дахин оролдох
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
