import { ModulesGrid } from "@/components/ModulesGrid";
import { PlusEditBar } from "./PlusEditBar";
import { screenTitle } from "@/lib/ui";

export default function PlusPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className={screenTitle}>Plus</h1>
        <PlusEditBar />
      </div>
      <ModulesGrid />
    </div>
  );
}
