"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type {
  Asset,
  ChecklistTask,
  Client,
  CmmsState,
  CompanySettings,
  Id,
  PMSchedule,
  PMScheduleCellStatus,
  PMScheduleSection,
  PMScheduleTask,
  Project,
  Report,
  Role,
  SiteFacility,
  TeamMember,
  WorkOrder,
  WorkOrderKind,
  WorkOrderTemplate
} from "@/lib/types";
import { initialState } from "@/lib/data/seed";

type SupabaseAny = any;

const uuid = () => crypto.randomUUID();

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("your-project-ref") && !key.includes("your-supabase-anon-key"));
}

function client() {
  return createBrowserSupabaseClient() as unknown as SupabaseAny;
}

function toDate(value?: string | null) {
  return value ?? "";
}

function categoryName(categories: Map<Id, string>, id?: Id | null) {
  return id ? categories.get(id) ?? "" : "";
}

function categoryId(categoriesByName: Map<string, Id>, name?: string) {
  return name ? categoriesByName.get(name) ?? null : null;
}

async function table<T>(supabase: SupabaseAny, name: string) {
  const { data, error } = await supabase.from(name).select("*");
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function loadCmmsStateFromSupabase(): Promise<CmmsState> {
  if (!isSupabaseConfigured()) return initialState;
  const supabase = client();

  const [
    companyRows,
    rolesRows,
    teamRows,
    industryRows,
    clientRows,
    projectRows,
    siteRows,
    assetTypeRows,
    assetRows,
    domainRows,
    activityRows,
    categoryRows,
    templateRows,
    templateTaskRows,
    workOrderRows,
    assignmentRows,
    workOrderTaskRows,
    reportRows,
    reportTaskRows,
    reportPartRows,
    pmRows,
    pmSectionRows,
    pmTaskRows,
    pmCellRows,
    sequenceRows
  ] = await Promise.all([
    table<any>(supabase, "company_settings"),
    table<any>(supabase, "roles"),
    table<any>(supabase, "team_members"),
    table<any>(supabase, "industries"),
    table<any>(supabase, "clients"),
    table<any>(supabase, "projects"),
    table<any>(supabase, "sites"),
    table<any>(supabase, "asset_types"),
    table<any>(supabase, "assets"),
    table<any>(supabase, "solution_domains"),
    table<any>(supabase, "activity_types"),
    table<any>(supabase, "task_categories"),
    table<any>(supabase, "work_order_templates"),
    table<any>(supabase, "template_tasks"),
    table<any>(supabase, "work_orders"),
    table<any>(supabase, "work_order_assignments"),
    table<any>(supabase, "work_order_tasks"),
    table<any>(supabase, "reports"),
    table<any>(supabase, "report_tasks"),
    table<any>(supabase, "report_parts"),
    table<any>(supabase, "pm_schedules"),
    table<any>(supabase, "pm_schedule_sections"),
    table<any>(supabase, "pm_schedule_tasks"),
    table<any>(supabase, "pm_schedule_cells"),
    table<any>(supabase, "app_sequences")
  ]);

  const industriesById = new Map<Id, string>(industryRows.map((row) => [row.id, row.name]));
  const categoriesById = new Map<Id, string>(categoryRows.map((row) => [row.id, row.name]));

  const companyRow = companyRows[0];
  const company: CompanySettings = companyRow
    ? {
        companyName: companyRow.company_name ?? "",
        companyType: companyRow.company_type ?? "",
        registrationNumber: companyRow.registration_number ?? "",
        taxNumber: companyRow.tax_number ?? "",
        address: companyRow.address ?? "",
        phone: companyRow.phone ?? "",
        email: companyRow.email ?? "",
        reportFooter: companyRow.report_footer ?? ""
      }
    : initialState.company;

  const roles: Role[] = rolesRows.map((row) => ({ id: row.id, name: row.name, description: row.description ?? "" }));
  const teamMembers: TeamMember[] = teamRows.map((row) => ({
    id: row.id,
    employeeId: row.employee_id ?? "",
    fullName: row.full_name ?? "",
    roleId: row.role_id ?? "",
    department: row.department ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    active: row.active ?? true
  }));
  const clients: Client[] = clientRows.map((row) => ({
    id: row.id,
    clientId: row.client_code ?? "",
    name: row.name ?? "",
    industry: industriesById.get(row.industry_id) ?? "",
    city: row.city ?? "",
    primaryContactName: row.primary_contact_name ?? "",
    primaryContactPhone: row.primary_contact_phone ?? "",
    primaryContactEmail: row.primary_contact_email ?? "",
    secondaryContactName: row.secondary_contact_name ?? "",
    secondaryContactPhone: row.secondary_contact_phone ?? "",
    secondaryContactEmail: row.secondary_contact_email ?? ""
  }));
  const projects: Project[] = projectRows.map((row) => ({
    id: row.id,
    clientId: row.client_id ?? "",
    name: row.name ?? "",
    contractNumber: row.contract_number ?? "",
    startDate: toDate(row.start_date),
    endDate: toDate(row.end_date),
    description: row.description ?? ""
  }));
  const sites: SiteFacility[] = siteRows.map((row) => ({
    id: row.id,
    projectId: row.project_id ?? "",
    name: row.name ?? "",
    city: row.city ?? "",
    zone: row.zone ?? ""
  }));
  const assetTypes = assetTypeRows.map((row) => ({ id: row.id, name: row.name ?? "" }));
  const assets: Asset[] = assetRows.map((row) => ({
    id: row.id,
    assetTypeId: row.asset_type_id ?? "",
    assetName: row.asset_name ?? "",
    model: row.model ?? "",
    serialNumber: row.serial_number ?? "",
    description: row.description ?? "",
    manufacturer: row.manufacturer ?? "",
    installationDate: toDate(row.installation_date),
    warrantyPeriodYears: row.warranty_period_years ?? 1
  }));
  const domains = domainRows.map((row) => ({ id: row.id, name: row.name ?? "" }));
  const activityTypes = activityRows.map((row) => ({ id: row.id, name: row.name ?? "" }));
  const taskCategories = categoryRows.map((row) => row.name as string);

  const templateTasksByTemplate = new Map<Id, ChecklistTask[]>();
  templateTaskRows.forEach((row) => {
    const tasks = templateTasksByTemplate.get(row.template_id) ?? [];
    tasks.push({
      id: row.id,
      description: row.description ?? "",
      category: categoryName(categoriesById, row.category_id),
      required: row.required ?? true
    });
    templateTasksByTemplate.set(row.template_id, tasks.sort((a, b) => a.id.localeCompare(b.id)));
  });
  const templates: WorkOrderTemplate[] = templateRows.map((row) => ({
    id: row.id,
    domainId: row.domain_id ?? "",
    activityTypeId: row.activity_type_id ?? "",
    name: row.name ?? "",
    description: row.description ?? "",
    scope: row.scope ?? "",
    tasks: templateTasksByTemplate.get(row.id) ?? []
  }));

  const assignmentsByWorkOrder = new Map<Id, Id[]>();
  assignmentRows.forEach((row) => {
    assignmentsByWorkOrder.set(row.work_order_id, [...(assignmentsByWorkOrder.get(row.work_order_id) ?? []), row.team_member_id]);
  });
  const tasksByWorkOrder = new Map<Id, ChecklistTask[]>();
  workOrderTaskRows.forEach((row) => {
    tasksByWorkOrder.set(row.work_order_id, [
      ...(tasksByWorkOrder.get(row.work_order_id) ?? []),
      {
        id: row.id,
        description: row.description ?? "",
        category: categoryName(categoriesById, row.category_id),
        required: row.required ?? true,
        result: row.result ?? "Unchecked"
      }
    ]);
  });
  const workOrders: WorkOrder[] = workOrderRows.map((row) => ({
    id: row.id,
    reference: row.reference ?? "",
    kind: row.kind,
    title: row.title ?? "",
    domainId: row.domain_id ?? "",
    templateId: row.template_id ?? "",
    clientId: row.client_id ?? "",
    projectId: row.project_id ?? "",
    siteId: row.site_id ?? "",
    assetId: row.asset_id ?? "",
    priority: row.priority ?? "Medium",
    status: row.status ?? "Scheduled",
    dueDate: toDate(row.due_date),
    assignedMemberIds: assignmentsByWorkOrder.get(row.id) ?? [],
    description: row.description ?? "",
    scope: row.scope ?? "",
    tasks: tasksByWorkOrder.get(row.id) ?? [],
    createdAt: toDate(row.created_at)
  }));

  const reportTasksByReport = new Map<Id, ChecklistTask[]>();
  reportTaskRows.forEach((row) => {
    reportTasksByReport.set(row.report_id, [
      ...(reportTasksByReport.get(row.report_id) ?? []),
      {
        id: row.id,
        description: row.description ?? "",
        category: categoryName(categoriesById, row.category_id),
        required: row.required ?? true,
        result: row.result ?? "Unchecked"
      }
    ]);
  });
  const partsByReport = new Map<Id, Report["parts"]>();
  reportPartRows.forEach((row) => {
    partsByReport.set(row.report_id, [...(partsByReport.get(row.report_id) ?? []), { id: row.id, name: row.name ?? "", quantity: row.quantity ?? 1, remarks: row.remarks ?? "" }]);
  });
  const reports: Report[] = reportRows.map((row) => ({
    id: row.id,
    type: row.type,
    reference: row.reference ?? "",
    workOrderId: row.work_order_id ?? "",
    status: row.status ?? "Submitted",
    date: toDate(row.report_date),
    preparedByMemberId: row.prepared_by_member_id ?? "",
    findings: row.findings ?? "",
    actionsTaken: row.actions_taken ?? "",
    recommendations: row.recommendations ?? "",
    systemStatus: row.system_status ?? "Optimal",
    tasks: reportTasksByReport.get(row.id) ?? [],
    parts: partsByReport.get(row.id) ?? [],
    clientRepresentative: row.client_representative ?? "",
    companyRepresentative: row.company_representative ?? "",
    installedAssetId: row.installed_asset_id ?? undefined
  })) as Report[];

  const pmSchedules: PMSchedule[] = pmRows.map((row) => ({
    id: row.id,
    title: row.title ?? "",
    projectId: row.project_id ?? "",
    assetId: row.asset_id ?? "",
    frequency: row.frequency ?? "Quarterly",
    nextDueDate: toDate(row.next_due_date),
    status: row.status ?? "Planned",
    assignedMemberId: row.assigned_member_id ?? "",
    workOrderId: row.work_order_id ?? undefined
  }));
  const cellsByTask = new Map<Id, Record<string, PMScheduleCellStatus>>();
  pmCellRows.forEach((row) => {
    const cells = cellsByTask.get(row.task_id) ?? {};
    cells[`${row.cell_year}_${Number(row.cell_month) - 1}`] = row.status ?? "empty";
    cellsByTask.set(row.task_id, cells);
  });
  const pmTasksBySection = new Map<Id, PMScheduleTask[]>();
  pmTaskRows.forEach((row) => {
    pmTasksBySection.set(row.section_id, [
      ...(pmTasksBySection.get(row.section_id) ?? []),
      {
        id: row.id,
        name: row.name ?? "",
        frequency: row.frequency ?? "Monthly",
        assignedMemberId: row.assigned_member_id ?? "",
        assetId: row.asset_id ?? undefined,
        cells: cellsByTask.get(row.id) ?? {}
      }
    ]);
  });
  const pmScheduleSections: PMScheduleSection[] = pmSectionRows.map((row) => ({
    id: row.id,
    title: row.title ?? "",
    clientId: row.client_id ?? "",
    projectId: row.project_id ?? "",
    tasks: pmTasksBySection.get(row.id) ?? []
  }));

  const sequences = sequenceRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.sequence_key] = row.current_value ?? 0;
    return acc;
  }, {});

  return {
    company,
    roles,
    teamMembers,
    industries: industryRows.map((row) => row.name),
    clients,
    projects,
    sites,
    assetTypes,
    assets,
    domains,
    activityTypes,
    taskCategories,
    templates,
    workOrders,
    reports,
    pmSchedules,
    pmScheduleSections,
    sequences
  };
}

