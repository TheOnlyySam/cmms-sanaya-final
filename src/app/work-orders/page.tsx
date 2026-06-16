"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SelectField, TextAreaField, TextField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { PageShell } from "@/components/layout/PageShell";
import { useAppData } from "@/lib/data/AppDataContext";
import { printElement } from "@/lib/print";
import { useToast } from "@/components/ui/ToastProvider";
import {
  PrintableChecklistTable,
  PrintableDataGrid,
  PrintableFieldTable,
  PrintableFooter,
  PrintableHeader,
  PrintableReportShell,
  PrintableSection,
  PrintableSignatureBlock,
  PrintableStatusBadge
} from "@/components/print/Printable";
import type { Id, WorkOrder, WorkOrderKind, WorkOrderStatus } from "@/lib/types";
import { formatDate, initials, optionName, todayIso } from "@/lib/utils";

const statuses: WorkOrderStatus[] = ["Scheduled", "In Progress", "On Hold", "Completed", "Cancelled"];
const priorities = ["Critical", "High", "Medium", "Low"] as const;

type Draft = Partial<WorkOrder> & { title: string; kind: WorkOrderKind; domainId: Id; templateId: Id };

const emptyDraft: Draft = { title: "", kind: "CM", domainId: "", templateId: "", assignedMemberIds: [], dueDate: todayIso() };

