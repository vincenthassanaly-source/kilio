"use client";

import { db } from "./db";
import { showToast } from "@/components/toast/toast-store";
import { toggleTache, deleteTache } from "@/app/actions/taches";
import { toggleNoteItem, deleteNote } from "@/app/actions/notes";
import { createCourseItem, toggleCourseItem, deleteCourseItem } from "@/app/actions/courses";
import { enregistrerEntreeHabitude, supprimerHabitude } from "@/app/actions/habitudes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionFn = (...args: any[]) => Promise<unknown>;

// Mapping module + nom d'action -> Server Action à rejouer. Limité aux
// écritures haute fréquence des 4 modules du scope (cf. 2.4 du prompt de
// session) : Budget et Recettes ne sont volontairement pas couverts.
const ACTIONS: Record<string, Record<string, ActionFn>> = {
  taches: { toggleTache, deleteTache },
  notes: { toggleNoteItem, deleteNote },
  courses: { createCourseItem, toggleCourseItem, deleteCourseItem },
  habitudes: { enregistrerEntreeHabitude, supprimerHabitude },
};

// Une erreur réseau (offline réel, ou fetch qui échoue avant même
// d'atteindre le serveur) déclenche la mise en file plutôt que de
// propager l'erreur — à distinguer d'une erreur métier renvoyée par le
// serveur (ex. validation), qui doit continuer à s'afficher normalement.
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (error instanceof Error) {
    return /failed to fetch|fetch failed|networkerror|load failed/i.test(error.message);
  }
  return false;
}

export async function enqueueAction(module: string, actionName: string, payload: unknown[]) {
  await db.pending_actions.add({
    module,
    action_name: actionName,
    payload,
    created_at: new Date().toISOString(),
  });
}

let flushing = false;

// Rejoue les actions en attente dans l'ordre d'ajout, en vidant la file au
// fur et à mesure. S'arrête au premier échec (probablement un nouveau
// passage offline) : les actions restantes seront retentées au prochain
// appel plutôt que perdues.
// Renvoie le nombre d'actions rejouées avec succès (0 si rien à faire ou si
// un rejeu est déjà en cours) : l'appelant s'en sert pour rafraîchir les
// données affichées, qu'un refetch parti à la reconnexion a pu lire AVANT le
// rejeu.
export async function flushQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  try {
    const pending = await db.pending_actions.orderBy("created_at").toArray();
    if (pending.length === 0) return 0;

    let synced = 0;
    for (const action of pending) {
      const fn = ACTIONS[action.module]?.[action.action_name];
      if (!fn) {
        if (action.id !== undefined) await db.pending_actions.delete(action.id);
        continue;
      }
      try {
        await fn(...action.payload);
        if (action.id !== undefined) await db.pending_actions.delete(action.id);
        synced++;
      } catch {
        break;
      }
    }

    if (synced > 0) {
      showToast(`${synced} action${synced > 1 ? "s" : ""} synchronisée${synced > 1 ? "s" : ""}`);
    }
    return synced;
  } finally {
    flushing = false;
  }
}
