import { getCollections } from "@/app/actions/collections";
import { ChoisirCollectionForm } from "./ChoisirCollectionForm";
import { FadeInImage } from "@/components/FadeInImage";
import { estTypeVideo } from "@/lib/collection/video";
import { screenTitle } from "@/lib/ui";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Atterrissage du Web Share Target (partage natif Android) : reçoit les
// urls des photos déjà uploadées par la Route Handler /collection/partage
// (query param `photo`, répété une fois par photo) et/ou les métadonnées
// d'un lien vidéo TikTok ou YouTube partagé (query params `video_url`/
// `video_thumbnail`/`video_titre`/`video_type`), et laisse choisir une collection existante ou en créer
// une à la volée.
export default async function ChoisirCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    photo?: string | string[];
    video_url?: string;
    video_thumbnail?: string;
    video_titre?: string;
    video_type?: string;
  }>;
}) {
  const { photo, video_url, video_thumbnail, video_titre, video_type } = await searchParams;
  const photos = photo === undefined ? [] : Array.isArray(photo) ? photo : [photo];
  const video =
    video_url && video_thumbnail && video_type && estTypeVideo(video_type)
      ? { url: video_url, thumbnailUrl: video_thumbnail, titre: video_titre ?? "", type: video_type }
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

        {photos.length === 0 && !video ? (
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
              {video && (
                <div className="relative h-24 w-24 shrink-0">
                  <FadeInImage
                    src={video.thumbnailUrl}
                    alt=""
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {video.type === "youtube" ? "YouTube" : "TikTok"}
                  </span>
                </div>
              )}
            </div>
            <ChoisirCollectionForm collections={collections} photos={photos} video={video} />
          </>
        )}
      </div>
    </div>
  );
}
