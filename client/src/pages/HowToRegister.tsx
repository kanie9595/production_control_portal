import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  UserPlus,
  LogIn,
  Shield,
  ClipboardList,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

const steps = [
  {
    icon: LogIn,
    title: "1. Перейдите на страницу входа",
    description:
      'Откройте ссылку на портал, которую вам предоставил начальник производства. Нажмите кнопку «Войти в систему».',
  },
  {
    icon: UserPlus,
    title: "2. Создайте аккаунт или войдите",
    description:
      "Вы будете перенаправлены на страницу авторизации Manus. Если у вас ещё нет аккаунта — зарегистрируйтесь, указав имя, email и пароль. Если аккаунт уже есть — просто войдите.",
  },
  {
    icon: Shield,
    title: "3. Дождитесь назначения роли",
    description:
      "После первого входа начальник производства (администратор) увидит вас в разделе «Сотрудники» и назначит вам вашу производственную должность (например, Упаковщик, Наладчик ТПА, Механик и т.д.).",
  },
  {
    icon: ClipboardList,
    title: "4. Заполняйте свой чек-лист",
    description:
      'После назначения роли вам станет доступен раздел «Мой чек-лист». Заходите в начале каждой смены и отмечайте выполненные пункты. Вы также можете добавлять примечания к каждому пункту.',
  },
  {
    icon: CheckCircle2,
    title: "5. Готово!",
    description:
      "Ваш начальник производства видит прогресс заполнения чек-листов в реальном времени. Это помогает контролировать качество и улучшать рабочие процессы.",
  },
];

export default function HowToRegister() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.16 0.01 260)" }}>
      {/* Header */}
      <header
        className="border-b border-border sticky top-0 z-40"
        style={{ background: "oklch(0.14 0.01 260)" }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="font-mono text-sm font-semibold text-foreground">
              Как зарегистрироваться
            </p>
            <p className="text-[10px] text-muted-foreground">
              Инструкция для новых сотрудников
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Intro */}
        <div
          className="rounded-xl border border-border p-6 mb-8"
          style={{ background: "oklch(0.18 0.012 260)" }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.78 0.16 75 / 0.12)" }}
            >
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-mono text-lg font-bold text-foreground mb-2">
                Добро пожаловать в MPC
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>Manus Production Control</strong> — это система
                управления производственными чек-листами. Каждый сотрудник
                получает чек-лист в соответствии со своей должностью и заполняет
                его в начале, в течение и в конце смены. Ниже — пошаговая
                инструкция по регистрации и началу работы.
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="rounded-xl border border-border p-5 flex items-start gap-4"
                style={{ background: "oklch(0.18 0.012 260)" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background:
                      index === steps.length - 1
                        ? "oklch(0.7 0.18 145 / 0.12)"
                        : "oklch(0.65 0.15 250 / 0.12)",
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color:
                        index === steps.length - 1
                          ? "oklch(0.7 0.18 145)"
                          : "oklch(0.65 0.15 250)",
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-mono text-sm font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Roles table */}
        <div
          className="rounded-xl border border-border p-6 mt-8"
          style={{ background: "oklch(0.18 0.012 260)" }}
        >
          <h2 className="font-mono text-sm font-semibold text-foreground mb-4">
            Доступные должности
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-mono text-muted-foreground font-medium">
                    Должность
                  </th>
                  <th className="text-left py-2 pr-4 font-mono text-muted-foreground font-medium">
                    Описание
                  </th>
                  <th className="text-left py-2 font-mono text-muted-foreground font-medium">
                    Доступ к мониторингу
                  </th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">Упаковщик</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Упаковка готовой продукции</td>
                  <td className="py-2.5 text-muted-foreground">Только свой чек-лист</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">Наладчик ТПА</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Наладка термопластавтоматов</td>
                  <td className="py-2.5 text-muted-foreground">Только свой чек-лист</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">Механик</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Обслуживание оборудования</td>
                  <td className="py-2.5 text-muted-foreground">Только свой чек-лист</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">Начальник смены</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Руководство производственной сменой</td>
                  <td className="py-2.5 text-muted-foreground">Только свой чек-лист</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">Помощница начальника смены</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Помощь в управлении сменой</td>
                  <td className="py-2.5 text-muted-foreground">Только свой чек-лист</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">Бригадир упаковщиков</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Контроль упаковочной линии</td>
                  <td className="py-2.5 text-muted-foreground">Только свой чек-лист</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">Старший механик</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Руководство отделом механиков</td>
                  <td className="py-2.5 text-muted-foreground">Только свой чек-лист</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">Старший наладчик ТПА</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Руководство командами наладчиков</td>
                  <td className="py-2.5 text-muted-foreground">Только свой чек-лист</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">Начальник производства</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Управление всем производством</td>
                  <td className="py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded font-mono" style={{ background: "oklch(0.7 0.18 145 / 0.15)", color: "oklch(0.7 0.18 145)" }}>
                      Полный доступ
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium">Директор производства</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">Контроль всех процессов</td>
                  <td className="py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded font-mono" style={{ background: "oklch(0.7 0.18 145 / 0.15)", color: "oklch(0.7 0.18 145)" }}>
                      Полный доступ
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div
          className="rounded-xl border border-border p-6 mt-6"
          style={{ background: "oklch(0.18 0.012 260)" }}
        >
          <h2 className="font-mono text-sm font-semibold text-foreground mb-4">
            Часто задаваемые вопросы
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-foreground mb-1">
                Я вошёл, но не вижу чек-лист. Что делать?
              </p>
              <p className="text-xs text-muted-foreground">
                Скорее всего, администратор ещё не назначил вам производственную
                должность. Обратитесь к начальнику производства.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1">
                Могу ли я заполнить чек-лист за прошлый день?
              </p>
              <p className="text-xs text-muted-foreground">
                Нет, чек-листы привязаны к текущему периоду (день, неделя,
                месяц). Заполняйте их вовремя.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1">
                Кто видит мой чек-лист?
              </p>
              <p className="text-xs text-muted-foreground">
                Ваш чек-лист видите вы и руководители с правом мониторинга
                (Начальник производства и Директор производства).
              </p>
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="font-mono"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Вернуться на главную
          </Button>
        </div>
      </main>
    </div>
  );
}
