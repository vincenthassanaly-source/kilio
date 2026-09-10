"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEtiquette, type EtiquetteFormState, type TypeChampsEtiquette } from "@/app/actions/documents";
import { TYPE_CHAMPS_LABELS } from "../champs";
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

      <div className="flex flex-col gap-1">
        <label htmlFor="type_champs" className={labelClass}>
          Champs supplémentaires à la création
        </label>
        <select id="type_champs" name="type_champs" defaultValue="standard" className={input}>
          {(Object.keys(TYPE_CHAMPS_LABELS) as TypeChampsEtiquette[]).map((key) => (
            <option key={key} value={key}>
              {TYPE_CHAMPS_LABELS[key]}
            </option>
          ))}
        </select>
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
