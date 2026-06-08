import { useMemo, useState } from "react";

type SortDir = "asc" | "desc";

export function useSortableTable<T>(
  rows: T[],
  accessors: Record<string, (row: T) => string | number>,
  defaultKey?: string,
) {
  const [sortKey, setSortKey] = useState(defaultKey ?? Object.keys(accessors)[0] ?? "");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    if (!sortKey || !accessors[sortKey]) return rows;
    const get = accessors[sortKey]!;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, accessors]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return { sorted, sortKey, sortDir, toggleSort };
}
