import { Skeleton } from "@/components/skeletons/Skeleton";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { screenTitle } from "@/lib/ui";

export default function DossiersLoading() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Dossiers</h1>
      <Skeleton className="h-16 w-full rounded-[22px]" />
      <ListItemSkeletonGroup count={3} />
    </div>
  );
}
