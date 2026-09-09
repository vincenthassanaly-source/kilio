import { getCollections } from "@/app/actions/collections";
import { ChoisirCollectionForm } from "./ChoisirCollectionForm";
import { FadeInImage } from "@/components/FadeInImage";
import { screenTitle } from "@/lib/ui";

// Atterrissage du Web Share Target (partage natif Android) : reçoit les
// urls des photos déjà uploadées par la Route Handler /collection/partage
// (query param `photo`, répété une fois par photo) et/ou les métadonnées
// d'un lien TikTok partagé (query params `tiktok_url`/`tiktok_thumbnail`/
// `tiktok_titre`), et laisse choisir une collection existante ou en créer
// une à la volée.
export default async function ChoisirCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    photo?: string | string[];
    tiktok_url?: string;
    tiktok_thumbnail?: string;
    tiktok_titre?: string;
  }>;
}) {
  const { photo, tiktok_url, tiktok_thumbnail, tiktok_titre } = await searchParams;
  const photos = photo === undefined ? [] : Array.isArray(photo) ? photo : [photo];
  const tiktok =
    tiktok_url && tiktok_thumbnail
      ? { url: tiktok_url, thumbnailUrl: tiktok_thumbnail, titre: tiktok_titre ?? "" }
      : null;
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

        {photos.length === 0 && !tiktok ? (
          <p className="text-ink-2">Rien reçu.</p>
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
              {tiktok && (
                <div className="relative h-24 w-24 shrink-0">
                  <FadeInImage
                    src={tiktok.thumbnailUrl}
                    alt=""
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    TikTok
                  </span>
                </div>
              )}
            </div>
            <ChoisirCollectionForm collections={collections} photos={photos} tiktok={tiktok} />
          </>
        )}
      </div>
    </div>
  );
}
