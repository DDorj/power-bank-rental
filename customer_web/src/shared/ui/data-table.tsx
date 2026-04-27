"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/utils";

export function DataTable<TData>({
  data,
  columns,
  emptyTitle = "Мэдээлэл алга",
  emptyDescription = "Сонгосон шүүлтүүрээр үр дүн олдсонгүй.",
  className,
}: Readonly<{
  data: TData[];
  columns: ColumnDef<TData>[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}>) {
  // TanStack Table returns non-memoizable helpers; this is an expected integration point.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div
      className={cn(
        "table-scroll overflow-x-auto rounded-[14px] border border-[color:var(--line)] bg-white",
        className,
      )}
    >
      <Table className="min-w-full border-collapse text-left text-sm">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="text-[var(--foreground)]">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
