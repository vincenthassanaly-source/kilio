import { getEtiquettes } from "@/app/actions/documents";
import { TransitionLink } from "@/components/TransitionLink";
import { eyebrow, linkButton, screenTitle } from "@/lib/ui";
import { AddEtiquetteToggle } from "./AddEtiquetteToggle";
import { EtiquettesManager } from "./EtiquettesManager";

export default async function EtiquettesPage() {
  const etiquettes = await getEtiquettes();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className={eyebrow}>Documents</p>
        <h1 className={screenTitle}>Étiquettes</h1>
        <TransitionLink href="/documents" className={linkButton}>
          ‹ Retour aux documents
        </TransitionLink>
      </div>

      <AddEtiquetteToggle />
      <EtiquettesManager etiquettes={etiquettes} />
    </div>
  );
}
