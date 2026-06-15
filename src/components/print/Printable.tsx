import type { ReactNode } from "react";

export function PrintableHeader({ title, reference, subtitle }: { title: string; reference?: string; subtitle?: string }) {
  return (
    <header className="ss-print-header">
      <div className="ss-print-brand">
        <SyncShieldPrintLogo />
      </div>
      <div className="ss-print-title">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {reference ? <code>{reference}</code> : null}
      </div>
    </header>
  );
}

export function PrintableFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="ss-print-footer">
      <span>{children}</span>
      <strong>SyncShield CMMS</strong>
    </footer>
  );
}

export function PrintableReportShell({ children }: { children: ReactNode }) {
  return <article className="print-report-shell">{children}</article>;
}

function SyncShieldPrintLogo() {
  return (
    <div className="ss-print-logo" aria-label="SyncShield CMMS Field Operations">
      <svg className="ss-print-logo-mark" viewBox="0 0 96 104" role="img" aria-hidden="true">
        <defs>
          <marker id="ssPrintArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 Z" fill="#00C8D4" />
          </marker>
          <linearGradient id="ssPrintShield" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#162235" />
            <stop offset="100%" stopColor="#0A1628" />
          </linearGradient>
        </defs>
        <path d="M 13 6 L 83 6 Q 91 6 91 14 L 91 60 Q 91 81 48 98 Q 5 81 5 60 L 5 14 Q 5 6 13 6 Z" fill="url(#ssPrintShield)" />
        <path d="M 13 6 L 83 6 Q 91 6 91 14 L 91 60 Q 91 81 48 98 Q 5 81 5 60 L 5 14 Q 5 6 13 6 Z" fill="none" stroke="#00C8D4" strokeWidth="2.2" opacity="0.8" />
        <line x1="25" y1="24" x2="71" y2="24" stroke="#00C8D4" strokeWidth="0.8" opacity="0.22" />
        <circle cx="22" cy="24" r="2.4" fill="#00C8D4" opacity="0.28" />
        <circle cx="74" cy="24" r="2.4" fill="#00C8D4" opacity="0.28" />
        <path d="M 62 43 A 19 19 0 0 0 31 62" stroke="#00C8D4" strokeWidth="4" fill="none" strokeLinecap="round" markerEnd="url(#ssPrintArrow)" />
        <path d="M 34 72 A 19 19 0 0 0 65 53" stroke="#00C8D4" strokeWidth="4" fill="none" strokeLinecap="round" markerEnd="url(#ssPrintArrow)" />
        <circle cx="48" cy="58" r="3.2" fill="#00C8D4" opacity="0.82" />
      </svg>
      <div className="ss-print-logo-text">
        <strong>
          Sync<span>Shield</span>
        </strong>
        <small>CMMS Field Operations</small>
      </div>
    </div>
  );
}

export function PrintableSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ss-print-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function PrintableDataGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="ss-print-grid">
      {items.map((item) => (
        <div className="ss-print-field" key={item.label}>
          <label>{item.label}</label>
          <span>{item.value || "Not set"}</span>
        </div>
      ))}
    </div>
  );
}

export function PrintableDataTable({
  columns,
  rows,
  emptyMessage = "No data available.",
  className = ""
}: {
  columns: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
  className?: string;
}) {
  const renderCell = (cell: ReactNode) => {
    if (cell === null || cell === undefined || cell === "") return "Not provided";
    return cell;
  };

  return (
    <table className={`print-data-table ${className}`.trim()}>
      <thead>
        <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderCell(cell)}</td>)}</tr>) : <tr><td colSpan={columns.length} className="print-empty-cell">{emptyMessage}</td></tr>}
      </tbody>
    </table>
  );
}

export function PrintableFieldTable({ rows }: { rows: { field: string; value: ReactNode }[] }) {
  return <PrintableDataTable className="print-field-table" columns={["Field", "Value"]} rows={rows.map((row) => [row.field, row.value])} />;
}

export function PrintableChecklistTable({
  tasks,
  emptyMessage = "No checklist tasks recorded."
}: {
  tasks: { category?: ReactNode; description?: ReactNode; result?: string; notes?: ReactNode }[];
  emptyMessage?: string;
}) {
  return (
    <PrintableDataTable
      className="print-checklist-table"
      columns={["#", "Category", "Task Description", "Result / Status", "Notes"]}
      rows={tasks.map((task, index) => [
        String(index + 1).padStart(2, "0"),
        task.category,
        task.description,
        <PrintableStatusBadge key={`${index}-${task.result ?? "status"}`} value={task.result} />,
        task.notes
      ])}
      emptyMessage={emptyMessage}
    />
  );
}

export function PrintableStatusBadge({ value }: { value?: string }) {
  const normalized = (value ?? "Not provided").toLowerCase();
  const tone =
    normalized.includes("complete") || normalized.includes("ok") || normalized.includes("optimal") || normalized.includes("approved") || normalized.includes("submitted")
      ? "success"
      : normalized.includes("fail") || normalized.includes("offline") || normalized.includes("problem") || normalized.includes("cancel")
        ? "danger"
        : normalized.includes("warning") || normalized.includes("issue") || normalized.includes("restricted") || normalized.includes("critical") || normalized.includes("high")
          ? "warning"
          : normalized.includes("unchecked") || normalized.includes("pending") || normalized.includes("draft") || normalized.includes("not provided")
            ? "neutral"
            : "info";

  return <span className={`print-status-badge print-status-${tone}`}>{value || "Not provided"}</span>;
}

export function PrintableSignatureBlock({ labels = ["Prepared By", "Reviewed By", "Client Approval"] }: { labels?: string[] }) {
  return (
    <div className="ss-print-signatures">
      {labels.map((label) => (
        <div className="ss-print-signature" key={label}>
          <label>{label}</label>
          <div />
          <small>Name / Date / Signature</small>
        </div>
      ))}
    </div>
  );
}
