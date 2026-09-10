"use client";

import { useActionState, useEffect, useRef } from "react";
import { createDocument, updateDocument, type DocumentFormState } from "@/app/actions/documents";
import type { Tables } from "@/lib/supabase/types";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: DocumentFormState = { error: null };

const CATEGORIES = ["Identité", "Véhicule", "Logement", "Santé", "Assurance", "Autre"] as const;

export function DocumentForm({
  document,
  onDone,
}: {
  document?: Tables<"documents">;
  onDone?: () => void;
}) {
  const action = document ? updateDocument : createDocument;
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
      {document && <input type="hidden" name="id" value={document.id} />}

      <div className="flex flex-col gap-1">
        <label htmlFor="nom" className={labelClass}>
          Nom
        </label>
        <input id="nom" name="nom" required defaultValue={document?.nom} className={input} />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="categorie" className={labelClass}>
            Catégorie (optionnel)
          </label>
          <select id="categorie" name="categorie" defaultValue={document?.categorie ?? ""} className={input}>
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="date_echeance" className={labelClass}>
            Échéance (optionnel)
          </label>
          <input
            id="date_echeance"
            name="date_echeance"
            type="date"
            defaultValue={document?.date_echeance ?? ""}
            className={input}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="fichier" className={labelClass}>
          {document ? "Remplacer le fichier (optionnel)" : "Fichier (photo ou PDF)"}
        </label>
        <input
          id="fichier"
          name="fichier"
          type="file"
          accept="image/*,application/pdf"
          required={!document}
          className={input}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className={labelClass}>
          Notes (optionnel)
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={document?.notes ?? ""} className={input} />
      </div>

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Enregistrement..." : document ? "Enregistrer" : "Ajouter le document"}
      </button>
    </form>
  );
}
