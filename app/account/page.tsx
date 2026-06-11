import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <main className="flex min-h-screen items-center bg-page px-5 py-10 text-ink">
        <section className="mx-auto w-full max-w-2xl rounded-lg border border-line bg-surface p-8 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
            Setup
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-heading">
            Supabase 尚未設定
          </h1>
          <p className="mt-5 leading-8 text-muted">
            請先建立 Supabase 專案，並在 Vercel 或本機設定
            <code className="mx-1 rounded bg-brand-soft px-1.5 py-0.5 text-brand">
              NEXT_PUBLIC_SUPABASE_URL
            </code>
            和
            <code className="mx-1 rounded bg-brand-soft px-1.5 py-0.5 text-brand">
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            </code>
            。
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-md border border-line-strong px-4 text-sm font-semibold text-brand transition hover:bg-page"
          >
            回到首頁
          </Link>
        </section>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-page px-5 py-10 text-ink">
      <section className="mx-auto w-full max-w-3xl rounded-lg border border-line bg-surface p-8 shadow-panel">
        <div className="flex flex-col justify-between gap-5 border-b border-line pb-6 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              Account
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-heading">
              帳號資訊
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              這個 user id 之後會用來記錄共同行事曆的建立、編輯、刪除與 audit log。
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-md border border-line-strong px-4 text-sm font-semibold text-brand transition hover:bg-page"
            >
              回到首頁
            </Link>
            <form action={signOutAction}>
              <button className="h-11 rounded-md border border-line-strong px-4 text-sm font-semibold text-brand transition hover:bg-page">
                登出
              </button>
            </form>
          </div>
        </div>

        <dl className="mt-6 grid gap-4">
          <div className="rounded-md border border-line bg-surface-muted p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              User ID
            </dt>
            <dd className="mt-2 break-all font-mono text-sm text-body">
              {user.id}
            </dd>
          </div>
          <div className="rounded-md border border-line bg-surface-muted p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              Email
            </dt>
            <dd className="mt-2 text-sm text-body">{user.email}</dd>
          </div>
          <div className="rounded-md border border-line bg-surface-muted p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              顯示名稱
            </dt>
            <dd className="mt-2 text-sm text-body">
              {profile?.display_name ?? user.user_metadata.display_name ?? "未設定"}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
