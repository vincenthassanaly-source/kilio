import { notFound } from "next/navigation";
import { getDocument } from "@/app/actions/documents";
import { DocumentDetail } from "./DocumentDetail";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocument(id);

  if (!document) {
    notFound();
  }

  return <DocumentDetail document={document} />;
}
