"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

export type NavDirection = "avance" | "recule";

// Attribut posé sur <html> juste avant `startViewTransition()`, lu par les
// règles `::view-transition-old(root)` / `::view-transition-new(root)` de
// globals.css pour choisir le sens du slide. Retiré une fois la transition
// terminée (ou avortée) pour ne jamais laisser une valeur périmée traîner.
const NAV_DIRECTION_ATTR = "navDirection";

// Déduit le sens avance/recule à partir de la hiérarchie des deux chemins
// (ex. /objectifs -> /objectifs/abc = avance, l'inverse = recule) quand
// l'appelant ne précise pas explicitement de direction (cas des onglets de
// la barre du bas, dont le sens suit l'ordre des onglets et pas la
// hiérarchie des routes — voir TabSwipeWrapper/BottomNav). Undefined si les
// deux chemins ne sont pas dans une relation parent/enfant (ex. bascule
// entre deux onglets sœurs comme /nutrition/journal <-> /nutrition/recettes) :
// dans ce cas le simple fondu existant s'applique, sans slide.
function deriveDirection(pathname: string, href: string): NavDirection | undefined {
  const cible = href.split("?")[0].split("#")[0];
  if (cible === pathname) return undefined;
  if (cible.startsWith(`${pathname}/`) || (pathname === "/" && cible !== "/")) return "avance";
  if (pathname.startsWith(`${cible}/`) || (cible === "/" && pathname !== "/")) return "recule";
  return undefined;
}

/**
 * Navigue vers `href` en enrobant `router.push` dans
 * `document.startViewTransition` quand l'API est disponible, avec un slide
 * directionnel (voir règles `::view-transition-old(root)` /
 * `::view-transition-new(root)` conditionnées par `[data-nav-direction]`
 * dans globals.css). `direction` peut être imposée explicitement (onglets de
 * la barre du bas, dont le sens suit l'ordre des onglets) ; sinon déduite de
 * la hiérarchie des deux chemins (`deriveDirection`). Feature detection
 * pure : fallback silencieux sur `router.push` direct sur les navigateurs
 * qui ne supportent pas encore l'API (Safari, Firefox), aucune erreur levée.
 */
export function useViewTransitionNavigate() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (href: string, direction?: NavDirection) => {
      if (typeof document !== "undefined" && "startViewTransition" in document) {
        const root = document.documentElement;
        const resolved = direction ?? deriveDirection(pathname, href);

        if (resolved) root.dataset[NAV_DIRECTION_ATTR] = resolved;
        else delete root.dataset[NAV_DIRECTION_ATTR];

        const transition = (
          document as Document & { startViewTransition: (callback: () => void) => { finished: Promise<void> } }
        ).startViewTransition(() => {
          router.push(href);
        });

        transition.finished
          .catch(() => {})
          .finally(() => {
            delete root.dataset[NAV_DIRECTION_ATTR];
          });
      } else {
        router.push(href);
      }
    },
    [router, pathname]
  );
}
