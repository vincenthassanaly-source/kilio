import { screenTitle } from "@/lib/ui";
import { CollectionsGrid } from "./CollectionsGrid";

// Shell serveur : les collections sont chargées côté client via TanStack
// Query dans CollectionsGrid (voir /taches, même patron), qui affiche un
// skeleton pendant isLoading.
export default function CollectionPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Collection</h1>
      <CollectionsGrid />
    </div>
  );
}
