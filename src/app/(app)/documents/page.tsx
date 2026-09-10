import { getDocuments, getDossiers, getEtiquettes } from "@/app/actions/documents";
import { screenTitle } from "@/lib/ui";
import { DocumentsBrowser } from "./DocumentsBrowser";
import { PullToRefresh } from "@/components/PullToRefresh";

export default async function DocumentsPage() {
  const [documents, dossiers, etiquettes] = await Promise.all([
    getDocuments(),
    getDossiers(),
    getEtiquettes(),
  ]);

  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <h1 className={screenTitle}>Documents</h1>
        <DocumentsBrowser documents={documents} dossiers={dossiers} etiquettes={etiquettes} />
      </div>
    </PullToRefresh>
  );
}
