import { NotesGrid } from "./NotesGrid";
import { screenTitle } from "@/lib/ui";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h1 className={screenTitle}>Notes</h1>
      <NotesGrid defaultOpen={action === "new"} />
    </div>
  );
}
