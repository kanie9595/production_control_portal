import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

// Admin-only procedure (site admin)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// Manager procedure: accessible by admin OR users with productionRole = "production_manager" or "production_director"
const MANAGER_ROLES = ["production_manager", "production_director"];

const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isAdmin = ctx.user.role === "admin";
  const isManager = MANAGER_ROLES.includes(ctx.user.productionRole ?? "");
  if (!isAdmin && !isManager) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Доступ только для Начальника производства и Директора производства" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ PRODUCTION ROLES ============
  roles: router({
    list: publicProcedure.query(async () => {
      return db.getAllProductionRoles();
    }),
    create: adminProcedure
      .input(z.object({ slug: z.string(), name: z.string(), description: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const id = await db.createProductionRole(input);
        return { id };
      }),
  }),

  // ============ USERS (admin only) ============
  users: router({
    list: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),
    setProductionRole: adminProcedure
      .input(z.object({ userId: z.number(), productionRole: z.string().nullable() }))
      .mutation(async ({ input }) => {
        await db.setUserProductionRole(input.userId, input.productionRole);
        return { success: true };
      }),
  }),

  // ============ TEMPLATES ============
  templates: router({
    list: protectedProcedure.query(async () => {
      return db.getAllTemplates();
    }),
    listForRole: protectedProcedure
      .input(z.object({ roleId: z.number() }))
      .query(async ({ input }) => {
        return db.getTemplatesForRole(input.roleId);
      }),
    create: adminProcedure
      .input(z.object({ roleId: z.number(), periodType: z.enum(["daily", "weekly", "monthly"]), title: z.string() }))
      .mutation(async ({ input }) => {
        const id = await db.createTemplate(input);
        return { id };
      }),
    update: adminProcedure
      .input(z.object({ id: z.number(), title: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.updateTemplate(input.id, { title: input.title });
        return { success: true };
      }),
    items: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return db.getTemplateItems(input.templateId);
      }),
    addItem: adminProcedure
      .input(z.object({
        templateId: z.number(),
        sectionTitle: z.string(),
        sectionIcon: z.string().optional(),
        text: z.string(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTemplateItem(input);
        return { id };
      }),
    updateItem: adminProcedure
      .input(z.object({
        id: z.number(),
        text: z.string().optional(),
        sectionTitle: z.string().optional(),
        sectionIcon: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTemplateItem(id, data);
        return { success: true };
      }),
    deleteItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTemplateItem(input.id);
        return { success: true };
      }),
  }),

  // ============ INSTANCES (employee checklists) ============
  instances: router({
    getOrCreate: protectedProcedure
      .input(z.object({ templateId: z.number(), dateKey: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const instance = await db.getOrCreateInstance(input.templateId, ctx.user.id, input.dateKey);
        return instance;
      }),
    items: protectedProcedure
      .input(z.object({ instanceId: z.number() }))
      .query(async ({ input }) => {
        return db.getInstanceItems(input.instanceId);
      }),
    toggleItem: protectedProcedure
      .input(z.object({ itemId: z.number(), checked: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.toggleInstanceItem(input.itemId, input.checked);
        return { success: true };
      }),
    setNote: protectedProcedure
      .input(z.object({ itemId: z.number(), note: z.string() }))
      .mutation(async ({ input }) => {
        await db.setInstanceItemNote(input.itemId, input.note);
        return { success: true };
      }),
  }),

  // ============ MANAGER DASHBOARD (manager procedure) ============
  dashboard: router({
    overview: managerProcedure
      .input(z.object({ periodType: z.enum(["daily", "weekly", "monthly"]) }))
      .query(async ({ input }) => {
        const instances = await db.getAllInstancesForPeriod(input.periodType);
        const allUsers = await db.getAllUsers();
        const roles = await db.getAllProductionRoles();
        const templates = await db.getAllTemplates();
        const allTemplateItems = await db.getAllTemplateItems();

        const results = [];
        for (const instance of instances) {
          const items = await db.getInstanceItems(instance.id);
          const user = allUsers.find((u) => u.id === instance.userId);
          const template = templates.find((t) => t.id === instance.templateId);
          const role = template ? roles.find((r) => r.id === template.roleId) : null;
          const total = items.length;
          const completed = items.filter((i) => i.checked).length;
          // Enrich items with template item text
          const enrichedItems = items.map((ii) => {
            const ti = allTemplateItems.find((t: { id: number; text: string }) => t.id === ii.templateItemId);
            return { ...ii, text: ti?.text ?? `Пункт #${ii.templateItemId}` };
          });
          results.push({
            instanceId: instance.id,
            userId: instance.userId,
            userName: user?.name ?? "Неизвестный",
            roleName: role?.name ?? "Без роли",
            roleSlug: role?.slug ?? "",
            templateTitle: template?.title ?? "",
            periodType: template?.periodType ?? input.periodType,
            total,
            completed,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0,
            items: enrichedItems,
            updatedAt: instance.updatedAt,
          });
        }
        return results;
      }),
  }),

  // ============ SEED (admin only, one-time) ============
  seed: router({
    run: adminProcedure.mutation(async () => {
      const existingRoles = await db.getAllProductionRoles();
      const existingSlugs = new Set(existingRoles.map((r) => r.slug));

      const rolesData = [
        { slug: "packer", name: "Упаковщик", description: "Упаковщик готовой продукции", sortOrder: 1 },
        { slug: "adjuster", name: "Наладчик ТПА", description: "Наладчик термопластавтоматов", sortOrder: 2 },
        { slug: "mechanic", name: "Механик", description: "Механик по обслуживанию оборудования", sortOrder: 3 },
        { slug: "shift_supervisor", name: "Начальник смены", description: "Начальник производственной смены", sortOrder: 4 },
        { slug: "production_manager", name: "Начальник производства", description: "Начальник производства", sortOrder: 5 },
        // New roles
        { slug: "production_director", name: "Директор производства", description: "Директор производства, контролирует все процессы", sortOrder: 6 },
        { slug: "shift_assistant", name: "Помощница начальника смены", description: "Помощница начальника смены", sortOrder: 7 },
        { slug: "packer_foreman", name: "Бригадир упаковщиков", description: "Бригадир упаковщиков, контролирует упаковочную линию", sortOrder: 8 },
        { slug: "senior_mechanic", name: "Старший механик", description: "Старший механик, руководит отделом механиков", sortOrder: 9 },
        { slug: "senior_adjuster", name: "Старший наладчик ТПА", description: "Старший наладчик ТПА, руководит командами наладчиков", sortOrder: 10 },
      ];

      const roleIds: Record<string, number> = {};
      // Reuse existing role IDs
      for (const er of existingRoles) {
        roleIds[er.slug] = er.id;
      }
      // Create only new roles
      for (const r of rolesData) {
        if (existingSlugs.has(r.slug)) continue;
        const id = await db.createProductionRole(r);
        if (id) roleIds[r.slug] = id;
      }

      const seedTemplates: Array<{
        roleSlug: string;
        periodType: "daily" | "weekly" | "monthly";
        title: string;
        sections: Array<{ title: string; icon: string; items: string[] }>;
      }> = [
        // === PACKER ===
        {
          roleSlug: "packer", periodType: "daily", title: "Ежедневный чек-лист упаковщика",
          sections: [
            { title: "Начало смены", icon: "sunrise", items: [
              "Проверить чистоту рабочего места",
              "Проверить наличие упаковочных материалов",
              "Проверить исправность весов и счётчиков",
              "Ознакомиться с планом на смену",
            ]},
            { title: "В процессе работы", icon: "sun", items: [
              "Визуальный контроль каждой единицы продукции",
              "Проверка отсутствия дефектов (облой, недолив, пузыри, деформация)",
              "Соблюдение нормы укладки в коробку",
              "Маркировка коробок (артикул, количество, дата, смена)",
              "Контроль веса выборочных образцов",
            ]},
            { title: "Конец смены", icon: "sunset", items: [
              "Подсчёт и запись выработки",
              "Запись выявленного брака в журнал",
              "Уборка рабочего места",
            ]},
          ],
        },
        // === ADJUSTER ===
        {
          roleSlug: "adjuster", periodType: "daily", title: "Ежедневный чек-лист наладчика ТПА",
          sections: [
            { title: "Начало смены", icon: "sunrise", items: [
              "Приёмка оборудования от предыдущей смены",
              "Проверка температурных режимов цилиндра и пресс-формы",
              "Проверка давления и скорости впрыска",
              "Проверка системы охлаждения (температура воды, расход)",
              "Контроль «первой детали» после запуска",
            ]},
            { title: "В процессе работы", icon: "sun", items: [
              "Мониторинг стабильности цикла",
              "Периодический контроль качества деталей (каждые 30 мин)",
              "Запись всех изменений параметров в журнал",
              "Контроль уровня сырья в бункере",
              "Реакция на сигналы тревоги оборудования",
            ]},
            { title: "Конец смены", icon: "sunset", items: [
              "Запись параметров работы в сменный журнал",
              "Передача информации о проблемах следующей смене",
              "Проверка состояния пресс-формы",
            ]},
          ],
        },
        // === MECHANIC ===
        {
          roleSlug: "mechanic", periodType: "daily", title: "Ежедневный чек-лист механика",
          sections: [
            { title: "Утренний обход", icon: "sunrise", items: [
              "Визуальный осмотр всех ТПА (утечки масла, посторонние звуки)",
              "Проверка уровня масла в гидросистемах",
              "Проверка состояния фильтров",
              "Проверка работы системы охлаждения",
              "Проверка электрических соединений и кабелей",
            ]},
            { title: "Текущая работа", icon: "sun", items: [
              "Выполнение заявок на ремонт",
              "Запись выполненных работ в журнал",
              "Контроль наличия запчастей на складе",
              "Смазка узлов по графику ППР",
            ]},
            { title: "Завершение дня", icon: "sunset", items: [
              "Обновление журнала дефектов",
              "Подготовка заявок на запчасти",
              "Передача информации о незавершённых работах",
            ]},
          ],
        },
        // === SHIFT SUPERVISOR ===
        {
          roleSlug: "shift_supervisor", periodType: "daily", title: "Ежедневный чек-лист начальника смены",
          sections: [
            { title: "Приёмка смены", icon: "sunrise", items: [
              "Получить информацию от предыдущей смены (проблемы, задачи)",
              "Проверить явку персонала, распределить по рабочим местам",
              "Проверить состояние оборудования и готовность к работе",
              "Ознакомиться с планом производства на смену",
              "Провести краткий инструктаж для персонала",
            ]},
            { title: "Контроль в течение смены", icon: "sun", items: [
              "Контроль выполнения плана производства",
              "Обход цеха каждые 2 часа (порядок, качество, безопасность)",
              "Контроль качества продукции (выборочные проверки)",
              "Решение оперативных проблем (поломки, брак, конфликты)",
              "Контроль соблюдения технологических режимов",
              "Учёт простоев и их причин",
            ]},
            { title: "Сдача смены", icon: "sunset", items: [
              "Подведение итогов смены (план, факт, брак, простои)",
              "Заполнение сменного отчёта",
              "Передача информации следующей смене",
              "Контроль уборки рабочих мест",
            ]},
          ],
        },
        // === PRODUCTION MANAGER (daily) ===
        {
          roleSlug: "production_manager", periodType: "daily", title: "Ежедневные задачи начальника производства",
          sections: [
            { title: "Утро (до начала основной работы)", icon: "sunrise", items: [
              "Просмотр отчетов смен за прошедшие сутки (выполнение плана, брак, простои)",
              "Проверка журналов наладчиков (изменения режимов, контроль «первой детали»)",
              "Проверка журналов упаковщиц (выявленный брак, соблюдение чек-листов)",
              "Проверка журнала дефектов механиков (новые заявки, статус ремонта)",
              "Краткое совещание с начальниками смен (план на день, ключевые проблемы)",
            ]},
            { title: "В течение дня", icon: "sun", items: [
              "Выборочный обход цеха (визуальный контроль порядка, работы оборудования, персонала)",
              "Решение оперативных вопросов (брак, поломки, нехватка сырья, конфликтные ситуации)",
              "Контроль выполнения поручений (наладчикам, механикам, начальникам смен)",
              "Контроль качества сырья (входной контроль, если есть поставки)",
              "Работа с документацией (техкарты, СОПы, приказы)",
            ]},
            { title: "Вечер (перед уходом)", icon: "sunset", items: [
              "Подведение итогов дня (выполнение плана, основные проблемы, принятые решения)",
              "Планирование задач на следующий день",
            ]},
          ],
        },
        // === PRODUCTION MANAGER (weekly) ===
        {
          roleSlug: "production_manager", periodType: "weekly", title: "Еженедельные задачи начальника производства",
          sections: [
            { title: "Аналитика и отчётность", icon: "bar-chart", items: [
              "Анализ недельных отчетов по браку (динамика, основные виды, причины)",
              "Анализ недельных отчетов по простоям оборудования (MTTR, MTBF)",
              "Анализ недельных отчетов по выполнению плана производства",
              "Анализ эффективности использования сырья и материалов",
            ]},
            { title: "Управление и контроль", icon: "users", items: [
              "Совещание с начальниками смен, бригадиром, руководителем механиков и наладчиков",
              "Контроль выполнения графика ППР (планово-предупредительных ремонтов)",
              "Проверка внедрения и соблюдения СОПов и чек-листов",
              "Планирование обучения персонала (повышение квалификации, инструктажи)",
              "Обновление досок визуализации (KPI, графики брака, план)",
            ]},
          ],
        },
        // === PRODUCTION MANAGER (monthly) ===
        {
          roleSlug: "production_manager", periodType: "monthly", title: "Ежемесячные задачи начальника производства",
          sections: [
            { title: "Стратегический анализ", icon: "target", items: [
              "Анализ месячных KPI (процент брака, простои, выполнение плана, расход сырья)",
              "Составление отчета для руководства (достижения, проблемы, планы)",
              "Анализ обратной связи от отдела продаж и клиентов (рекламации, пожелания)",
              "Анализ новых технологий и материалов на рынке",
            ]},
            { title: "Операционное управление", icon: "settings", items: [
              "Планирование бюджета производства (закупки запчастей, материалов, обучение)",
              "Проведение инвентаризации (сырье, готовая продукция, запчасти)",
              "Разработка и внедрение мероприятий по оптимизации процессов (Lean, Poka-Yoke)",
              "Оценка эффективности системы мотивации персонала",
              "Проведение индивидуальных бесед с ключевыми сотрудниками",
            ]},
          ],
        },
        // === PRODUCTION DIRECTOR (daily) ===
        {
          roleSlug: "production_director", periodType: "daily", title: "Ежедневные задачи директора производства",
          sections: [
            { title: "Утро", icon: "sunrise", items: [
              "Просмотр сводки по всем производственным площадкам",
              "Анализ ключевых показателей за прошедшие сутки (OEE, брак, выполнение плана)",
              "Проверка статуса критических заказов и сроков отгрузки",
              "Краткое совещание с начальником производства (приоритеты дня)",
            ]},
            { title: "В течение дня", icon: "sun", items: [
              "Контроль исполнения стратегических решений",
              "Работа с поставщиками сырья и оборудования",
              "Координация с отделом продаж по приоритетам заказов",
              "Решение эскалированных проблем (крупные поломки, массовый брак)",
              "Контроль бюджета и затрат производства",
            ]},
            { title: "Вечер", icon: "sunset", items: [
              "Подведение итогов дня с начальником производства",
              "Утверждение плана на следующий день",
            ]},
          ],
        },
        // === SHIFT ASSISTANT (daily) ===
        {
          roleSlug: "shift_assistant", periodType: "daily", title: "Ежедневный чек-лист помощницы начальника смены",
          sections: [
            { title: "Начало смены", icon: "sunrise", items: [
              "Проверить явку персонала и отметить в табеле",
              "Распределить упаковщиков по рабочим местам согласно указаниям начальника смены",
              "Проверить наличие расходных материалов (коробки, стрейч-плёнка, скотч, этикетки)",
              "Подготовить журналы учёта (выработки, брака, простоев)",
              "Проверить чистоту и порядок в зоне упаковки",
            ]},
            { title: "В течение смены", icon: "sun", items: [
              "Контроль соблюдения упаковщиками стандартов упаковки",
              "Помощь в решении мелких оперативных вопросов (замена материалов, перестановка)",
              "Ведение учёта выработки по каждому рабочему месту",
              "Фиксация случаев брака и информирование начальника смены",
              "Контроль соблюдения перерывов и дисциплины",
              "Обеспечение своевременной подачи тары и материалов на линию",
            ]},
            { title: "Конец смены", icon: "sunset", items: [
              "Сбор данных по выработке от всех упаковщиков",
              "Подготовка сводки по смене для начальника смены",
              "Контроль уборки рабочих мест",
              "Передача информации помощнице следующей смены",
            ]},
          ],
        },
        // === PACKER FOREMAN (daily) ===
        {
          roleSlug: "packer_foreman", periodType: "daily", title: "Ежедневный чек-лист бригадира упаковщиков",
          sections: [
            { title: "Начало смены", icon: "sunrise", items: [
              "Принять информацию от предыдущей смены (проблемы, остатки, задачи)",
              "Проверить явку бригады, при необходимости перераспределить людей",
              "Проверить готовность рабочих мест (чистота, инструмент, материалы)",
              "Ознакомиться с планом выпуска и приоритетами на смену",
              "Провести краткий инструктаж бригады (качество, безопасность, план)",
            ]},
            { title: "В течение смены", icon: "sun", items: [
              "Контроль качества упаковки (выборочные проверки каждый час)",
              "Контроль скорости работы и выполнения нормы выработки",
              "Обучение новых сотрудников на рабочем месте",
              "Контроль правильности маркировки и этикетирования",
              "Решение конфликтных ситуаций в бригаде",
              "Информирование начальника смены о проблемах и отклонениях",
              "Контроль соблюдения техники безопасности",
            ]},
            { title: "Конец смены", icon: "sunset", items: [
              "Подсчёт выработки бригады и сравнение с планом",
              "Заполнение отчёта по смене (выработка, брак, замечания)",
              "Контроль уборки и подготовки рабочих мест для следующей смены",
              "Передача информации бригадиру следующей смены",
            ]},
          ],
        },
        // === SENIOR MECHANIC (daily) ===
        {
          roleSlug: "senior_mechanic", periodType: "daily", title: "Ежедневный чек-лист старшего механика",
          sections: [
            { title: "Начало рабочего дня", icon: "sunrise", items: [
              "Получить информацию от ночной/предыдущей смены о состоянии оборудования",
              "Распределить задачи между механиками на день",
              "Проверить статус незавершённых ремонтов",
              "Проверить наличие необходимых запчастей и инструмента",
              "Провести планёрку с механиками (приоритеты, безопасность)",
            ]},
            { title: "В течение дня", icon: "sun", items: [
              "Контроль выполнения заявок на ремонт механиками",
              "Личное участие в сложных ремонтах и диагностике",
              "Контроль выполнения графика ППР",
              "Ведение учёта расхода запчастей и материалов",
              "Координация с наладчиками по вопросам оборудования",
              "Подготовка заявок на закупку запчастей",
              "Контроль соблюдения техники безопасности при ремонтных работах",
            ]},
            { title: "Конец дня", icon: "sunset", items: [
              "Проверка завершённости всех плановых работ",
              "Обновление журнала ремонтов и дефектов",
              "Отчёт начальнику производства о состоянии оборудования",
              "Планирование работ на следующий день",
            ]},
          ],
        },
        // === SENIOR MECHANIC (weekly) ===
        {
          roleSlug: "senior_mechanic", periodType: "weekly", title: "Еженедельные задачи старшего механика",
          sections: [
            { title: "Аналитика", icon: "bar-chart", items: [
              "Анализ статистики поломок за неделю (частота, типы, причины)",
              "Анализ времени простоев по причине ремонтов (MTTR)",
              "Контроль расхода запчастей и масел",
            ]},
            { title: "Управление", icon: "users", items: [
              "Планирование графика ППР на следующую неделю",
              "Проверка квалификации механиков, планирование обучения",
              "Инвентаризация склада запчастей",
              "Совещание с начальником производства по техническим вопросам",
            ]},
          ],
        },
        // === SENIOR ADJUSTER (daily) ===
        {
          roleSlug: "senior_adjuster", periodType: "daily", title: "Ежедневный чек-лист старшего наладчика ТПА",
          sections: [
            { title: "Начало рабочего дня", icon: "sunrise", items: [
              "Получить информацию от предыдущей смены о работе оборудования",
              "Распределить задачи между наладчиками обеих команд",
              "Проверить технологические карты на текущие заказы",
              "Проверить параметры работы всех ТПА (температура, давление, цикл)",
              "Провести планёрку с наладчиками (приоритеты, проблемные машины)",
            ]},
            { title: "В течение дня", icon: "sun", items: [
              "Контроль качества настройки оборудования наладчиками",
              "Личное участие в сложных переналадках и запусках новых пресс-форм",
              "Контроль соблюдения технологических режимов на всех ТПА",
              "Анализ причин брака и корректировка параметров",
              "Координация с механиками по вопросам технического состояния ТПА",
              "Ведение журнала переналадок и изменений параметров",
              "Обучение наладчиков новым методам и технологиям",
            ]},
            { title: "Конец дня", icon: "sunset", items: [
              "Проверка стабильности работы всех ТПА перед передачей смены",
              "Обновление технологических карт при изменении параметров",
              "Отчёт начальнику производства о состоянии наладки",
              "Планирование переналадок на следующий день",
            ]},
          ],
        },
        // === SENIOR ADJUSTER (weekly) ===
        {
          roleSlug: "senior_adjuster", periodType: "weekly", title: "Еженедельные задачи старшего наладчика ТПА",
          sections: [
            { title: "Аналитика", icon: "bar-chart", items: [
              "Анализ статистики брака по каждому ТПА за неделю",
              "Анализ стабильности циклов и отклонений параметров",
              "Оценка состояния пресс-форм (износ, необходимость профилактики)",
            ]},
            { title: "Управление", icon: "users", items: [
              "Планирование переналадок на следующую неделю",
              "Проверка квалификации наладчиков, планирование обучения",
              "Совещание с начальником производства по технологическим вопросам",
              "Обновление базы технологических карт",
            ]},
          ],
        },
      ];

      const existingTemplates = await db.getAllTemplates();
      const existingTemplateKeys = new Set(existingTemplates.map((t) => `${t.roleId}-${t.periodType}`));

      for (const tmpl of seedTemplates) {
        const roleId = roleIds[tmpl.roleSlug];
        if (!roleId) continue;
        // Skip if template already exists for this role+period
        if (existingTemplateKeys.has(`${roleId}-${tmpl.periodType}`)) continue;
        const templateId = await db.createTemplate({ roleId, periodType: tmpl.periodType, title: tmpl.title });
        if (!templateId) continue;
        let sortOrder = 0;
        for (const section of tmpl.sections) {
          for (const itemText of section.items) {
            await db.createTemplateItem({
              templateId,
              sectionTitle: section.title,
              sectionIcon: section.icon,
              text: itemText,
              sortOrder: sortOrder++,
            });
          }
        }
      }

      return { message: `Seeded successfully. Roles: ${Object.keys(roleIds).length}, new templates created.` };
    }),
  }),
});

export type AppRouter = typeof appRouter;
