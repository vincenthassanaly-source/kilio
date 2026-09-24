import { Suspense } from "react";
import { getComptesAvecSolde } from "@/app/actions/comptes";
import { getCategories } from "@/app/actions/categories-budget";
import { getRecurrences } from "@/app/actions/transactions-recurrentes";
import { eyebrow, screenTitle } from "@/lib/ui";
import { AddRecurrenceToggle } from "./AddRecurrenceToggle";
import { RecurrencesList } from "./RecurrencesList";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Skeleton } from "@/components/skeletons/Skeleton";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";

export default function RecurrentesPage() {
  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <div>
          <p className={eyebrow}>Budget</p>
          <h1 className={screenTitle}>Transactions récurrentes</h1>
        </div>
        <Suspense
          fallback={
            <>
              <Skeleton className="h-11 w-full rounded-2xl" />
              <ListItemSkeletonGroup count={5} withSubtitle />
            </>
          }
        >
          <Recurrences />
        </Suspense>
      </div>
    </PullToRefresh>
  );
}

// Le formulaire d'ajout a besoin des comptes et catégories : il arrive avec
// la liste.
async function Recurrences() {
  const [comptes, categories, recurrences] = await Promise.all([
    getComptesAvecSolde(),
    getCategories(),
    getRecurrences(),
  ]);

  return (
    <>
      <AddRecurrenceToggle comptes={comptes} categories={categories} />
      <RecurrencesList recurrences={recurrences} comptes={comptes} categories={categories} />
    </>
  );
}
