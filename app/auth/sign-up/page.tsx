import Link from "next/link";
import { signUpAction } from "../actions";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center bg-page px-5 py-10 text-ink">
      <section className="mx-auto w-full max-w-md rounded-lg border border-line bg-surface p-8 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
          Account
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-heading">註冊</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          建立帳號後，系統會用你的 user id 記錄共同行事曆的新增、編輯與刪除操作。
        </p>

        {error ? (
          <p className="mt-5 rounded-md border border-line-strong bg-page px-4 py-3 text-sm text-brand">
            {error}
          </p>
        ) : null}

        <form action={signUpAction} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-body">
            顯示名稱
            <input
              required
              name="displayName"
              type="text"
              autoComplete="name"
              className="h-11 rounded-md border border-line bg-surface px-3 text-ink outline-none transition focus:border-line-hover"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-body">
            Email
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              className="h-11 rounded-md border border-line bg-surface px-3 text-ink outline-none transition focus:border-line-hover"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-body">
            密碼
            <input
              required
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className="h-11 rounded-md border border-line bg-surface px-3 text-ink outline-none transition focus:border-line-hover"
            />
          </label>
          <button
            type="submit"
            className="mt-2 flex h-12 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            確認註冊
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          已經有帳號？{" "}
          <Link href="/auth/sign-in" className="font-semibold text-brand">
            登入
          </Link>
        </p>
      </section>
    </main>
  );
}
