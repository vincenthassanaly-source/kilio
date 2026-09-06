import { Skeleton } from "@/components/skeletons/Skeleton";
import { screenTitle } from "@/lib/ui";

export default function ChoisirCollectionLoading() {
  return (
    <div
      className="flex-1 overflow-y-auto px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
      }}
    >
      <div className="flex flex-col gap-4">
        <h1 className={screenTitle}>Ajouter à une collection</h1>
        <div className="flex gap-2 overflow-x-hidden pb-1">
          <Skeleton className="h-24 w-24 shrink-0 rounded-2xl" />
          <Skeleton className="h-24 w-24 shrink-0 rounded-2xl" />
        </div>
        <Skeleton className="h-11 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-2xl" />
      </div>
    </div>
  );
}
