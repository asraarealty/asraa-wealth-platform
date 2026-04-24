import { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface TableProps<T extends object> {
  columns: Column<T>[];
  rows: T[];
  keyField: keyof T;
}

export default function Table<T extends object>({
  columns,
  rows,
  keyField,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="border-b border-slate-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={String((row as Record<string, unknown>)[String(keyField)])}
              className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-slate-200">
                  {col.render
                    ? col.render(row)
                    : String(
                        (row as Record<string, unknown>)[col.key] ?? "—"
                      )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
