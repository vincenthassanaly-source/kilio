import Link from "next/link";
import type { JourJournal } from "./jour";
import { shiftDate } from "./date-utils";

const boutonJour =
  "flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-base";

const ONGLETS: { value: JourJournal["jourType"]; label: string }[] = [
  { value: "repos", label: "Repos" },
  { value: "entrainement", label: "Entraînement" },
];

/**
 * Boutons ‹ › de changement de jour. Sans `jour` (fallback de `<Suspense>`,
 * donc dans la coquille), même cadre, inactif, le temps que l'URL soit lue.
 */
export function JourNavigation({ jour }: { jour?: JourJournal }) {
  if (!jour) {
    return (
      <div className="flex gap-1.5" aria-hidden="true">
        <span className={`${boutonJour} text-ink-3`}>‹</span>
        <span className={`${boutonJour} text-ink-3`}>›</span>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <Link
        href={`/nutrition/journal?date=${shiftDate(jour.date, -1)}&jour=${jour.jourType}`}
        aria-label="Jour précédent"
        className={`${boutonJour} text-ink`}
      >
        ‹
      </Link>
      <Link
        href={`/nutrition/journal?date=${shiftDate(jour.date, 1)}&jour=${jour.jourType}`}
        aria-label="Jour suivant"
        className={`${boutonJour} text-ink`}
      >
        ›
      </Link>
    </div>
  );
}

/** Bascule Repos / Entraînement ; sans `jour`, même cadre, inactif. */
export function JourTypeOnglets({ jour }: { jour?: JourJournal }) {
  return (
    <div className="flex gap-1.5 rounded-2xl bg-surface-alt p-1">
      {ONGLETS.map((onglet) => {
        const actif = jour?.jourType === onglet.value;
        const className = `flex-1 rounded-xl py-2 text-center text-[13.5px] font-semibold transition-colors ${
          actif ? "bg-kcal text-white" : "text-ink-2"
        }`;
        return jour ? (
          <Link
            key={onglet.value}
            href={`/nutrition/journal?date=${jour.date}&jour=${onglet.value}`}
            aria-current={actif ? "page" : undefined}
            className={className}
          >
            {onglet.label}
          </Link>
        ) : (
          <span key={onglet.value} aria-disabled="true" className={className}>
            {onglet.label}
          </span>
        );
      })}
    </div>
  );
}