async function upsertSequence(supabase: SupabaseAny, key: string, value: number) {
  const prefixes: Record<string, string> = { employee: "EMP", client: "CL", workOrder: "WO", report: "RPT" };
  await supabase
    .from("app_sequences")
    .upsert({ sequence_key: key, prefix: prefixes[key] ?? key.toUpperCase(), current_value: value, year: new Date().getFullYear(), updated_at: new Date().toISOString() }, { onConflict: "sequence_key" });
}

export async function persistSequence(key: string, value: number) {
  if (!isSupabaseConfigured()) return;
  await upsertSequence(client(), key, value);
}

export async function persistCompany(settings: CompanySettings) {
  if (!isSupabaseConfigured()) return;
  const supabase = client();
  const row = {
    company_name: settings.companyName,
    company_type: settings.companyType,
    registration_number: settings.registrationNumber,
    tax_number: settings.taxNumber,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    report_footer: settings.reportFooter,
    updated_at: new Date().toISOString()
  };
  const { data } = await supabase.from("company_settings").select("id").limit(1).maybeSingle();
  if (data?.id) await supabase.from("company_settings").update(row).eq("id", data.id);
  else await supabase.from("company_settings").insert(row);
}

export async function persistRole(role: Role) {
  if (!isSupabaseConfigured()) return;
  await client().from("roles").upsert({ id: role.id, name: role.name, description: role.description ?? "", updated_at: new Date().toISOString() });
}

