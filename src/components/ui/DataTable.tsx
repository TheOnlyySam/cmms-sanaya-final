import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

export interface Column<T> {
  header: string;
  render: (record: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({ columns, data, emptyTitle = "No records yet" }: { columns: Column<T>[]; data: T[]; emptyTitle?: string }) {
  if (!data.length) return <EmptyState title={emptyTitle}>Create a record to populate this table.</EmptyState>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((record, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.header} className={column.className}>
                  {column.render(record)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
