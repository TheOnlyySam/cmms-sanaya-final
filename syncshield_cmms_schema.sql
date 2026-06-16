-- SyncShield CMMS database schema
-- PostgreSQL DDL for users, roles, work orders, reports, PM schedules, notifications, and supporting setup data.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('invited', 'active', 'suspended', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE work_order_kind AS ENUM ('CM', 'PM', 'Installation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE work_order_status AS ENUM ('Scheduled', 'In Progress', 'On Hold', 'Completed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE priority AS ENUM ('Critical', 'High', 'Medium', 'Low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE checklist_result AS ENUM ('Unchecked', 'OK', 'Warning', 'Fail', 'N/A');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('Draft', 'Submitted', 'Approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE system_status AS ENUM ('Optimal', 'Restricted', 'Offline');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pm_status AS ENUM ('Planned', 'Due', 'Completed', 'Overdue', 'Skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pm_frequency AS ENUM ('Weekly', 'Monthly', 'Quarterly', 'Bi-Annual', 'Annual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pm_cell_status AS ENUM ('empty', 'scheduled', 'completed', 'issue', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'work_order_assigned',
    'work_order_due',
    'work_order_overdue',
    'pm_due',
    'report_submitted',
    'report_approved',
    'invitation_sent',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('info', 'warning', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name varchar(255) NOT NULL,
  company_type varchar(255),
  registration_number varchar(100),
  tax_number varchar(100),
  address text,
  phone varchar(50),
  email varchar(255),
  report_footer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id varchar(50) NOT NULL UNIQUE,
  full_name varchar(255) NOT NULL,
  role_id uuid NOT NULL REFERENCES roles(id),
  department varchar(120),
  phone varchar(50),
  email varchar(255) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id),
  team_member_id uuid UNIQUE REFERENCES team_members(id),
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255),
  display_name varchar(255),
  status user_status NOT NULL DEFAULT 'invited',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code varchar(50) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  industry_id uuid REFERENCES industries(id),
  city varchar(120),
  primary_contact_name varchar(255),
  primary_contact_phone varchar(50),
  primary_contact_email varchar(255),
  secondary_contact_name varchar(255),
  secondary_contact_phone varchar(50),
  secondary_contact_email varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  contract_number varchar(120),
  start_date date,
  end_date date,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  city varchar(120),
  zone varchar(120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type_id uuid NOT NULL REFERENCES asset_types(id),
  asset_name varchar(255) NOT NULL,
  model varchar(120),
  serial_number varchar(120),
  description text,
  manufacturer varchar(120),
  installation_date date,
  warranty_period_years int NOT NULL DEFAULT 1 CHECK (warranty_period_years BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solution_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS activity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS work_order_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES solution_domains(id),
  activity_type_id uuid NOT NULL REFERENCES activity_types(id),
  name varchar(255) NOT NULL,
  description text,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES work_order_templates(id) ON DELETE CASCADE,
  category_id uuid REFERENCES task_categories(id),
  description text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference varchar(50) NOT NULL UNIQUE,
  kind work_order_kind NOT NULL,
  title varchar(255) NOT NULL,
  domain_id uuid NOT NULL REFERENCES solution_domains(id),
  template_id uuid NOT NULL REFERENCES work_order_templates(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  site_id uuid REFERENCES sites(id),
  asset_id uuid REFERENCES assets(id),
  priority priority NOT NULL DEFAULT 'Medium',
  status work_order_status NOT NULL DEFAULT 'Scheduled',
  due_date date NOT NULL,
  description text,
  scope text,
  created_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES team_members(id),
  assigned_by_user_id uuid REFERENCES users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_order_id, team_member_id)
);

CREATE TABLE IF NOT EXISTS work_order_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  template_task_id uuid REFERENCES template_tasks(id),
  category_id uuid REFERENCES task_categories(id),
  description text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  result checklist_result NOT NULL DEFAULT 'Unchecked',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference varchar(50) NOT NULL UNIQUE,
  type work_order_kind NOT NULL,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  status report_status NOT NULL DEFAULT 'Submitted',
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  prepared_by_member_id uuid REFERENCES team_members(id),
  findings text,
  actions_taken text,
  recommendations text,
  system_status system_status NOT NULL DEFAULT 'Optimal',
  client_representative varchar(255),
  company_representative varchar(255),
  installed_asset_id uuid REFERENCES assets(id),
  submitted_at timestamptz,
  approved_by_user_id uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  work_order_task_id uuid REFERENCES work_order_tasks(id),
  category_id uuid REFERENCES task_categories(id),
  description text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  result checklist_result NOT NULL DEFAULT 'Unchecked',
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS report_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  remarks text
);

CREATE TABLE IF NOT EXISTS pm_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id),
  frequency pm_frequency NOT NULL DEFAULT 'Quarterly',
  next_due_date date NOT NULL,
  status pm_status NOT NULL DEFAULT 'Planned',
  assigned_member_id uuid REFERENCES team_members(id),
  work_order_id uuid REFERENCES work_orders(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pm_schedule_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pm_schedule_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES pm_schedule_sections(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id),
  assigned_member_id uuid REFERENCES team_members(id),
  name text NOT NULL,
  frequency pm_frequency NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pm_schedule_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES pm_schedule_tasks(id) ON DELETE CASCADE,
  cell_year int NOT NULL,
  cell_month int NOT NULL CHECK (cell_month BETWEEN 1 AND 12),
  status pm_cell_status NOT NULL DEFAULT 'empty',
  note text,
  work_order_id uuid REFERENCES work_orders(id),
  report_id uuid REFERENCES reports(id),
  updated_by_user_id uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, cell_year, cell_month)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  recipient_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'info',
  title varchar(255) NOT NULL,
  message text,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE,
  pm_schedule_id uuid REFERENCES pm_schedules(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (recipient_user_id IS NOT NULL OR recipient_member_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  team_member_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  token_hash varchar(255),
  status varchar(40) NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS app_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_key varchar(80) NOT NULL UNIQUE,
  prefix varchar(30) NOT NULL,
  current_value int NOT NULL DEFAULT 0,
  year int,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type varchar(120) NOT NULL,
  entity_id uuid NOT NULL,
  action varchar(80) NOT NULL,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role_id ON team_members(role_id);
CREATE INDEX IF NOT EXISTS idx_clients_industry_id ON clients(industry_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_sites_project_id ON sites(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type_id ON assets(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_templates_domain_id ON work_order_templates(domain_id);
CREATE INDEX IF NOT EXISTS idx_templates_activity_type_id ON work_order_templates(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_client_project ON work_orders(client_id, project_id);
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_member ON work_order_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_reports_work_order_id ON reports(work_order_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_pm_schedules_project_id ON pm_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_schedules_status ON pm_schedules(status);
CREATE INDEX IF NOT EXISTS idx_pm_cells_status ON pm_schedule_cells(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user ON notifications(recipient_user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_member ON notifications(recipient_member_id, read_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_manage_settings()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_role() IN ('CMMS Admin', 'Project Manager'), false)
$$;

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "authenticated users can read company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "settings managers can manage company settings"
  ON company_settings FOR ALL
  TO authenticated
  USING (public.can_manage_settings())
  WITH CHECK (public.can_manage_settings());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated users can read roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "settings managers can manage roles"
  ON roles FOR ALL
  TO authenticated
  USING (public.can_manage_settings())
  WITH CHECK (public.can_manage_settings());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated users can read team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "settings managers can manage team members"
  ON team_members FOR ALL
  TO authenticated
  USING (public.can_manage_settings())
  WITH CHECK (public.can_manage_settings());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "users can read their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.can_manage_settings());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "settings managers can manage app users"
  ON users FOR ALL
  TO authenticated
  USING (public.can_manage_settings())
  WITH CHECK (public.can_manage_settings());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "anon app can manage company settings during local integration" ON company_settings;
DROP POLICY IF EXISTS "anon app can manage roles during local integration" ON roles;
DROP POLICY IF EXISTS "anon app can manage team members during local integration" ON team_members;

INSERT INTO roles (name, description) VALUES
  ('CMMS Admin', 'System owner and configuration administrator'),
  ('Project Manager', 'Owns work order planning and assignment'),
  ('Engineer', 'Completes assigned technical work and reports'),
  ('Technician', 'Executes field tasks and checklist items')
ON CONFLICT (name) DO NOTHING;

INSERT INTO industries (name) VALUES
  ('Energy'),
  ('Healthcare'),
  ('Manufacturing'),
  ('Telecommunications'),
  ('Government')
ON CONFLICT (name) DO NOTHING;

INSERT INTO asset_types (name) VALUES
  ('Life Safety System')
ON CONFLICT (name) DO NOTHING;

INSERT INTO solution_domains (name) VALUES
  ('Life Safety Systems')
ON CONFLICT (name) DO NOTHING;

INSERT INTO activity_types (name) VALUES
  ('Corrective Maintenance'),
  ('Preventive Maintenance'),
  ('Installation')
ON CONFLICT (name) DO NOTHING;

INSERT INTO task_categories (name) VALUES
  ('Inspection'),
  ('Electrical'),
  ('Functional Test'),
  ('Documentation')
ON CONFLICT (name) DO NOTHING;

INSERT INTO app_sequences (sequence_key, prefix, current_value, year) VALUES
  ('employee', 'EMP', 0, EXTRACT(YEAR FROM CURRENT_DATE)::int),
  ('client', 'CL', 0, EXTRACT(YEAR FROM CURRENT_DATE)::int),
  ('workOrder', 'WO', 0, EXTRACT(YEAR FROM CURRENT_DATE)::int),
  ('report', 'RPT', 0, EXTRACT(YEAR FROM CURRENT_DATE)::int)
ON CONFLICT (sequence_key) DO NOTHING;

INSERT INTO company_settings (company_name, company_type, report_footer) VALUES
  ('SyncShield', 'CMMS Operator', 'Confidential maintenance record generated by SyncShield CMMS.');