export async function deleteRow(tableName: string, id: Id) {
  if (!isSupabaseConfigured()) return;
  await client().from(tableName).delete().eq("id", id);
}

export async function persistTeamMember(member: TeamMember) {
  if (!isSupabaseConfigured()) return;
  await client().from("team_members").upsert({
    id: member.id,
    employee_id: member.employeeId,
    full_name: member.fullName,
    role_id: member.roleId,
    department: member.department,
    phone: member.phone,
    email: member.email,
    active: member.active,
    updated_at: new Date().toISOString()
  });
}

export async function persistIndustry(name: string) {
  if (!isSupabaseConfigured()) return;
  await client().from("industries").upsert({ name }, { onConflict: "name" });
}

async function ensureIndustryId(supabase: SupabaseAny, name: string) {
  if (!name) return null;
  const { data: existing } = await supabase.from("industries").select("id").eq("name", name).maybeSingle();
  if (existing?.id) return existing.id as Id;
  const { data } = await supabase.from("industries").insert({ name }).select("id").single();
  return data?.id ?? null;
}

async function ensureCategoryId(supabase: SupabaseAny, name: string) {
  if (!name) return null;
  const { data: existing } = await supabase.from("task_categories").select("id").eq("name", name).maybeSingle();
  if (existing?.id) return existing.id as Id;
  const { data } = await supabase.from("task_categories").insert({ name }).select("id").single();
  return data?.id ?? null;
}

