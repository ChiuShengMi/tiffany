import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toolbox",
  description: "常用工具網站的導向首頁",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
