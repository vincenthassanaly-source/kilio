import { getDocuments } from "@/app/actions/documents";
import { screenTitle } from "@/lib/ui";
import { AddDocumentToggle } from "./AddDocumentToggle";
import { DocumentsList } from "./DocumentsList";
import { PullToRefresh } from "@/components/PullToRefresh";

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <h1 className={screenTitle}>Documents</h1>
        <AddDocumentToggle />
        <DocumentsList documents={documents} />
      </div>
    </PullToRefresh>
  );
}