export async function persistClient(record: Client) {
  if (!isSupabaseConfigured()) return;
  const supabase = client();
  const industryId = await ensureIndustryId(supabase, record.industry);
  await supabase.from("clients").upsert({
    id: record.id,
    client_code: record.clientId,
    name: record.name,
    industry_id: industryId,
    city: record.city,
    primary_contact_name: record.primaryContactName,
    primary_contact_phone: record.primaryContactPhone,
    primary_contact_email: record.primaryContactEmail,
    secondary_contact_name: record.secondaryContactName,
    secondary_contact_phone: record.secondaryContactPhone,
    secondary_contact_email: record.secondaryContactEmail,
    updated_at: new Date().toISOString()
  });
}

export async function persistProject(project: Project) {
  if (!isSupabaseConfigured()) return;
  await client().from("projects").upsert({
    id: project.id,
    client_id: project.clientId,
    name: project.name,
    contract_number: project.contractNumber,
    start_date: project.startDate || null,
    end_date: project.endDate || null,
    description: project.description,
    updated_at: new Date().toISOString()
  });
}

export async function persistSite(site: SiteFacility) {
  if (!isSupabaseConfigured()) return;
  await client().from("sites").upsert({ id: site.id, project_id: site.projectId, name: site.name, city: site.city, zone: site.zone, updated_at: new Date().toISOString() });
}

