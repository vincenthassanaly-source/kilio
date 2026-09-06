import { Skeleton } from "@/components/skeletons/Skeleton";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { screenTitle } from "@/lib/ui";

export default function ComptesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Comptes</h1>
      <Skeleton className="h-11 w-full rounded-2xl" />
      <ListItemSkeletonGroup count={4} withSubtitle />
    </div>
  );
}
