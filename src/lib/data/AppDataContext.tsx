"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { initialState } from "@/lib/data/seed";
import { nextSequence, referenceForReport } from "@/lib/sequences";
import {
  deleteRow,
  isSupabaseConfigured,
  loadCmmsStateFromSupabase,
  newId,
  persistAsset,
  persistClient,
  persistCompany,
  persistIndustry,
  persistNamed,
  persistPMSections,
  persistPMSchedule,
  persistProject,
  persistReport,
  persistRole,
  persistSequence,
  persistSite,
  persistTeamMember,
  persistTemplate,
  persistWorkOrder,
  persistWorkOrderStatus
} from "@/lib/supabase/cmms";
import type {
  Asset,
  AssetType,
  ChecklistTask,
  Client,
  CmmsState,
  CompanySettings,
  Id,
  PMSchedule,
  Project,
  Report,
  Role,
  SiteFacility,
  TeamMember,
  WorkOrder,
  WorkOrderKind,
  WorkOrderTemplate
} from "@/lib/types";
import { todayIso, uid } from "@/lib/utils";

const STORAGE_KEY = "syncshield-cmms-state-v1";

type Updater<T> = T | ((current: T) => T);

interface AppDataContextValue {
  state: CmmsState;
  setState: Dispatch<SetStateAction<CmmsState>>;
  updateCompany: (settings: CompanySettings) => void;
  saveRole: (role: Partial<Role> & { name: string }) => Id;
  removeRole: (id: Id) => void;
  saveTeamMember: (member: Partial<TeamMember> & { fullName: string; roleId: Id }) => void;
  removeTeamMember: (id: Id) => void;
  saveClient: (client: Partial<Client> & { name: string }) => Id;
  saveIndustry: (name: string) => void;
  removeClient: (id: Id) => void;
  saveProject: (project: Partial<Project> & { name: string; clientId: Id }) => Id;
  removeProject: (id: Id) => void;
  saveSite: (site: Partial<SiteFacility> & { name: string; projectId: Id }) => void;
  removeSite: (id: Id) => void;
  saveAssetType: (name: string) => Id;
  saveAsset: (asset: Partial<Asset> & { assetName: string; assetTypeId: Id }) => void;
  removeAsset: (id: Id) => void;
  saveDomain: (name: string) => Id;
  saveActivityType: (name: string) => Id;
  saveTaskCategory: (name: string) => void;
  saveTemplate: (template: Partial<WorkOrderTemplate> & { name: string; domainId: Id; activityTypeId: Id }) => void;
  removeTemplate: (id: Id) => void;
  saveWorkOrder: (workOrder: Partial<WorkOrder> & { title: string; kind: WorkOrderKind; domainId: Id; templateId: Id }) => Id;
  updateWorkOrderStatus: (id: Id, status: WorkOrder["status"]) => void;
  removeWorkOrder: (id: Id) => void;
  saveReport: (report: Partial<Report> & { workOrderId: Id; type: Report["type"] }) => Id | null;
  removeReport: (id: Id) => void;
  savePMSchedule: (schedule: Partial<PMSchedule> & { title: string; projectId: Id; assetId: Id }) => void;
  removePMSchedule: (id: Id) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const apply = <T,>(value: Updater<T>, current: T) => (typeof value === "function" ? (value as (arg: T) => T)(current) : value);

function loadState(): CmmsState {
  if (typeof window === "undefined") return initialState;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? { ...initialState, ...JSON.parse(stored) } : initialState;
  } catch {
    return initialState;
  }
}

