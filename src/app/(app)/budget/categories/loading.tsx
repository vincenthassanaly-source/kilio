import { Skeleton } from "@/components/skeletons/Skeleton";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import { eyebrow, screenTitle } from "@/lib/ui";

export default function CategoriesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className={eyebrow}>Budget</p>
        <h1 className={screenTitle}>Catégories</h1>
      </div>
      <Skeleton className="h-9 w-full rounded-2xl" />
      <Skeleton className="h-11 w-full rounded-2xl" />
      <div className="flex flex-col gap-2.5">
        <CardSkeleton withRing={false} />
        <CardSkeleton withRing={false} />
        <CardSkeleton withRing={false} />
      </div>
    </div>
  );
}
