"use client";

import { useId, useActionState, useEffect, useRef } from "react";
import { creerCategorie, type CategorieFormState } from "@/app/actions/categories-budget";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: CategorieFormState = { error: null };

export function AddCategorieForm({ onDone }: { onDone?: () => void }) {
  // Ids uniques par instance (T11) : formulaire rendu en ajout et en édition.
  const uid = useId();
  const [state, formAction, pending] = useActionState(creerCategorie, initialState);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onDone?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-nom`} className={labelClass}>
          Nom
        </label>
        <input id={`${uid}-nom`} name="nom" required className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-type`} className={labelClass}>
          Type
        </label>
        <select id={`${uid}-type`} name="type" defaultValue="depense" className={input}>
          <option value="depense">Dépense</option>
          <option value="revenu">Revenu</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-icone`} className={labelClass}>
          Icône (optionnel, un emoji)
        </label>
        <input id={`${uid}-icone`} name="icone" placeholder="🎯" className={input} />
      </div>

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Enregistrement..." : "Créer la catégorie"}
      </button>
    </form>
  );
}