function cloneTasks(tasks: ChecklistTask[] = []) {
  return tasks.map((task) => ({ ...task, id: uid("task"), result: task.result ?? "Unchecked" }));
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setRawState] = useState<CmmsState>(initialState);

  const makeId = (prefix: string) => (isSupabaseConfigured() ? newId() : uid(prefix));

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!isSupabaseConfigured()) {
        setRawState(loadState());
        return;
      }
      try {
        const remoteState = await loadCmmsStateFromSupabase();
        if (mounted) setRawState(remoteState);
      } catch (error) {
        console.error("Could not load CMMS data from Supabase. Falling back to seed data.", error);
        if (mounted) setRawState(initialState);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured()) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setState: Dispatch<SetStateAction<CmmsState>> = (value) => {
    setRawState((current) => {
      const next = apply(value, current);
      if (isSupabaseConfigured() && next.pmScheduleSections !== current.pmScheduleSections) {
        void persistPMSections(next.pmScheduleSections);
      }
      return next;
    });
  };

  const value = useMemo<AppDataContextValue>(() => {
    const mutate = (fn: (current: CmmsState) => CmmsState, after?: (next: CmmsState, current: CmmsState) => void) =>
      setRawState((current) => {
        const next = fn(current);
        after?.(next, current);
        return next;
      });

    return {
      state,
      setState,
      updateCompany: (settings) => mutate((current) => ({ ...current, company: settings }), (next) => void persistCompany(next.company)),
      saveRole: (role) => {
        const id = role.id ?? makeId("role");
        mutate((current) => ({
          ...current,
          roles: role.id
            ? current.roles.map((item) => (item.id === role.id ? { ...item, ...role, id } : item))
            : [...current.roles, { id, name: role.name, description: role.description ?? "" }]
        }), (next) => {
          const record = next.roles.find((item) => item.id === id);
          if (record) void persistRole(record);
        });
        return id;
      },
      removeRole: (id) =>
        mutate((current) => {
          const fallbackRole = current.roles.find((role) => role.id !== id)?.id ?? makeId("role");
          const roles = current.roles.filter((role) => role.id !== id);
          return {
            ...current,
            roles: roles.length ? roles : [{ id: fallbackRole, name: "Team Member" }],
            teamMembers: current.teamMembers.map((member) => (member.roleId === id ? { ...member, roleId: fallbackRole } : member))
          };
        }, () => {
          void deleteRow("roles", id);
        }),
      saveTeamMember: (member) =>
        mutate((current) => {
          let next = current;
          let employeeId = member.employeeId;
          if (!member.id && !employeeId) {
            const [sequence, withSequence] = nextSequence(current, "employee");
            next = withSequence;
            employeeId = sequence;
          }
          const record: TeamMember = {
            id: member.id ?? makeId("member"),
            employeeId: employeeId ?? "",
            fullName: member.fullName,
            roleId: member.roleId,
            department: member.department ?? "Project Manager",
            phone: member.phone ?? "",
            email: member.email ?? "",
            active: member.active ?? true
          };
          return {
            ...next,
            teamMembers: member.id ? next.teamMembers.map((item) => (item.id === member.id ? record : item)) : [...next.teamMembers, record]
          };
        }, (next) => {
          const record = next.teamMembers.find((item) => item.fullName === member.fullName && item.email === (member.email ?? ""));
          const saved = record ?? next.teamMembers[next.teamMembers.length - 1];
          if (saved) void persistTeamMember(saved);
          void persistSequence("employee", next.sequences.employee ?? 0);
        }),
      removeTeamMember: (id) =>
        mutate((current) => ({
          ...current,
          teamMembers: current.teamMembers.filter((item) => item.id !== id),
          workOrders: current.workOrders.map((wo) => ({ ...wo, assignedMemberIds: wo.assignedMemberIds.filter((memberId) => memberId !== id) })),
          pmSchedules: current.pmSchedules.map((pm) => (pm.assignedMemberId === id ? { ...pm, assignedMemberId: "" } : pm)),
          reports: current.reports.map((report) => (report.preparedByMemberId === id ? { ...report, preparedByMemberId: "" } : report))
        }), () => void deleteRow("team_members", id)),
      saveClient: (client) => {
        const id = client.id ?? makeId("client");
        mutate((current) => {
          let next = current;
          let generatedClientId = client.clientId;
          if (!client.id && !generatedClientId) {
            const [sequence, withSequence] = nextSequence(current, "client");
            next = withSequence;
            generatedClientId = sequence;
          }
          const record: Client = {
            id,
            clientId: generatedClientId ?? "",
            name: client.name,
            industry: client.industry ?? "",
            city: client.city ?? "",
            primaryContactName: client.primaryContactName ?? "",
            primaryContactPhone: client.primaryContactPhone ?? "",
            primaryContactEmail: client.primaryContactEmail ?? "",
            secondaryContactName: client.secondaryContactName ?? "",
            secondaryContactPhone: client.secondaryContactPhone ?? "",
            secondaryContactEmail: client.secondaryContactEmail ?? ""
          };
          return { ...next, clients: client.id ? next.clients.map((item) => (item.id === client.id ? record : item)) : [...next.clients, record] };
        }, (next) => {
          const record = next.clients.find((item) => item.id === id);
          if (record) void persistClient(record);
          void persistSequence("client", next.sequences.client ?? 0);
        });
        return id;
      },
      saveIndustry: (name) => mutate((current) => ({ ...current, industries: Array.from(new Set([...current.industries, name])) }), () => void persistIndustry(name)),
      removeClient: (id) =>
        mutate((current) => ({
          ...current,
          clients: current.clients.filter((client) => client.id !== id),
          projects: current.projects.filter((project) => project.clientId !== id),
          workOrders: current.workOrders.filter((wo) => wo.clientId !== id)
        }), () => void deleteRow("clients", id)),
      saveProject: (project) => {
        const id = project.id ?? makeId("project");
        mutate((current) => {
          const record: Project = {
            id,
            name: project.name,
            clientId: project.clientId,
            contractNumber: project.contractNumber ?? "",
            startDate: project.startDate ?? "",
            endDate: project.endDate ?? "",
            description: project.description ?? ""
          };
          return { ...current, projects: project.id ? current.projects.map((item) => (item.id === project.id ? record : item)) : [...current.projects, record] };
        }, (next) => {
          const record = next.projects.find((item) => item.id === id);
          if (record) void persistProject(record);
        });
        return id;
      },
      removeProject: (id) =>
        mutate((current) => ({
          ...current,
          projects: current.projects.filter((project) => project.id !== id),
          sites: current.sites.filter((site) => site.projectId !== id),
          pmSchedules: current.pmSchedules.filter((pm) => pm.projectId !== id),
          workOrders: current.workOrders.filter((wo) => wo.projectId !== id)
        }), () => void deleteRow("projects", id)),
      saveSite: (site) =>
        mutate((current) => {
          const record: SiteFacility = { id: site.id ?? makeId("site"), name: site.name, projectId: site.projectId, city: site.city ?? "", zone: site.zone ?? "" };
          return { ...current, sites: site.id ? current.sites.map((item) => (item.id === site.id ? record : item)) : [...current.sites, record] };
        }, (next) => {
          const id = site.id ?? next.sites[next.sites.length - 1]?.id;
          const record = next.sites.find((item) => item.id === id);
          if (record) void persistSite(record);
        }),
      removeSite: (id) =>
        mutate((current) => ({ ...current, sites: current.sites.filter((site) => site.id !== id), workOrders: current.workOrders.filter((wo) => wo.siteId !== id) }), () => void deleteRow("sites", id)),
      saveAssetType: (name) => {
        const id = makeId("assetType");
        mutate((current) => ({ ...current, assetTypes: [...current.assetTypes, { id, name }] }), () => void persistNamed("asset_types", { id, name }));
        return id;
      },
      saveAsset: (asset) =>
        mutate((current) => {
          const record: Asset = {
            id: asset.id ?? makeId("asset"),
            assetName: asset.assetName,
            model: asset.model ?? "",
            serialNumber: asset.serialNumber ?? "",
            description: asset.description ?? "",
            manufacturer: asset.manufacturer ?? "",
            assetTypeId: asset.assetTypeId,
            installationDate: asset.installationDate ?? "",
            warrantyPeriodYears: asset.warrantyPeriodYears ?? 1
          };
          return { ...current, assets: asset.id ? current.assets.map((item) => (item.id === asset.id ? record : item)) : [...current.assets, record] };
        }, (next) => {
          const id = asset.id ?? next.assets[next.assets.length - 1]?.id;
          const record = next.assets.find((item) => item.id === id);
          if (record) void persistAsset(record);
        }),
      removeAsset: (id) =>
        mutate((current) => ({
          ...current,
          assets: current.assets.filter((asset) => asset.id !== id),
          pmSchedules: current.pmSchedules.filter((pm) => pm.assetId !== id),
          workOrders: current.workOrders.filter((wo) => wo.assetId !== id)
        }), () => void deleteRow("assets", id)),
      saveDomain: (name) => {
        const id = makeId("domain");
        mutate((current) => ({ ...current, domains: [...current.domains, { id, name }] }), () => void persistNamed("solution_domains", { id, name }));
        return id;
      },
      saveActivityType: (name) => {
        const id = makeId("activity");
        mutate((current) => ({ ...current, activityTypes: [...current.activityTypes, { id, name }] }), () => void persistNamed("activity_types", { id, name }));
        return id;
      },
      saveTaskCategory: (name) => mutate((current) => ({ ...current, taskCategories: Array.from(new Set([...current.taskCategories, name])) }), () => void persistNamed("task_categories", { id: makeId("category"), name })),
      saveTemplate: (template) =>
        mutate((current) => {
          const record: WorkOrderTemplate = {
            id: template.id ?? makeId("template"),
            name: template.name,
            domainId: template.domainId,
            activityTypeId: template.activityTypeId,
            description: template.description ?? "",
            scope: template.scope ?? "",
            tasks: (template.tasks ?? []).map((task) => ({ ...task, id: task.id ?? makeId("task") }))
          };
          return { ...current, templates: template.id ? current.templates.map((item) => (item.id === template.id ? record : item)) : [...current.templates, record] };
        }, (next) => {
          const id = template.id ?? next.templates[next.templates.length - 1]?.id;
          const record = next.templates.find((item) => item.id === id);
          if (record) void persistTemplate(record);
        }),
      removeTemplate: (id) => mutate((current) => ({ ...current, templates: current.templates.filter((template) => template.id !== id) }), () => void deleteRow("work_order_templates", id)),
      saveWorkOrder: (workOrder) => {
        const id = workOrder.id ?? makeId("wo");
        mutate((current) => {
          let next = current;
          let reference = workOrder.reference;
          if (!workOrder.id && !reference) {
            const [sequence, withSequence] = nextSequence(current, "workOrder");
            next = withSequence;
            reference = sequence;
          }
          const template = next.templates.find((item) => item.id === workOrder.templateId);
          const kind = workOrder.kind;
          const record: WorkOrder = {
            id,
            reference: reference ?? "",
            kind,
            title: workOrder.title,
            domainId: workOrder.domainId,
            templateId: workOrder.templateId,
            clientId: workOrder.clientId ?? "",
            projectId: workOrder.projectId ?? "",
            siteId: workOrder.siteId ?? "",
            assetId: workOrder.assetId ?? "",
            priority: workOrder.priority ?? "Medium",
            status: workOrder.status ?? "Scheduled",
            dueDate: workOrder.dueDate ?? todayIso(),
            assignedMemberIds: workOrder.assignedMemberIds ?? [],
            description: workOrder.description ?? "",
            scope: workOrder.scope ?? template?.scope ?? "",
            tasks: workOrder.tasks?.length ? workOrder.tasks.map((task) => ({ ...task, id: task.id ?? makeId("task") })) : cloneTasks(template?.tasks).map((task) => ({ ...task, id: makeId("task") })),
            createdAt: workOrder.createdAt ?? todayIso()
          };
          return { ...next, workOrders: workOrder.id ? next.workOrders.map((item) => (item.id === workOrder.id ? record : item)) : [...next.workOrders, record] };
        }, (next) => {
          const record = next.workOrders.find((item) => item.id === id);
          if (record) void persistWorkOrder(record, next.sequences);
        });
        return id;
      },
      updateWorkOrderStatus: (id, status) =>
        mutate((current) => ({
          ...current,
          workOrders: current.workOrders.map((workOrder) => (workOrder.id === id ? { ...workOrder, status } : workOrder))
        }), () => void persistWorkOrderStatus(id, status)),
      removeWorkOrder: (id) =>
        mutate((current) => ({
          ...current,
          workOrders: current.workOrders.filter((wo) => wo.id !== id),
          pmSchedules: current.pmSchedules.map((pm) => (pm.workOrderId === id ? { ...pm, workOrderId: undefined } : pm)),
          reports: current.reports.filter((report) => report.workOrderId !== id)
        }), () => void deleteRow("work_orders", id)),
      saveReport: (report) => {
        const workOrder = state.workOrders.find((wo) => wo.id === report.workOrderId);
        if (!workOrder) return null;
        const missingRequired = (report.tasks ?? workOrder.tasks).some((task) => task.required && (task.result === "Unchecked" || !task.result));
        if (missingRequired) return null;
        const id = report.id ?? makeId("report");
        mutate((current) => {
          let next = current;
          let reference = report.reference;
          if (!report.id && !reference) {
            const [sequence, withSequence] = referenceForReport(report.type, current);
            next = withSequence;
            reference = sequence;
          }
          const record: Report = {
            id,
            type: report.type,
            reference: reference ?? "",
            workOrderId: report.workOrderId,
            status: report.status ?? "Submitted",
            date: report.date ?? todayIso(),
            preparedByMemberId: report.preparedByMemberId ?? workOrder.assignedMemberIds[0] ?? "",
            findings: report.findings ?? "",
            actionsTaken: report.actionsTaken ?? "",
            recommendations: report.recommendations ?? "",
            systemStatus: report.systemStatus ?? "Optimal",
            tasks: report.tasks ?? cloneTasks(workOrder.tasks).map((task) => ({ ...task, id: makeId("task") })),
            parts: report.parts ?? [],
            clientRepresentative: report.clientRepresentative ?? "",
            companyRepresentative: report.companyRepresentative ?? current.company.companyName
          } as Report;
          return {
            ...next,
            reports: report.id ? next.reports.map((item) => (item.id === report.id ? record : item)) : [...next.reports, record],
            workOrders: next.workOrders.map((wo) => (wo.id === report.workOrderId ? { ...wo, status: "Completed" } : wo))
          };
        }, (next) => {
          const record = next.reports.find((item) => item.id === id);
          if (record) void persistReport(record, report.workOrderId, next.sequences);
        });
        return id;
      },
      removeReport: (id) => mutate((current) => ({ ...current, reports: current.reports.filter((report) => report.id !== id) }), () => void deleteRow("reports", id)),
      savePMSchedule: (schedule) =>
        mutate((current) => {
          const record: PMSchedule = {
            id: schedule.id ?? makeId("pm"),
            title: schedule.title,
            projectId: schedule.projectId,
            assetId: schedule.assetId,
            frequency: schedule.frequency ?? "Quarterly",
            nextDueDate: schedule.nextDueDate ?? todayIso(),
            status: schedule.status ?? "Planned",
            assignedMemberId: schedule.assignedMemberId ?? "",
            workOrderId: schedule.workOrderId
          };
          return { ...current, pmSchedules: schedule.id ? current.pmSchedules.map((item) => (item.id === schedule.id ? record : item)) : [...current.pmSchedules, record] };
        }, (next) => {
          const id = schedule.id ?? next.pmSchedules[next.pmSchedules.length - 1]?.id;
          const record = next.pmSchedules.find((item) => item.id === id);
          if (record) void persistPMSchedule(record);
        }),
      removePMSchedule: (id) => mutate((current) => ({ ...current, pmSchedules: current.pmSchedules.filter((pm) => pm.id !== id) }), () => void deleteRow("pm_schedules", id))
    };
  }, [state, setState]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
