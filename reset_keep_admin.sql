-- Danger: this clears SyncShield CMMS data and removes every Auth user except admin@email.com.
-- Run only in the Supabase SQL editor for the project you intend to reset.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = 'admin@email.com') THEN
    RAISE EXCEPTION 'Abort: auth.users does not contain admin@email.com';
  END IF;
END $$;

DELETE FROM auth.users
WHERE lower(email) <> 'admin@email.com';

TRUNCATE TABLE
  public.audit_events,
  public.notifications,
  public.invitations,
  public.pm_schedule_cells,
  public.pm_schedule_tasks,
  public.pm_schedule_sections,
  public.pm_schedules,
  public.report_parts,
  public.report_tasks,
  public.reports,
  public.work_order_tasks,
  public.work_order_assignments,
  public.work_orders,
  public.template_tasks,
  public.work_order_templates,
  public.task_categories,
  public.activity_types,
  public.solution_domains,
  public.assets,
  public.asset_types,
  public.sites,
  public.projects,
  public.clients,
  public.industries,
  public.app_sequences,
  public.users,
  public.team_members,
  public.roles,
  public.company_settings
RESTART IDENTITY CASCADE;

WITH admin_auth AS (
  SELECT id, email
  FROM auth.users
  WHERE lower(email) = 'admin@email.com'
  LIMIT 1
),
seed_roles AS (
  INSERT INTO public.roles (name, description)
  VALUES
    ('CMMS Admin', 'System owner and configuration administrator'),
    ('Project Manager', 'Owns work order planning and assignment'),
    ('Engineer', 'Completes assigned technical work and reports'),
    ('Technician', 'Executes field tasks and checklist items')
  RETURNING id, name
),
admin_role AS (
  SELECT id
  FROM seed_roles
  WHERE name = 'CMMS Admin'
  LIMIT 1
)
INSERT INTO public.users (
  id,
  role_id,
  company_id,
  team_member_id,
  email,
  display_name,
  status
)
SELECT
  admin_auth.id,
  admin_role.id,
  NULL,
  NULL,
  admin_auth.email,
  'CMMS Admin',
  'active'::public.user_status
FROM admin_auth
CROSS JOIN admin_role;

COMMIT;
