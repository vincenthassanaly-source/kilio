"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isModuleRootPath } from "@/lib/navigation/registry";

export type NavDirection = "avance" | "recule";

// Attribut posé sur <html> juste avant `startViewTransition()`, lu par les
// règles `::view-transition-old(root)` / `::view-transition-new(root)` de
// globals.css pour choisir le sens du slide. Retiré une fois la transition
// terminée (ou avortée) pour ne jamais laisser une valeur périmée traîner.
const NAV_DIRECTION_ATTR = "navDirection";

// Délai de sécurité au-delà duquel le callback de `startViewTransition` se
// résout même si le pathname n'a pas (encore) rejoint la cible : couvre une
// navigation qui échoue silencieusement ou une cible dont le pathname ne
// correspond jamais exactement (cas déjà écarté par la comparaison
// `target === pathname` ci-dessous, mais gardé par sécurité). Ne doit jamais
// bloquer la transition indéfiniment.
const TIMEOUT_NAVIGATION_MS = 3000;

type NavigationEnAttente = {
  target: string;
  resolve: () => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

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
 *
 * `router.push` ne renvoie rien à attendre : lui seul dans le callback,
 * `startViewTransition` capturerait l'état "après" dès la fin (synchrone)
 * de cet appel, avant que la navigation App Router (fetch RSC + rendu de la
 * page cible) ne soit réellement effective, figeant l'écran sur l'ancienne
 * route jusqu'à ce que le vrai changement de DOM survienne (bascule brutale
 * sans transition visible). Le callback renvoie donc une Promise qui ne se
 * résout qu'une fois `usePathname()` reflète effectivement `href` (voir
 * l'effet ci-dessous), avec le timeout de sécurité `TIMEOUT_NAVIGATION_MS`.
 */
export function useViewTransitionNavigate() {
  const router = useRouter();
  const pathname = usePathname();

  // Toujours au plus une navigation en attente : un `useCallback` recréé à
  // chaque changement de pathname (deps `[router, pathname]`) ne peut de
  // toute façon pas en avoir plusieurs en vol vers des pathnames différents
  // sans qu'un re-render (et donc cet effet) ne survienne entre les deux.
  const enAttenteRef = useRef<NavigationEnAttente | null>(null);

  useEffect(() => {
    const enAttente = enAttenteRef.current;
    if (enAttente && enAttente.target === pathname) {
      clearTimeout(enAttente.timeoutId);
      enAttenteRef.current = null;
      enAttente.resolve();
    }
  }, [pathname]);

  return useCallback(
    (href: string, direction?: NavDirection) => {
      const target = href.split("?")[0].split("#")[0];

      // Transition entre deux routes racine de module (ex. /nutrition ->
      // /taches, ou /plus -> /agenda) : `replace` au lieu de `push`, pour ne
      // jamais empiler plus d'une entrée "module racine" au-dessus de
      // l'accueil — la flèche retour matérielle revient donc toujours
      // directement à l'accueil en un seul geste, quel que soit le nombre de
      // modules racine visités entretemps. Quitter l'accueil elle-même reste
      // un `push` : son entrée doit rester dans l'historique comme point
      // d'ancrage, sinon plus aucune entrée "/" n'y subsisterait pour que la
      // flèche retour puisse y revenir. La navigation en profondeur dans un
      // module (drill-down, ex. /taches -> /taches/listes/abc) n'est jamais
      // concernée : ni pathname ni target n'y correspond à une racine.
      const useReplace = pathname !== "/" && isModuleRootPath(pathname) && isModuleRootPath(target);
      const push = (h: string) => (useReplace ? router.replace(h) : router.push(h));

      if (typeof document !== "undefined" && "startViewTransition" in document) {
        const root = document.documentElement;
        const resolved = direction ?? deriveDirection(pathname, href);

        if (resolved) root.dataset[NAV_DIRECTION_ATTR] = resolved;
        else delete root.dataset[NAV_DIRECTION_ATTR];

        const transition = (
          document as Document & {
            startViewTransition: (callback: () => void | Promise<void>) => { finished: Promise<void> };
          }
        ).startViewTransition(() => {
          push(href);

          // Même pathname que l'actuel (query/hash seuls diffèrent, ou
          // onglet déjà actif) : `usePathname()` ne changera jamais, rien à
          // attendre (cas déjà écarté côté direction par `deriveDirection`).
          if (target === pathname) return;

          return new Promise<void>((resolve) => {
            const enAttente: NavigationEnAttente = {
              target,
              resolve,
              timeoutId: setTimeout(() => {
                if (enAttenteRef.current === enAttente) enAttenteRef.current = null;
                resolve();
              }, TIMEOUT_NAVIGATION_MS),
            };
            enAttenteRef.current = enAttente;
          });
        });

        transition.finished
          .catch(() => {})
          .finally(() => {
            delete root.dataset[NAV_DIRECTION_ATTR];
          });
      } else {
        push(href);
      }
    },
    [router, pathname]
  );
}
