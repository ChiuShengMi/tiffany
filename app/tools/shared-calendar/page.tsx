import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createCalendarAction,
  createUserEventAction,
  deleteUserEventAction,
  syncHolidayEventsAction,
  updateUserEventAction,
} from "./actions";

export const dynamic = "force-dynamic";

type SharedCalendarPageProps = {
  searchParams: Promise<{
    calendar?: string;
    year?: string;
    month?: string;
    error?: string;
    detail?: string;
  }>;
};

type Calendar = {
  id: string;
  name: string;
  owner_user_id: string;
};

type CalendarMember = {
  calendar_id: string;
  role: "owner" | "editor" | "viewer";
};

type HolidayEvent = {
  country_code: "TW" | "JP";
  holiday_date: string;
  local_name: string;
  name: string;
};

type UserEvent = {
  id: string;
  calendar_id: string;
  title: string;
  start_date: string;
  end_date: string;
  note: string | null;
  created_by_user_id: string;
  updated_by_user_id: string;
};

type AuditLog = {
  id: string;
  action: "create" | "update" | "delete";
  actor_user_id: string;
  created_at: string;
};

const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const days = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month - 1, day));
  }

  return days;
}

function eventOccursOn(event: UserEvent, dateKey: string) {
  return event.start_date <= dateKey && event.end_date >= dateKey;
}

function getErrorMessage(error?: string) {
  if (!error) return null;

  const messages: Record<string, string> = {
    create_calendar_failed: "建立日曆失敗，請確認 Supabase schema 已更新。",
    create_member_failed: "建立日曆成員失敗，請確認 RLS policy 已更新。",
    holiday_sync_failed: "同步國定假日 API 失敗，請稍後再試。",
    holiday_upsert_failed: "寫入國定假日失敗，請確認 holiday_events 權限。",
    create_event_failed: "新增事件失敗，請確認你有 editor 權限。",
    update_event_failed: "更新事件失敗，請確認你有 editor 權限。",
    delete_event_failed: "刪除事件失敗，請確認你有 editor 權限。",
    invalid_event: "事件資料不完整。",
    not_allowed: "你沒有編輯這個日曆的權限。",
  };

  return messages[error] ?? "操作失敗，請稍後再試。";
}

