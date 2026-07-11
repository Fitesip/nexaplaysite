import type { Metadata } from "next";
import { Exo_2, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const chakra = Exo_2({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
});

export const metadata: Metadata = {
  title: "NEXAPLAY — Minecraft сервер",
  description: "NEXAPLAY — пиксельный мир без границ. Выживание, кастомные механики и дружное комьюнити.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${chakra.variable} ${inter.variable} ${mono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
