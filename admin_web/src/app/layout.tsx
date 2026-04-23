import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/shared/providers/app-providers";

export const metadata: Metadata = {
  title: "Power Bank Admin",
  description: "Power bank rental системийн admin удирдлагын самбар",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" className="antialiased">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
