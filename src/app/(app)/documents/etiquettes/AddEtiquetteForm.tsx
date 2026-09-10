"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEtiquette, type EtiquetteFormState } from "@/app/actions/documents";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: EtiquetteFormState = { error: null };

export function AddEtiquetteForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(createEtiquette, initialState);
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
        <label htmlFor="etiquette-nom" className={labelClass}>
          Nom
        </label>
        <input
          id="etiquette-nom"
          name="nom"
          required
          placeholder="Ex. Carte d'identité"
          className={input}
        />
      </div>

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Création..." : "Créer l'étiquette"}
      </button>
    </form>
  );
}
