import { screenTitle } from "@/lib/ui";
import { ObjectifsList } from "./ObjectifsList";

// Shell serveur : les objectifs sont chargés côté client via TanStack Query
// dans ObjectifsList (voir /taches, même patron), qui affiche un skeleton
// pendant isLoading.
export default function ObjectifsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Objectifs</h1>
      <ObjectifsList />
    </div>
  );
}
