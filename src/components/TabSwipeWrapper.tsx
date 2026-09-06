"use client";

import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { useSwipeHorizontal, type SensSwipe } from "@/hooks/useSwipeHorizontal";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useNavigationEdit } from "@/lib/navigation/NavigationEditContext";

// Routes possédant leur propre swipe horizontal interne (changement de
// jour/semaine, historique...) : les événements `onTouchStart/Move/End` de
// React bubblent jusqu'à `<main>`, donc attacher aussi les handlers de swipe
// entre onglets sur ces routes exactes déclencherait les deux détections
// pour un même geste et casserait le swipe interne (constaté sur Agenda).
// Exclues du swipe entre onglets même si épinglées en barre du bas — on peut
// toujours y arriver en swipant depuis un onglet voisin, seule la détection
// *sur* la route elle-même est désactivée.
const ROUTES_SWIPE_INTERNE = ["/agenda"];

/**
 * Enrobe le `<main>` commun à toutes les pages de `(app)` pour détecter un
 * swipe horizontal entre les onglets épinglés en barre du bas. L'ordre suivi
 * est celui, dynamique et personnalisable, de `modulesBarreBasse`
 * (`NavigationEditContext`) — pas de notion d'ordre linéaire pour "Plus",
 * toujours exclu de ce tableau. Le hook de détection (`useSwipeHorizontal`,
 * déjà utilisé par Agenda et le Journal Nutrition pour naviguer entre dates)
 * n'est réellement branché sur `<main>` que sur les routes exactes présentes
 * dans `modulesBarreBasse` et hors `ROUTES_SWIPE_INTERNE` : sur les
 * sous-routes (/agenda/..., /nutrition/journal, /nutrition/recettes...) et
 * sur Agenda lui-même, les handlers ne sont pas attachés du tout, pour ne
 * jamais entrer en conflit avec un swipe dates/semaines déjà présent sur ces
 * écrans.
 *
 * Porte aussi la restauration du scroll (`useScrollRestoration`) : `<main>`
 * étant le seul conteneur scrollable de l'app (pas `window`) et restant
 * monté d'une navigation à l'autre, un seul hook ici couvre génériquement
 * toutes les listes scrollables de l'app.
 */
export function TabSwipeWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const navigate = useViewTransitionNavigate();
  const { modulesBarreBasse } = useNavigationEdit();

  const indexOngletActif = modulesBarreBasse.indexOf(pathname);
  const actif = indexOngletActif !== -1 && !ROUTES_SWIPE_INTERNE.includes(pathname);

  function handleSwipe(sens: SensSwipe) {
    if (!actif) return;
    const prochainIndex = indexOngletActif + (sens === "suivant" ? 1 : -1);
    if (prochainIndex < 0 || prochainIndex >= modulesBarreBasse.length) return;
    navigate(modulesBarreBasse[prochainIndex], sens === "suivant" ? "avance" : "recule");
  }

  const swipeHandlers = useSwipeHorizontal(handleSwipe);

  const mainRef = useRef<HTMLElement>(null);
  useScrollRestoration(mainRef);

  return (
    <main
      ref={mainRef}
      className="flex-1 overflow-x-hidden overflow-y-auto px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 64px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 112px)",
        overscrollBehaviorY: "contain",
      }}
      {...(actif ? swipeHandlers : {})}
    >
      {children}
    </main>
  );
}
