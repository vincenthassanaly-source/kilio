"use client";

import { useLayoutEffect, type RefObject } from "react";
import { usePathname } from "next/navigation";

const STORAGE_PREFIX = "kilio:scroll:";

/**
 * Restaure l'offset de scroll de `ref` (le `<main>` commun à toutes les
 * pages de `(app)`, voir TabSwipeWrapper — pas `window`, l'app ne scrolle
 * jamais la fenêtre) à l'identique de celui quitté en dernier sur la même
 * route, et le persiste en continu dans `sessionStorage` (clé = pathname)
 * pendant que l'utilisateur scrolle. `<main>` restant monté d'une
 * navigation à l'autre (layout partagé de `(app)`, seuls ses enfants
 * changent), un seul appel de ce hook dans TabSwipeWrapper couvre
 * génériquement toutes les listes scrollables de l'app, sans rien dupliquer
 * par module. `useLayoutEffect` (plutôt que `useEffect`) pour restaurer la
 * position avant la peinture du nouveau contenu et éviter tout flash.
 */
export function useScrollRestoration(ref: RefObject<HTMLElement | null>) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cle = `${STORAGE_PREFIX}${pathname}`;

    let cible = 0;
    try {
      const sauvegarde = sessionStorage.getItem(cle);
      if (sauvegarde) cible = Number(sauvegarde);
    } catch {
      // sessionStorage indisponible (navigation privée stricte...) : on
      // reste simplement en haut de page, sans bloquer le rendu.
    }

    // Comparaison avec la position actuelle pour éviter un flash de scroll
    // sur une première visite (déjà en haut, pas besoin de forcer un
    // scrollTo identique).
    if (Number.isFinite(cible) && el.scrollTop !== cible) {
      el.scrollTop = cible;
    }

    function handleScroll() {
      try {
        sessionStorage.setItem(cle, String(el!.scrollTop));
      } catch {
        // Idem : échec silencieux, la restauration est un confort, pas une
        // garantie fonctionnelle.
      }
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [ref, pathname]);
}
