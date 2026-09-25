"use client";

import { useId, useActionState, useEffect, useRef, useState } from "react";
import {
  creerTransaction,
  modifierTransaction,
  type TransactionAvecRelations,
  type TransactionFormState,
} from "@/app/actions/transactions";
import type { CompteAvecSolde } from "@/app/actions/comptes";
import type { Enums, Tables } from "@/lib/supabase/types";
import { aujourdhuiISO, regrouperParCategorieParente } from "@/lib/budget/compute";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: TransactionFormState = { error: null };

export function TransactionForm({
  transaction,
  typeMouvement,
  comptes,
  categories,
  onDone,
}: {
  transaction?: TransactionAvecRelations;
  /** Dépense ou revenu : fixé par l'onglet actif du formulaire (cf. TransactionModeForm). */
  typeMouvement: Enums<"type_mouvement">;
  comptes: CompteAvecSolde[];
  categories: Tables<"categories_budget">[];
  onDone?: () => void;
}) {
  // Ids uniques par instance (T11) : formulaire rendu en ajout et en édition.
  const uid = useId();
  const action = transaction ? modifierTransaction : creerTransaction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const prevPending = useRef(pending);

  const categoriesDuType = categories.filter((c) => c.type === typeMouvement);
  const groupesCategories = regrouperParCategorieParente(categoriesDuType);

  const [categorieId, setCategorieId] = useState(
    transaction?.categorie_id ?? categoriesDuType[0]?.id ?? ""
  );

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onDone?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-compte_id`} className={labelClass}>
          Compte
        </label>
        <select
          id={`${uid}-compte_id`}
          name="compte_id"
          defaultValue={transaction?.compte_id ?? comptes[0]?.id ?? ""}
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
        <label htmlFor={`${uid}-categorie_id`} className={labelClass}>
          Catégorie
        </label>
        <select
          id={`${uid}-categorie_id`}
          name="categorie_id"
          value={categorieId}
          onChange={(e) => setCategorieId(e.target.value)}
          className={input}
        >
          {groupesCategories.map(({ parent, sousCategories }) =>
            sousCategories.length === 0 ? (
              <option key={parent.id} value={parent.id}>
                {parent.icone ? `${parent.icone} ` : ""}
                {parent.nom}
              </option>
            ) : (
              <optgroup
                key={parent.id}
                label={`${parent.icone ? `${parent.icone} ` : ""}${parent.nom}`}
              >
                <option value={parent.id}>
                  {parent.icone ? `${parent.icone} ` : ""}
                  {parent.nom} (général)
                </option>
                {sousCategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.icone ? `${sc.icone} ` : ""}
                    {sc.nom}
                  </option>
                ))}
              </optgroup>
            )
          )}
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
        {pending ? "Enregistrement..." : transaction ? "Enregistrer" : "Ajouter la transaction"}
      </button>
    </form>
  );
}
