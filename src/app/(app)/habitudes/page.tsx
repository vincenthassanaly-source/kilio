import { HabitudesView } from "./HabitudesView";
import { screenTitle } from "@/lib/ui";
import { toISODate } from "./date-utils";
import { connection } from "next/server";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function HabitudesPage() {
  // TODO: Cache Components adoption. Added to unblock the build: remove this boundary to re-trigger the error and review the documented options.
  await connection();
  const today = toISODate(new Date());

  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle} style={{ viewTransitionName: "habitudes-titre-dashboard" }}>
        Habitudes
      </h1>
      <HabitudesView today={today} />
    </div>
  );
}
