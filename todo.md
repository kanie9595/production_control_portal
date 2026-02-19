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

## Update 3: Аналитика, Задачи, Отчёты, Заказы, Сырьё

### Аналитика чек-листов
- [x] История выполнения чек-листов (по дням/неделям/месяцам)
- [x] Графики выполнения (по должностям, по сотрудникам)
- [x] Сохранение истории чек-листов
- [x] Экспорт чек-листов в PDF

### Задачи
- [x] Таблица задач в БД (assignee, creator, status, deadline, description)
- [x] API для CRUD задач
- [x] Назначение задач конкретному сотруднику
- [x] Начальник и Директор видят все задачи в реальном времени
- [x] Остальные видят только свои задачи
- [x] Уведомление сотруднику о новой задаче
- [x] Уведомление начальнику производства о новой задаче
- [x] Фронтенд страница задач

### Отчёты (сменные)
- [x] Таблица отчётов в БД с полями: станок, пресс-форма, цвет, план, факт, цикл стандарт/факт, простой, причина, брак, переналадка
- [x] Редактируемые списки выбора (станки, пресс-формы, цвета, причины простоя)
- [x] API для CRUD отчётов
- [x] Аналитика по параметрам (цикл, простой, брак, переналадка) для одного продукта
- [x] Сохранение истории отчётов
- [x] Экспорт отчётов в PDF
- [x] Фронтенд страница отчётов с формой и аналитикой

### Заказы
- [x] 27 станков в системе
- [x] Таблица заказов в БД (станок, продукция, количество, статус, история)
- [x] API для CRUD заказов
- [x] Карточки станков с информацией о текущем заказе
- [x] Полная информация о заказе при клике на станок
- [x] Начальник и Директор могут создавать заказы
- [x] История заказов на каждом станке
- [x] Уведомления начальнику смены, главному наладчику и наладчикам о новом заказе
- [x] Фронтенд страница заказов

### Сырьё
- [x] Таблица рецептов сырья в БД
- [x] API для CRUD рецептов
- [x] Привязка рецепта к заказу
- [x] Фронтенд страница сырья

### Общее
- [x] Обновить навигацию (Home) с новыми разделами
- [x] Обновить App.tsx с новыми маршрутами
- [x] Написать тесты для новых модулей
- [x] Сохранить чекпоинт и доставить
