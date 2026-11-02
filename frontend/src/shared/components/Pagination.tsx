import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  return (
    <nav
      aria-label="Pagination"
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3"
    >
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft aria-hidden />
        <span className="sr-only sm:not-sr-only">Previous</span>
      </Button>
      <p
        className="min-w-0 text-center text-xs text-muted-foreground tabular-nums sm:text-sm"
        aria-live="polite"
      >
        Page {page} of {totalPages}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <span className="sr-only sm:not-sr-only">Next</span>
        <ChevronRight aria-hidden />
      </Button>
    </nav>
  );
}
