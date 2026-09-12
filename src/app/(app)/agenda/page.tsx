import { AgendaView } from "./AgendaView";
import { screenTitle } from "@/lib/ui";

// Shell serveur : tâches/listes/tags/planning sont chargés côté client via
// TanStack Query dans AgendaView (voir /taches, même patron). La clé
// `queryKeys.taches` est réutilisée telle quelle (partagée avec /taches et
// le dashboard) : cocher une tâche depuis l'agenda met donc à jour /taches
// instantanément et inversement, sans wiring supplémentaire.
//
// `force-dynamic` conservé malgré la disparition du fetch Server Component
// de cette page (voir reports/2026-09-12-fix-build-agenda-force-dynamic.md
// pour l'historique) : ce n'est plus cette page qui appelle Supabase, mais
// `src/app/(app)/layout.tsx` (préférences de navigation) l'appelle pour
// TOUTE route de ce groupe lors d'une génération statique — sans ce flag,
// Next.js retente de pré-rendre /agenda au build et le même crash qui avait
// nécessité ce correctif pour /agenda (constaté à nouveau ici avant l'ajout
// de cette ligne) réapparaît, indépendamment du fetch propre à cette page.
export const dynamic = "force-dynamic";

export default function AgendaPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Agenda</h1>
      <AgendaView />
    </div>
  );
}
