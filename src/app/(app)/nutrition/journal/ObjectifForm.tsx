"use client";

import { useId, useActionState, useState } from "react";
import { upsertObjectif, type ObjectifFormState } from "@/app/actions/objectifs-nutritionnels";
import type { Enums, Tables } from "@/lib/supabase/types";
import { card, errorText, input, label as labelClass, linkButton, primaryButton, secondaryButton } from "@/lib/ui";

const initialState: ObjectifFormState = { error: null };

export function ObjectifForm({
  jourType,
  objectif,
}: {
  jourType: Enums<"jour_type_ppl">;
  objectif: Tables<"objectifs_nutritionnels"> | null;
}) {
  // Ids uniques par instance (T11) : formulaire rendu en ajout et en édition.
  const uid = useId();
  const [open, setOpen] = useState(!objectif);
  const [state, formAction, pending] = useActionState(upsertObjectif, initialState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={linkButton}>
        Modifier l&apos;objectif
      </button>
    );
  }

  return (
    <form
      action={formAction}
      // Empêche un drag sur un champ/bouton du formulaire (ex. ajuster un
      // input number) d'être lu comme un swipe de changement de jour par
      // JournalSwipeWrapper — voir la même garde sur le bouton "Suppr." de
      // JournalEntriesList.tsx.
      onTouchStart={(e) => e.stopPropagation()}
      className={`${card} flex flex-col gap-3`}
    >
      <input type="hidden" name="jour_type" value={jourType} />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-kcal_cible`} className={labelClass}>
            Kcal cible
          </label>
          <input
            id={`${uid}-kcal_cible`}
            name="kcal_cible"
            type="number"
            inputMode="numeric"
            min="0"
            max="10000"
            step="1"
            required
            defaultValue={objectif?.kcal_cible ?? ""}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-proteines_cible_g`} className={labelClass}>
            Protéines (g)
          </label>
          <input
            id={`${uid}-proteines_cible_g`}
            name="proteines_cible_g"
            type="number"
            inputMode="numeric"
            min="0"
            max="1000"
            step="1"
            defaultValue={objectif?.proteines_cible_g ?? 0}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-glucides_cible_g`} className={labelClass}>
            Glucides (g)
          </label>
          <input
            id={`${uid}-glucides_cible_g`}
            name="glucides_cible_g"
            type="number"
            inputMode="numeric"
            min="0"
            max="1000"
            step="1"
            defaultValue={objectif?.glucides_cible_g ?? 0}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-lipides_cible_g`} className={labelClass}>
            Lipides (g)
          </label>
          <input
            id={`${uid}-lipides_cible_g`}
            name="lipides_cible_g"
            type="number"
            inputMode="numeric"
            min="0"
            max="1000"
            step="1"
            defaultValue={objectif?.lipides_cible_g ?? 0}
            className={input}
          />
        </div>
      </div>

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Enregistrement..." : "Enregistrer l'objectif"}
        </button>
        {objectif && (
          <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
            Fermer
          </button>
        )}
      </div>
    </form>
  );
}
