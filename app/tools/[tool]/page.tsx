import Link from "next/link";
import { notFound } from "next/navigation";

const toolNames: Record<string, string> = {
  "text-cleaner": "文字整理",
  "image-tools": "圖片工具",
  "file-converter": "檔案轉換",
  calculator: "計算工具",
};

export function generateStaticParams() {
  return Object.keys(toolNames).map((tool) => ({ tool }));
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  const toolName = toolNames[tool];

  if (!toolName) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center bg-page px-5 py-10 text-ink">
      <section className="mx-auto w-full max-w-2xl rounded-lg border border-line bg-surface p-8 shadow-panel sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
          Coming Soon
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-heading">
          {toolName}
        </h1>
        <p className="mt-5 leading-8 text-muted">
          這個工具頁面已經先建立路徑，實際功能會在後續開發時接上。
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          回到首頁
        </Link>
      </section>
    </main>
  );
}
