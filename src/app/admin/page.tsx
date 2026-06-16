"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Filter, RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { SelectField, TextField } from "@/components/ui/FormField";
import { PageShell } from "@/components/layout/PageShell";
import { useAuth } from "@/lib/auth/AuthContext";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";

interface CompanyRow {
  id: string;
  company_name: string;
  company_type: string | null;
  company_subdomain: string | null;
}

interface RoleRow {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  role_id: string;
  company_id: string | null;
  status: string;
  created_at: string;
}

interface Metrics {
  users: number;
  companies: number;
  roles: number;
  teamMembers: number;
}

const initialMetrics: Metrics = { users: 0, companies: 0, roles: 0, teamMembers: 0 };

export default function AdminPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient() as any, []);
  const { session, profile } = useAuth();
  const toast = useToast();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [form, setForm] = useState({ displayName: "", email: "", password: "", companyId: "", roleId: "" });
  const [companyForm, setCompanyForm] = useState({ companyName: "", companyType: "" });
  const [companyFilter, setCompanyFilter] = useState("all");

  const roleById = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);
  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company.company_name])), [companies]);
  const filteredUsers = useMemo(() => {
    if (companyFilter === "all") return users;
    if (companyFilter === "none") return users.filter((user) => !user.company_id);
    return users.filter((user) => user.company_id === companyFilter);
  }, [companyFilter, users]);

  async function loadAdminData() {
    setLoading(true);
    const [companiesResult, rolesResult, usersResult, teamMembersResult] = await Promise.all([
      supabase.from("company_settings").select("id,company_name,company_type,company_subdomain", { count: "exact" }).order("company_name"),
      supabase.from("roles").select("id,name", { count: "exact" }).order("name"),
      supabase.from("users").select("id,email,display_name,role_id,company_id,status,created_at", { count: "exact" }).order("created_at", { ascending: false }),
      supabase.from("team_members").select("id", { count: "exact", head: true })
    ]);

    if (companiesResult.error || rolesResult.error || usersResult.error || teamMembersResult.error) {
      toast.error("Could not load admin dashboard data.");
    } else {
      setCompanies(companiesResult.data ?? []);
      setRoles(rolesResult.data ?? []);
      setUsers(usersResult.data ?? []);
      setMetrics({
        users: usersResult.count ?? 0,
        companies: companiesResult.count ?? 0,
        roles: rolesResult.count ?? 0,
        teamMembers: teamMembersResult.count ?? 0
      });

      setForm((current) => ({
        ...current,
        companyId: current.companyId || companiesResult.data?.[0]?.id || "",
        roleId: current.roleId || rolesResult.data?.find((role: RoleRow) => role.name === "Engineer")?.id || rolesResult.data?.[0]?.id || ""
      }));
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadAdminData();
  }, []);

  async function createSystemUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session?.access_token ?? ""}`
      },
      body: JSON.stringify(form)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(result.message ?? "Could not create system user.");
      setSaving(false);
      return;
    }

    toast.success("System user created.");
    setForm((current) => ({ ...current, displayName: "", email: "", password: "" }));
    await loadAdminData();
    setSaving(false);
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingCompany(true);

    const response = await fetch("/api/admin/companies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session?.access_token ?? ""}`
      },
      body: JSON.stringify(companyForm)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(result.message ?? "Could not create company.");
      setCreatingCompany(false);
      return;
    }

    toast.success(`Company created with subdomain ${result.company?.company_subdomain}.`);
    setCompanyForm({ companyName: "", companyType: "" });
    await loadAdminData();
    setCreatingCompany(false);
  }

  if (profile?.roleName !== "CMMS Admin") {
    return (
      <PageShell title="Admin" subtitle="Restricted system administration area.">
        <Card>
          <p className="subtle">Only CMMS Admin users can access this dashboard.</p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Admin Dashboard"
      subtitle="Manage SyncShield platform users, companies, and access roles."
      actions={
        <Button variant="outline" onClick={loadAdminData} loading={loading}>
          <RefreshCw size={15} /> Refresh
        </Button>
      }
    >
      <div className="kpi-grid">
        <Card className="kpi">
          <div className="kpi-label">System Users</div>
          <div className="kpi-value">{metrics.users}</div>
          <div className="kpi-sub">Supabase Auth profiles</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Companies</div>
          <div className="kpi-value">{metrics.companies}</div>
          <div className="kpi-sub">Configured CMMS tenants</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Roles</div>
          <div className="kpi-value">{metrics.roles}</div>
          <div className="kpi-sub">Access levels available</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Team Members</div>
          <div className="kpi-value">{metrics.teamMembers}</div>
          <div className="kpi-sub">Operational staff records</div>
        </Card>
      </div>

      <div className="admin-dashboard-grid">
        <Card
          title={
            <span className="admin-card-title">
              <UserPlus size={17} /> Add System User
            </span>
          }
        >
          <form className="admin-user-form" onSubmit={createSystemUser}>
            <TextField label="Full Name" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Jane Engineer" />
            <TextField label="Email" type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="user@company.com" />
            <TextField label="Temporary Password" type="password" required value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Minimum 6 characters" />
            <SelectField label="Company" value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value }))}>
              <option value="">No company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.company_name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Role" required value={form.roleId} onChange={(event) => setForm((current) => ({ ...current, roleId: event.target.value }))}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </SelectField>
            <Button type="submit" variant="teal" loading={saving}>
              <ShieldCheck size={15} /> Create User
            </Button>
          </form>
        </Card>

        <Card
          title={
            <span className="admin-card-title">
              <Building2 size={17} /> Companies
            </span>
          }
        >
          <form className="admin-company-form" onSubmit={createCompany}>
            <TextField label="Company Name" required value={companyForm.companyName} onChange={(event) => setCompanyForm((current) => ({ ...current, companyName: event.target.value }))} placeholder="Acme Facilities" />
            <TextField label="Company Type" value={companyForm.companyType} onChange={(event) => setCompanyForm((current) => ({ ...current, companyType: event.target.value }))} placeholder="Client, Operator..." />
            <Button type="submit" variant="teal" loading={creatingCompany}>
              <Building2 size={15} /> Create Company
            </Button>
          </form>
          <div className="admin-company-list">
            {companies.map((company) => (
              <div className="admin-company-row" key={company.id}>
                <strong>{company.company_name}</strong>
                <span>{company.company_type || "CMMS company"}</span>
                <code>{company.company_subdomain || "no-subdomain"}</code>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title={
          <span className="admin-card-title">
            <Users size={17} /> System Users
          </span>
        }
      >
        <div className="admin-table-toolbar">
          <span>
            <Filter size={15} /> Filter by company
          </span>
          <SelectField label="Company" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
            <option value="all">All companies</option>
            <option value="none">No company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.company_name}
              </option>
            ))}
          </SelectField>
        </div>
        <DataTable
          data={filteredUsers}
          emptyTitle="No system users yet"
          columns={[
            { header: "Name", render: (user) => user.display_name || user.email },
            { header: "Email", render: (user) => user.email },
            { header: "Role", render: (user) => roleById.get(user.role_id) || "Unassigned" },
            { header: "Company", render: (user) => (user.company_id ? companyById.get(user.company_id) || "Unknown company" : "No company") },
            {
              header: "Status",
              render: (user) => <Badge tone={user.status === "active" ? "green" : user.status === "invited" ? "blue" : "neutral"}>{user.status}</Badge>
            }
          ]}
        />
      </Card>
    </PageShell>
  );
}
