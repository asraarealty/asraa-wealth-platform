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
    <div className="overflow-x-auto glass-card rounded-2xl">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="border-b px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest"
                style={{
                  borderColor: "rgba(201,162,39,0.15)",
                  color: "#c9a227",
                }}
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
              className="border-b last:border-0 transition-colors"
              style={{ borderColor: "rgba(201,162,39,0.08)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(201,162,39,0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-gray-200">
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
