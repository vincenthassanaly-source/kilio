import { Skeleton } from "@/components/skeletons/Skeleton";
import { card, eyebrow, screenTitle, sectionTitle } from "@/lib/ui";

export default function StatistiquesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={eyebrow}>Budget</p>
          <h1 className={screenTitle}>Statistiques</h1>
        </div>
        <Skeleton className="h-[34px] w-[34px] rounded-[10px]" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>

      <div className={`${card} flex flex-col gap-3`}>
        <h2 className={sectionTitle}>Répartition par catégorie</h2>
        <Skeleton className="h-[140px] w-full rounded-xl" />
      </div>

      <div className={`${card} flex flex-col gap-3`}>
        <h2 className={sectionTitle}>Tendance</h2>
        <Skeleton className="h-[100px] w-full rounded-xl" />
      </div>

      <div className={`${card} flex flex-col gap-3`}>
        <h2 className={sectionTitle}>Répartition par compte</h2>
        <Skeleton className="h-[80px] w-full rounded-xl" />
      </div>
    </div>
  );
}
