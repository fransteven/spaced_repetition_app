import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "NeuroCards — Spaced Repetition Learning",
    template: "%s — NeuroCards",
  },
  description: "Advanced spaced repetition flashcard app powered by FSRS 4.5 algorithm",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "NeuroCards",
  },
};

import { Providers } from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