export default function WorkOrdersPage() {
  const { state, saveWorkOrder, removeWorkOrder, saveClient, updateWorkOrderStatus } = useAppData();
  const toast = useToast();
  const [view, setView] = useState<"board" | "list" | "assigned">("board");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [openModal, setOpenModal] = useState(false);
  const [deleteId, setDeleteId] = useState<Id | null>(null);
  const [newClientName, setNewClientName] = useState("");

  const filtered = state.workOrders.filter((wo) => {
    const haystack = [wo.reference, wo.title, optionName(state.clients, wo.clientId), optionName(state.projects, wo.projectId)].join(" ").toLowerCase();
    return (
      haystack.includes(query.toLowerCase()) &&
      (projectFilter === "all" || wo.projectId === projectFilter) &&
      (statusFilter === "all" || wo.status === statusFilter)
    );
  });

  const availableTemplates = useMemo(() => state.templates.filter((template) => template.domainId === draft.domainId), [state.templates, draft.domainId]);
  const selectedTemplate = state.templates.find((template) => template.id === draft.templateId);

  function openCreate() {
    const firstDomain = state.domains[0]?.id ?? "";
    const firstTemplate = state.templates.find((template) => template.domainId === firstDomain)?.id ?? "";
    setDraft({ ...emptyDraft, domainId: firstDomain, templateId: firstTemplate, tasks: state.templates.find((template) => template.id === firstTemplate)?.tasks ?? [] });
    setOpenModal(true);
  }

  function openEdit(workOrder: WorkOrder) {
    setDraft(workOrder);
    setOpenModal(true);
  }

  function selectDomain(domainId: Id) {
    const nextTemplate = state.templates.find((template) => template.domainId === domainId);
    setDraft((current) => ({
      ...current,
      domainId,
      templateId: nextTemplate?.id ?? "",
      scope: nextTemplate?.scope ?? "",
      tasks: nextTemplate?.tasks ?? []
    }));
  }

  function selectTemplate(templateId: Id) {
    const template = state.templates.find((item) => item.id === templateId);
    setDraft((current) => ({ ...current, templateId, scope: template?.scope ?? "", tasks: template?.tasks ?? [] }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      saveWorkOrder({
        ...draft,
        clientId: draft.clientId ?? state.clients[0]?.id ?? "",
        projectId: draft.projectId ?? state.projects[0]?.id ?? "",
        siteId: draft.siteId ?? state.sites[0]?.id ?? "",
        assetId: draft.assetId ?? state.assets[0]?.id ?? ""
      });
      setOpenModal(false);
      toast.success("Work order saved.");
    } catch {
      toast.error("Work order could not be saved.");
    }
  }

  function addClientFromWO() {
    if (!newClientName.trim()) {
      toast.error("Client name is required.");
      return;
    }
    const id = saveClient({ name: newClientName.trim(), industry: state.industries[0] ?? "" });
    setDraft((current) => ({ ...current, clientId: id }));
    setNewClientName("");
    toast.success("Client created from work order.");
  }

  function moveWorkOrder(workOrderId: Id, status: WorkOrderStatus) {
    try {
      updateWorkOrderStatus(workOrderId, status);
      toast.success(`Work order moved to ${status}.`);
    } catch {
      toast.error("Work order could not be moved.");
    }
  }

  return (
    <PageShell
      title="Work Orders"
      subtitle="Work orders are created by owners, project managers, or CMMS admins and assigned to employees."
      actions={
        <>
          <Button variant="outline" onClick={() => printElement("wo-dashboard-print", "Work Orders Dashboard", "landscape")}>
            Print Dashboard
          </Button>
          <Button variant="teal" onClick={openCreate}>
            New Work Order
          </Button>
        </>
      }
    >
      <div className="kpi-grid">
        <Card className="kpi">
          <div className="kpi-label">Total Work Orders</div>
          <div className="kpi-value">{state.workOrders.length}</div>
          <div className="kpi-sub">Generated by sequence</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{state.workOrders.filter((wo) => wo.status !== "Completed" && wo.status !== "Cancelled").length}</div>
          <div className="kpi-sub">Visible to assigned employees</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Templates</div>
          <div className="kpi-value">{state.templates.length}</div>
          <div className="kpi-sub">Domain linked</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Assigned Staff</div>
          <div className="kpi-value">{state.teamMembers.length}</div>
          <div className="kpi-sub">From Team Members</div>
        </Card>
      </div>

      <Card>
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <div className="tabs">
            {(["board", "list", "assigned"] as const).map((mode) => (
              <button className={`tab-button ${view === mode ? "active" : ""}`} key={mode} onClick={() => setView(mode)}>
                {mode === "board" ? "Board View" : mode === "list" ? "List View" : "Assigned View"}
              </button>
            ))}
          </div>
          <div className="filters">
            <input className="filter-input" placeholder="Search work orders..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <FilterSelect value={projectFilter} onChange={setProjectFilter} options={[{ value: "all", label: "All projects" }, ...state.projects.map((project) => ({ value: project.id, label: project.name }))]} />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All statuses" }, ...statuses.map((status) => ({ value: status, label: status }))]} />
          </div>
        </div>
      </Card>

      {view === "board" ? (
        <div className="kanban" style={{ marginTop: 14 }}>
          {statuses.map((status) => {
            const items = filtered.filter((wo) => wo.status === status);
            return (
              <section
                className="kanban-column"
                key={status}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("text/work-order-id");
                  if (id) moveWorkOrder(id, status);
                }}
              >
                <h3>
                  {status} <span>{items.length}</span>
                </h3>
                {items.map((wo) => (
                  <WorkOrderCard key={wo.id} workOrder={wo} onEdit={openEdit} />
                ))}
              </section>
            );
          })}
        </div>
      ) : view === "assigned" ? (
        <div className="grid-2" style={{ marginTop: 14 }}>
          {state.teamMembers.map((member) => (
            <Card key={member.id} title={`${member.fullName} · ${optionName(state.roles, member.roleId)}`}>
              <DataTable
                data={filtered.filter((wo) => wo.assignedMemberIds.includes(member.id))}
                emptyTitle="No assigned work orders"
                columns={[
                  { header: "Ref", render: (wo) => wo.reference },
                  { header: "Title", render: (wo) => wo.title },
                  { header: "Status", render: (wo) => <Badge tone="blue">{wo.status}</Badge> },
                  { header: "Due", render: (wo) => formatDate(wo.dueDate) }
                ]}
              />
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ marginTop: 14 }}>
          <DataTable
            data={filtered}
            emptyTitle="No work orders match the filters"
            columns={[
              { header: "Reference", render: (wo) => wo.reference },
              { header: "Title", render: (wo) => wo.title },
              { header: "Type", render: (wo) => <Badge tone={wo.kind === "CM" ? "blue" : wo.kind === "PM" ? "green" : "amber"}>{wo.kind}</Badge> },
              { header: "Client", render: (wo) => optionName(state.clients, wo.clientId) },
              { header: "Project", render: (wo) => optionName(state.projects, wo.projectId) },
              { header: "Status", render: (wo) => <Badge tone="neutral">{wo.status}</Badge> },
              {
                header: "Actions",
                render: (wo) => (
                  <div className="table-actions">
                    <Button size="sm" variant="outline" onClick={() => openEdit(wo)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => printElement(`wo-print-${wo.id}`, `Work Order ${wo.reference}`)}>
                      Print
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteId(wo.id)}>
                      Delete
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </Card>
      )}

      <div className="print-area">
        <section id="wo-dashboard-print" className="print-document">
          <PrintableHeader title="Work Orders Dashboard" subtitle="Operational Board" />
          <PrintableSection title="Dashboard Summary">
            <PrintableDataGrid
              items={[
                { label: "Total Work Orders", value: state.workOrders.length },
                { label: "Active", value: state.workOrders.filter((wo) => wo.status !== "Completed" && wo.status !== "Cancelled").length },
                { label: "Templates", value: state.templates.length },
                { label: "Assigned Staff", value: state.teamMembers.length }
              ]}
            />
          </PrintableSection>
          <PrintableSection title="Filtered Work Orders">
            <table className="print-table">
              <thead><tr><th>Reference</th><th>Title</th><th>Client</th><th>Project</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>{filtered.map((wo) => <tr key={wo.id}><td>{wo.reference}</td><td>{wo.title}</td><td>{optionName(state.clients, wo.clientId)}</td><td>{optionName(state.projects, wo.projectId)}</td><td>{wo.priority}</td><td>{wo.status}</td><td>{formatDate(wo.dueDate)}</td></tr>)}</tbody>
            </table>
          </PrintableSection>
          <PrintableFooter>{state.company.reportFooter}</PrintableFooter>
        </section>
        {state.workOrders.map((wo) => (
          <PrintableWorkOrder key={wo.id} workOrder={wo} />
        ))}
      </div>

      <Modal
        open={openModal}
        title={draft.id ? "Edit Work Order" : "New Work Order"}
        subtitle="Select a domain first, then a template. Template checklist tasks are injected into the work order."
        onClose={() => setOpenModal(false)}
        wide
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button variant="teal" type="submit" form="wo-form" disabled={!draft.domainId || !draft.templateId || !draft.title}>
              Save Work Order
            </Button>
          </>
        }
      >
        <form id="wo-form" onSubmit={handleSubmit}>
          <div className="grid-3">
            <TextField label="Work Order Reference" value={draft.reference ?? "Auto-generated on save"} readOnly />
            <SelectField label="Work Order Type" value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as WorkOrderKind }))}>
              <option value="CM">CM</option>
              <option value="PM">PM</option>
              <option value="Installation">Installation</option>
            </SelectField>
            <SelectField label="Priority" value={draft.priority ?? "Medium"} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as WorkOrder["priority"] }))}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </SelectField>
            <TextField label="Title" required placeholder="General work order title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
            <SelectField label="Domain" required value={draft.domainId} onChange={(event) => selectDomain(event.target.value)}>
              <option value="">Select domain</option>
              {state.domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Template" required value={draft.templateId} onChange={(event) => selectTemplate(event.target.value)}>
              <option value="">Select template</option>
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Client" value={draft.clientId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, clientId: event.target.value }))}>
              <option value="">Select client</option>
              {state.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </SelectField>
            <div className="field">
              <span>Create Client Here</span>
              <div className="inline-row">
                <input placeholder="New client name" value={newClientName} onChange={(event) => setNewClientName(event.target.value)} />
                <Button type="button" variant="outline" onClick={addClientFromWO}>
                  Add
                </Button>
              </div>
            </div>
            <SelectField label="Project" value={draft.projectId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
              <option value="">Select project</option>
              {state.projects
                .filter((project) => !draft.clientId || project.clientId === draft.clientId)
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </SelectField>
            <SelectField label="Site / Facility" value={draft.siteId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, siteId: event.target.value }))}>
              <option value="">Select site</option>
              {state.sites
                .filter((site) => !draft.projectId || site.projectId === draft.projectId)
                .map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
            </SelectField>
            <SelectField label="Asset" value={draft.assetId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, assetId: event.target.value }))}>
              <option value="">Select asset</option>
              {state.assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetName}
                </option>
              ))}
            </SelectField>
            <SelectField label="Status" value={draft.status ?? "Scheduled"} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as WorkOrderStatus }))}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectField>
            <TextField label="Due Date" type="date" value={draft.dueDate ?? todayIso()} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
          </div>
          <div className="grid-2" style={{ marginTop: 14 }}>
            <TextAreaField label="Description" placeholder="Describe the requested work..." value={draft.description ?? ""} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            <TextAreaField label="Scope From Template" value={draft.scope ?? selectedTemplate?.scope ?? ""} onChange={(event) => setDraft((current) => ({ ...current, scope: event.target.value }))} />
          </div>
          <Card title="Assigned Engineers / Employees / Technicians" className="nested-card">
            <div className="employee-chip-row">
              {(draft.assignedMemberIds ?? []).map((id) => {
                const member = state.teamMembers.find((item) => item.id === id);
                if (!member) return null;
                return <span className="employee-chip" key={id}><b>{initials(member.fullName)}</b>{member.fullName}</span>;
              })}
            </div>
            <div className="check-grid">
              {state.teamMembers.map((member) => (
                <label key={member.id} className="check-row">
                  <input
                    type="checkbox"
                    checked={(draft.assignedMemberIds ?? []).includes(member.id)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        assignedMemberIds: event.target.checked
                          ? [...(current.assignedMemberIds ?? []), member.id]
                          : (current.assignedMemberIds ?? []).filter((id) => id !== member.id)
                      }))
                    }
                  />
                  {member.fullName} <span>{optionName(state.roles, member.roleId)}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card title="Task Checklist From Domain → Template → Checklist Tasks" className="nested-card">
            <div className="task-list">
              {(draft.tasks ?? selectedTemplate?.tasks ?? []).map((task) => (
                <div className="task-row" key={task.id}>
                  <Badge tone={task.required ? "red" : "neutral"}>{task.required ? "Required" : "Optional"}</Badge>
                  <span>{task.category}</span>
                  <strong>{task.description}</strong>
                </div>
              ))}
            </div>
          </Card>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Remove work order?"
        message="This will remove the work order and any linked reports. Related dropdowns and schedules will be updated."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            removeWorkOrder(deleteId);
            toast.success("Work order removed.");
          }
          setDeleteId(null);
        }}
      />
    </PageShell>
  );
}

