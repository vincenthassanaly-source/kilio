import { ModulesGrid } from "@/components/ModulesGrid";
import { PlusEditBar } from "./PlusEditBar";
import { screenTitle } from "@/lib/ui";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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
