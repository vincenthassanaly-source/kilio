import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppResumeRefresh } from "@/components/AppResumeRefresh";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kilio",
  description: "Liste de courses, recettes, suivi calorique et placard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kilio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#292f2d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full flex flex-col overflow-hidden bg-background text-ink font-sans">
        {children}
        <ServiceWorkerRegister />
        <AppResumeRefresh />
      </body>
    </html>
  );
}
