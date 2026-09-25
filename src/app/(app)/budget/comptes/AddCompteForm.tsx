"use client";

import { useId, useActionState, useEffect, useRef } from "react";
import { creerCompte, modifierCompte, type CompteFormState } from "@/app/actions/comptes";
import type { Enums, Tables } from "@/lib/supabase/types";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: CompteFormState = { error: null };

const TYPE_LABELS: Record<Enums<"type_compte">, string> = {
  courant: "Courant",
  epargne: "Épargne",
  autre: "Autre",
};

export function AddCompteForm({
  compte,
  onDone,
}: {
  compte?: Tables<"comptes">;
  onDone?: () => void;
}) {
  // Ids uniques par instance (T11) : formulaire rendu en ajout et en édition.
  const uid = useId();
  const action = compte ? modifierCompte : creerCompte;
  const [state, formAction, pending] = useActionState(action, initialState);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onDone?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {compte && <input type="hidden" name="id" value={compte.id} />}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-nom`} className={labelClass}>
          Nom
        </label>
        <input id={`${uid}-nom`} name="nom" required defaultValue={compte?.nom} className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-type`} className={labelClass}>
          Type
        </label>
        <select
          id={`${uid}-type`}
          name="type"
          defaultValue={compte?.type ?? "courant"}
          className={input}
        >
          {(Object.keys(TYPE_LABELS) as Enums<"type_compte">[]).map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-solde_initial`} className={labelClass}>
          Solde initial
        </label>
        <input
          id={`${uid}-solde_initial`}
          name="solde_initial"
          type="number"
          step="0.01"
          defaultValue={compte?.solde_initial ?? 0}
          className={input}
        />
      </div>

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Enregistrement..." : compte ? "Enregistrer" : "Créer le compte"}
      </button>
    </form>
  );
}
