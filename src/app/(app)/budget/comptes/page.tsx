import { getComptesAvecSolde } from "@/app/actions/comptes";
import { screenTitle } from "@/lib/ui";
import { AddCompteToggle } from "./AddCompteToggle";
import { ComptesList } from "./ComptesList";
import { PullToRefresh } from "@/components/PullToRefresh";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function ComptesPage() {
  const comptes = await getComptesAvecSolde();

  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <h1 className={screenTitle}>Comptes</h1>
        <AddCompteToggle />
        <ComptesList comptes={comptes} />
      </div>
    </PullToRefresh>
  );
}
