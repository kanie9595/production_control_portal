import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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

  // ============ USERS (admin) ============
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

  // ============ MANAGER DASHBOARD ============
  dashboard: router({
    overview: adminProcedure
      .input(z.object({ periodType: z.enum(["daily", "weekly", "monthly"]) }))
      .query(async ({ input }) => {
        const instances = await db.getAllInstancesForPeriod(input.periodType);
        const allUsers = await db.getAllUsers();
        const roles = await db.getAllProductionRoles();
        const templates = await db.getAllTemplates();

        const results = [];
        for (const instance of instances) {
          const items = await db.getInstanceItems(instance.id);
          const user = allUsers.find((u) => u.id === instance.userId);
          const template = templates.find((t) => t.id === instance.templateId);
          const role = template ? roles.find((r) => r.id === template.roleId) : null;
          const total = items.length;
          const completed = items.filter((i) => i.checked).length;
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
            items,
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
      if (existingRoles.length > 0) return { message: "Already seeded" };

      const rolesData = [
        { slug: "packer", name: "Упаковщик", description: "Упаковщик готовой продукции", sortOrder: 1 },
        { slug: "adjuster", name: "Наладчик ТПА", description: "Наладчик термопластавтоматов", sortOrder: 2 },
        { slug: "mechanic", name: "Механик", description: "Механик по обслуживанию оборудования", sortOrder: 3 },
        { slug: "shift_supervisor", name: "Начальник смены", description: "Начальник производственной смены", sortOrder: 4 },
        { slug: "production_manager", name: "Начальник производства", description: "Начальник производства", sortOrder: 5 },
      ];

      const roleIds: Record<string, number> = {};
      for (const r of rolesData) {
        const id = await db.createProductionRole(r);
        if (id) roleIds[r.slug] = id;
      }

      // Seed templates and items for each role
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
        // === PRODUCTION MANAGER ===
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
        // WEEKLY for production manager
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
        // MONTHLY for production manager
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
      ];

      for (const tmpl of seedTemplates) {
        const roleId = roleIds[tmpl.roleSlug];
        if (!roleId) continue;
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

      return { message: "Seeded successfully" };
    }),
  }),
});

export type AppRouter = typeof appRouter;