export async function persistNamed(tableName: string, record: { id: Id; name: string }) {
  if (!isSupabaseConfigured()) return;
  await client().from(tableName).upsert({ id: record.id, name: record.name });
}

export async function persistAsset(asset: Asset) {
  if (!isSupabaseConfigured()) return;
  await client().from("assets").upsert({
    id: asset.id,
    asset_type_id: asset.assetTypeId,
    asset_name: asset.assetName,
    model: asset.model,
    serial_number: asset.serialNumber,
    description: asset.description,
    manufacturer: asset.manufacturer,
    installation_date: asset.installationDate || null,
    warranty_period_years: asset.warrantyPeriodYears,
    updated_at: new Date().toISOString()
  });
}

export async function persistTemplate(template: WorkOrderTemplate) {
  if (!isSupabaseConfigured()) return;
  const supabase = client();
  await supabase.from("work_order_templates").upsert({
    id: template.id,
    domain_id: template.domainId,
    activity_type_id: template.activityTypeId,
    name: template.name,
    description: template.description,
    scope: template.scope,
    updated_at: new Date().toISOString()
  });
  await supabase.from("template_tasks").delete().eq("template_id", template.id);
  for (const [index, task] of template.tasks.entries()) {
    const catId = await ensureCategoryId(supabase, task.category);
    await supabase.from("template_tasks").insert({
      id: task.id,
      template_id: template.id,
      category_id: catId,
      description: task.description,
      required: task.required,
      sort_order: index
    });
  }
}

export async function persistWorkOrder(workOrder: WorkOrder, sequences: Record<string, number>) {
  if (!isSupabaseConfigured()) return;
  const supabase = client();
  await supabase.from("work_orders").upsert({
    id: workOrder.id,
    reference: workOrder.reference,
    kind: workOrder.kind,
    title: workOrder.title,
    domain_id: workOrder.domainId,
    template_id: workOrder.templateId,
    client_id: workOrder.clientId,
    project_id: workOrder.projectId,
    site_id: workOrder.siteId || null,
    asset_id: workOrder.assetId || null,
    priority: workOrder.priority,
    status: workOrder.status,
    due_date: workOrder.dueDate,
    description: workOrder.description,
    scope: workOrder.scope,
    updated_at: new Date().toISOString()
  });
  await supabase.from("work_order_assignments").delete().eq("work_order_id", workOrder.id);
  for (const memberId of workOrder.assignedMemberIds) {
    await supabase.from("work_order_assignments").insert({ work_order_id: workOrder.id, team_member_id: memberId });
  }
  await supabase.from("work_order_tasks").delete().eq("work_order_id", workOrder.id);
  for (const [index, task] of workOrder.tasks.entries()) {
    await supabase.from("work_order_tasks").insert({
      id: task.id,
      work_order_id: workOrder.id,
      category_id: await ensureCategoryId(supabase, task.category),
      description: task.description,
      required: task.required,
      result: task.result ?? "Unchecked",
      sort_order: index
    });
  }
  await upsertSequence(supabase, "workOrder", sequences.workOrder ?? 0);
}

