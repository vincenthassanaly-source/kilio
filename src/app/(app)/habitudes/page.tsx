import { Suspense } from "react";
import { connection } from "next/server";
import { HabitudesView } from "./HabitudesView";
import { HabitudesSkeleton } from "./HabitudesSkeleton";
import { screenTitle } from "@/lib/ui";
import { aujourdhuiParis } from "@/lib/date/paris";

// La date du jour est une donnée de requête : lue après connection(), sous
// <Suspense>, pour que le titre reste dans la coquille statique.
async function HabitudesDuJour() {
  await connection();
  return <HabitudesView today={aujourdhuiParis()} />;
}

export default function HabitudesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle} style={{ viewTransitionName: "habitudes-titre-dashboard" }}>
        Habitudes
      </h1>
      <Suspense fallback={<HabitudesSkeleton />}>
        <HabitudesDuJour />
      </Suspense>
    </div>
  );
}
