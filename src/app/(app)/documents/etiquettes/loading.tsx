import { Skeleton } from "@/components/skeletons/Skeleton";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { screenTitle } from "@/lib/ui";

export default function EtiquettesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Étiquettes</h1>
      <Skeleton className="h-16 w-full rounded-[22px]" />
      <ListItemSkeletonGroup count={5} />
    </div>
  );
}
