import { AgendaView } from "./AgendaView";
import { screenTitle } from "@/lib/ui";

// TODO(per-link-prefetch): assess with the user whether URL data should resolve before click.
// See: https://nextjs.org/docs/app/guides/optimizing-prefetching
// See: https://nextjs.org/docs/app/guides/adopting-partial-prefetching
export const prefetch = 'partial'

// Shell serveur : tâches/listes/tags/planning sont chargés côté client via
// TanStack Query dans AgendaView (voir /taches, même patron). La clé
// `queryKeys.taches` est réutilisée telle quelle (partagée avec /taches et
// le dashboard) : cocher une tâche depuis l'agenda met donc à jour /taches
// instantanément et inversement, sans wiring supplémentaire.

export default function AgendaPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Agenda</h1>
      <AgendaView />
    </div>
  );
}
