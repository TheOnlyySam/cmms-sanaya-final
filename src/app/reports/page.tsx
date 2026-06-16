"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SelectField, TextAreaField, TextField } from "@/components/ui/FormField";
import { PageShell } from "@/components/layout/PageShell";
import {
  PrintableChecklistTable,
  PrintableDataTable,
  PrintableFieldTable,
  PrintableFooter,
  PrintableHeader,
  PrintableReportShell,
  PrintableSection,
  PrintableSignatureBlock,
  PrintableStatusBadge
} from "@/components/print/Printable";
import { useAppData } from "@/lib/data/AppDataContext";
import { printElement } from "@/lib/print";
import { useToast } from "@/components/ui/ToastProvider";
import type { ChecklistTask, CmmsState, Report } from "@/lib/types";
import { formatDate, optionName, todayIso, uid } from "@/lib/utils";

type ReportTab = "summary" | "CM" | "PM" | "Installation";
type ReportFilters = {
  search: string;
  workOrderRef: string;
  reportRef: string;
  clientId: string;
  projectId: string;
  siteId: string;
  assetId: string;
  assignedMemberId: string;
  priority: string;
  reportStatus: string;
  workOrderStatus: string;
  domainId: string;
  templateId: string;
  activityTypeId: string;
  reportType: string;
  dateFrom: string;
  dateTo: string;
};

