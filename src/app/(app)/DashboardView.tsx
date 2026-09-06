import { Suspense } from "react";
import { card } from "@/lib/ui";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { Skeleton } from "@/components/skeletons/Skeleton";
import { DashboardNutritionCard } from "./DashboardNutritionCard";
import { DashboardTachesCard } from "./DashboardTachesCard";
import { DashboardHabitudesCard } from "./DashboardHabitudesCard";
import { QuickAddFab } from "./QuickAddFab";

// Silhouette des cartes "Aujourd'hui" + "Prochain événement", identique au
// rendu isLoading historique de DashboardView — sert de fallback au
// <Suspense> de DashboardTachesCard pendant que la query `taches` résout.
function TachesCardsSkeleton() {
  return (
    <>
      <div className={`${card} flex flex-col gap-3`}>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-ink">Aujourd&apos;hui</span>
          <Skeleton className="h-3 w-14" />
        </div>
        <ListItemSkeletonGroup count={3} />
      </div>
      <CardSkeleton withRing={false} />
    </>
  );
}

function HabitudesSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <span className="px-0.5 text-[14px] font-semibold text-ink">Habitudes</span>
      <div className="flex gap-3 overflow-x-hidden pb-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[50px] w-[50px] shrink-0 rounded-full" />
        ))}
      </div>
    </div>
  );
}

// Chaque carte est un Server Component async indépendant (Dashboard*Card),
// wrappé dans son propre <Suspense> : elle apparaît dès que SA requête est
// prête, sans attendre les autres. Voir
// reports/2026-09-04-dashboard-streaming-par-section.md.
export function DashboardView({ today }: { today: string }) {
  return (
    <>
      <Suspense fallback={<CardSkeleton />}>
        <DashboardNutritionCard today={today} />
      </Suspense>

      <Suspense fallback={<TachesCardsSkeleton />}>
        <DashboardTachesCard today={today} />
      </Suspense>

      <Suspense fallback={<HabitudesSkeleton />}>
        <DashboardHabitudesCard today={today} />
      </Suspense>

      <QuickAddFab />
    </>
  );
}
