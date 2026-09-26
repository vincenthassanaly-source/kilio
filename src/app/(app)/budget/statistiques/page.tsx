import Link from "next/link";
import { Suspense, cache } from "react";
import { connection } from "next/server";
import { getComptesAvecSolde } from "@/app/actions/comptes";
import { getSuiviCategories } from "@/app/actions/budgets";
import { getResumeMoisPlage } from "@/app/actions/transactions";
import { card, eyebrow, screenTitle, sectionTitle } from "@/lib/ui";
import { RepartitionCategories } from "./RepartitionCategories";
import { RepartitionComptes } from "./RepartitionComptes";
import { TendanceChart } from "./TendanceChart";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Skeleton } from "@/components/skeletons/Skeleton";
import { PeriodeNavigation } from "../PeriodeNavigation";
import { genererOccurrencesDuesPourLaRequete, lirePeriodeMensuelle } from "../requete";

function CalendrierIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

// 6 mois plutôt que 12 : lisibilité sur la largeur d'écran mobile visée par
// ce module (cf. viewBox 320 de `EvolutionChart`/`TendanceChart`) — 12
// barres groupées serait trop serré pour rester lisible.
const NB_MOIS_TENDANCE = 6;

type StatistiquesSearchParams = Promise<{ periode?: string }>;

export default async function StatistiquesPage({ searchParams }: { searchParams: StatistiquesSearchParams }) {
  // Voir le commentaire de /budget/comptes.
  await connection();
  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className={eyebrow}>Budget</p>
            <h1 className={screenTitle}>Statistiques</h1>
          </div>
          <Link
            href="/budget/calendrier"
            aria-label="Calendrier"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-line text-ink-2"
          >
            <CalendrierIcon />
          </Link>
        </div>

        <Suspense fallback={<PeriodeNavigation route="/budget/statistiques" />}>
          <PeriodeNavigationCourante searchParams={searchParams} />
        </Suspense>

        <div className={`${card} flex flex-col gap-3`}>
          <h2 className={sectionTitle}>Répartition par catégorie</h2>
          <Suspense fallback={<Skeleton className="h-[140px] w-full rounded-xl" />}>
            <RepartitionCategoriesCourante searchParams={searchParams} />
          </Suspense>
        </div>

        <div className={`${card} flex flex-col gap-3`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={sectionTitle}>Tendance</h2>
            <div className="flex items-center gap-3 text-[11px] text-ink-2">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-alert" /> Dépenses
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-kcal" /> Revenus
              </span>
            </div>
          </div>
          <Suspense fallback={<Skeleton className="h-[100px] w-full rounded-xl" />}>
            <TendanceCourante searchParams={searchParams} />
          </Suspense>
        </div>

        <div className={`${card} flex flex-col gap-3`}>
          <h2 className={sectionTitle}>Répartition par compte</h2>
          <Suspense fallback={<Skeleton className="h-[80px] w-full rounded-xl" />}>
            <RepartitionComptesCourante />
          </Suspense>
        </div>
      </div>
    </PullToRefresh>
  );
}

// Une seule génération des récurrences et une seule série de lectures par
// requête, partagées par les trois cartes.
const chargerStatistiques = cache(async (periode: string) => {
  await genererOccurrencesDuesPourLaRequete();
  const [suiviCategories, tendance] = await Promise.all([
    getSuiviCategories(periode),
    getResumeMoisPlage(periode, NB_MOIS_TENDANCE),
  ]);
  return { suiviCategories, tendance };
});

const chargerComptes = cache(async () => {
  await genererOccurrencesDuesPourLaRequete();
  return getComptesAvecSolde();
});

async function PeriodeNavigationCourante({ searchParams }: { searchParams: StatistiquesSearchParams }) {
  return <PeriodeNavigation route="/budget/statistiques" periode={await lirePeriodeMensuelle(searchParams)} />;
}

async function RepartitionCategoriesCourante({ searchParams }: { searchParams: StatistiquesSearchParams }) {
  const { suiviCategories } = await chargerStatistiques(await lirePeriodeMensuelle(searchParams));
  return <RepartitionCategories suivi={suiviCategories} />;
}

async function TendanceCourante({ searchParams }: { searchParams: StatistiquesSearchParams }) {
  const { tendance } = await chargerStatistiques(await lirePeriodeMensuelle(searchParams));
  return <TendanceChart donnees={tendance} />;
}

async function RepartitionComptesCourante() {
  return <RepartitionComptes comptes={await chargerComptes()} />;
}
