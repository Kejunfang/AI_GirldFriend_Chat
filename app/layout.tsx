import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI Companion Chat",
  description: "A customizable AI companion chat project with memory and voice support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
