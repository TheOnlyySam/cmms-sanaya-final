"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageShell } from "@/components/layout/PageShell";
import { PrintableFooter, PrintableHeader, PrintableSection } from "@/components/print/Printable";
import { useAppData } from "@/lib/data/AppDataContext";
import { printElement } from "@/lib/print";
import { useToast } from "@/components/ui/ToastProvider";
import type { Id, PMScheduleCellStatus, PMScheduleFrequency, PMScheduleSection, PMScheduleTask } from "@/lib/types";
import { optionName, uid } from "@/lib/utils";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const frequencies: PMScheduleFrequency[] = ["Weekly", "Monthly", "Quarterly", "Bi-Annual", "Annual"];
const statuses: Exclude<PMScheduleCellStatus, "empty">[] = ["scheduled", "completed", "issue", "skipped"];
const cellCycle: PMScheduleCellStatus[] = ["empty", "scheduled", "completed", "issue", "skipped"];
const durationOptions = [1, 2, 3, 4, 6, 9, 12, 18, 24];

export default function PMSchedulePage() {
  const { state, setState } = useAppData();
  const toast = useToast();
  const [clientFilter, setClientFilter] = useState(state.clients[0]?.id ?? "all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [startMonth, setStartMonth] = useState<number | "all">("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [duration, setDuration] = useState(12);
  const [statusFilter, setStatusFilter] = useState<"all" | Exclude<PMScheduleCellStatus, "empty">>("all");
  const [sectionToRemove, setSectionToRemove] = useState<Id | null>(null);

  const filteredProjects = state.projects.filter((project) => clientFilter === "all" || project.clientId === clientFilter);
  const visibleMonths = useMemo(
    () =>
      Array.from({ length: duration }, (_, index) => {
        const start = startMonth === "all" ? 0 : startMonth;
        const absolute = start + index;
        const month = absolute % 12;
        const displayYear = year + Math.floor(absolute / 12);
        return { key: `${displayYear}_${month}`, month, year: displayYear, label: `${monthShort[month]}${displayYear !== year ? ` '${String(displayYear).slice(2)}` : ""}`, offset: index };
      }),
    [duration, startMonth, year]
  );

  const sections = state.pmScheduleSections.filter((section) => {
    const project = state.projects.find((item) => item.id === section.projectId);
    return (clientFilter === "all" || section.clientId === clientFilter || project?.clientId === clientFilter) && (projectFilter === "all" || section.projectId === projectFilter);
  });

  const visibleSections = sections
    .map((section) => ({
      ...section,
      tasks: section.tasks.filter((task) => {
        const statusMatch =
          statusFilter === "all" ||
          visibleMonths.some((month) => getCellStatus(task, month.key, month.offset) === statusFilter);
        return statusMatch;
      })
    }))
    .filter((section) => section.tasks.length || statusFilter === "all");

  const selectedClient = clientFilter === "all" ? state.clients[0] : state.clients.find((client) => client.id === clientFilter);
  const selectedProject = projectFilter === "all" ? filteredProjects[0] : state.projects.find((project) => project.id === projectFilter);

  function updateSection(sectionId: Id, updater: (section: PMScheduleSection) => PMScheduleSection) {
    setState((current) => ({
      ...current,
      pmScheduleSections: current.pmScheduleSections.map((section) => (section.id === sectionId ? updater(section) : section))
    }));
  }

  function addSection() {
    const project = selectedProject ?? state.projects[0];
    if (!project) {
      toast.error("Create a project before adding PM sections.");
      return;
    }
    const clientId = clientFilter === "all" ? project.clientId : clientFilter;
    const firstMember = state.teamMembers[0]?.id ?? "";
    const secondMember = state.teamMembers[1]?.id ?? firstMember;
    const assetId = state.assets[0]?.id;
    setState((current) => ({
      ...current,
      pmScheduleSections: [
        ...current.pmScheduleSections,
        {
          id: uid("pmsec"),
          title: "Battery & Charging Systems",
          clientId,
          projectId: project.id,
          tasks: [
            { id: uid("pmtask"), name: "Check battery terminal voltage and record readings", frequency: "Monthly", assignedMemberId: firstMember, assetId, cells: {} },
            { id: uid("pmtask"), name: "Inspect charging system indicators and verify normal operation", frequency: "Monthly", assignedMemberId: secondMember, assetId, cells: {} },
            { id: uid("pmtask"), name: "Clean terminals and apply anti-corrosion protection", frequency: "Bi-Annual", assignedMemberId: secondMember, assetId, cells: {} },
            { id: uid("pmtask"), name: "Load-test batteries for runtime capacity", frequency: "Annual", assignedMemberId: firstMember, assetId, cells: {} }
          ]
        }
      ]
    }));
    toast.success("Battery & Charging Systems section added.");
  }

  function addTask(sectionId: Id) {
    const firstMember = state.teamMembers[0]?.id ?? "";
    updateSection(sectionId, (section) => ({
      ...section,
      tasks: [
        ...section.tasks,
        {
          id: uid("pmtask"),
          name: "New preventive maintenance task",
          frequency: "Monthly",
          assignedMemberId: firstMember,
          cells: {}
        }
      ]
    }));
    toast.success("PM task added.");
  }

  function removeTask(sectionId: Id, taskId: Id) {
    updateSection(sectionId, (section) => ({ ...section, tasks: section.tasks.filter((task) => task.id !== taskId) }));
    toast.success("PM task removed.");
  }

  function cycleCell(sectionId: Id, taskId: Id, key: string, offset: number) {
    updateSection(sectionId, (section) => ({
      ...section,
      tasks: section.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const currentStatus = getCellStatus(task, key, offset);
        const nextStatus = cellCycle[(cellCycle.indexOf(currentStatus) + 1) % cellCycle.length];
        return { ...task, cells: { ...task.cells, [key]: nextStatus } };
      })
    }));
  }

  return (
    <PageShell title="PM Schedule" subtitle="Annual preventive maintenance planner with sectioned task schedules and monthly status controls.">
      <section className="sch-top">
        <div className="sch-title">
          <div className="sch-eyebrow">SyncShield · Annual PM Schedule</div>
          <div className="yr">{year}</div>
          <div className="lbl">
            {selectedClient?.clientId ?? "All"} — {selectedClient?.name ?? "All Clients"} · {selectedClient?.city || "Region"} · {selectedProject?.name ?? "All Projects"}
          </div>
        </div>
        <div className="sch-cfg no-print">
          <label>Client<select value={clientFilter} onChange={(event) => { setClientFilter(event.target.value); setProjectFilter("all"); }}><option value="all">All clients</option>{state.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label>Project<select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="all">All projects</option>{filteredProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Start Month<select value={startMonth} onChange={(event) => { const value = event.target.value; setStartMonth(value === "all" ? "all" : Number(value)); if (value === "all") setDuration(12); }}><option value="all">All months</option>{monthNames.map((month, index) => <option key={month} value={index}>{month}</option>)}</select></label>
          <label>Year<input type="number" value={year} min={2024} max={2040} onChange={(event) => setYear(Number(event.target.value))} /></label>
          <label>Duration<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{durationOptions.map((value) => <option key={value} value={value}>{value === 1 ? "1 month" : `${value} months`}</option>)}</select></label>
          <Button variant="ghost" size="sm" onClick={addSection}>+ Section</Button>
          <Button variant="teal" size="sm" onClick={() => printElement("pm-schedule-print", "PM Schedule", "landscape")}>Print</Button>
        </div>
      </section>

      <div className="sch-legend">
        <strong>Click cells:</strong>
        {statuses.map((status) => <button className={`legend-chip legend-${status} ${statusFilter === status ? "active" : ""}`} key={status} onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}><span>{cellIcon(status)}</span>{statusLabel(status)}</button>)}
        <button className={`legend-chip ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>All statuses</button>
      </div>

      <div id="pm-schedule-print">
        <div className="print-only">
          <PrintableHeader title="Annual PM Schedule" reference={String(year)} subtitle={`${selectedClient?.name ?? "All Clients"} · ${selectedProject?.name ?? "All Projects"}`} />
        </div>
        {visibleSections.map((section) => (
          <section className="sch-section-wrap" key={section.id}>
            <div className="sch-sec-hdr">
              <div className="dot" />
              <input value={section.title} onChange={(event) => updateSection(section.id, (current) => ({ ...current, title: event.target.value }))} />
              <div className="no-print sch-sec-actions">
                <Button size="sm" variant="ghost" onClick={() => addTask(section.id)}>+ Task</Button>
                <Button size="sm" variant="danger" onClick={() => setSectionToRemove(section.id)}>Remove</Button>
              </div>
            </div>
            <div className="sch-table-wrap">
              <table className="sch-tbl">
                <thead><tr><th>Task</th><th className="freq-col">Frequency</th><th className="by-col">By</th>{visibleMonths.map((month) => <th key={month.key}>{month.label}</th>)}<th className="no-print">Delete</th></tr></thead>
                <tbody>
                  {section.tasks.map((task) => (
                    <tr key={task.id}>
                      <td><textarea value={task.name} onChange={(event) => updateSection(section.id, (current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, name: event.target.value } : item) }))} /></td>
                      <td>
                        <select value={task.frequency} onChange={(event) => updateSection(section.id, (current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, frequency: event.target.value as PMScheduleFrequency } : item) }))}>
                          {frequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}
                        </select>
                        <span className={`fb ${freqClass(task.frequency)} print-freq`}>{task.frequency}</span>
                      </td>
                      <td><select value={task.assignedMemberId} onChange={(event) => updateSection(section.id, (current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, assignedMemberId: event.target.value } : item) }))}><option value="">Unassigned</option>{state.teamMembers.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></td>
                      {visibleMonths.map((month) => {
                        const status = getCellStatus(task, month.key, month.offset);
                        return <td key={month.key}><button type="button" className={`sch-cell sc-${status}`} onClick={() => cycleCell(section.id, task.id, month.key, month.offset)}>{cellIcon(status)}</button></td>;
                      })}
                      <td className="no-print"><Button size="sm" variant="danger" onClick={() => removeTask(section.id, task.id)}>Delete</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        <div className="print-only">
          <PrintableSection title="Filter Context">
            <table className="print-table"><tbody><tr><td>Client</td><td>{selectedClient?.name ?? "All"}</td><td>Project</td><td>{selectedProject?.name ?? "All"}</td><td>Duration</td><td>{duration} months</td></tr></tbody></table>
          </PrintableSection>
          <PrintableFooter>{state.company.reportFooter}</PrintableFooter>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(sectionToRemove)}
        title="Remove PM section?"
        message="This removes the PM section and all tasks inside it."
        onCancel={() => setSectionToRemove(null)}
        onConfirm={() => {
          if (sectionToRemove) {
            setState((current) => ({ ...current, pmScheduleSections: current.pmScheduleSections.filter((section) => section.id !== sectionToRemove) }));
            toast.success("PM section removed.");
          }
          setSectionToRemove(null);
        }}
      />
    </PageShell>
  );
}

function getCellStatus(task: PMScheduleTask, key: string, offset: number): PMScheduleCellStatus {
  if (task.cells[key]) return task.cells[key];
  if (task.frequency === "Weekly" || task.frequency === "Monthly") return "scheduled";
  if (task.frequency === "Quarterly") return offset % 3 === 0 ? "scheduled" : "empty";
  if (task.frequency === "Bi-Annual") return offset === 0 || offset === 6 ? "scheduled" : "empty";
  return offset === 11 ? "scheduled" : "empty";
}

function cellIcon(status: PMScheduleCellStatus) {
  if (status === "scheduled") return "●";
  if (status === "completed") return "✓";
  if (status === "issue") return "!";
  if (status === "skipped") return "×";
  return "";
}

function statusLabel(status: Exclude<PMScheduleCellStatus, "empty">) {
  if (status === "scheduled") return "Scheduled";
  if (status === "completed") return "Completed";
  if (status === "issue") return "Issue Found";
  return "Skipped";
}

function freqClass(frequency: PMScheduleFrequency) {
  if (frequency === "Weekly") return "fb-W";
  if (frequency === "Monthly") return "fb-M";
  if (frequency === "Quarterly") return "fb-Q";
  if (frequency === "Bi-Annual") return "fb-B";
  return "fb-A";
}
