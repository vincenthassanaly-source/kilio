"use client";

import { useState, useTransition } from "react";
import {
  getImpactSuppressionCompte,
  supprimerCompte,
  type CompteAvecSolde,
  type ImpactSuppressionCompte,
} from "@/app/actions/comptes";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { runAction } from "@/lib/actions/runAction";
import { useBackClose } from "@/hooks/useBackClose";
import { formatMontant } from "@/lib/budget/compute";
import { AddCompteForm } from "./AddCompteForm";
import { card, dangerButton, ghostButton, listCard, metaText, nameText, pillTag } from "@/lib/ui";
import type { Enums } from "@/lib/supabase/types";

const TYPE_LABELS: Record<Enums<"type_compte">, string> = {
  courant: "Courant",
  epargne: "Épargne",
  autre: "Autre",
};

function CompteCard({ compte }: { compte: CompteAvecSolde }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Confirmation explicite qui détaille la cascade (constat T2) : null tant
  // qu'elle n'est pas ouverte, sinon l'impact compté côté serveur.
  const [impact, setImpact] = useState<ImpactSuppressionCompte | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  useBackClose(impact !== null, () => setImpact(null));

  function demanderSuppression() {
    startTransition(async () => {
      const resultat = await runAction(() => getImpactSuppressionCompte(compte.id));
      if (resultat.ok) setImpact(resultat.data);
    });
  }

  async function confirmerSuppression() {
    setSuppressionEnCours(true);
    const resultat = await runAction(() => supprimerCompte(compte.id), {
      erreur: `Le compte « ${compte.nom} » n'a pas pu être supprimé. Réessaie.`,
    });
    setSuppressionEnCours(false);
    if (resultat.ok) history.back();
  }

  if (editing) {
    return (
      <li className={card}>
        <AddCompteForm compte={compte} onDone={() => setEditing(false)} />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-2 text-sm text-ink-2 underline"
        >
          Annuler
        </button>
      </li>
    );
  }

  const negatif = compte.solde < 0;

  return (
    <li className={listCard}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className={nameText}>{compte.nom}</p>
          <span className={pillTag}>{TYPE_LABELS[compte.type]}</span>
        </div>
        <p className={`font-display text-lg font-semibold ${negatif ? "text-alert" : "text-ink"}`}>
          {formatMontant(compte.solde)}
        </p>
      </div>
      <span className={metaText}>Solde initial : {formatMontant(compte.solde_initial)}</span>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
          Modifier
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={demanderSuppression}
          className={dangerButton}
        >
          {isPending ? "Vérification…" : "Suppr."}
        </button>
      </div>

      <ConfirmDialog
        open={impact !== null}
        titre={`Supprimer « ${compte.nom} » ?`}
        confirmer={
          impact && impact.transactions > 0
            ? `Supprimer le compte et ${impact.transactions} transaction${impact.transactions > 1 ? "s" : ""}`
            : "Supprimer le compte"
        }
        enCours={suppressionEnCours}
        onConfirm={confirmerSuppression}
        onClose={() => history.back()}
      >
        {impact && impact.transactions + impact.recurrences === 0 ? (
          <p>Ce compte n&apos;a aucun historique : sa suppression n&apos;efface rien d&apos;autre.</p>
        ) : (
          impact && (
            <>
              <p>La suppression est définitive et efface aussi :</p>
              <ul className="list-disc pl-5 text-ink">
                {impact.transactions > 0 && (
                  <li>
                    {impact.transactions} transaction{impact.transactions > 1 ? "s" : ""} de ce compte
                  </li>
                )}
                {impact.virementsLies > 0 && (
                  <li>
                    dont {impact.virementsLies} virement{impact.virementsLies > 1 ? "s" : ""} avec un autre compte,
                    dont le solde changera
                  </li>
                )}
                {impact.recurrences > 0 && (
                  <li>
                    {impact.recurrences} transaction{impact.recurrences > 1 ? "s" : ""} récurrente
                    {impact.recurrences > 1 ? "s" : ""}
                  </li>
                )}
              </ul>
              <p>Pour garder l&apos;historique, modifie plutôt le compte (nom, solde initial) sans le supprimer.</p>
            </>
          )
        )}
      </ConfirmDialog>
    </li>
  );
}

export function ComptesList({ comptes }: { comptes: CompteAvecSolde[] }) {
  if (comptes.length === 0) {
    return <p className="text-ink-2">Aucun compte pour l&apos;instant.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {comptes.map((compte) => (
        <CompteCard key={compte.id} compte={compte} />
      ))}
    </ul>
  );
}
