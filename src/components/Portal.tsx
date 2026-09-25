"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

function abonnementVide() {
  return () => {};
}

/**
 * Rend ses enfants directement dans `document.body` (constat T14) : un
 * overlay `fixed` déclaré dans une carte animée (`active:scale`, transform
 * de framer-motion, glissement de page) était décalé ou déformé par le
 * transform de son ancêtre. Rien côté serveur : le contenu n'apparaît
 * qu'après hydratation, ce qui convient aux overlays ouverts par un geste.
 */
export function Portal({ children }: { children: ReactNode }) {
  const monte = useSyncExternalStore(abonnementVide, () => true, () => false);
  return monte ? createPortal(children, document.body) : null;
}