export async function persistWorkOrderStatus(id: Id, status: WorkOrder["status"]) {
  if (!isSupabaseConfigured()) return;
  await client().from("work_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function persistReport(report: Report, workOrderId: Id, sequences: Record<string, number>) {
  if (!isSupabaseConfigured()) return;
  const supabase = client();
  await supabase.from("reports").upsert({
    id: report.id,
    reference: report.reference,
    type: report.type,
    work_order_id: report.workOrderId,
    status: report.status,
    report_date: report.date,
    prepared_by_member_id: report.preparedByMemberId || null,
    findings: report.findings,
    actions_taken: report.actionsTaken,
    recommendations: report.recommendations,
    system_status: report.systemStatus,
    client_representative: report.clientRepresentative,
    company_representative: report.companyRepresentative,
    installed_asset_id: report.type === "Installation" ? report.installedAssetId ?? null : null,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  await supabase.from("report_tasks").delete().eq("report_id", report.id);
  for (const [index, task] of report.tasks.entries()) {
    await supabase.from("report_tasks").insert({
      id: task.id,
      report_id: report.id,
      category_id: await ensureCategoryId(supabase, task.category),
      description: task.description,
      required: task.required,
      result: task.result ?? "Unchecked",
      sort_order: index
    });
  }
  await supabase.from("report_parts").delete().eq("report_id", report.id);
  for (const part of report.parts) {
    await supabase.from("report_parts").insert({ id: part.id || uuid(), report_id: report.id, name: part.name, quantity: part.quantity, remarks: part.remarks });
  }
  await supabase.from("work_orders").update({ status: "Completed", updated_at: new Date().toISOString() }).eq("id", workOrderId);
  await upsertSequence(supabase, "report", sequences.report ?? 0);
}

export async function persistPMSchedule(schedule: PMSchedule) {
  if (!isSupabaseConfigured()) return;
  await client().from("pm_schedules").upsert({
    id: schedule.id,
    title: schedule.title,
    project_id: schedule.projectId,
    asset_id: schedule.assetId,
    frequency: schedule.frequency === "Biannual" ? "Bi-Annual" : schedule.frequency,
    next_due_date: schedule.nextDueDate,
    status: schedule.status,
    assigned_member_id: schedule.assignedMemberId || null,
    work_order_id: schedule.workOrderId ?? null,
    updated_at: new Date().toISOString()
  });
}

export async function persistPMSections(sections: PMScheduleSection[]) {
  if (!isSupabaseConfigured()) return;
  const supabase = client();
  for (const [sectionIndex, section] of sections.entries()) {
    await supabase.from("pm_schedule_sections").upsert({
      id: section.id,
      client_id: section.clientId,
      project_id: section.projectId,
      title: section.title,
      sort_order: sectionIndex,
      updated_at: new Date().toISOString()
    });
    for (const [taskIndex, task] of section.tasks.entries()) {
      await supabase.from("pm_schedule_tasks").upsert({
        id: task.id,
        section_id: section.id,
        asset_id: task.assetId ?? null,
        assigned_member_id: task.assignedMemberId || null,
        name: task.name,
        frequency: task.frequency,
        sort_order: taskIndex,
        updated_at: new Date().toISOString()
      });
      for (const [key, status] of Object.entries(task.cells)) {
        const [year, zeroBasedMonth] = key.split("_").map(Number);
        if (!year || Number.isNaN(zeroBasedMonth)) continue;
        await supabase.from("pm_schedule_cells").upsert(
          {
            task_id: task.id,
            cell_year: year,
            cell_month: zeroBasedMonth + 1,
            status,
            updated_at: new Date().toISOString()
          },
          { onConflict: "task_id,cell_year,cell_month" }
        );
      }
    }
  }
}

export function newId() {
  return isSupabaseConfigured() ? uuid() : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
