"use client";

import { useActionState, useEffect, useRef } from "react";
import { createDossier, type DossierFormState } from "@/app/actions/documents";
import { aplatirDossiers, libelleDossier } from "../dossiers-tree";
import type { Tables } from "@/lib/supabase/types";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: DossierFormState = { error: null };

export function AddDossierForm({
  dossiers,
  onDone,
}: {
  dossiers: Tables<"dossiers">[];
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createDossier, initialState);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onDone?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onDone]);

  const dossiersAplatis = aplatirDossiers(dossiers);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="dossier-nom" className={labelClass}>
          Nom
        </label>
        <input id="dossier-nom" name="nom" required className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="parent_id" className={labelClass}>
          Dossier parent (optionnel)
        </label>
        <select id="parent_id" name="parent_id" defaultValue="" className={input}>
          <option value="">— Dossier racine —</option>
          {dossiersAplatis.map((dossier) => (
            <option key={dossier.id} value={dossier.id}>
              {libelleDossier(dossier)}
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
        {pending ? "Création..." : "Créer le dossier"}
      </button>
    </form>
  );
}
