import { getCategories } from "@/app/actions/categories-budget";
import { getSuiviCategories } from "@/app/actions/budgets";
import { periodeParDefaut } from "@/lib/budget/compute";
import type { Enums } from "@/lib/supabase/types";
import { eyebrow, screenTitle } from "@/lib/ui";
import { AddCategorieToggle } from "./AddCategorieToggle";
import { CategoriesList } from "./CategoriesList";
import { PeriodeSelector } from "./PeriodeSelector";
import { PullToRefresh } from "@/components/PullToRefresh";

const TYPES_PERIODE: readonly Enums<"type_periode_budget">[] = ["hebdomadaire", "mensuel", "annuel"];

export default async function CategoriesBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ type_periode?: string; periode?: string }>;
}) {
  const params = await searchParams;
  const typePeriode = TYPES_PERIODE.includes(params.type_periode as Enums<"type_periode_budget">)
    ? (params.type_periode as Enums<"type_periode_budget">)
    : "mensuel";
  const periode = params.periode || periodeParDefaut(typePeriode);

  const [suiviDepenses, categories] = await Promise.all([
    getSuiviCategories(periode, typePeriode),
    getCategories(),
  ]);

  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <div>
          <p className={eyebrow}>Budget</p>
          <h1 className={screenTitle}>Catégories</h1>
        </div>
        <PeriodeSelector typePeriode={typePeriode} periode={periode} />
        <AddCategorieToggle />
        <CategoriesList
          suiviDepenses={suiviDepenses}
          categories={categories}
          periode={periode}
          typePeriode={typePeriode}
        />
      </div>
    </PullToRefresh>
  );
}
