function PhotoPlaceholderIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="9.5" r="1.3" />
      <path d="M4.5 16.5l4.5-4.5 3 3 3.5-3.5 4.5 4.5" />
    </svg>
  );
}

// Mosaïque de couverture d'une collection, façon Raindrop : jusqu'à 4
// vignettes selon le nombre de photos disponibles.
export function CollectionMosaic({
  photos,
  viewTransitionName,
}: {
  photos: string[];
  viewTransitionName?: string;
}) {
  if (photos.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-surface-alt">
        <PhotoPlaceholderIcon />
      </div>
    );
  }

  if (photos.length === 1) {
    return (
      <div className="aspect-square overflow-hidden rounded-2xl bg-surface-alt">
        {/* eslint-disable-next-line @next/next/no-img-element -- image issue du bucket Storage public collection-images, affichée telle quelle sans optimisation next/image */}
        <img src={photos[0]} alt="" style={{ viewTransitionName }} className="h-full w-full object-cover" />
      </div>
    );
  }

  if (photos.length === 2) {
    return (
      <div className="grid aspect-square grid-cols-2 gap-0.5 overflow-hidden rounded-2xl bg-surface-alt">
        {photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- image issue du bucket Storage public collection-images, affichée telle quelle sans optimisation next/image
          <img
            key={i}
            src={src}
            alt=""
            style={i === 0 ? { viewTransitionName } : undefined}
            className="h-full w-full object-cover"
          />
        ))}
      </div>
    );
  }

  if (photos.length === 3) {
    return (
      <div className="grid aspect-square grid-cols-2 gap-0.5 overflow-hidden rounded-2xl bg-surface-alt">
        {/* eslint-disable-next-line @next/next/no-img-element -- image issue du bucket Storage public collection-images, affichée telle quelle sans optimisation next/image */}
        <img
          src={photos[0]}
          alt=""
          style={{ viewTransitionName }}
          className="row-span-2 h-full w-full object-cover"
        />
        <div className="grid grid-rows-2 gap-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- image issue du bucket Storage public collection-images, affichée telle quelle sans optimisation next/image */}
          <img src={photos[1]} alt="" className="h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element -- image issue du bucket Storage public collection-images, affichée telle quelle sans optimisation next/image */}
          <img src={photos[2]} alt="" className="h-full w-full object-cover" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl bg-surface-alt">
      {photos.slice(0, 4).map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- image issue du bucket Storage public collection-images, affichée telle quelle sans optimisation next/image
        <img
          key={i}
          src={src}
          alt=""
          style={i === 0 ? { viewTransitionName } : undefined}
          className="h-full w-full object-cover"
        />
      ))}
    </div>
  );
}
