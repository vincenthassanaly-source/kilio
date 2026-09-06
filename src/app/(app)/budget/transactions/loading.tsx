import { Skeleton } from "@/components/skeletons/Skeleton";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { screenTitle } from "@/lib/ui";

export default function TransactionsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className={screenTitle}>Transactions</h1>
        <div className="flex gap-2">
          <Skeleton className="h-[34px] w-[34px] rounded-[10px]" />
          <Skeleton className="h-[34px] w-[34px] rounded-[10px]" />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-hidden">
        <Skeleton className="h-9 w-24 rounded-2xl" />
        <Skeleton className="h-9 w-28 rounded-2xl" />
        <Skeleton className="h-9 w-20 rounded-2xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-2xl" />
      <ListItemSkeletonGroup count={6} withSubtitle />
    </div>
  );
}
