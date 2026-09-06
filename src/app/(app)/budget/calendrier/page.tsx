import Link from "next/link";
import { getTransactionsParJour } from "@/app/actions/transactions";
import { genererOccurrencesDues } from "@/app/actions/transactions-recurrentes";
import {
  formatMontant,
  formatPeriode,
  grilleCalendrierMois,
  periodeAdjacente,
  premierJourDuMois,
} from "@/lib/budget/compute";
import { card, eyebrow, ghostButton, screenTitle } from "@/lib/ui";
import { PullToRefresh } from "@/components/PullToRefresh";

// Comme /budget et /budget/transactions : les occurrences récurrentes
// peuvent générer de nouvelles transactions à chaque chargement, cette route
// ne doit jamais rester en cache.
export const dynamic = "force-dynamic";

const JOURS_SEMAINE = ["L", "M", "M", "J", "V", "S", "D"];

function ListeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 6.5h13M8 12h13M8 17.5h13" />
      <path d="M3 6.5h.01M3 12h.01M3 17.5h.01" />
    </svg>
  );
}

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: periodeParam } = await searchParams;
  const periode = periodeParam || premierJourDuMois();

  await genererOccurrencesDues();

  const totauxParJour = await getTransactionsParJour(periode);
  const semaines = grilleCalendrierMois(periode);

  const periodePrecedente = periodeAdjacente(periode, "mensuel", -1);
  const periodeSuivante = periodeAdjacente(periode, "mensuel", 1);

  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className={eyebrow}>Budget</p>
            <h1 className={screenTitle}>Calendrier</h1>
          </div>
          <Link
            href="/budget/transactions"
            aria-label="Liste"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-line text-ink-2"
          >
            <ListeIcon />
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Link href={`/budget/calendrier?periode=${periodePrecedente}`} className={ghostButton}>
            ← Précédent
          </Link>
          <p className="text-[13px] font-semibold text-ink">{formatPeriode(periode)}</p>
          <Link href={`/budget/calendrier?periode=${periodeSuivante}`} className={ghostButton}>
            Suivant →
          </Link>
        </div>

        <div className={`${card} flex flex-col gap-2`}>
          <div className="grid grid-cols-7 gap-1 text-center">
            {JOURS_SEMAINE.map((jour, i) => (
              <span key={i} className="text-[11px] font-semibold text-ink-2">
                {jour}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {semaines.map((semaine, i) => (
              <div key={i} className="grid grid-cols-7 gap-1">
                {semaine.map((jour) => {
                  const totaux = totauxParJour[jour.date];
                  return (
                    <Link
                      key={jour.date}
                      href={`/budget/transactions?date=${jour.date}`}
                      className={`flex min-h-14 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] leading-tight transition-colors ${
                        jour.horsMois ? "opacity-30" : ""
                      } ${totaux ? "bg-surface-alt" : "hover:bg-surface-alt/60"}`}
                    >
                      <span className="text-[12px] font-semibold text-ink">
                        {Number(jour.date.slice(-2))}
                      </span>
                      {totaux?.depenses ? (
                        <span className="text-alert">-{formatMontant(totaux.depenses)}</span>
                      ) : null}
                      {totaux?.revenus ? (
                        <span className="text-kcal">+{formatMontant(totaux.revenus)}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}
