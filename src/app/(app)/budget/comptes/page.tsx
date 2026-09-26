import { Suspense } from "react";
import { connection } from "next/server";
import { getComptesAvecSolde } from "@/app/actions/comptes";
import { screenTitle } from "@/lib/ui";
import { AddCompteToggle } from "./AddCompteToggle";
import { ComptesList } from "./ComptesList";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";

export default async function ComptesPage() {
  // Sans `connection()` : le <Suspense> ci-dessous ne suffit pas à isoler
  // le crash — createAdminClient() (dans getComptesAvecSolde) jette de
  // façon synchrone, pas une rejection async que Cache Components sait
  // reporter à l'exécution, donc `next build` échoue tout entier dès que
  // SUPABASE_SERVICE_ROLE_KEY est absent (cas des déploiements preview
  // Vercel, cette clé n'étant configurée que pour Production). Même
  // pattern que /agenda, /courses, /habitudes, /objectifs, /taches.
  await connection();
  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <h1 className={screenTitle}>Comptes</h1>
        <AddCompteToggle />
        <Suspense fallback={<ListItemSkeletonGroup count={4} withSubtitle />}>
          <Comptes />
        </Suspense>
      </div>
    </PullToRefresh>
  );
}

async function Comptes() {
  return <ComptesList comptes={await getComptesAvecSolde()} />;
}
