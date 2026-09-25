"use client";

import { useId, useActionState, useEffect, useRef, useState } from "react";
import { creerObjectif, modifierObjectif, type ObjectifFormState } from "@/app/actions/objectifs";
import type { Enums, Tables } from "@/lib/supabase/types";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";

const initialState: ObjectifFormState = { error: null };

const CATEGORIE_LABELS: Record<Enums<"categorie_objectif">, string> = {
  perso: "Personnel",
  pro: "Professionnel",
};

const TYPE_SUIVI_LABELS: Record<Enums<"type_suivi_objectif">, string> = {
  valeur: "Valeur cible + courbe",
  etapes: "Checklist d'étapes",
  binaire: "Fait / pas fait",
};

export function ObjectifForm({
  objectif,
  onDone,
}: {
  objectif?: Tables<"objectifs">;
  onDone?: () => void;
}) {
  // Ids uniques par instance (T11) : formulaire rendu en ajout et en édition.
  const uid = useId();
  const action = objectif ? modifierObjectif : creerObjectif;
  const [state, formAction, pending] = useActionState(action, initialState);
  const prevPending = useRef(pending);
  const [typeSuivi, setTypeSuivi] = useState<Enums<"type_suivi_objectif">>(
    objectif?.type_suivi ?? "binaire"
  );

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      onDone?.();
    }
    prevPending.current = pending;
  }, [pending, state.error, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {objectif && <input type="hidden" name="id" value={objectif.id} />}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-titre`} className={labelClass}>
          Titre
        </label>
        <input id={`${uid}-titre`} name="titre" required defaultValue={objectif?.titre} className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-description`} className={labelClass}>
          Description (optionnel)
        </label>
        <textarea
          id={`${uid}-description`}
          name="description"
          rows={2}
          defaultValue={objectif?.description ?? ""}
          className={input}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`${uid}-categorie`} className={labelClass}>
            Catégorie
          </label>
          <select
            id={`${uid}-categorie`}
            name="categorie"
            defaultValue={objectif?.categorie ?? "perso"}
            className={input}
          >
            {(Object.keys(CATEGORIE_LABELS) as Enums<"categorie_objectif">[]).map((key) => (
              <option key={key} value={key}>
                {CATEGORIE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`${uid}-date_echeance`} className={labelClass}>
            Échéance (optionnel)
          </label>
          <input
            id={`${uid}-date_echeance`}
            name="date_echeance"
            type="date"
            defaultValue={objectif?.date_echeance ?? ""}
            className={input}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-type_suivi`} className={labelClass}>
          Mode de suivi
        </label>
        <select
          id={`${uid}-type_suivi`}
          name="type_suivi"
          value={typeSuivi}
          onChange={(e) => setTypeSuivi(e.target.value as Enums<"type_suivi_objectif">)}
          className={input}
        >
          {(Object.keys(TYPE_SUIVI_LABELS) as Enums<"type_suivi_objectif">[]).map((key) => (
            <option key={key} value={key}>
              {TYPE_SUIVI_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {typeSuivi === "valeur" && (
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor={`${uid}-valeur_cible`} className={labelClass}>
              Valeur cible
            </label>
            <input
              id={`${uid}-valeur_cible`}
              name="valeur_cible"
              type="number"
              min="0"
              step="any"
              defaultValue={objectif?.valeur_cible ?? ""}
              className={input}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor={`${uid}-unite`} className={labelClass}>
              Unité
            </label>
            <input
              id={`${uid}-unite`}
              name="unite"
              placeholder="kg, km, €…"
              defaultValue={objectif?.unite ?? ""}
              className={input}
            />
          </div>
        </div>
      )}

      {state.error && (
        <p className={errorText} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Enregistrement..." : objectif ? "Enregistrer" : "Créer l'objectif"}
      </button>
    </form>
  );
}
