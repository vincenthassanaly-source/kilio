import { getListes, getTachesAvecRelations, getTags } from "@/app/actions/taches";
import { getPlanningTravail, getPlanningTravailExceptions } from "@/app/actions/planning-travail";
import { AgendaView } from "./AgendaView";
import { screenTitle } from "@/lib/ui";

// Les tâches/créneaux sont ajoutés quasi exclusivement en écriture directe en
// base (hors Server Action) : cette route ne doit jamais rester en cache
// (cf. /nutrition/journal, même pattern).
export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const [taches, listes, tags, creneaux, exceptions] = await Promise.all([
    getTachesAvecRelations(),
    getListes(),
    getTags(),
    getPlanningTravail(),
    getPlanningTravailExceptions(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Agenda</h1>
      <AgendaView
        taches={taches}
        listes={listes}
        tags={tags}
        creneaux={creneaux}
        exceptions={exceptions}
      />
    </div>
  );
}
