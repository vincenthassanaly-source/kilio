"use client";

import { useId, useActionState, useEffect, useRef } from "react";
import {
  creerVirement,
  modifierVirement,
  type TransactionAvecRelations,
  type TransactionFormState,
} from "@/app/actions/transactions";
import type { CompteAvecSolde } from "@/app/actions/comptes";
import { aujourdhuiISO } from "@/lib/budget/compute";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: TransactionFormState = { error: null };

export function VirementForm({
  transaction,
  comptes,
  onDone,
}: {
  transaction?: TransactionAvecRelations;
  comptes: CompteAvecSolde[];
  onDone?: () => void;
}) {
  // Ids uniques par instance (T11) : formulaire rendu en ajout et en édition.
  const uid = useId();
  const action = transaction ? modifierVirement : creerVirement;
  const [state, formAction, pending] = useActionState(action, initialState);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onDone?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onDone]);

  if (comptes.length < 2) {
    return <p className="text-ink-2">Il faut au moins 2 comptes pour faire un virement.</p>;
  }

  const defaultSource = transaction?.compte_id ?? comptes[0]?.id ?? "";
  const defaultDestination =
    transaction?.compte_destination_id ?? comptes.find((c) => c.id !== defaultSource)?.id ?? "";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}

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
          defaultValue={transaction?.montant}
          className={input}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-date_operation`} className={labelClass}>
          Date
        </label>
        <input
          id={`${uid}-date_operation`}
          name="date_operation"
          type="date"
          required
          defaultValue={transaction?.date_operation ?? aujourdhuiISO()}
          className={input}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-libelle`} className={labelClass}>
          Libellé (optionnel)
        </label>
        <input id={`${uid}-libelle`} name="libelle" defaultValue={transaction?.libelle ?? ""} className={input} />
      </div>

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Enregistrement..." : transaction ? "Enregistrer" : "Effectuer le virement"}
      </button>
    </form>
  );
}
