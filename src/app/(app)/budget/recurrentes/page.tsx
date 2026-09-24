import { getComptesAvecSolde } from "@/app/actions/comptes";
import { getCategories } from "@/app/actions/categories-budget";
import { getRecurrences } from "@/app/actions/transactions-recurrentes";
import { eyebrow, screenTitle } from "@/lib/ui";
import { AddRecurrenceToggle } from "./AddRecurrenceToggle";
import { RecurrencesList } from "./RecurrencesList";
import { PullToRefresh } from "@/components/PullToRefresh";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function RecurrentesPage() {
  const [comptes, categories, recurrences] = await Promise.all([
    getComptesAvecSolde(),
    getCategories(),
    getRecurrences(),
  ]);

  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <div>
          <p className={eyebrow}>Budget</p>
          <h1 className={screenTitle}>Transactions récurrentes</h1>
        </div>
        <AddRecurrenceToggle comptes={comptes} categories={categories} />
        <RecurrencesList recurrences={recurrences} comptes={comptes} categories={categories} />
      </div>
    </PullToRefresh>
  );
}