export default async function SharedCalendarPage({
  searchParams,
}: SharedCalendarPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/account");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const today = new Date();
  const currentYear = Number(params.year) || today.getFullYear();
  const currentMonth = Number(params.month) || today.getMonth() + 1;
  const monthDays = getMonthDays(currentYear, currentMonth);
  const firstDateKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const lastDateKey = toDateKey(new Date(currentYear, currentMonth, 0));
  const previousMonth = addMonths(currentYear, currentMonth, -1);
  const nextMonth = addMonths(currentYear, currentMonth, 1);

  const { data: memberships } = await supabase
    .from("calendar_members")
    .select("calendar_id, role")
    .eq("user_id", user.id);

  const memberRows = (memberships ?? []) as CalendarMember[];
  const calendarIds = memberRows.map((member) => member.calendar_id);

  const { data: calendarsData } = calendarIds.length
    ? await supabase
        .from("calendars")
        .select("id, name, owner_user_id")
        .in("id", calendarIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const calendars = (calendarsData ?? []) as Calendar[];
  const selectedCalendarId = params.calendar ?? calendars[0]?.id ?? "";
  const selectedCalendar = calendars.find(
    (calendar) => calendar.id === selectedCalendarId,
  );
  const selectedMember = memberRows.find(
    (member) => member.calendar_id === selectedCalendarId,
  );
  const canEdit =
    selectedMember?.role === "owner" || selectedMember?.role === "editor";
  const errorMessage = getErrorMessage(params.error);
  const errorDetail = params.detail ? decodeURIComponent(params.detail) : null;

  const { data: holidayData } = selectedCalendarId
    ? await supabase
        .from("holiday_events")
        .select("country_code, holiday_date, local_name, name")
        .gte("holiday_date", firstDateKey)
        .lte("holiday_date", lastDateKey)
        .order("holiday_date")
    : { data: [] };

  const { data: userEventData } = selectedCalendarId
    ? await supabase
        .from("user_events")
        .select(
          "id, calendar_id, title, start_date, end_date, note, created_by_user_id, updated_by_user_id",
        )
        .eq("calendar_id", selectedCalendarId)
        .is("deleted_at", null)
        .lte("start_date", lastDateKey)
        .gte("end_date", firstDateKey)
        .order("start_date")
    : { data: [] };

  const { data: auditData } = selectedCalendarId
    ? await supabase
        .from("event_audit_logs")
        .select("id, action, actor_user_id, created_at")
        .eq("calendar_id", selectedCalendarId)
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [] };

  const holidays = (holidayData ?? []) as HolidayEvent[];
  const userEvents = (userEventData ?? []) as UserEvent[];
  const auditLogs = (auditData ?? []) as AuditLog[];

  return (
    <main className="min-h-screen bg-page px-5 py-8 text-ink">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <header className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              Shared Calendar
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-heading">
              共同行事曆
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              國定假日資料和使用者事件分開儲存，所有新增、編輯與刪除都會記錄 actor user id。
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex h-11 items-center justify-center rounded-md border border-line-strong px-4 text-sm font-semibold text-brand transition hover:bg-surface"
          >
            帳號資訊
          </Link>
        </header>

        {errorMessage || errorDetail ? (
          <p className="rounded-md border border-line-strong bg-surface px-4 py-3 text-sm text-brand">
            {errorMessage ?? "同步完成，但有部分提醒。"}
            {errorDetail ? (
              <span className="mt-2 block break-all text-xs text-body">
                {errorDetail}
              </span>
            ) : null}
          </p>
        ) : null}

        {!calendars.length ? (
          <section className="rounded-lg border border-line bg-surface p-6 shadow-panel">
            <h2 className="text-xl font-semibold text-heading">
              建立第一個共同行事曆
            </h2>
            <form action={createCalendarAction} className="mt-5 flex gap-3">
              <input
                suppressHydrationWarning
                name="name"
                placeholder="例如：家族共同行事曆"
                className="h-11 flex-1 rounded-md border border-line bg-surface px-3 text-ink outline-none transition focus:border-line-hover"
              />
              <button className="h-11 rounded-md bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-hover">
                建立
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-panel lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2 text-sm font-medium text-body">
                  <span>選擇日曆</span>
                  <div className="flex flex-wrap gap-2">
                    {calendars.map((calendar) => (
                      <Link
                        key={calendar.id}
                        href={`/tools/shared-calendar?calendar=${calendar.id}&year=${currentYear}&month=${currentMonth}`}
                        className={`rounded-md border px-3 py-2 text-sm transition ${
                          calendar.id === selectedCalendarId
                            ? "border-line-hover bg-brand-soft text-brand"
                            : "border-line text-body hover:bg-page"
                        }`}
                      >
                        {calendar.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <form action={createCalendarAction} className="grid gap-2">
                  <label className="text-sm font-medium text-body">
                    新增日曆
                  </label>
                  <div className="flex gap-2">
                    <input
                suppressHydrationWarning
                name="name"
                      placeholder="新日曆名稱"
                      className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-ink outline-none transition focus:border-line-hover"
                    />
                    <button className="h-11 rounded-md border border-line-strong px-4 text-sm font-semibold text-brand transition hover:bg-page">
                      建立
                    </button>
                  </div>
                </form>
              </div>

              {selectedCalendar ? (
                <form action={syncHolidayEventsAction} className="flex gap-2">
                  <input type="hidden" name="calendarId" value={selectedCalendar.id} />
                  <input type="hidden" name="year" value={currentYear} />
                  <button
                    disabled={!canEdit}
                    className="h-11 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    同步 {currentYear} TW / JP 假日
                  </button>
                </form>
              ) : null}
            </section>

            {selectedCalendar ? (
              <section className="grid gap-6">
                <div className="rounded-lg border border-line bg-surface p-5 shadow-panel">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <Link
                      href={`/tools/shared-calendar?calendar=${selectedCalendar.id}&year=${previousMonth.year}&month=${previousMonth.month}`}
                      className="rounded-md border border-line px-3 py-2 text-sm text-body transition hover:bg-page"
                    >
                      上個月
                    </Link>
                    <h2 className="text-xl font-semibold text-heading">
                      {currentYear} 年 {currentMonth} 月
                    </h2>
                    <Link
                      href={`/tools/shared-calendar?calendar=${selectedCalendar.id}&year=${nextMonth.year}&month=${nextMonth.month}`}
                      className="rounded-md border border-line px-3 py-2 text-sm text-body transition hover:bg-page"
                    >
                      下個月
                    </Link>
                  </div>

                  <div className="grid grid-cols-7 border-y border-line text-center text-xs font-semibold text-accent">
                    {weekdays.map((weekday, index) => (
                      <div
                        key={weekday}
                        className={`py-2 ${
                          index === 0 || index === 6 ? "calendar-weekend" : ""
                        }`}
                      >
                        {weekday}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {monthDays.map((date, index) => {
                      if (!date) {
                        return (
                          <div
                            key={`blank-${index}`}
                            className="min-h-44 border-b border-r border-line bg-page"
                          />
                        );
                      }

                      const dateKey = toDateKey(date);
                      const dayHolidays = holidays.filter(
                        (holiday) => holiday.holiday_date === dateKey,
                      );
                      const dayEvents = userEvents.filter((event) =>
                        eventOccursOn(event, dateKey),
                      );
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                      return (
                        <div
                          key={dateKey}
                          className="flex min-h-44 flex-col border-b border-r border-line bg-surface p-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div
                              className={`text-sm font-semibold ${
                                isWeekend ? "calendar-weekend" : "text-heading"
                              }`}
                            >
                              {date.getDate()}
                            </div>
                            <details className="relative">
                              <summary className="cursor-pointer rounded border border-line px-2 py-1 text-xs font-semibold text-brand transition hover:bg-page">
                                ＋新增
                              </summary>
                              <form
                                action={createUserEventAction}
                                className="absolute right-0 z-10 mt-2 grid w-64 gap-2 rounded-lg border border-line bg-surface p-3 shadow-panel"
                              >
                                <input type="hidden" name="calendarId" value={selectedCalendar.id} />
                                <input type="hidden" name="startDate" value={dateKey} />
                                <input type="hidden" name="endDate" value={dateKey} />
                                <label className="grid gap-1 text-xs font-medium text-body">
                                  標題
                                  <input
                suppressHydrationWarning
                required
                                    name="title"
                                    className="h-9 rounded border border-line bg-surface px-2 text-ink outline-none focus:border-line-hover"
                                  />
                                </label>
                                <label className="grid gap-1 text-xs font-medium text-body">
                                  備註
                                  <textarea
                suppressHydrationWarning
                name="note"
                                    className="min-h-16 rounded border border-line bg-surface px-2 py-1 text-ink outline-none focus:border-line-hover"
                                  />
                                </label>
                                <button
                                  disabled={!canEdit}
                                  className="h-9 rounded bg-brand text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  這天新增
                                </button>
                              </form>
                            </details>
                          </div>
                          <div className="mt-2 grid flex-1 content-start gap-1">
                            {dayHolidays.map((holiday) => (
                              <div
                                key={`${holiday.country_code}-${holiday.name}`}
                                className="rounded bg-brand-soft px-2 py-1 text-xs leading-5 text-brand"
                              >
                                {holiday.country_code} {holiday.local_name}
                              </div>
                            ))}
                            {dayEvents.map((event) => (
                              <details
                                key={event.id}
                                className="relative rounded border border-line-soft bg-surface-muted px-2 py-1 text-xs text-body"
                              >
                                <summary className="cursor-pointer font-semibold text-ink">
                                  {event.title}
                                </summary>
                                <div className="absolute left-0 z-20 mt-2 w-72 rounded-lg border border-line bg-surface p-3 shadow-panel">
                                  <form action={updateUserEventAction} className="grid gap-2">
                                    <input type="hidden" name="calendarId" value={selectedCalendar.id} />
                                    <input type="hidden" name="eventId" value={event.id} />
                                    <input
                                      suppressHydrationWarning
                                      name="title"
                                      defaultValue={event.title}
                                      className="h-9 w-full rounded border border-line bg-surface px-2 text-xs text-ink outline-none focus:border-line-hover"
                                    />
                                    <input
                                      suppressHydrationWarning
                                      name="startDate"
                                      type="date"
                                      defaultValue={event.start_date}
                                      className="h-9 w-full rounded border border-line bg-surface px-2 text-xs text-ink outline-none focus:border-line-hover"
                                    />
                                    <input
                                      suppressHydrationWarning
                                      name="endDate"
                                      type="date"
                                      defaultValue={event.end_date}
                                      className="h-9 w-full rounded border border-line bg-surface px-2 text-xs text-ink outline-none focus:border-line-hover"
                                    />
                                    <textarea
                                      suppressHydrationWarning
                                      name="note"
                                      defaultValue={event.note ?? ""}
                                      className="min-h-16 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-line-hover"
                                    />
                                    <button
                                      disabled={!canEdit}
                                      className="h-9 rounded bg-brand text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      更新
                                    </button>
                                  </form>
                                  <form action={deleteUserEventAction} className="mt-2">
                                    <input type="hidden" name="calendarId" value={selectedCalendar.id} />
                                    <input type="hidden" name="eventId" value={event.id} />
                                    <button
                                      disabled={!canEdit}
                                      className="h-9 w-full rounded border border-line-strong text-xs font-semibold text-brand disabled:opacity-50"
                                    >
                                      刪除
                                    </button>
                                  </form>
                                </div>
                              </details>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <aside className="rounded-lg border border-line bg-surface p-5 shadow-panel">
                    <h2 className="text-xl font-semibold text-heading">
                      最近操作
                    </h2>
                    <div className="mt-4 grid gap-2">
                      {auditLogs.length ? (
                        auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="rounded-md border border-line bg-surface-muted p-3 text-xs leading-5 text-body"
                          >
                            <div className="font-semibold text-ink">{log.action}</div>
                            <div className="break-all">actor: {log.actor_user_id}</div>
                            <div>{new Date(log.created_at).toLocaleString("zh-TW")}</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted">尚無操作紀錄。</p>
                      )}
                    </div>
                </aside>
              </section>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}


