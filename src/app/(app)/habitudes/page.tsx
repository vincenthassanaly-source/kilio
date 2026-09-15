import { HabitudesView } from "./HabitudesView";
import { screenTitle } from "@/lib/ui";
import { toISODate } from "./date-utils";

export default function HabitudesPage() {
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