function WorkOrderCard({ workOrder, onEdit }: { workOrder: WorkOrder; onEdit: (workOrder: WorkOrder) => void }) {
  const { state } = useAppData();
  return (
    <article
      className="work-card"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/work-order-id", workOrder.id);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <Badge tone={workOrder.kind === "CM" ? "blue" : workOrder.kind === "PM" ? "green" : "amber"}>{workOrder.kind}</Badge>
        <Badge tone={workOrder.priority === "Critical" ? "red" : workOrder.priority === "High" ? "amber" : "neutral"}>{workOrder.priority}</Badge>
      </div>
      <h4>{workOrder.title}</h4>
      <p>{workOrder.reference}</p>
      <p>{optionName(state.clients, workOrder.clientId)} · {formatDate(workOrder.dueDate)}</p>
      <div className="table-actions" style={{ marginTop: 10 }}>
        <Button size="sm" variant="outline" onClick={() => onEdit(workOrder)}>
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={() => printElement(`wo-print-${workOrder.id}`, `Work Order ${workOrder.reference}`)}>
          Print
        </Button>
      </div>
    </article>
  );
}

function PrintableWorkOrder({ workOrder }: { workOrder: WorkOrder }) {
  const { state } = useAppData();
  const assigned = workOrder.assignedMemberIds.map((id) => optionName(state.teamMembers, id)).filter(Boolean).join(", ");
  return (
    <section id={`wo-print-${workOrder.id}`} className="print-document">
      <PrintableReportShell>
        <PrintableHeader title="Work Order" reference={workOrder.reference} subtitle={workOrder.title} />
        <PrintableSection title="Operational Details">
          <PrintableFieldTable
            rows={[
              { field: "Client", value: optionName(state.clients, workOrder.clientId) },
              { field: "Project", value: optionName(state.projects, workOrder.projectId) },
              { field: "Site / Facility", value: optionName(state.sites, workOrder.siteId) },
              { field: "Asset / System", value: optionName(state.assets, workOrder.assetId) },
              { field: "Priority", value: <PrintableStatusBadge value={workOrder.priority} /> },
              { field: "Status", value: <PrintableStatusBadge value={workOrder.status} /> },
              { field: "Domain", value: optionName(state.domains, workOrder.domainId) },
              { field: "Template", value: optionName(state.templates, workOrder.templateId) },
              { field: "Scheduled Date", value: formatDate(workOrder.dueDate) },
              { field: "Assigned Employees", value: assigned || "Unassigned" }
            ]}
          />
        </PrintableSection>
        <PrintableSection title="Scope and Notes">
          <PrintableFieldTable rows={[{ field: "Scope Summary", value: workOrder.scope || workOrder.description || "No notes recorded." }]} />
        </PrintableSection>
        <PrintableSection title="Checklist Tasks">
          <PrintableChecklistTable
            tasks={workOrder.tasks.map((task) => ({
              category: task.category,
              description: task.description,
              result: task.result === "Unchecked" || !task.result ? "Pending" : task.result,
              notes: "Checklist task"
            }))}
          />
        </PrintableSection>
        <PrintableSignatureBlock />
        <PrintableFooter>{state.company.reportFooter}</PrintableFooter>
      </PrintableReportShell>
    </section>
  );
}
