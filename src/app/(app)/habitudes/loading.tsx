import { screenTitle } from "@/lib/ui";
import { HabitudesSkeleton } from "./HabitudesSkeleton";

export default function HabitudesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Habitudes</h1>
      <HabitudesSkeleton />
    </div>
  );
}
