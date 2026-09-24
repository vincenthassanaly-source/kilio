import { Suspense } from "react";
import { getCategories } from "@/app/actions/categories-budget";
import { getSuiviCategories } from "@/app/actions/budgets";
import { eyebrow, screenTitle } from "@/lib/ui";
import { AddCategorieToggle } from "./AddCategorieToggle";
import { CategoriesList } from "./CategoriesList";
import { PeriodeSelector } from "./PeriodeSelector";
import { PullToRefresh } from "@/components/PullToRefresh";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import { lirePeriodeCategories } from "../requete";

type CategoriesSearchParams = Promise<{ type_periode?: string; periode?: string }>;

export default function CategoriesBudgetPage({ searchParams }: { searchParams: CategoriesSearchParams }) {
  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <div>
          <p className={eyebrow}>Budget</p>
          <h1 className={screenTitle}>Catégories</h1>
        </div>
        <Suspense fallback={<PeriodeSelector />}>
          <PeriodeSelectorCourant searchParams={searchParams} />
        </Suspense>
        <AddCategorieToggle />
        <Suspense
          fallback={
            <div className="flex flex-col gap-2.5">
              <CardSkeleton withRing={false} />
              <CardSkeleton withRing={false} />
              <CardSkeleton withRing={false} />
            </div>
          }
        >
          <Categories searchParams={searchParams} />
        </Suspense>
      </div>
    </PullToRefresh>
  );
}

async function PeriodeSelectorCourant({ searchParams }: { searchParams: CategoriesSearchParams }) {
  const [{ typePeriode, periode }, params] = await Promise.all([lirePeriodeCategories(searchParams), searchParams]);
  const parametres = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(params)) if (typeof valeur === "string") parametres.set(cle, valeur);
  return <PeriodeSelector selection={{ typePeriode, periode, parametres: parametres.toString() }} />;
}

async function Categories({ searchParams }: { searchParams: CategoriesSearchParams }) {
  const { typePeriode, periode } = await lirePeriodeCategories(searchParams);
  const [suiviDepenses, categories] = await Promise.all([
    getSuiviCategories(periode, typePeriode),
    getCategories(),
  ]);

  return (
    <CategoriesList
      suiviDepenses={suiviDepenses}
      categories={categories}
      periode={periode}
      typePeriode={typePeriode}
    />
  );
}
