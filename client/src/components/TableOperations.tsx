import { useEffect, useMemo, useRef, useState } from 'react';

const numberFormat = Intl.NumberFormat('en-US');

type OperationStats = Map<string, number>;
type TableStats = Map<string, OperationStats> | null;

interface TableOperationsProps {
  stats?: TableStats;
}

export default function TableOperations({ stats }: TableOperationsProps) {
  // Highlighted table names
  const [highlightedTables, setHighlightedTables] = useState<Set<string>>(() => new Set());

  // Previous totals per table
  const prevTotalsRef = useRef<Map<string, number>>(new Map());

  // Timeout per table
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /**
   * Collect all operation names (columns)
   */
  const operations = useMemo<string[]>(() => {
    if (!stats) return [];

    return Array.from(
      new Set(Array.from(stats.values()).flatMap((tableStats) => Array.from(tableStats.keys()))),
    );
  }, [stats]);

  /**
   * Sort tables by total operations (descending)
   */
  const sortedTables = useMemo<[string, OperationStats][]>(() => {
    if (!stats) return [];

    return Array.from(stats.entries()).sort(([, aStats], [, bStats]) => {
      const sumA = Array.from(aStats.values()).reduce((acc, v) => acc + v, 0);
      const sumB = Array.from(bStats.values()).reduce((acc, v) => acc + v, 0);
      return sumB - sumA;
    });
  }, [stats]);

  /**
   * Detect updates and highlight changed tables
   */
  useEffect(() => {
    if (!stats) return;

    const nextTotals = new Map<string, number>();

    for (const [table, tableStats] of stats.entries()) {
      const total = Array.from(tableStats.values()).reduce((acc, v) => acc + v, 0);

      const prevTotal = prevTotalsRef.current.get(table);

      if (prevTotal !== undefined && prevTotal !== total) {
        setHighlightedTables((prev) => {
          const next = new Set(prev);
          next.add(table);
          return next;
        });

        const existingTimeout = timeoutsRef.current.get(table);
        if (existingTimeout) clearTimeout(existingTimeout);

        const timeoutId = setTimeout(() => {
          setHighlightedTables((prev) => {
            const next = new Set(prev);
            next.delete(table);
            return next;
          });
          timeoutsRef.current.delete(table);
        }, 1000);

        timeoutsRef.current.set(table, timeoutId);
      }

      nextTotals.set(table, total);
    }

    prevTotalsRef.current = nextTotals;
  }, [stats]);

  /**
   * Cleanup on unmount
   */

  useEffect(() => {
    const timeouts = timeoutsRef.current;

    return () => {
      for (const timeout of timeouts.values()) {
        clearTimeout(timeout);
      }
      timeouts.clear();
    };
  }, []);

  // ✅ Safe early return (after hooks)
  if (!stats || stats.size === 0) {
    return <div className="text-sm text-gray-500">No tables yet</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Table</th>

            {operations.map((op) => (
              <th
                key={op}
                className="px-4 py-2 text-right text-sm font-semibold text-gray-700 capitalize"
              >
                {op}
              </th>
            ))}

            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Total</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {sortedTables.map(([table, tableStats]) => {
            const total = Array.from(tableStats.values()).reduce((acc, v) => acc + v, 0);

            const isHighlighted = highlightedTables.has(table);

            return (
              <tr
                key={table}
                className={
                  'transition-colors duration-1000 ' +
                  (isHighlighted ? 'bg-yellow-100' : 'hover:bg-gray-50')
                }
              >
                <td className="px-4 py-2 text-sm font-medium text-gray-800">{table}</td>

                {operations.map((op) => (
                  <td key={op} className="px-4 py-2 text-sm text-right text-gray-700">
                    {numberFormat.format(tableStats.get(op) ?? 0)}
                  </td>
                ))}

                <td className="px-4 py-2 text-sm font-semibold text-right text-gray-800">
                  {numberFormat.format(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
