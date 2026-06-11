"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HolidayApiItem = {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
};

type HolidayRow = {
  country_code: string;
  holiday_date: string;
  local_name: string;
  name: string;
  source: string;
  year: number;
  synced_at: string;
};

function getField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalField(formData: FormData, name: string) {
  const value = getField(formData, name);
  return value ? value : null;
}

function getTaiwanFallbackHolidays(year: number): HolidayApiItem[] {
  const holidaysByYear: Record<number, Array<[string, string, string]>> = {
    2026: [
      ["01-01", "中華民國開國紀念日", "Republic Day"],
      ["02-16", "農曆春節", "Lunar New Year Holiday"],
      ["02-17", "農曆春節", "Lunar New Year Holiday"],
      ["02-18", "農曆春節", "Lunar New Year Holiday"],
      ["02-19", "農曆春節", "Lunar New Year Holiday"],
      ["02-20", "農曆春節", "Lunar New Year Holiday"],
      ["02-28", "和平紀念日", "Peace Memorial Day"],
      ["04-04", "兒童節", "Children's Day"],
      ["04-05", "清明節", "Tomb-Sweeping Day"],
      ["05-01", "勞動節", "Labor Day"],
      ["06-19", "端午節", "Dragon Boat Festival"],
      ["09-25", "中秋節", "Mid-Autumn Festival"],
      ["09-28", "孔子誕辰紀念日", "Confucius' Birthday"],
      ["10-10", "國慶日", "National Day"],
      ["10-25", "臺灣光復暨金門古寧頭大捷紀念日", "Retrocession Day"],
      ["12-25", "行憲紀念日", "Constitution Day"],
    ],
  };

  const fixedHolidays = [
    ["01-01", "中華民國開國紀念日", "Republic Day"],
    ["02-28", "和平紀念日", "Peace Memorial Day"],
    ["04-04", "兒童節", "Children's Day"],
    ["05-01", "勞動節", "Labor Day"],
    ["10-10", "國慶日", "National Day"],
  ];
  const holidays = holidaysByYear[year] ?? fixedHolidays;

  return holidays.map(([date, localName, name]) => ({
    date: `${year}-${date}`,
    localName,
    name,
    countryCode: "TW",
  }));
}

async function fetchPublicHolidays(year: number, country: string) {
  const response = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`,
    { cache: "no-store" },
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${country}: ${response.status} ${body.slice(0, 120)}`);
  }

  if (!body.trim()) {
    throw new Error(`${country}: empty response`);
  }

  try {
    return JSON.parse(body) as HolidayApiItem[];
  } catch {
    throw new Error(`${country}: invalid JSON response`);
  }
}

function toHolidayRows(
  holidays: HolidayApiItem[],
  country: string,
  year: number,
  source: string,
): HolidayRow[] {
  const syncedAt = new Date().toISOString();

  return holidays.map((holiday) => ({
    country_code: country,
    holiday_date: holiday.date,
    local_name: holiday.localName,
    name: holiday.name,
    source,
    year,
    synced_at: syncedAt,
  }));
}

async function requireUser() {
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

  return { supabase, user };
}

async function requireEditableCalendar(calendarId: string) {
  const { supabase, user } = await requireUser();
  const { data: member } = await supabase
    .from("calendar_members")
    .select("role")
    .eq("calendar_id", calendarId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || !["owner", "editor"].includes(member.role)) {
    redirect("/tools/shared-calendar?error=not_allowed");
  }

  return { supabase, user };
}

