import Link from "next/link";
import { signInAction } from "../actions";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error, message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center bg-page px-5 py-10 text-ink">
      <section className="mx-auto w-full max-w-md rounded-lg border border-line bg-surface p-8 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
          Account
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-heading">登入</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          登入後才能建立共同行事曆、編輯事件，並記錄每一次操作的人。
        </p>

        {message ? (
          <p className="mt-5 rounded-md border border-line bg-section px-4 py-3 text-sm text-body">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-md border border-line-strong bg-page px-4 py-3 text-sm text-brand">
            {error}
          </p>
        ) : null}

        <form action={signInAction} className="mt-6 grid gap-4">
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
              autoComplete="current-password"
              className="h-11 rounded-md border border-line bg-surface px-3 text-ink outline-none transition focus:border-line-hover"
            />
          </label>
          <button
            type="submit"
            className="mt-2 flex h-12 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            登入
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          還沒有帳號？{" "}
          <Link href="/auth/sign-up" className="font-semibold text-brand">
            註冊
          </Link>
        </p>
      </section>
    </main>
  );
}
