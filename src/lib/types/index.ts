export type Id = string;

export type WorkOrderKind = "CM" | "PM" | "Installation";
export type WorkOrderStatus = "Scheduled" | "In Progress" | "On Hold" | "Completed" | "Cancelled";
export type Priority = "Critical" | "High" | "Medium" | "Low";
export type ReportStatus = "Draft" | "Submitted" | "Approved";
export type ChecklistResult = "Unchecked" | "OK" | "Warning" | "Fail" | "N/A";
export type PMStatus = "Planned" | "Due" | "Completed" | "Overdue" | "Skipped";
export type PMScheduleCellStatus = "empty" | "scheduled" | "completed" | "issue" | "skipped";
export type PMScheduleFrequency = "Weekly" | "Monthly" | "Quarterly" | "Bi-Annual" | "Annual";

export interface CompanySettings {
  companyName: string;
  companyType: string;
  registrationNumber: string;
  taxNumber: string;
  address: string;
  phone: string;
  email: string;
  reportFooter: string;
}

export interface Role {
  id: Id;
  name: string;
  description?: string;
}

export interface TeamMember {
  id: Id;
  employeeId: string;
  fullName: string;
  roleId: Id;
  department: string;
  phone: string;
  email: string;
  active: boolean;
}

export interface Client {
  id: Id;
  clientId: string;
  name: string;
  industry: string;
  city: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  secondaryContactName: string;
  secondaryContactPhone: string;
  secondaryContactEmail: string;
}

export interface Project {
  id: Id;
  name: string;
  clientId: Id;
  contractNumber: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface SiteFacility {
  id: Id;
  name: string;
  projectId: Id;
  city: string;
  zone: string;
}

export interface AssetType {
  id: Id;
  name: string;
}

export interface Asset {
  id: Id;
  assetName: string;
  model: string;
  serialNumber: string;
  description: string;
  manufacturer: string;
  assetTypeId: Id;
  installationDate: string;
  warrantyPeriodYears: 1 | 2 | 3 | 4 | 5;
}

export interface SolutionDomain {
  id: Id;
  name: string;
}

export interface ActivityType {
  id: Id;
  name: string;
}

export interface ChecklistTask {
  id: Id;
  description: string;
  category: string;
  required: boolean;
  result?: ChecklistResult;
}

export interface WorkOrderTemplate {
  id: Id;
  domainId: Id;
  name: string;
  activityTypeId: Id;
  description: string;
  scope: string;
  tasks: ChecklistTask[];
}

export interface WorkOrder {
  id: Id;
  reference: string;
  kind: WorkOrderKind;
  title: string;
  domainId: Id;
  templateId: Id;
  clientId: Id;
  projectId: Id;
  siteId: Id;
  assetId: Id;
  priority: Priority;
  status: WorkOrderStatus;
  dueDate: string;
  assignedMemberIds: Id[];
  description: string;
  scope: string;
  tasks: ChecklistTask[];
  createdAt: string;
}

export interface ReportBase {
  id: Id;
  reference: string;
  workOrderId: Id;
  status: ReportStatus;
  date: string;
  preparedByMemberId: Id;
  findings: string;
  actionsTaken: string;
  recommendations: string;
  systemStatus: "Optimal" | "Restricted" | "Offline";
  tasks: ChecklistTask[];
  parts: { id: Id; name: string; quantity: number; remarks: string }[];
  clientRepresentative: string;
  companyRepresentative: string;
}

export interface CMReport extends ReportBase {
  type: "CM";
}

export interface PMReport extends ReportBase {
  type: "PM";
}

export interface InstallationReport extends ReportBase {
  type: "Installation";
  installedAssetId?: Id;
}

export type Report = CMReport | PMReport | InstallationReport;

export interface PMSchedule {
  id: Id;
  title: string;
  projectId: Id;
  assetId: Id;
  frequency: PMScheduleFrequency | "Biannual";
  nextDueDate: string;
  status: PMStatus;
  assignedMemberId: Id;
  workOrderId?: Id;
}

export interface PMScheduleTask {
  id: Id;
  name: string;
  frequency: PMScheduleFrequency;
  assignedMemberId: Id;
  assetId?: Id;
  cells: Record<string, PMScheduleCellStatus>;
}

export interface PMScheduleSection {
  id: Id;
  title: string;
  clientId: Id;
  projectId: Id;
  tasks: PMScheduleTask[];
}

export interface CmmsState {
  company: CompanySettings;
  roles: Role[];
  teamMembers: TeamMember[];
  industries: string[];
  clients: Client[];
  projects: Project[];
  sites: SiteFacility[];
  assetTypes: AssetType[];
  assets: Asset[];
  domains: SolutionDomain[];
  activityTypes: ActivityType[];
  taskCategories: string[];
  templates: WorkOrderTemplate[];
  workOrders: WorkOrder[];
  reports: Report[];
  pmSchedules: PMSchedule[];
  pmScheduleSections: PMScheduleSection[];
  sequences: Record<string, number>;
}
