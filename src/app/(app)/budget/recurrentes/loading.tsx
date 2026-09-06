import { Skeleton } from "@/components/skeletons/Skeleton";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { eyebrow, screenTitle } from "@/lib/ui";

export default function RecurrentesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className={eyebrow}>Budget</p>
        <h1 className={screenTitle}>Transactions récurrentes</h1>
      </div>
      <Skeleton className="h-11 w-full rounded-2xl" />
      <ListItemSkeletonGroup count={5} withSubtitle />
    </div>
  );
}
