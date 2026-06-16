-- Restores the default SyncShield roles without deleting any data.

INSERT INTO public.roles (name, description)
VALUES
  ('CMMS Admin', 'System owner and configuration administrator'),
  ('Project Manager', 'Owns work order planning and assignment'),
  ('Engineer', 'Completes assigned technical work and reports'),
  ('Technician', 'Executes field tasks and checklist items')
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  updated_at = now();

