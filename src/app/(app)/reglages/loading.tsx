import { Skeleton } from "@/components/skeletons/Skeleton";
import { screenTitle } from "@/lib/ui";

export default function ReglagesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Réglages</h1>
      <div className="rounded-[22px] border border-line bg-surface px-4 shadow-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-3.5 ${i > 0 ? "border-t border-line" : ""}`}
          >
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
