"use client";

import { useId, useActionState, useEffect, useRef, useState } from "react";
import { creerObjectif, modifierObjectif, type ObjectifFormState } from "@/app/actions/objectifs";
import type { Enums, Tables } from "@/lib/supabase/types";
import { errorText, input, label as labelClass, primaryButton } from "@/lib/ui";
import { SegmentedControl } from "@/components/SegmentedControl";

const initialState: ObjectifFormState = { error: null };

const CATEGORIE_LABELS: Record<Enums<"categorie_objectif">, string> = {
  perso: "Personnel",
  pro: "Professionnel",
};

// Libellés courts pour les segments (3 sur la largeur d'un téléphone).
const TYPE_SUIVI_COURT: Record<Enums<"type_suivi_objectif">, string> = {
  valeur: "Valeur",
  etapes: "Étapes",
  binaire: "Oui / non",
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
  const [categorie, setCategorie] = useState<Enums<"categorie_objectif">>(objectif?.categorie ?? "perso");
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
          <span className={labelClass}>Catégorie</span>
          <SegmentedControl
            ariaLabel="Catégorie"
            name="categorie"
            taille="sm"
            options={(Object.keys(CATEGORIE_LABELS) as Enums<"categorie_objectif">[]).map((key) => ({
              value: key,
              label: CATEGORIE_LABELS[key],
            }))}
            value={categorie}
            onChange={setCategorie}
          />
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
        <span className={labelClass}>Mode de suivi</span>
        <SegmentedControl
          ariaLabel="Mode de suivi"
          name="type_suivi"
          taille="sm"
          options={(Object.keys(TYPE_SUIVI_LABELS) as Enums<"type_suivi_objectif">[]).map((key) => ({
            value: key,
            label: TYPE_SUIVI_COURT[key],
            ariaLabel: TYPE_SUIVI_LABELS[key],
          }))}
          value={typeSuivi}
          onChange={setTypeSuivi}
        />
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
