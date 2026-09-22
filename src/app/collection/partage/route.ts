import { NextResponse, type NextRequest } from "next/server";
import { recupererLienVideoPartage, uploaderPhotosPartagees } from "@/app/actions/collections";
import { extraireLienVideoDuTexte } from "@/lib/collection/video";

// Cible du Web Share Target déclaré dans public/manifest.json : reçoit les
// photos et/ou le lien vidéo TikTok ou YouTube partagés depuis une autre app
// Android (Galerie, app TikTok, app YouTube, navigateur...), uploade les
// photos dans le bucket collection-images et résout les métadonnées du lien
// vidéo (sans rien rattacher à une collection), puis redirige vers l'écran de
// sélection de collection avec un paramètre `photo` par photo uploadée et des
// paramètres `video_*` si un lien a été trouvé.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const fichiers = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  // TikTok et YouTube envoient le lien partagé via `text` ou `url` selon les
  // versions Android, et le champ texte peut contenir d'autres mots autour du lien.
  const texteRecu = [formData.get("url"), formData.get("text")]
    .map((v) => (typeof v === "string" ? v : ""))
    .join(" ");
  const lienVideo = extraireLienVideoDuTexte(texteRecu);

  const url = new URL("/collection/partage/choisir", request.url);

  if (fichiers.length > 0) {
    const urls = await uploaderPhotosPartagees(fichiers);
    for (const photoUrl of urls) {
      url.searchParams.append("photo", photoUrl);
    }
  }

  if (lienVideo) {
    const metadonnees = await recupererLienVideoPartage(lienVideo);
    if (metadonnees) {
      url.searchParams.set("video_url", metadonnees.url);
      url.searchParams.set("video_thumbnail", metadonnees.thumbnailUrl);
      url.searchParams.set("video_titre", metadonnees.titre);
      url.searchParams.set("video_type", metadonnees.type);
    }
  }

  return NextResponse.redirect(url, 303);
}