export async function createCalendarAction(formData: FormData) {
  const name = getField(formData, "name") || "共同行事曆";
  const { supabase, user } = await requireUser();
  const calendarId = crypto.randomUUID();

  const { error: calendarError } = await supabase.from("calendars").insert({
    id: calendarId,
    name,
    owner_user_id: user.id,
  });

  if (calendarError) {
    redirect(
      `/tools/shared-calendar?error=create_calendar_failed&detail=${encodeURIComponent(calendarError.message)}`,
    );
  }

  const { error: memberError } = await supabase.from("calendar_members").insert({
    calendar_id: calendarId,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    redirect(
      `/tools/shared-calendar?error=create_member_failed&detail=${encodeURIComponent(memberError.message)}`,
    );
  }

  revalidatePath("/tools/shared-calendar");
  redirect(`/tools/shared-calendar?calendar=${calendarId}`);
}

export async function syncHolidayEventsAction(formData: FormData) {
  const year = Number(getField(formData, "year"));
  const calendarId = getField(formData, "calendarId");

  if (!calendarId || !Number.isInteger(year)) {
    redirect("/tools/shared-calendar?error=invalid_sync_request");
  }

  const { supabase } = await requireEditableCalendar(calendarId);
  const countries = ["TW", "JP"];
  const holidayRows: HolidayRow[] = [];
  const failedCountries: string[] = [];

  for (const country of countries) {
    try {
      const holidays = await fetchPublicHolidays(year, country);
      holidayRows.push(...toHolidayRows(holidays, country, year, "nager"));
    } catch (error) {
      failedCountries.push(
        error instanceof Error ? error.message : `${country}: unknown error`,
      );

      if (country === "TW") {
        holidayRows.push(
          ...toHolidayRows(
            getTaiwanFallbackHolidays(year),
            country,
            year,
            "local_fallback",
          ),
        );
      }
    }
  }

  if (!holidayRows.length) {
    redirect(
      `/tools/shared-calendar?calendar=${calendarId}&error=holiday_sync_failed&detail=${encodeURIComponent(failedCountries.join("; "))}`,
    );
  }

  const { error } = await supabase.from("holiday_events").upsert(holidayRows, {
    onConflict: "country_code,holiday_date,name",
  });

  if (error) {
    redirect(`/tools/shared-calendar?calendar=${calendarId}&error=holiday_upsert_failed`);
  }

  revalidatePath("/tools/shared-calendar");
  const detail = failedCountries.length
    ? `&detail=${encodeURIComponent(`部分來源同步失敗：${failedCountries.join("; ")}。已寫入可用資料。`)}`
    : "";

  redirect(
    `/tools/shared-calendar?calendar=${calendarId}&year=${year}${detail}`,
  );
}

export async function createUserEventAction(formData: FormData) {
  const calendarId = getField(formData, "calendarId");
  const title = getField(formData, "title");
  const startDate = getField(formData, "startDate");
  const endDate = getField(formData, "endDate") || startDate;
  const note = getOptionalField(formData, "note");

  if (!calendarId || !title || !startDate || !endDate) {
    redirect(`/tools/shared-calendar?calendar=${calendarId}&error=invalid_event`);
  }

  const { supabase, user } = await requireEditableCalendar(calendarId);
  const { data: event, error } = await supabase
    .from("user_events")
    .insert({
      calendar_id: calendarId,
      title,
      start_date: startDate,
      end_date: endDate,
      note,
      created_by_user_id: user.id,
      updated_by_user_id: user.id,
    })
    .select()
    .single();

  if (error || !event) {
    redirect(`/tools/shared-calendar?calendar=${calendarId}&error=create_event_failed`);
  }

  await supabase.from("event_audit_logs").insert({
    calendar_id: calendarId,
    event_id: event.id,
    action: "create",
    actor_user_id: user.id,
    before_data: null,
    after_data: event,
  });

  revalidatePath("/tools/shared-calendar");
  redirect(`/tools/shared-calendar?calendar=${calendarId}`);
}

export async function updateUserEventAction(formData: FormData) {
  const calendarId = getField(formData, "calendarId");
  const eventId = getField(formData, "eventId");
  const title = getField(formData, "title");
  const startDate = getField(formData, "startDate");
  const endDate = getField(formData, "endDate") || startDate;
  const note = getOptionalField(formData, "note");

  if (!calendarId || !eventId || !title || !startDate || !endDate) {
    redirect(`/tools/shared-calendar?calendar=${calendarId}&error=invalid_event`);
  }

  const { supabase, user } = await requireEditableCalendar(calendarId);
  const { data: before } = await supabase
    .from("user_events")
    .select()
    .eq("id", eventId)
    .eq("calendar_id", calendarId)
    .maybeSingle();

  const { data: after, error } = await supabase
    .from("user_events")
    .update({
      title,
      start_date: startDate,
      end_date: endDate,
      note,
      updated_by_user_id: user.id,
    })
    .eq("id", eventId)
    .eq("calendar_id", calendarId)
    .select()
    .single();

  if (error || !after) {
    redirect(`/tools/shared-calendar?calendar=${calendarId}&error=update_event_failed`);
  }

  await supabase.from("event_audit_logs").insert({
    calendar_id: calendarId,
    event_id: eventId,
    action: "update",
    actor_user_id: user.id,
    before_data: before,
    after_data: after,
  });

  revalidatePath("/tools/shared-calendar");
  redirect(`/tools/shared-calendar?calendar=${calendarId}`);
}

export async function deleteUserEventAction(formData: FormData) {
  const calendarId = getField(formData, "calendarId");
  const eventId = getField(formData, "eventId");

  if (!calendarId || !eventId) {
    redirect(`/tools/shared-calendar?calendar=${calendarId}&error=invalid_event`);
  }

  const { supabase, user } = await requireEditableCalendar(calendarId);
  const { data: before } = await supabase
    .from("user_events")
    .select()
    .eq("id", eventId)
    .eq("calendar_id", calendarId)
    .maybeSingle();

  const { data: after, error } = await supabase
    .from("user_events")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_user_id: user.id,
      updated_by_user_id: user.id,
    })
    .eq("id", eventId)
    .eq("calendar_id", calendarId)
    .select()
    .single();

  if (error || !after) {
    redirect(`/tools/shared-calendar?calendar=${calendarId}&error=delete_event_failed`);
  }

  await supabase.from("event_audit_logs").insert({
    calendar_id: calendarId,
    event_id: eventId,
    action: "delete",
    actor_user_id: user.id,
    before_data: before,
    after_data: after,
  });

  revalidatePath("/tools/shared-calendar");
  redirect(`/tools/shared-calendar?calendar=${calendarId}`);
}
