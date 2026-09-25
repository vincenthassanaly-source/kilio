"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { setJourTypeJournal } from "@/app/actions/journal";
import { runAction } from "@/lib/actions/runAction";
import { queryKeys } from "@/lib/query/keys";
import type { JourJournal } from "./jour";
import { ONGLETS, ONGLETS_CADRE, ongletClasse } from "./onglets";

/**
 * Bascule Repos / Entraînement qui **mémorise** le choix pour la date
 * affichée (journal_jours) : le lien met tout de suite l'écran à jour via
 * `?jour=`, et l'action enregistre en parallèle pour les visites suivantes
 * et pour le dashboard. Un échec n'affecte pas l'affichage : le toast dit
 * que le choix n'a pas été retenu.
 */
export function JourTypeBascule({ date, jourType }: JourJournal) {
  const queryClient = useQueryClient();

  return (
    <div className={ONGLETS_CADRE} role="group" aria-label="Type de jour">
      {ONGLETS.map((onglet) => {
        const actif = jourType === onglet.value;
        return (
          <Link
            key={onglet.value}
            href={`/nutrition/journal?date=${date}&jour=${onglet.value}`}
            replace
            scroll={false}
            aria-current={actif ? "page" : undefined}
            onClick={() => {
              if (actif) return;
              void runAction(() => setJourTypeJournal(date, onglet.value)).then((r) => {
                if (r.ok) queryClient.invalidateQueries({ queryKey: queryKeys.resumeNutrition(date) });
              });
            }}
            className={ongletClasse(actif)}
          >
            {onglet.label}
          </Link>
        );
      })}
    </div>
  );
}
