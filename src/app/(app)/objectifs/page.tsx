import { connection } from "next/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeServerQueryClient } from "@/lib/query/server-client";
import { queryKeys } from "@/lib/query/keys";
import { getObjectifs } from "@/app/actions/objectifs";
import { screenTitle } from "@/lib/ui";
import { ObjectifsList } from "./ObjectifsList";

// Server Component async : précharge `objectifs` côté serveur (voir
// DashboardTachesCard.tsx pour le patron), hydraté avant que ObjectifsList
// (mutations/offline-queue) ne prenne le relais côté client.
export default async function ObjectifsPage() {
  await connection();
  const queryClient = makeServerQueryClient();
  await queryClient.prefetchQuery({ queryKey: queryKeys.objectifs, queryFn: getObjectifs });

  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Objectifs</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ObjectifsList />
      </HydrationBoundary>
    </div>
  );
}
