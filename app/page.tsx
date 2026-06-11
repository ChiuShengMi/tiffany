import Link from "next/link";

type Tool = {
  name: string;
  slug: string;
  description: string;
  tag: string;
};

const tools: Tool[] = [
  {
    name: "共同行事曆",
    slug: "shared-calendar",
    description: "同步台灣與日本國定假日，並讓成員共同新增、編輯、刪除行事。",
    tag: "Calendar",
  },
  {
    name: "圖片工具",
    slug: "image-tools",
    description: "預留給圖片壓縮、尺寸調整、格式轉換等常用操作。",
    tag: "Image",
  },
  {
    name: "檔案轉換",
    slug: "file-converter",
    description: "未來可放 CSV、JSON、PDF 或其他格式的轉換入口。",
    tag: "File",
  },
  {
    name: "計算工具",
    slug: "calculator",
    description: "匯率、日期、單位換算等小型計算功能的集中入口。",
    tag: "Calc",
  },
];

const roadmapItems = [
  "建立各工具的實際操作頁",
  "補上輸入、輸出與複製結果流程",
  "依使用頻率調整首頁排序",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-page text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-line pb-5">
          <Link href="/" className="text-lg font-semibold tracking-[0.04em]">
            Toolbox
          </Link>
          <nav aria-label="主要導覽" className="flex items-center gap-3 text-sm">
            <a
              href="#tools"
              className="rounded-md px-3 py-2 text-body transition hover:bg-surface"
            >
              工具列表
            </a>
            <a
              href="#roadmap"
              className="rounded-md px-3 py-2 text-body transition hover:bg-surface"
            >
              開發方向
            </a>
            <Link
              href="/account"
              className="rounded-md px-3 py-2 text-body transition hover:bg-surface"
            >
              帳號
            </Link>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Online Utility Hub
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-heading sm:text-5xl lg:text-6xl">
              把常用小工具整理成一個清楚好找的入口。
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg">
              這裡會是工具網站的導向頁。現在先把功能入口、狀態與版面建立起來，後續可以逐步把每個工具頁接上實際功能。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#tools"
                className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                查看工具
              </a>
              <a
                href="#roadmap"
                className="inline-flex h-12 items-center justify-center rounded-md border border-line-strong px-5 text-sm font-semibold text-brand transition hover:bg-surface"
              >
                查看規劃
              </a>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-line bg-surface p-4 shadow-panel">
            {tools.slice(0, 3).map((tool, index) => (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-md border border-line-soft bg-surface-muted p-4 transition hover:border-line-hover hover:bg-surface"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-sm font-semibold text-brand">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-semibold text-ink">
                    {tool.name}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-light">
                    {tool.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-xl text-subtle transition group-hover:translate-x-1 group-hover:text-brand"
                >
                  -&gt;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="tools" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:px-10">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                Tools
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-heading">
                功能入口
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-muted-light">
              目前每個入口會先前往準備中頁面，之後可以在同一路徑替換成實際工具。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group flex min-h-56 flex-col justify-between rounded-lg border border-line bg-surface-muted p-5 transition hover:-translate-y-1 hover:border-line-hover hover:bg-surface hover:shadow-lifted"
              >
                <span className="inline-flex w-fit rounded-md bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand">
                  {tool.tag}
                </span>
                <span>
                  <span className="block text-xl font-semibold text-ink">
                    {tool.name}
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-muted-light">
                    {tool.description}
                  </span>
                </span>
                <span className="text-sm font-semibold text-brand">
                  進入準備中頁面
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="roadmap" className="bg-section">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              Roadmap
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-heading">
              後續擴充方向
            </h2>
          </div>
          <div className="grid gap-3">
            {roadmapItems.map((item) => (
              <div
                key={item}
                className="rounded-md border border-line bg-surface px-5 py-4 text-body"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
