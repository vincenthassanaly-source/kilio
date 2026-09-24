import { Skeleton } from "./Skeleton";
import { CardSkeleton } from "./CardSkeleton";
import { ListItemSkeletonGroup } from "./ListItemSkeleton";
import { card } from "@/lib/ui";

/** En-tête (date + salutation) du dashboard, en attente de la date du jour :
 * fallback du <Suspense> de l'en-tête dans src/app/(app)/page.tsx. */
export function DashboardHeaderSkeleton() {
  return (
    <header className="flex flex-col gap-1.5">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-6 w-44" />
    </header>
  );
}

/** Reproduit la mise en page de la page d'accueil (src/app/(app)/page.tsx) :
 * en-tête, carte nutrition (ring), carte "Aujourd'hui" (liste de tâches),
 * carte "Prochain événement", puis la rangée d'habitudes. Affiché pendant
 * `isLoading` des queries du dashboard, à la place d'un écran blanc. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardHeaderSkeleton />

      <Skeleton className="h-11 w-full rounded-2xl" />

      <CardSkeleton />

      <div className={`${card} flex flex-col gap-3`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>
        <ListItemSkeletonGroup count={3} />
      </div>

      <div className={`${card} flex items-center gap-3.5`}>
        <Skeleton className="h-[46px] w-[46px] shrink-0 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-3.5 w-36" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3.5 w-20" />
        <div className="flex gap-3 overflow-x-hidden pb-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[50px] w-[50px] shrink-0 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
