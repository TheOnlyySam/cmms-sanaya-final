"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageShell } from "@/components/layout/PageShell";
import { useAppData } from "@/lib/data/AppDataContext";
import { countBy, formatDate, optionName } from "@/lib/utils";

export default function DashboardPage() {
  const { state } = useAppData();
  const open = state.workOrders.filter((wo) => ["Scheduled", "In Progress", "On Hold"].includes(wo.status));
  const completed = state.workOrders.filter((wo) => wo.status === "Completed");
  const overdue = open.filter((wo) => wo.dueDate && new Date(`${wo.dueDate}T00:00:00`) < new Date());
  const completionRate = state.workOrders.length ? Math.round((completed.length / state.workOrders.length) * 100) : 0;
  const statusCounts = countBy(state.workOrders, (wo) => wo.status);
  const priorityCounts = countBy(state.workOrders, (wo) => wo.priority);
  const upcoming = state.workOrders
    .filter((wo) => wo.status !== "Completed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);

  const workload = state.teamMembers.map((member) => ({
    member,
    active: state.workOrders.filter((wo) => wo.assignedMemberIds.includes(member.id) && wo.status !== "Completed").length
  }));

  return (
    <PageShell
      title="Dashboard"
      subtitle="Live overview built from Settings, Work Orders, Reports, PM Schedule, Clients, Projects, Assets, and Team Members."
      actions={
        <>
          <Link href="/work-orders">
            <Button variant="teal">New Work Order</Button>
          </Link>
          <Button variant="outline" onClick={() => window.print()}>
            Print Dashboard
          </Button>
        </>
      }
    >
      <div className="kpi-grid">
        <Card className="kpi">
          <div className="kpi-label">Total Work Orders</div>
          <div className="kpi-value" style={{ color: "var(--teal)" }}>
            {state.workOrders.length}
          </div>
          <div className="kpi-sub">All generated work orders</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Open / Active</div>
          <div className="kpi-value" style={{ color: "var(--sky)" }}>
            {open.length}
          </div>
          <div className="kpi-sub">Scheduled, in progress, or on hold</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Overdue</div>
          <div className="kpi-value" style={{ color: "var(--red)" }}>
            {overdue.length}
          </div>
          <div className="kpi-sub">Past due and not completed</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Completion Rate</div>
          <div className="kpi-value" style={{ color: "var(--green)" }}>
            {completionRate}%
          </div>
          <div className="kpi-sub">{completed.length} completed</div>
        </Card>
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <Card title="Work Order Status">
          <div className="stack-list">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div className="stack-row" key={status}>
                <span>{status}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Priority Distribution">
          <div className="stack-list">
            {Object.entries(priorityCounts).map(([priority, count]) => (
              <div className="stack-row" key={priority}>
                <Badge tone={priority === "Critical" ? "red" : priority === "High" ? "amber" : priority === "Medium" ? "blue" : "green"}>{priority}</Badge>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Upcoming Work Orders" action={<Link href="/work-orders">View all</Link>} style={{ marginTop: 14 }}>
        <DataTable
          data={upcoming}
          emptyTitle="No upcoming work orders"
          columns={[
            { header: "Ref", render: (wo) => wo.reference },
            { header: "Title", render: (wo) => wo.title },
            { header: "Client", render: (wo) => optionName(state.clients, wo.clientId) },
            { header: "Project", render: (wo) => optionName(state.projects, wo.projectId) },
            { header: "Assigned", render: (wo) => wo.assignedMemberIds.map((id) => optionName(state.teamMembers, id)).join(", ") || "Unassigned" },
            { header: "Due", render: (wo) => formatDate(wo.dueDate) }
          ]}
        />
      </Card>
      <Card title="Team Workload" action={<Link href="/work-orders">Assigned view</Link>}>
        <DataTable
          data={workload}
          emptyTitle="No team members"
          columns={[
            { header: "Employee", render: (row) => row.member.fullName },
            { header: "Role", render: (row) => optionName(state.roles, row.member.roleId) },
            { header: "Department", render: (row) => row.member.department },
            { header: "Active Work Orders", render: (row) => row.active }
          ]}
        />
      </Card>

      <div className="grid-3" style={{ marginTop: 14 }}>
        <Card title="Reports Filed">
          <div className="big-number">{state.reports.length}</div>
          <p className="subtle">CM: {state.reports.filter((r) => r.type === "CM").length} · PM: {state.reports.filter((r) => r.type === "PM").length} · Installations: {state.reports.filter((r) => r.type === "Installation").length}</p>
        </Card>
        <Card title="Assets">
          <div className="big-number">{state.assets.length}</div>
          <p className="subtle">Equipment and Project Assets in registry</p>
        </Card>
        <Card title="PM Schedules">
          <div className="big-number">{state.pmSchedules.length}</div>
          <p className="subtle">All preventive maintenance schedules</p>
        </Card>
      </div>
    </PageShell>
  );
}
