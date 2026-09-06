import { getCollections } from "@/app/actions/collections";
import { ChoisirCollectionForm } from "./ChoisirCollectionForm";
import { FadeInImage } from "@/components/FadeInImage";
import { screenTitle } from "@/lib/ui";

// Atterrissage du Web Share Target (partage natif Android) : reçoit les
// urls des photos déjà uploadées par la Route Handler /collection/partage
// (query param `photo`, répété une fois par photo), et laisse choisir une
// collection existante ou en créer une à la volée.
export default async function ChoisirCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ photo?: string | string[] }>;
}) {
  const { photo } = await searchParams;
  const photos = photo === undefined ? [] : Array.isArray(photo) ? photo : [photo];
  const collections = await getCollections();

  return (
    <div
      className="flex-1 overflow-y-auto px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
      }}
    >
      <div className="flex flex-col gap-4">
        <h1 className={screenTitle}>Ajouter à une collection</h1>

        {photos.length === 0 ? (
          <p className="text-ink-2">Aucune photo reçue.</p>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((url) => (
                <FadeInImage
                  key={url}
                  src={url}
                  alt=""
                  width={96}
                  height={96}
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                />
              ))}
            </div>
            <ChoisirCollectionForm collections={collections} photos={photos} />
          </>
        )}
      </div>
    </div>
  );
}
