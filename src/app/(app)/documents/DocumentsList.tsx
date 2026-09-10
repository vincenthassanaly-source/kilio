import type { DocumentAvecFichiers } from "@/app/actions/documents";
import type { Tables } from "@/lib/supabase/types";
import { DocumentCard } from "./DocumentCard";

export function DocumentsList({
  documents,
  dossiers,
  emptyMessage = "Aucun document pour l'instant.",
}: {
  documents: DocumentAvecFichiers[];
  dossiers: Tables<"dossiers">[];
  emptyMessage?: string;
}) {
  if (documents.length === 0) {
    return <p className="text-ink-2">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} dossiers={dossiers} />
      ))}
    </ul>
  );
}
