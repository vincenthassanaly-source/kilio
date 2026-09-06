import { Skeleton } from "@/components/skeletons/Skeleton";
import { card, eyebrow, screenTitle } from "@/lib/ui";

const JOURS_SEMAINE = ["L", "M", "M", "J", "V", "S", "D"];

export default function CalendrierLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={eyebrow}>Budget</p>
          <h1 className={screenTitle}>Calendrier</h1>
        </div>
        <Skeleton className="h-[34px] w-[34px] rounded-[10px]" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>

      <div className={`${card} flex flex-col gap-2`}>
        <div className="grid grid-cols-7 gap-1 text-center">
          {JOURS_SEMAINE.map((jour, i) => (
            <span key={i} className="text-[11px] font-semibold text-ink-2">
              {jour}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
