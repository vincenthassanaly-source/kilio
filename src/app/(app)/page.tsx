import { Suspense } from "react";
import { eyebrow } from "@/lib/ui";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { DashboardView } from "./DashboardView";
import { PullToRefresh } from "@/components/PullToRefresh";
import { MeteoHeaderCard } from "./MeteoHeaderCard";
import { Skeleton } from "@/components/skeletons/Skeleton";

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
export default function DashboardPage() {
  const today = todayISO();
  const dateLabel = new Date(`${today}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className={`${eyebrow} capitalize`}>{dateLabel}</p>
          <Suspense fallback={<Skeleton className="h-6 w-20 rounded-full" />}>
            <MeteoHeaderCard />
          </Suspense>
        </div>
        <h1 className="font-display text-[25px] font-bold tracking-tight text-ink">{greeting()}</h1>
      </header>

      <GlobalSearchBar />

      <PullToRefresh>
        <DashboardView today={today} />
      </PullToRefresh>
    </div>
  );
}
