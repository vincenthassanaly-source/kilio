import { ModulesGrid } from "@/components/ModulesGrid";
import { PlusEditBar } from "./PlusEditBar";
import { eyebrow, screenTitle } from "@/lib/ui";

export default function PlusPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className={screenTitle}>Plus</h1>
        <PlusEditBar />
      </div>
      {/* Seul indice visible que les tuiles sont réorganisables/épinglables
          (voir NavigationEditContext) : rien d'autre ne le signale
          aujourd'hui, ni ici ni dans Réglages (rapport d'audit navigation). */}
      <p className={eyebrow}>Appui long sur une tuile pour la réorganiser ou l&apos;épingler en barre du bas</p>
      <ModulesGrid />
    </div>
  );
}
