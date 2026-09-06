"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  ajouterEtape,
  deplacerEtape,
  supprimerEtape,
  toggleEtape,
} from "@/app/actions/objectifs";
import { showToast } from "@/components/toast/toast-store";
import type { Tables } from "@/lib/supabase/types";
import { card, dangerButton, ghostButton, input, sectionTitle } from "@/lib/ui";
import { CheckToggle } from "@/components/CheckToggle";
import { vibrate } from "@/lib/haptics";

type EtapeAction =
  | { type: "toggle"; id: string; fait: boolean }
  | { type: "supprimer"; id: string }
  | { type: "deplacer"; id: string; direction: "haut" | "bas" };

function reduireEtapes(state: Tables<"objectif_etapes">[], action: EtapeAction) {
  switch (action.type) {
    case "toggle":
      return state.map((e) => (e.id === action.id ? { ...e, fait: action.fait } : e));
    case "supprimer":
      return state.filter((e) => e.id !== action.id);
    case "deplacer": {
      const index = state.findIndex((e) => e.id === action.id);
      const voisinIndex = action.direction === "haut" ? index - 1 : index + 1;
      if (index === -1 || voisinIndex < 0 || voisinIndex >= state.length) return state;
      const next = [...state];
      [next[index], next[voisinIndex]] = [next[voisinIndex], next[index]];
      return next;
    }
  }
}

// Cocher/décocher, réordonner et supprimer une étape sont réconciliés
// optimistiquement (même pattern `useOptimistic` que JournalEntriesList,
// pas TanStack Query) : le changement s'affiche immédiatement, avant
// confirmation serveur, réconcilié par la nouvelle prop `etapes` une fois la
// Server Action (qui appelle revalidatePath) résolue. En cas d'échec, pas de
// rollback manuel — la prop re-synchronise l'état au prochain rendu serveur
// — accompagné d'un toast d'erreur. Ajouter une étape reste non optimiste :
// hors périmètre demandé, le délai (ajout peu fréquent) est négligeable.
export function ObjectifSuiviEtapes({
  objectifId,
  etapes,
}: {
  objectifId: string;
  etapes: Tables<"objectif_etapes">[];
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticEtapes, appliquerOptimiste] = useOptimistic(etapes, reduireEtapes);
  const [titre, setTitre] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const faites = optimisticEtapes.filter((e) => e.fait).length;

  function handleAjouter(formData: FormData) {
    const valeur = String(formData.get("titre") ?? "");
    if (!valeur.trim()) return;
    startTransition(async () => {
      try {
        await ajouterEtape(objectifId, valeur);
      } catch {
        showToast("Impossible d'ajouter cette étape.");
      }
      setTitre("");
      formRef.current?.reset();
    });
  }

  function handleToggle(etape: Tables<"objectif_etapes">) {
    vibrate();
    const fait = !etape.fait;
    startTransition(async () => {
      appliquerOptimiste({ type: "toggle", id: etape.id, fait });
      try {
        await toggleEtape(objectifId, etape.id, fait);
      } catch {
        showToast("Impossible de mettre à jour l'étape.");
      }
    });
  }

  function handleDeplacer(etape: Tables<"objectif_etapes">, direction: "haut" | "bas") {
    startTransition(async () => {
      appliquerOptimiste({ type: "deplacer", id: etape.id, direction });
      try {
        await deplacerEtape(objectifId, etape.id, direction);
      } catch {
        showToast("Impossible de réordonner l'étape.");
      }
    });
  }

  function handleSupprimer(etape: Tables<"objectif_etapes">) {
    startTransition(async () => {
      appliquerOptimiste({ type: "supprimer", id: etape.id });
      try {
        await supprimerEtape(objectifId, etape.id);
      } catch {
        showToast("Impossible de supprimer l'étape.");
      }
    });
  }

  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <h2 className={sectionTitle}>Étapes</h2>
        <span className="text-[13px] text-ink-2">
          {faites}/{optimisticEtapes.length}
        </span>
      </div>

      {optimisticEtapes.length === 0 ? (
        <p className="text-ink-2">Aucune étape pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {optimisticEtapes.map((etape, index) => (
            <li key={etape.id} className="flex items-center gap-2">
              <CheckToggle
                checked={etape.fait}
                disabled={isPending}
                onToggle={() => handleToggle(etape)}
                color="var(--accent-objectifs)"
                label={etape.fait ? "Marquer non fait" : "Marquer fait"}
              />
              <span className={`flex-1 text-[14.5px] text-ink ${etape.fait ? "text-ink-2 line-through" : ""}`}>
                {etape.titre}
              </span>
              <button
                type="button"
                disabled={isPending || index === 0}
                onClick={() => handleDeplacer(etape, "haut")}
                className={`${ghostButton} px-2 py-1 disabled:opacity-30`}
                aria-label="Monter"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={isPending || index === optimisticEtapes.length - 1}
                onClick={() => handleDeplacer(etape, "bas")}
                className={`${ghostButton} px-2 py-1 disabled:opacity-30`}
                aria-label="Descendre"
              >
                ↓
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleSupprimer(etape)}
                className={`${dangerButton} px-2 py-1`}
              >
                Suppr.
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={handleAjouter}
        className="flex gap-2"
      >
        <input
          name="titre"
          placeholder="Nouvelle étape…"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          className={`${input} flex-1`}
        />
        <button type="submit" disabled={isPending} className={ghostButton}>
          Ajouter
        </button>
      </form>
    </div>
  );
}