export default function ReportsPage() {
  const { state } = useAppData();
  const [tab, setTab] = useState<ReportTab>("summary");
  const [view, setView] = useState<"board" | "list" | "calendar">("board");
  const [filters, setFilters] = useState({
    search: "",
    workOrderRef: "",
    reportRef: "",
    clientId: "all",
    projectId: "all",
    siteId: "all",
    assetId: "all",
    assignedMemberId: "all",
    priority: "all",
    reportStatus: "all",
    workOrderStatus: "all",
    domainId: "all",
    templateId: "all",
    activityTypeId: "all",
    reportType: "all",
    dateFrom: "",
    dateTo: ""
  });

  const filteredReports = state.reports.filter((report) => {
    const wo = state.workOrders.find((item) => item.id === report.workOrderId);
    const template = state.templates.find((item) => item.id === wo?.templateId);
    const values = [report.reference, wo?.reference, wo?.title, optionName(state.clients, wo?.clientId), optionName(state.projects, wo?.projectId), optionName(state.sites, wo?.siteId), optionName(state.assets, wo?.assetId)].join(" ").toLowerCase();
    return (
      values.includes(filters.search.toLowerCase()) &&
      (!filters.workOrderRef || (wo?.reference ?? "").toLowerCase().includes(filters.workOrderRef.toLowerCase())) &&
      (!filters.reportRef || report.reference.toLowerCase().includes(filters.reportRef.toLowerCase())) &&
      (filters.clientId === "all" || wo?.clientId === filters.clientId) &&
      (filters.projectId === "all" || wo?.projectId === filters.projectId) &&
      (filters.siteId === "all" || wo?.siteId === filters.siteId) &&
      (filters.assetId === "all" || wo?.assetId === filters.assetId) &&
      (filters.assignedMemberId === "all" || wo?.assignedMemberIds.includes(filters.assignedMemberId)) &&
      (filters.priority === "all" || wo?.priority === filters.priority) &&
      (filters.reportStatus === "all" || report.status === filters.reportStatus) &&
      (filters.workOrderStatus === "all" || wo?.status === filters.workOrderStatus) &&
      (filters.domainId === "all" || wo?.domainId === filters.domainId) &&
      (filters.templateId === "all" || wo?.templateId === filters.templateId) &&
      (filters.activityTypeId === "all" || template?.activityTypeId === filters.activityTypeId) &&
      (filters.reportType === "all" || report.type === filters.reportType) &&
      (!filters.dateFrom || report.date >= filters.dateFrom) &&
      (!filters.dateTo || report.date <= filters.dateTo)
    );
  });

  const filterContextRows = buildFilterContextRows(filters, state);
  const summaryMetrics = [
    ["Total Reports", String(filteredReports.length)],
    ["CM Reports", String(filteredReports.filter((r) => r.type === "CM").length)],
    ["PM Reports", String(filteredReports.filter((r) => r.type === "PM").length)],
    ["Installation Reports", String(filteredReports.filter((r) => r.type === "Installation").length)]
  ];

  return (
    <PageShell
      title="Reports"
      subtitle="Reports Summary opens by default. Field reports auto-fill from their selected work order."
      actions={
        <Button variant="outline" onClick={() => printElement("report-summary-print", "Report Summary")}>
          Print Report Summary
        </Button>
      }
    >
      <Card>
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <div className="tabs">
            {(["summary", "CM", "PM", "Installation"] as ReportTab[]).map((item) => (
              <button className={`tab-button ${tab === item ? "active" : ""}`} key={item} onClick={() => setTab(item)}>
                {item === "summary" ? "Summary" : item === "Installation" ? "Installation Reports" : `${item} Reports`}
              </button>
            ))}
          </div>
          {tab === "summary" ? (
            <div className="tabs">
              <button className={`tab-button ${view === "board" ? "active" : ""}`} onClick={() => setView("board")}>Board View</button>
              <button className={`tab-button ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>List View</button>
              <button className={`tab-button ${view === "calendar" ? "active" : ""}`} onClick={() => setView("calendar")}>Calendar View</button>
            </div>
          ) : null}
        </div>
      </Card>

      {tab === "summary" ? (
        <ReportsSummary reports={filteredReports} view={view} filters={filters} setFilters={setFilters} />
      ) : (
        <ReportEditor type={tab} />
      )}

      <div id="report-summary-print" className="print-document">
        <PrintableReportShell>
          <PrintableHeader title="Reports Summary" reference={`${filteredReports.length} reports`} subtitle={`${state.company.companyName} · ${formatDate(todayIso())}`} />
          <PrintableSection title="Summary Metrics">
            <PrintableDataTable columns={["Metric", "Value"]} rows={summaryMetrics} />
          </PrintableSection>
          <PrintableSection title="Applied Filters">
            <PrintableDataTable columns={["Filter", "Value"]} rows={filterContextRows} emptyMessage="No filters applied. Showing the full report register." />
          </PrintableSection>
          <PrintableSection title="Filtered Report Register">
            <PrintableDataTable
              columns={["Report Reference", "Type", "Report Date", "Work Order", "Client", "Project", "System Status", "Report Status"]}
              rows={filteredReports.map((report) => {
                const wo = state.workOrders.find((item) => item.id === report.workOrderId);
                return [
                  <code key={`${report.id}-ref`}>{report.reference}</code>,
                  <PrintableStatusBadge key={`${report.id}-type`} value={reportLabel(report.type)} />,
                  formatDate(report.date),
                  wo?.reference ? <code key={`${report.id}-wo`}>{wo.reference}</code> : "Not provided",
                  optionName(state.clients, wo?.clientId),
                  optionName(state.projects, wo?.projectId),
                  <PrintableStatusBadge key={`${report.id}-system`} value={report.systemStatus} />,
                  <PrintableStatusBadge key={`${report.id}-status`} value={report.status} />
                ];
              })}
              emptyMessage="No reports match the selected filters."
            />
          </PrintableSection>
          <PrintableFooter>{state.company.reportFooter}</PrintableFooter>
        </PrintableReportShell>
      </div>

      <div className="print-area">
        {state.reports.map((report) => <PrintableReport key={report.id} report={report} />)}
      </div>
    </PageShell>
  );
}

function ReportsSummary({
  reports,
  view,
  filters,
  setFilters
}: {
  reports: Report[];
  view: "board" | "list" | "calendar";
  filters: ReportFilters;
  setFilters: (value: ReportFilters) => void;
}) {
  const { state, removeReport } = useAppData();
  const setFilter = (key: string, value: string) => setFilters({ ...filters, [key]: value });

  return (
    <>
      <div className="kpi-grid" style={{ marginTop: 14 }}>
        <Card className="kpi"><div className="kpi-label">Total Reports</div><div className="kpi-value">{reports.length}</div><div className="kpi-sub">All submitted records</div></Card>
        <Card className="kpi"><div className="kpi-label">CM Reports</div><div className="kpi-value">{reports.filter((r) => r.type === "CM").length}</div><div className="kpi-sub">Corrective</div></Card>
        <Card className="kpi"><div className="kpi-label">PM Reports</div><div className="kpi-value">{reports.filter((r) => r.type === "PM").length}</div><div className="kpi-sub">Preventive</div></Card>
        <Card className="kpi"><div className="kpi-label">Installations</div><div className="kpi-value">{reports.filter((r) => r.type === "Installation").length}</div><div className="kpi-sub">Installation reports</div></Card>
      </div>
      <Card style={{ marginTop: 14 }}>
        <div className="advanced-filters">
          <input className="filter-input" placeholder="Search any work order/report field..." value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
          <input className="filter-input" placeholder="Work Order Reference" value={filters.workOrderRef} onChange={(event) => setFilter("workOrderRef", event.target.value)} />
          <input className="filter-input" placeholder="Report Reference" value={filters.reportRef} onChange={(event) => setFilter("reportRef", event.target.value)} />
          <FilterSelect value={filters.clientId} onChange={(value) => setFilter("clientId", value)} options={[{ value: "all", label: "All clients" }, ...state.clients.map((client) => ({ value: client.id, label: client.name }))]} />
          <FilterSelect value={filters.projectId} onChange={(value) => setFilter("projectId", value)} options={[{ value: "all", label: "All projects" }, ...state.projects.map((project) => ({ value: project.id, label: project.name }))]} />
          <FilterSelect value={filters.siteId} onChange={(value) => setFilter("siteId", value)} options={[{ value: "all", label: "All sites" }, ...state.sites.map((site) => ({ value: site.id, label: site.name }))]} />
          <FilterSelect value={filters.assetId} onChange={(value) => setFilter("assetId", value)} options={[{ value: "all", label: "All assets" }, ...state.assets.map((asset) => ({ value: asset.id, label: asset.assetName }))]} />
          <FilterSelect value={filters.assignedMemberId} onChange={(value) => setFilter("assignedMemberId", value)} options={[{ value: "all", label: "All assigned employees" }, ...state.teamMembers.map((member) => ({ value: member.id, label: member.fullName }))]} />
          <FilterSelect value={filters.priority} onChange={(value) => setFilter("priority", value)} options={["all", "Critical", "High", "Medium", "Low"].map((value) => ({ value, label: value === "all" ? "All priorities" : value }))} />
          <FilterSelect value={filters.reportStatus} onChange={(value) => setFilter("reportStatus", value)} options={["all", "Draft", "Submitted", "Approved"].map((value) => ({ value, label: value === "all" ? "All report statuses" : value }))} />
          <FilterSelect value={filters.workOrderStatus} onChange={(value) => setFilter("workOrderStatus", value)} options={["all", "Scheduled", "In Progress", "On Hold", "Completed", "Cancelled"].map((value) => ({ value, label: value === "all" ? "All WO statuses" : value }))} />
          <FilterSelect value={filters.domainId} onChange={(value) => setFilter("domainId", value)} options={[{ value: "all", label: "All domains" }, ...state.domains.map((domain) => ({ value: domain.id, label: domain.name }))]} />
          <FilterSelect value={filters.templateId} onChange={(value) => setFilter("templateId", value)} options={[{ value: "all", label: "All templates" }, ...state.templates.map((template) => ({ value: template.id, label: template.name }))]} />
          <FilterSelect value={filters.activityTypeId} onChange={(value) => setFilter("activityTypeId", value)} options={[{ value: "all", label: "All activity types" }, ...state.activityTypes.map((activity) => ({ value: activity.id, label: activity.name }))]} />
          <FilterSelect value={filters.reportType} onChange={(value) => setFilter("reportType", value)} options={["all", "CM", "PM", "Installation"].map((value) => ({ value, label: value === "all" ? "All report types" : value }))} />
          <input className="filter-input" type="date" value={filters.dateFrom} onChange={(event) => setFilter("dateFrom", event.target.value)} />
          <input className="filter-input" type="date" value={filters.dateTo} onChange={(event) => setFilter("dateTo", event.target.value)} />
          <Button variant="outline" onClick={() => setFilters({ search: "", workOrderRef: "", reportRef: "", clientId: "all", projectId: "all", siteId: "all", assetId: "all", assignedMemberId: "all", priority: "all", reportStatus: "all", workOrderStatus: "all", domainId: "all", templateId: "all", activityTypeId: "all", reportType: "all", dateFrom: "", dateTo: "" })}>Clear Filters</Button>
        </div>
      </Card>
      {view === "board" ? (
        <div className="kanban" style={{ marginTop: 14 }}>
          {(["Draft", "Submitted", "Approved"] as const).map((status) => (
            <section className="kanban-column" key={status}>
              <h3>{status}<span>{reports.filter((report) => report.status === status).length}</span></h3>
              {reports.filter((report) => report.status === status).map((report) => {
                const wo = state.workOrders.find((item) => item.id === report.workOrderId);
                return (
                  <article className="work-card" key={report.id}>
                    <Badge tone={report.type === "CM" ? "blue" : report.type === "PM" ? "green" : "amber"}>{report.type}</Badge>
                    <h4>{report.reference}</h4>
                    <p>{wo?.reference} · {optionName(state.clients, wo?.clientId)}</p>
                    <div className="table-actions" style={{ marginTop: 10 }}>
                      <Button size="sm" variant="outline" onClick={() => printElement(`report-print-${report.id}`, report.reference)}>Print Report</Button>
                      <Button size="sm" variant="danger" onClick={() => removeReport(report.id)}>Delete</Button>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      ) : (
        <Card style={{ marginTop: 14 }}>
          <DataTable
            data={reports}
            emptyTitle="No reports filed"
            columns={[
              { header: "Reference", render: (report) => report.reference },
              { header: "Type", render: (report) => <Badge>{report.type}</Badge> },
              { header: "Date", render: (report) => formatDate(report.date) },
              { header: "Status", render: (report) => report.status },
              { header: "Actions", render: (report) => <div className="table-actions"><Button size="sm" variant="outline" onClick={() => printElement(`report-print-${report.id}`, report.reference)}>Print Report</Button><Button size="sm" variant="danger" onClick={() => removeReport(report.id)}>Delete</Button></div> }
            ]}
          />
        </Card>
      )}
    </>
  );
}

function ReportEditor({ type }: { type: Exclude<ReportTab, "summary"> }) {
  const { state, saveReport } = useAppData();
  const toast = useToast();
  const eligibleWorkOrders = state.workOrders.filter((wo) => wo.kind === type);
  const [workOrderId, setWorkOrderId] = useState(eligibleWorkOrders[0]?.id ?? "");
  const workOrder = state.workOrders.find((wo) => wo.id === workOrderId) ?? eligibleWorkOrders[0];
  const client = state.clients.find((item) => item.id === workOrder?.clientId);
  const [tasks, setTasks] = useState<ChecklistTask[]>(() => workOrder?.tasks.map((task) => ({ ...task, id: uid("reportTask"), result: task.result ?? "Unchecked" })) ?? []);
  const [message, setMessage] = useState("");
  const existingReport = state.reports.find((item) => item.workOrderId === workOrder?.id && item.type === type);

  useEffect(() => {
    if (workOrder) setTasks(workOrder.tasks.map((task) => ({ ...task, id: uid("reportTask"), result: task.result ?? "Unchecked" })));
  }, [workOrder?.id]);

  function printSelectedReport() {
    if (!existingReport) {
      toast.error("Save this report before printing.");
      return;
    }
    printElement(`report-print-${existingReport.id}`, existingReport.reference);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = saveReport({
      type,
      workOrderId: workOrder?.id ?? "",
      preparedByMemberId: String(form.get("preparedByMemberId") ?? ""),
      date: String(form.get("date") ?? todayIso()),
      status: "Submitted",
      findings: String(form.get("findings") ?? ""),
      actionsTaken: String(form.get("actionsTaken") ?? ""),
      recommendations: String(form.get("recommendations") ?? ""),
      systemStatus: form.get("systemStatus") as Report["systemStatus"],
      tasks,
      clientRepresentative: client?.primaryContactName ?? "",
      companyRepresentative: state.company.companyName
    });
    setMessage(result ? "Report saved. Work order moved to Completed." : "Required checklist tasks must be completed before submission.");
    if (result) {
      toast.success("Report saved.");
    } else {
      toast.error("Required checklist tasks must be completed before submission.");
    }
  }

  if (!workOrder) {
    return <Card title={`${type} Reports`}><p className="subtle">Create an assigned {type} work order before filing this report.</p></Card>;
  }

  return (
    <form onSubmit={submit}>
      <Card title={`${type} Report`} action={<Button variant="outline" type="button" onClick={printSelectedReport}>Print Report</Button>}>
        <div className="grid-3">
          <TextField label="Report Reference" value={existingReport?.reference ?? "Auto-generated on save"} readOnly />
          <SelectField label="Work Order" value={workOrder.id} onChange={(event) => setWorkOrderId(event.target.value)}>
            {eligibleWorkOrders.map((wo) => <option key={wo.id} value={wo.id}>{wo.reference} · {wo.title}</option>)}
          </SelectField>
          <TextField label="Report Date" type="date" name="date" defaultValue={todayIso()} />
          <TextField label="Project / Contract" value={optionName(state.projects, workOrder.projectId)} readOnly />
          <TextField label="Client / Beneficiary" value={optionName(state.clients, workOrder.clientId)} readOnly />
          <TextField label="System Identification" value={optionName(state.assets, workOrder.assetId)} readOnly />
          <TextField label="Site / Facility" value={optionName(state.sites, workOrder.siteId)} readOnly />
          <SelectField label="Prepared By" name="preparedByMemberId" defaultValue={workOrder.assignedMemberIds[0] ?? ""}>
            {state.teamMembers.filter((member) => workOrder.assignedMemberIds.includes(member.id)).map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
          </SelectField>
          <SelectField label="System Status" name="systemStatus" defaultValue="Optimal">
            <option>Optimal</option>
            <option>Restricted</option>
            <option>Offline</option>
          </SelectField>
        </div>
      </Card>

      <Card title="Section 3 · Inspection & Corrective Tasks">
        <div className="task-list">
          {tasks.map((task) => (
            <div className="task-row" key={task.id}>
              <Badge tone={task.required ? "red" : "neutral"}>{task.required ? "Required" : "Optional"}</Badge>
              <span>{task.category}</span>
              <strong>{task.description}</strong>
              <select className="filter-input" value={task.result ?? "Unchecked"} onChange={(event) => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, result: event.target.value as ChecklistTask["result"] } : item))}>
                <option>Unchecked</option><option>OK</option><option>Warning</option><option>Fail</option><option>N/A</option>
              </select>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Sections 4, 5, and 6 · Employee / Engineer / Technician Completion">
        <div className="grid-2">
          <TextAreaField label="Findings" name="findings" />
          <TextAreaField label="Actions Taken" name="actionsTaken" />
          <TextAreaField label="Recommendations" name="recommendations" />
          <div className="grid-2">
            <TextField label={`${state.company.companyName} Representative`} value={state.company.companyName} readOnly />
            <TextField label="Client Representative" value={client?.primaryContactName ?? ""} readOnly />
          </div>
        </div>
        {message ? <p className={message.startsWith("Required") ? "form-error" : "form-success"}>{message}</p> : null}
        <div className="page-actions" style={{ marginTop: 14 }}>
          <Button variant="teal" type="submit">Submit Report</Button>
          <Button variant="outline" type="button" onClick={printSelectedReport}>Print Report</Button>
        </div>
      </Card>
    </form>
  );
}

function PrintableReport({ report }: { report: Report }) {
  const { state } = useAppData();
  const wo = state.workOrders.find((item) => item.id === report.workOrderId);
  const client = state.clients.find((item) => item.id === wo?.clientId);
  const project = state.projects.find((item) => item.id === wo?.projectId);
  const site = state.sites.find((item) => item.id === wo?.siteId);
  const asset = state.assets.find((item) => item.id === wo?.assetId);
  const assetType = state.assetTypes.find((item) => item.id === asset?.assetTypeId);
  const domain = state.domains.find((item) => item.id === wo?.domainId);
  const template = state.templates.find((item) => item.id === wo?.templateId);
  const preparedBy = state.teamMembers.find((item) => item.id === report.preparedByMemberId);
  const assignedTeam = wo?.assignedMemberIds.map((id) => optionName(state.teamMembers, id)).filter(Boolean).join(", ");

  return (
    <section id={`report-print-${report.id}`} className="print-document">
      <PrintableReportShell>
        <PrintableHeader
          title={reportLabel(report.type)}
          reference={report.reference}
          subtitle={`${formatDate(report.date)} · ${wo?.reference ?? "No linked work order"}`}
        />
        <PrintableSection title="Report Information">
          <PrintableFieldTable
            rows={[
              { field: "Report Reference", value: <code>{report.reference}</code> },
              { field: "Work Order", value: wo?.reference ? <code>{wo.reference}</code> : null },
              { field: "Report Date", value: formatDate(report.date) },
              { field: "Report Type", value: <PrintableStatusBadge value={reportLabel(report.type)} /> },
              { field: "Prepared By", value: preparedBy?.fullName },
              { field: "System Status", value: <PrintableStatusBadge value={report.systemStatus} /> }
            ]}
          />
        </PrintableSection>
        <PrintableSection title="Work Order / Operational Details">
          <PrintableFieldTable
            rows={[
              { field: "Work Order Reference", value: wo?.reference ? <code>{wo.reference}</code> : null },
              { field: "Client / Beneficiary", value: client?.name },
              { field: "Project / Contract", value: project?.name },
              { field: "Site / Facility", value: site?.name },
              { field: "Asset / System", value: asset?.assetName },
              { field: "Priority", value: wo?.priority ? <PrintableStatusBadge value={wo.priority} /> : null },
              { field: "Status", value: wo?.status ? <PrintableStatusBadge value={wo.status} /> : null },
              { field: "Assigned Team", value: assignedTeam || null },
              { field: "Domain", value: domain?.name },
              { field: "Template", value: template?.name }
            ]}
          />
        </PrintableSection>
        <PrintableSection title="System / Asset Details">
          <PrintableFieldTable
            rows={[
              { field: "Asset Name", value: asset?.assetName },
              { field: "Asset Type", value: assetType?.name },
              { field: "Model", value: asset?.model },
              { field: "Serial Number", value: asset?.serialNumber },
              { field: "Manufacturer", value: asset?.manufacturer },
              { field: "Description", value: asset?.description }
            ]}
          />
        </PrintableSection>
        <PrintableSection title="Inspection / Task Checklist">
          <PrintableChecklistTable
            tasks={report.tasks.map((task) => ({
              category: task.category,
              description: task.description,
              result: task.result,
              notes: task.result === "Unchecked" ? "Pending verification" : "Recorded in field report"
            }))}
          />
        </PrintableSection>
        <PrintableSection title="Completion Details">
          <PrintableDataTable
            columns={["Section", "Details"]}
            rows={[
              ["Findings", report.findings],
              ["Actions Taken", report.actionsTaken],
              ["Recommendations", report.recommendations],
              [`${state.company.companyName} Representative`, report.companyRepresentative || state.company.companyName],
              ["Client Representative", report.clientRepresentative || client?.primaryContactName]
            ]}
          />
        </PrintableSection>
        <PrintableSection title="Representative / Sign-off">
          <PrintableDataTable
            columns={["Role", "Representative", "Status"]}
            rows={[
              [
                `${state.company.companyName} Representative`,
                report.companyRepresentative || state.company.companyName,
                <PrintableStatusBadge value="Completed" />
              ],
              [
                "Client Representative",
                report.clientRepresentative || client?.primaryContactName,
                <PrintableStatusBadge value={report.clientRepresentative || client?.primaryContactName ? "Acknowledged" : "Pending"} />
              ]
            ]}
          />
          <PrintableSignatureBlock labels={[`${state.company.companyName} Representative`, "Client Representative"]} />
        </PrintableSection>
        <PrintableFooter>{state.company.reportFooter}</PrintableFooter>
      </PrintableReportShell>
    </section>
  );
}

function reportLabel(type: Report["type"]) {
  return type === "Installation" ? "Installation Report" : `${type} Report`;
}

function buildFilterContextRows(filters: ReportFilters, state: CmmsState) {
  return [
    filters.search ? ["Search", filters.search] : null,
    filters.workOrderRef ? ["Work Order Reference", filters.workOrderRef] : null,
    filters.reportRef ? ["Report Reference", filters.reportRef] : null,
    filters.clientId !== "all" ? ["Client", optionName(state.clients, filters.clientId)] : null,
    filters.projectId !== "all" ? ["Project", optionName(state.projects, filters.projectId)] : null,
    filters.siteId !== "all" ? ["Site / Facility", optionName(state.sites, filters.siteId)] : null,
    filters.assetId !== "all" ? ["Asset", optionName(state.assets, filters.assetId)] : null,
    filters.assignedMemberId !== "all" ? ["Assigned Employee", optionName(state.teamMembers, filters.assignedMemberId)] : null,
    filters.priority !== "all" ? ["Priority", filters.priority] : null,
    filters.reportStatus !== "all" ? ["Report Status", filters.reportStatus] : null,
    filters.workOrderStatus !== "all" ? ["Work Order Status", filters.workOrderStatus] : null,
    filters.domainId !== "all" ? ["Domain", optionName(state.domains, filters.domainId)] : null,
    filters.templateId !== "all" ? ["Template", optionName(state.templates, filters.templateId)] : null,
    filters.activityTypeId !== "all" ? ["Activity Type", optionName(state.activityTypes, filters.activityTypeId)] : null,
    filters.reportType !== "all" ? ["Report Type", filters.reportType] : null,
    filters.dateFrom ? ["Date From", formatDate(filters.dateFrom)] : null,
    filters.dateTo ? ["Date To", formatDate(filters.dateTo)] : null
  ].filter((row): row is string[] => Boolean(row));
}
