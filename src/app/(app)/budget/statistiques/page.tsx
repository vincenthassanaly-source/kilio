import Link from "next/link";
import { getComptesAvecSolde } from "@/app/actions/comptes";
import { getSuiviCategories } from "@/app/actions/budgets";
import { getResumeMoisPlage } from "@/app/actions/transactions";
import { genererOccurrencesDues } from "@/app/actions/transactions-recurrentes";
import { formatPeriode, periodeAdjacente, premierJourDuMois } from "@/lib/budget/compute";
import { card, eyebrow, ghostButton, screenTitle, sectionTitle } from "@/lib/ui";
import { RepartitionCategories } from "./RepartitionCategories";
import { RepartitionComptes } from "./RepartitionComptes";
import { TendanceChart } from "./TendanceChart";
import { PullToRefresh } from "@/components/PullToRefresh";

// Comme /budget et /budget/transactions : les occurrences récurrentes
// peuvent générer de nouvelles transactions à chaque chargement.
export const dynamic = "force-dynamic";

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

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: periodeParam } = await searchParams;
  const periode = periodeParam || premierJourDuMois();

  await genererOccurrencesDues();

  const [suiviCategories, tendance, comptes] = await Promise.all([
    getSuiviCategories(periode),
    getResumeMoisPlage(periode, NB_MOIS_TENDANCE),
    getComptesAvecSolde(),
  ]);

  const periodePrecedente = periodeAdjacente(periode, "mensuel", -1);
  const periodeSuivante = periodeAdjacente(periode, "mensuel", 1);

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

        <div className="flex items-center justify-between gap-2">
          <Link href={`/budget/statistiques?periode=${periodePrecedente}`} className={ghostButton}>
            ← Précédent
          </Link>
          <p className="text-[13px] font-semibold text-ink">{formatPeriode(periode)}</p>
          <Link href={`/budget/statistiques?periode=${periodeSuivante}`} className={ghostButton}>
            Suivant →
          </Link>
        </div>

        <div className={`${card} flex flex-col gap-3`}>
          <h2 className={sectionTitle}>Répartition par catégorie</h2>
          <RepartitionCategories suivi={suiviCategories} />
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
          <TendanceChart donnees={tendance} />
        </div>

        <div className={`${card} flex flex-col gap-3`}>
          <h2 className={sectionTitle}>Répartition par compte</h2>
          <RepartitionComptes comptes={comptes} />
        </div>
      </div>
    </PullToRefresh>
  );
}
