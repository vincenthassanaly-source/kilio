import { getDossiers } from "@/app/actions/documents";
import { TransitionLink } from "@/components/TransitionLink";
import { eyebrow, linkButton, screenTitle } from "@/lib/ui";
import { AddDossierToggle } from "./AddDossierToggle";
import { DossiersManager } from "./DossiersManager";

export default async function DossiersPage() {
  const dossiers = await getDossiers();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className={eyebrow}>Documents</p>
        <h1 className={screenTitle}>Dossiers</h1>
        <TransitionLink href="/documents" className={linkButton}>
          ‹ Retour aux documents
        </TransitionLink>
      </div>

      <AddDossierToggle dossiers={dossiers} />
      <DossiersManager dossiers={dossiers} />
    </div>
  );
}
