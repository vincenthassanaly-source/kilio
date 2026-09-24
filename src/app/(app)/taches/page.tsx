import { TachesView } from "./TachesView";
import { screenTitle } from "@/lib/ui";

// Le shell (titre) reste rendu instantanément côté serveur ; les données
// (tâches/listes/tags) sont chargées côté client via TanStack Query dans
// TachesView, qui affiche un skeleton pendant isLoading — voir 2.2 du prompt
// de session (reports/2026-09-02-fluidite-ux-globale.md pour le détail).
export default function TachesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle} style={{ viewTransitionName: "taches-titre-dashboard" }}>
        Tâches
      </h1>
      <TachesView />
    </div>
  );
}
