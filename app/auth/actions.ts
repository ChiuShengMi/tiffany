"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getRequiredField(formData: FormData, name: string) {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function getReadableAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "登入失敗：帳號不存在、密碼錯誤，或 Email 尚未完成驗證。請先確認你已註冊成功，並到信箱點擊 Supabase 驗證信。";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Email 尚未完成驗證。請先到信箱點擊 Supabase 驗證信後再登入。";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "這個 Email 已經註冊過，請直接登入；如果忘記密碼，之後需要補重設密碼功能。";
  }

  return message;
}

export async function signUpAction(formData: FormData) {
  const displayName = getRequiredField(formData, "displayName");
  const email = getRequiredField(formData, "email");
  const password = getRequiredField(formData, "password");

  if (!displayName) {
    redirectWithError("/auth/sign-up", "請輸入顯示名稱。");
  }

  if (!email || !password) {
    redirectWithError("/auth/sign-up", "請輸入 Email 和密碼。");
  }

  if (password.length < 8) {
    redirectWithError("/auth/sign-up", "密碼至少需要 8 個字元。");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithError(
      "/auth/sign-up",
      "尚未設定 Supabase 環境變數，請先設定 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。",
    );
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
    },
  });

  if (error) {
    redirectWithError("/auth/sign-up", getReadableAuthError(error.message));
  }

  redirect(
    `/auth/sign-in?message=${encodeURIComponent(
      "註冊完成。若 Supabase 要求 Email 驗證，請先到信箱完成驗證後再登入。",
    )}`,
  );
}

export async function signInAction(formData: FormData) {
  const email = getRequiredField(formData, "email");
  const password = getRequiredField(formData, "password");

  if (!email || !password) {
    redirectWithError("/auth/sign-in", "請輸入 Email 和密碼。");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithError(
      "/auth/sign-in",
      "尚未設定 Supabase 環境變數，請先設定 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。",
    );
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithError("/auth/sign-in", getReadableAuthError(error.message));
  }

  redirect("/account");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/");
}
