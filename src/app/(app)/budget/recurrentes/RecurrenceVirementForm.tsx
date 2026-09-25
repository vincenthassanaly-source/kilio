"use client";

import { useId, useActionState, useEffect, useRef } from "react";
import {
  creerRecurrenceVirement,
  modifierRecurrenceVirement,
  type RecurrenceAvecRelations,
  type RecurrenceFormState,
} from "@/app/actions/transactions-recurrentes";
import type { CompteAvecSolde } from "@/app/actions/comptes";
import type { Enums } from "@/lib/supabase/types";
import { FREQUENCE_LABELS, aujourdhuiISO } from "@/lib/budget/compute";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: RecurrenceFormState = { error: null };
const FREQUENCES = Object.keys(FREQUENCE_LABELS) as Enums<"frequence_recurrence">[];

export function RecurrenceVirementForm({
  recurrence,
  comptes,
  onDone,
}: {
  recurrence?: RecurrenceAvecRelations;
  comptes: CompteAvecSolde[];
  onDone?: () => void;
}) {
  // Ids uniques par instance (T11) : formulaire rendu en ajout et en édition.
  const uid = useId();
  const action = recurrence ? modifierRecurrenceVirement : creerRecurrenceVirement;
  const [state, formAction, pending] = useActionState(action, initialState);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onDone?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onDone]);

  if (comptes.length < 2) {
    return <p className="text-ink-2">Il faut au moins 2 comptes pour un virement récurrent.</p>;
  }

  const defaultSource = recurrence?.compte_id ?? comptes[0]?.id ?? "";
  const defaultDestination =
    recurrence?.compte_destination_id ?? comptes.find((c) => c.id !== defaultSource)?.id ?? "";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {recurrence && <input type="hidden" name="id" value={recurrence.id} />}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-compte_id`} className={labelClass}>
          Compte source
        </label>
        <select id={`${uid}-compte_id`} name="compte_id" defaultValue={defaultSource} className={input}>
          {comptes.map((compte) => (
            <option key={compte.id} value={compte.id}>
              {compte.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-compte_destination_id`} className={labelClass}>
          Compte destination
        </label>
        <select
          id={`${uid}-compte_destination_id`}
          name="compte_destination_id"
          defaultValue={defaultDestination}
          className={input}
        >
          {comptes.map((compte) => (
            <option key={compte.id} value={compte.id}>
              {compte.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-montant`} className={labelClass}>
          Montant
        </label>
        <input
          id={`${uid}-montant`}
          name="montant"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={recurrence?.montant}
          className={input}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-frequence`} className={labelClass}>
          Fréquence
        </label>
        <select id={`${uid}-frequence`} name="frequence" defaultValue={recurrence?.frequence ?? "mensuel"} className={input}>
          {FREQUENCES.map((f) => (
            <option key={f} value={f}>
              {FREQUENCE_LABELS[f]}
            </option>
          ))}
        </select>
      </div>

      {recurrence ? (
        <>
          <input type="hidden" name="date_debut" value={recurrence.date_debut} />
          <p className="text-sm text-ink-2">
            Prochaine échéance : {recurrence.prochaine_occurrence} (date de départ non modifiable —
            supprimez et recréez le modèle pour la changer).
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-date_debut`} className={labelClass}>
            Date de la première occurrence
          </label>
          <input
            id={`${uid}-date_debut`}
            name="date_debut"
            type="date"
            required
            defaultValue={aujourdhuiISO()}
            className={input}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-date_fin`} className={labelClass}>
          Date de fin (optionnel)
        </label>
        <input
          id={`${uid}-date_fin`}
          name="date_fin"
          type="date"
          defaultValue={recurrence?.date_fin ?? ""}
          className={input}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-libelle`} className={labelClass}>
          Libellé (optionnel)
        </label>
        <input id={`${uid}-libelle`} name="libelle" defaultValue={recurrence?.libelle ?? ""} className={input} />
      </div>

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Enregistrement..." : recurrence ? "Enregistrer" : "Créer le virement récurrent"}
      </button>
    </form>
  );
}
