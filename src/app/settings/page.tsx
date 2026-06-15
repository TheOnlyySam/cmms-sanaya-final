"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { SelectField, TextAreaField, TextField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { PageShell } from "@/components/layout/PageShell";
import { useAppData } from "@/lib/data/AppDataContext";
import { iraqiCities } from "@/lib/data/iraqiCities";
import { sendTeamMemberInvitation } from "@/lib/invitations";
import { useToast } from "@/components/ui/ToastProvider";
import type { Asset, ChecklistTask, Client, Id, Project, SiteFacility, TeamMember, WorkOrderTemplate } from "@/lib/types";
import { optionName, uid } from "@/lib/utils";

type Panel = "dashboard" | "company" | "team" | "projects" | "sites" | "assets" | "templates";

export default function SettingsPage() {
  const [panel, setPanel] = useState<Panel>("dashboard");
  const nav = [
    ["Core", [["dashboard", "Main Dashboard"], ["company", "Company"], ["team", "Team Members"]]],
    ["Field Data", [["projects", "Projects & Clients"], ["sites", "Sites & Facilities"], ["assets", "Equipment and Project Assets"]]],
    ["Work Orders", [["templates", "WO Templates"]]]
  ] as const;

  return (
    <PageShell title="Settings" subtitle="Configure company, people, clients, projects, sites, assets, and reusable work order templates.">
      <div className="split-layout">
        <aside className="side-nav">
          {nav.map(([section, items]) => (
            <div key={section}>
              <div className="side-section">{section}</div>
              {items.map(([id, label]) => (
                <button className={`side-item ${panel === id ? "active" : ""}`} key={id} onClick={() => setPanel(id)}>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <section className="settings-content">
          {panel === "dashboard" ? <SettingsDashboard /> : null}
          {panel === "company" ? <CompanySettings /> : null}
          {panel === "team" ? <TeamSettings /> : null}
          {panel === "projects" ? <ProjectsClientsSettings /> : null}
          {panel === "sites" ? <SitesSettings /> : null}
          {panel === "assets" ? <AssetsSettings /> : null}
          {panel === "templates" ? <TemplateSettings /> : null}
        </section>
      </div>
    </PageShell>
  );
}

function SettingsDashboard() {
  const { state, saveRole, removeRole } = useAppData();
  const toast = useToast();
  const [roleName, setRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<Id | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");
  return (
    <>
      <div className="grid-4">
        <Card className="kpi"><div className="kpi-label">Roles</div><div className="kpi-value">{state.roles.length}</div><div className="kpi-sub">Connected to Team Members</div></Card>
        <Card className="kpi"><div className="kpi-label">Clients</div><div className="kpi-value">{state.clients.length}</div><div className="kpi-sub">Beneficiaries and contacts</div></Card>
        <Card className="kpi"><div className="kpi-label">Projects</div><div className="kpi-value">{state.projects.length}</div><div className="kpi-sub">Contracts and scopes</div></Card>
        <Card className="kpi"><div className="kpi-label">WO Templates</div><div className="kpi-value">{state.templates.length}</div><div className="kpi-sub">Reusable checklists</div></Card>
      </div>
      <Card title="Roles" style={{ marginTop: 14 }}>
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <input className="filter-input" placeholder="Add role, e.g. Project Manager" value={roleName} onChange={(event) => setRoleName(event.target.value)} />
          <Button variant="teal" onClick={() => { if (roleName.trim()) { saveRole({ name: roleName.trim() }); setRoleName(""); toast.success("Role created."); } else toast.error("Role name is required."); }}>Add Role</Button>
        </div>
        <DataTable
          data={state.roles}
          columns={[
            { header: "Role", render: (role) => editingRoleId === role.id ? <input className="filter-input" value={editingRoleName} onChange={(event) => setEditingRoleName(event.target.value)} /> : role.name },
            { header: "Team Members", render: (role) => state.teamMembers.filter((member) => member.roleId === role.id).length },
            { header: "Actions", render: (role) => <div className="table-actions">{editingRoleId === role.id ? <><Button size="sm" variant="teal" onClick={() => { if (!editingRoleName.trim()) { toast.error("Role name cannot be empty."); return; } saveRole({ ...role, name: editingRoleName.trim() }); setEditingRoleId(null); toast.success("Role updated across team member dropdowns."); }}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditingRoleId(null)}>Cancel</Button></> : <><Button size="sm" variant="outline" onClick={() => { setEditingRoleId(role.id); setEditingRoleName(role.name); }}>Edit</Button><Button size="sm" variant="danger" onClick={() => { removeRole(role.id); toast.success("Role removed and team members synced."); }}>Remove</Button></>}</div> }
          ]}
        />
      </Card>
      <Card title="Clients Quick View" style={{ marginTop: 14 }}>
        <DataTable data={state.clients} columns={[{ header: "Client ID", render: (c) => c.clientId }, { header: "Client", render: (c) => c.name }, { header: "City", render: (c) => c.city }, { header: "Primary Contact", render: (c) => c.primaryContactName || "Not set" }]} />
      </Card>
      <Card title="Projects Quick View">
        <DataTable data={state.projects} columns={[{ header: "Project / Contract", render: (p) => p.name }, { header: "Client", render: (p) => optionName(state.clients, p.clientId) }, { header: "Contract", render: (p) => p.contractNumber || "Not set" }]} />
      </Card>
      <Card title="Assets Table">
        <DataTable data={state.assets} columns={[{ header: "Asset Name", render: (a) => a.assetName }, { header: "Serial Number", render: (a) => a.serialNumber }, { header: "Asset Type", render: (a) => optionName(state.assetTypes, a.assetTypeId) }]} />
      </Card>
    </>
  );
}

function CompanySettings() {
  const { state, updateCompany } = useAppData();
  const toast = useToast();
  const [draft, setDraft] = useState(state.company);
  return (
    <form onSubmit={(event) => { event.preventDefault(); try { if (!draft.companyName.trim()) throw new Error("Company name is required."); updateCompany(draft); toast.success("Company settings saved."); } catch (error) { toast.error(error instanceof Error ? error.message : "Company settings could not be saved."); } }}>
      <Card title="Company Registration Details" action={<Button variant="teal" type="submit">Save Settings</Button>}>
        <div className="grid-2">
          <TextField label="Company Name" required value={draft.companyName} onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} />
          <TextField label="Company Type" placeholder="Facilities provider, hospital, manufacturer..." value={draft.companyType} onChange={(event) => setDraft({ ...draft, companyType: event.target.value })} />
          <TextField label="Phone" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
          <TextField label="Email" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
          <TextAreaField label="Company Address" value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
          <TextAreaField label="Report Footer" value={draft.reportFooter} onChange={(event) => setDraft({ ...draft, reportFooter: event.target.value })} />
        </div>
      </Card>
    </form>
  );
}

function TeamSettings() {
  const { state, saveTeamMember, removeTeamMember, saveRole } = useAppData();
  const toast = useToast();
  const [draft, setDraft] = useState<Partial<TeamMember> | null>(null);
  const [removeId, setRemoveId] = useState<Id | null>(null);
  const [roleName, setRoleName] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft?.fullName || !draft.roleId) {
      toast.error("Full name and role are required.");
      return;
    }
    if (!draft.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      toast.error("A valid email is required to invite a team member.");
      return;
    }
    const invitation = await sendTeamMemberInvitation(draft.email, draft);
    if (!invitation.ok) {
      toast.error(invitation.message);
      return;
    }
    saveTeamMember(draft as Partial<TeamMember> & { fullName: string; roleId: Id });
    setDraft(null);
    toast.success(invitation.message);
  }
  return (
    <>
      <Card title="Team Members" action={<Button variant="teal" onClick={() => setDraft({ fullName: "", roleId: state.roles[0]?.id, department: "Project Manager", active: true })}>Add Team Member</Button>}>
        <DataTable
          data={state.teamMembers}
          columns={[
            { header: "Employee ID", render: (member) => member.employeeId },
            { header: "Full Name", render: (member) => member.fullName },
            { header: "Role", render: (member) => optionName(state.roles, member.roleId) },
            { header: "Department", render: (member) => member.department },
            { header: "Actions", render: (member) => <div className="table-actions"><Button size="sm" variant="outline" onClick={() => setDraft(member)}>Edit</Button><Button size="sm" variant="danger" onClick={() => setRemoveId(member.id)}>Remove</Button></div> }
          ]}
        />
      </Card>
      <Modal open={Boolean(draft)} title={draft?.id ? "Edit Team Member" : "Add Team Member"} onClose={() => setDraft(null)} footer={<><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button form="team-form" type="submit" variant="teal">Save</Button></>}>
        {draft ? <form id="team-form" onSubmit={submit}><div className="grid-2">
          <TextField label="Full Name" required placeholder="John Doe" value={draft.fullName ?? ""} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} />
          <TextField label="Employee ID" value={draft.employeeId ?? "Auto-generated on save"} readOnly />
          <SelectField label="Role" required value={draft.roleId ?? ""} onChange={(event) => setDraft({ ...draft, roleId: event.target.value })}>{state.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</SelectField>
          <div className="field"><span>Add New Role</span><div className="inline-row"><input placeholder="Role name" value={roleName} onChange={(event) => setRoleName(event.target.value)} /><Button type="button" variant="outline" onClick={() => { if (roleName.trim()) { const id = saveRole({ name: roleName.trim() }); setDraft({ ...draft, roleId: id }); setRoleName(""); } }}>Add</Button></div></div>
          <TextField label="Department / Speciality" placeholder="Project Manager" value={draft.department ?? ""} onChange={(event) => setDraft({ ...draft, department: event.target.value })} />
          <TextField label="Phone" value={draft.phone ?? ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
          <TextField label="Email" type="email" required value={draft.email ?? ""} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
        </div></form> : null}
      </Modal>
      <ConfirmDialog open={Boolean(removeId)} title="Remove employee?" message="This employee will be removed from team records and all assigned work order/report dropdowns will sync automatically." onCancel={() => setRemoveId(null)} onConfirm={() => { if (removeId) { removeTeamMember(removeId); toast.success("Employee removed and related dropdowns synced."); } setRemoveId(null); }} />
    </>
  );
}

function ProjectsClientsSettings() {
  const { state, saveClient, removeClient, saveProject, removeProject, saveIndustry } = useAppData();
  const toast = useToast();
  const [tab, setTab] = useState<"clients" | "projects">("clients");
  const [client, setClient] = useState<Partial<Client> | null>(null);
  const [project, setProject] = useState<Partial<Project> | null>(null);
  const [industry, setIndustry] = useState("");
  return (
    <>
      <Card>
        <div className="tabs"><button className={`tab-button ${tab === "clients" ? "active" : ""}`} onClick={() => setTab("clients")}>Clients</button><button className={`tab-button ${tab === "projects" ? "active" : ""}`} onClick={() => setTab("projects")}>Projects</button></div>
      </Card>
      {tab === "clients" ? (
        <Card title="Clients" action={<Button variant="teal" onClick={() => setClient({ name: "", industry: state.industries[0] ?? "" })}>Add Client</Button>} style={{ marginTop: 14 }}>
          <DataTable data={state.clients} columns={[{ header: "Client ID", render: (c) => c.clientId }, { header: "Client", render: (c) => c.name }, { header: "Industry / Sector", render: (c) => c.industry }, { header: "Primary Contact", render: (c) => c.primaryContactName }, { header: "Secondary Contact", render: (c) => c.secondaryContactName || "Not set" }, { header: "Actions", render: (c) => <div className="table-actions"><Button size="sm" variant="outline" onClick={() => setClient(c)}>Edit</Button><Button size="sm" variant="danger" onClick={() => removeClient(c.id)}>Remove</Button></div> }]} />
        </Card>
      ) : (
        <Card title="Projects & Contracts" action={<Button variant="teal" onClick={() => setProject({ name: "", clientId: state.clients[0]?.id ?? "" })}>Add Project</Button>} style={{ marginTop: 14 }}>
          <DataTable data={state.projects} columns={[{ header: "Project / Contract", render: (p) => p.name }, { header: "Client", render: (p) => optionName(state.clients, p.clientId) }, { header: "Contract Number", render: (p) => p.contractNumber }, { header: "Dates", render: (p) => `${p.startDate || "Not set"} → ${p.endDate || "Not set"}` }, { header: "Actions", render: (p) => <div className="table-actions"><Button size="sm" variant="outline" onClick={() => setProject(p)}>Edit</Button><Button size="sm" variant="danger" onClick={() => removeProject(p.id)}>Remove</Button></div> }]} />
        </Card>
      )}
      <Modal open={Boolean(client)} title={client?.id ? "Edit Client" : "Add Client"} onClose={() => setClient(null)} footer={<><Button variant="outline" onClick={() => setClient(null)}>Cancel</Button><Button form="client-form" type="submit" variant="teal">Save</Button></>} wide>
        {client ? <form id="client-form" onSubmit={(event) => { event.preventDefault(); if (!client.name || !client.primaryContactName || !client.primaryContactPhone || !client.primaryContactEmail) { toast.error("Client name and primary contact name, phone, and email are required."); return; } if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.primaryContactEmail)) { toast.error("Primary contact email must be valid."); return; } saveClient(client as Partial<Client> & { name: string }); setClient(null); toast.success("Client saved."); }}>
          <div className="grid-3">
            <TextField label="Client ID" value={client.clientId ?? "Auto-generated on save"} readOnly />
            <TextField label="Client Name" required placeholder="Client organization name" value={client.name ?? ""} onChange={(event) => setClient({ ...client, name: event.target.value })} />
            <SelectField label="Industry / Sector" value={client.industry ?? ""} onChange={(event) => setClient({ ...client, industry: event.target.value })}>{state.industries.map((item) => <option key={item}>{item}</option>)}</SelectField>
            <div className="field"><span>Add Industry / Sector</span><div className="inline-row"><input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="New sector" /><Button type="button" variant="outline" onClick={() => { if (industry.trim()) { saveIndustry(industry.trim()); setClient({ ...client, industry: industry.trim() }); setIndustry(""); } }}>Add</Button></div></div>
            <SelectField label="City / Region" value={client.city ?? ""} onChange={(event) => setClient({ ...client, city: event.target.value })}><option value="">Select city</option>{iraqiCities.map((city) => <option key={city}>{city}</option>)}</SelectField>
            <TextField label="Primary Contact Name" required value={client.primaryContactName ?? ""} onChange={(event) => setClient({ ...client, primaryContactName: event.target.value })} />
            <TextField label="Primary Phone" required value={client.primaryContactPhone ?? ""} onChange={(event) => setClient({ ...client, primaryContactPhone: event.target.value })} />
            <TextField label="Primary Email" required type="email" value={client.primaryContactEmail ?? ""} onChange={(event) => setClient({ ...client, primaryContactEmail: event.target.value })} />
            <TextField label="Secondary Contact Name" value={client.secondaryContactName ?? ""} onChange={(event) => setClient({ ...client, secondaryContactName: event.target.value })} />
            <TextField label="Secondary Phone" value={client.secondaryContactPhone ?? ""} onChange={(event) => setClient({ ...client, secondaryContactPhone: event.target.value })} />
            <TextField label="Secondary Email" type="email" value={client.secondaryContactEmail ?? ""} onChange={(event) => setClient({ ...client, secondaryContactEmail: event.target.value })} />
          </div>
        </form> : null}
      </Modal>
      <Modal open={Boolean(project)} title={project?.id ? "Edit Project" : "Add Project"} onClose={() => setProject(null)} footer={<><Button variant="outline" onClick={() => setProject(null)}>Cancel</Button><Button form="project-form" type="submit" variant="teal">Save</Button></>}>
        {project ? <form id="project-form" onSubmit={(event) => { event.preventDefault(); if (project.name && project.clientId) { saveProject(project as Partial<Project> & { name: string; clientId: Id }); toast.success("Project saved."); } else toast.error("Project name and client are required."); setProject(null); }}><div className="grid-2">
          <TextField label="Project / Contract Name" required placeholder="Project or contract name" value={project.name ?? ""} onChange={(event) => setProject({ ...project, name: event.target.value })} />
          <SelectField label="Client" required value={project.clientId ?? ""} onChange={(event) => setProject({ ...project, clientId: event.target.value })}>{state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField>
          <TextField label="Contract Number" placeholder="Contract number" value={project.contractNumber ?? ""} onChange={(event) => setProject({ ...project, contractNumber: event.target.value })} />
          <TextField label="Start Date" type="date" value={project.startDate ?? ""} onChange={(event) => setProject({ ...project, startDate: event.target.value })} />
          <TextField label="End Date" type="date" value={project.endDate ?? ""} onChange={(event) => setProject({ ...project, endDate: event.target.value })} />
          <TextAreaField label="Project Description" value={project.description ?? ""} onChange={(event) => setProject({ ...project, description: event.target.value })} />
        </div></form> : null}
      </Modal>
    </>
  );
}

function SitesSettings() {
  const { state, saveSite, removeSite } = useAppData();
  const toast = useToast();
  const [draft, setDraft] = useState<Partial<SiteFacility> | null>(null);
  return <CrudCard title="Sites & Facilities" button="Add Site / Facility" onAdd={() => setDraft({ name: "", projectId: state.projects[0]?.id ?? "" })}>
    <DataTable data={state.sites} columns={[{ header: "Site / Facility", render: (s) => s.name }, { header: "Assigned Project", render: (s) => optionName(state.projects, s.projectId) }, { header: "City / Region", render: (s) => s.city }, { header: "Zone / Area", render: (s) => s.zone }, { header: "Actions", render: (s) => <div className="table-actions"><Button size="sm" variant="outline" onClick={() => setDraft(s)}>Edit</Button><Button size="sm" variant="danger" onClick={() => removeSite(s.id)}>Remove</Button></div> }]} />
    <Modal open={Boolean(draft)} title="Site / Facility" onClose={() => setDraft(null)} footer={<><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button form="site-form" type="submit" variant="teal">Save</Button></>}>{draft ? <form id="site-form" onSubmit={(event) => { event.preventDefault(); if (!draft.name || !draft.projectId || !draft.city) { toast.error("Site name, project, and city are required."); return; } saveSite(draft as Partial<SiteFacility> & { name: string; projectId: Id }); setDraft(null); toast.success("Site / Facility saved."); }}><div className="grid-2"><TextField label="Site Full Name" required placeholder="Facility name" value={draft.name ?? ""} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><SelectField label="Assigned Project" required value={draft.projectId ?? ""} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}>{state.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField><SelectField label="Location / City" required value={draft.city ?? ""} onChange={(event) => setDraft({ ...draft, city: event.target.value })}><option value="">Select city</option>{iraqiCities.map((city) => <option key={city}>{city}</option>)}</SelectField><TextField label="Zone / Area" placeholder="Zone / Area" value={draft.zone ?? ""} onChange={(event) => setDraft({ ...draft, zone: event.target.value })} /></div></form> : null}</Modal>
  </CrudCard>;
}

function AssetsSettings() {
  const { state, saveAsset, removeAsset, saveAssetType } = useAppData();
  const [draft, setDraft] = useState<Partial<Asset> | null>(null);
  const [typeName, setTypeName] = useState("");
  return <CrudCard title="Equipment and Project Assets" button="Add Asset" onAdd={() => setDraft({ assetName: "", assetTypeId: state.assetTypes[0]?.id ?? "", warrantyPeriodYears: 1 })}>
    <DataTable data={state.assets} columns={[{ header: "Asset Name", render: (a) => a.assetName }, { header: "Model", render: (a) => a.model }, { header: "Serial Number", render: (a) => a.serialNumber }, { header: "Manufacturer", render: (a) => a.manufacturer }, { header: "Asset Type", render: (a) => optionName(state.assetTypes, a.assetTypeId) }, { header: "Actions", render: (a) => <div className="table-actions"><Button size="sm" variant="outline" onClick={() => setDraft(a)}>Edit</Button><Button size="sm" variant="danger" onClick={() => removeAsset(a.id)}>Remove</Button></div> }]} />
    <Modal open={Boolean(draft)} title="Asset" onClose={() => setDraft(null)} footer={<><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button form="asset-form" type="submit" variant="teal">Save</Button></>} wide>{draft ? <form id="asset-form" onSubmit={(event) => { event.preventDefault(); if (draft.assetName && draft.assetTypeId) saveAsset(draft as Partial<Asset> & { assetName: string; assetTypeId: Id }); setDraft(null); }}><div className="grid-3">
      <TextField label="Asset Name" required value={draft.assetName ?? ""} onChange={(event) => setDraft({ ...draft, assetName: event.target.value })} />
      <TextField label="Model" value={draft.model ?? ""} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
      <TextField label="Serial Number" value={draft.serialNumber ?? ""} onChange={(event) => setDraft({ ...draft, serialNumber: event.target.value })} />
      <TextAreaField label="Description" value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
      <TextField label="Manufacturer" value={draft.manufacturer ?? ""} onChange={(event) => setDraft({ ...draft, manufacturer: event.target.value })} />
      <SelectField label="Asset Type" value={draft.assetTypeId ?? ""} onChange={(event) => setDraft({ ...draft, assetTypeId: event.target.value })}>{state.assetTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</SelectField>
      <div className="field"><span>Add Asset Type</span><div className="inline-row"><input value={typeName} onChange={(event) => setTypeName(event.target.value)} placeholder="New asset type" /><Button type="button" variant="outline" onClick={() => { if (typeName.trim()) { const id = saveAssetType(typeName.trim()); setDraft({ ...draft, assetTypeId: id }); setTypeName(""); } }}>Add</Button></div></div>
      <TextField label="Installation Date" value={draft.installationDate || "Populated when installed by Work Order"} readOnly />
      <SelectField label="Warranty Period" value={draft.warrantyPeriodYears ?? 1} onChange={(event) => setDraft({ ...draft, warrantyPeriodYears: Number(event.target.value) as Asset["warrantyPeriodYears"] })}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y} year{y > 1 ? "s" : ""}</option>)}</SelectField>
    </div></form> : null}</Modal>
  </CrudCard>;
}

function TemplateSettings() {
  const { state, saveDomain, saveActivityType, saveTaskCategory, saveTemplate, removeTemplate } = useAppData();
  const [draft, setDraft] = useState<Partial<WorkOrderTemplate> | null>(null);
  const [domainModal, setDomainModal] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [activityName, setActivityName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const domainTemplates = useMemo(() => state.domains.map((domain) => ({ domain, templates: state.templates.filter((template) => template.domainId === domain.id) })), [state.domains, state.templates]);
  return (
    <>
      <Card title="Work Order Templates" action={<><Button variant="outline" onClick={() => { setDomainName(""); setDomainModal(true); }}>Add Domain</Button><Button variant="teal" onClick={() => setDraft({ name: "", domainId: state.domains[0]?.id ?? "", activityTypeId: state.activityTypes[0]?.id ?? "", tasks: [] })}>New Template</Button></>}>
        <p className="subtle">Domain → Template → Tasks. New solution domains ask only for the name. Reference Lists have been removed.</p>
        <div className="template-columns">
          {domainTemplates.map(({ domain, templates }) => <section key={domain.id}><h3>{domain.name}</h3>{templates.map((template) => <article className="template-card" key={template.id}><strong>{template.name}</strong><p>{template.description}</p><Badge tone="teal">{template.tasks.length} tasks</Badge><div className="table-actions"><Button size="sm" variant="outline" onClick={() => setDraft(template)}>Edit</Button><Button size="sm" variant="danger" onClick={() => removeTemplate(template.id)}>Delete</Button></div></article>)}</section>)}
        </div>
      </Card>
      <Modal open={domainModal} title="Add Solution Domain" onClose={() => setDomainModal(false)} footer={<><Button variant="outline" onClick={() => setDomainModal(false)}>Cancel</Button><Button variant="teal" onClick={() => { if (domainName.trim()) { saveDomain(domainName.trim()); setDomainName(""); setDomainModal(false); } }}>Save Domain</Button></>}>
        <div className="field"><span>Domain Name</span><input value={domainName} onChange={(event) => setDomainName(event.target.value)} placeholder="Solution domain name" /></div>
      </Modal>
      <Modal open={Boolean(draft)} title="Template Editor" onClose={() => setDraft(null)} wide footer={<><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button form="template-form" type="submit" variant="teal">Save Template</Button></>}>
        {draft ? <form id="template-form" onSubmit={(event) => { event.preventDefault(); if (draft.name && draft.domainId && draft.activityTypeId) saveTemplate(draft as Partial<WorkOrderTemplate> & { name: string; domainId: Id; activityTypeId: Id }); setDraft(null); }}>
          <div className="grid-2">
            <TextField label="Template Name" required value={draft.name ?? ""} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <SelectField label="Solution Domain" value={draft.domainId ?? ""} onChange={(event) => setDraft({ ...draft, domainId: event.target.value })}>{state.domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}</SelectField>
            <SelectField label="Activity Type" value={draft.activityTypeId ?? ""} onChange={(event) => setDraft({ ...draft, activityTypeId: event.target.value })}>{state.activityTypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectField>
            <div className="field"><span>Add Activity Type</span><div className="inline-row"><input value={activityName} onChange={(event) => setActivityName(event.target.value)} placeholder="New activity type" /><Button type="button" variant="outline" onClick={() => { if (activityName.trim()) { const id = saveActivityType(activityName.trim()); setDraft({ ...draft, activityTypeId: id }); setActivityName(""); } }}>Add</Button></div></div>
            <TextField label="Description" value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            <TextAreaField label="Scope of Work" value={draft.scope ?? ""} onChange={(event) => setDraft({ ...draft, scope: event.target.value })} />
          </div>
          <Card title="Task Checklist" className="nested-card" action={<Button type="button" variant="outline" onClick={() => setDraft({ ...draft, tasks: [...(draft.tasks ?? []), { id: uid("task"), description: "", category: state.taskCategories[0] ?? "Inspection", required: true }] })}>Add Task</Button>}>
            <div className="template-category-add">
              <label>
                <span>Add Category</span>
                <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category" />
              </label>
              <Button type="button" variant="outline" onClick={() => { if (categoryName.trim()) { saveTaskCategory(categoryName.trim()); setCategoryName(""); } }}>Add Category</Button>
            </div>
            <div className="template-checklist">
              <div className="template-checklist-head">
                <span>Task Description</span>
                <span>Category</span>
                <span>Required or Not</span>
                <span>Actions</span>
              </div>
              <div className="template-task-grid">{(draft.tasks ?? []).map((task, index) => <TemplateTaskRow key={task.id} task={task} categories={state.taskCategories} onChange={(next) => setDraft({ ...draft, tasks: (draft.tasks ?? []).map((item, taskIndex) => taskIndex === index ? next : item) })} onRemove={() => setDraft({ ...draft, tasks: (draft.tasks ?? []).filter((_, taskIndex) => taskIndex !== index) })} />)}</div>
            </div>
          </Card>
        </form> : null}
      </Modal>
    </>
  );
}

function TemplateTaskRow({ task, categories, onChange, onRemove }: { task: ChecklistTask; categories: string[]; onChange: (task: ChecklistTask) => void; onRemove: () => void }) {
  return (
    <div className="template-task-row">
      <label className="template-task-desc">
        <span>Task Description</span>
        <textarea value={task.description} placeholder="Describe the checklist task in full..." onChange={(event) => onChange({ ...task, description: event.target.value })} />
      </label>
      <label>
        <span>Category</span>
        <select value={task.category} onChange={(event) => onChange({ ...task, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select>
      </label>
      <label>
        <span>Required or Not</span>
        <select value={task.required ? "Required" : "Optional"} onChange={(event) => onChange({ ...task, required: event.target.value === "Required" })}><option>Required</option><option>Optional</option></select>
      </label>
      <div className="template-task-actions">
        <Button type="button" size="sm" variant="danger" onClick={onRemove}>Remove</Button>
      </div>
    </div>
  );
}

function CrudCard({ title, button, onAdd, children }: { title: string; button: string; onAdd: () => void; children: ReactNode }) {
  return <Card title={title} action={<Button variant="teal" onClick={onAdd}>{button}</Button>}>{children}</Card>;
}
