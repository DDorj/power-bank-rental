import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/shared/providers/app-providers";

export const metadata: Metadata = {
  title: "PowerGo",
  description: "Power bank rental системийн хэрэглэгчийн веб",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" className="antialiased">
      <body className="powergo-app">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
