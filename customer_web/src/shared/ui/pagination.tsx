"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function Pagination({
  page,
  limit,
  total,
  onPageChange,
}: Readonly<{
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}>) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--line)] pt-5 text-sm text-[var(--muted)] md:flex-row md:items-center md:justify-between">
      <p>
        Нийт {total} мөр, {page}/{totalPages} хуудас
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="mr-1 size-4" />
          Өмнөх
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Дараах
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}
