import { eyebrow } from "@/lib/ui";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { DashboardView } from "./DashboardView";
import { PullToRefresh } from "@/components/PullToRefresh";
import { connection } from "next/server";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Le header (statique, instantané) est rendu côté serveur, sans aucun await
// avant le retour du JSX. Chaque carte du dashboard est un Server Component
// async indépendant (voir DashboardView.tsx), streamée via son propre
// <Suspense> : elle s'affiche dès que SA requête est prête, sans attendre
// les autres. Voir reports/2026-09-04-dashboard-streaming-par-section.md.
export default async function DashboardPage() {
  // TODO: Cache Components adoption. Added to unblock the build: remove this boundary to re-trigger the error and review the documented options.
  await connection();
  const today = todayISO();
  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-0.5">
        <p className={`${eyebrow} capitalize`}>{dateLabel}</p>
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-[25px] font-bold tracking-tight text-ink">{greeting()}</h1>
        </div>
      </header>

      <GlobalSearchBar />

      <PullToRefresh>
        <DashboardView today={today} />
      </PullToRefresh>
    </div>
  );
}
