import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Sora, Inter } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppResumeRefresh } from "@/components/AppResumeRefresh";
import { THEME_COOKIE_KEY, themeInitScript } from "@/lib/theme";
import "./globals.css";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const isDark = cookieStore.get(THEME_COOKIE_KEY)?.value === "dark";

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${sora.variable} ${inter.variable} h-full antialiased${isDark ? " dark" : ""}`}
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
