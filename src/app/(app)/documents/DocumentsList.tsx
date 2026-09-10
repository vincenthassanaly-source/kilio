import type { DocumentAvecFichiers } from "@/app/actions/documents";
import { DocumentCard } from "./DocumentCard";

export function DocumentsList({ documents }: { documents: DocumentAvecFichiers[] }) {
  if (documents.length === 0) {
    return <p className="text-ink-2">Aucun document pour l&apos;instant.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} />
      ))}
    </ul>
  );
}
