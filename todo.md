# Production Control Portal - Multi-Role Checklists

## Phase 1: Upgrade to full-stack
- [x] Run webdev_add_feature web-db-user
- [x] Review generated README and migration guidance

## Phase 2: Database schema & API
- [x] Create DB tables: roles, checklist_templates, template_items, checklist_instances, instance_items
- [x] Create API routes: CRUD for templates, instances, items
- [x] Seed default roles and checklist templates from existing data
- [x] Add real-time polling endpoint for manager dashboard

## Phase 3: Frontend
- [x] Role selection / login flow (manager vs employee)
- [x] Employee view: see assigned checklist, check items, add notes
- [x] Manager dashboard: view all employees' checklists in real-time
- [x] Manager: edit checklist template items (add/remove/rename)
- [x] Manager: assign checklist templates to roles
- [x] Responsive mobile layout for shop floor use

## Phase 4: Testing & delivery
- [x] Test all flows end-to-end
- [x] Fix bugs (no bugs found)
- [x] Save checkpoint and deliver

## Update 2: New roles, access control, checklists, registration
- [x] Add role: Директор производства (can view all checklists like Начальник производства)
- [x] Add role: Помощница начальника смены (with unique checklist)
- [x] Add role: Бригадир упаковщиков (with unique checklist)
- [x] Add role: Старший механик (with unique checklist)
- [x] Add role: Старший наладчик ТПА (with unique checklist)
- [x] Restrict monitoring dashboard: only Директор производства and Начальник производства can view
- [x] Hide monitoring/templates/users cards from non-manager roles on Home page
- [x] Create checklist for Помощница начальника смены
- [x] Create checklist for Бригадир упаковщиков
- [x] Create checklist for Старший механик
- [x] Create checklist for Старший наладчик ТПА
- [x] Add registration instructions page
- [x] Update seed data with new roles and checklists
- [x] Update tests for new access control logic
- [x] Save checkpoint and deliver
