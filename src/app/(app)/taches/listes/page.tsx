import { connection } from "next/server";
import { getComptesTachesParListe, getListes, getTags } from "@/app/actions/taches";
import { TransitionLink } from "@/components/TransitionLink";
import { eyebrow, linkButton, screenTitle, sectionTitle } from "@/lib/ui";
import { AddListeToggle } from "./AddListeToggle";
import { ListesManager } from "./ListesManager";
import { AddTagToggle } from "./AddTagToggle";
import { TagsManager } from "./TagsManager";

export default async function ListesTachesPage() {
  // Voir le commentaire de /budget/comptes : createAdminClient() jette de
  // façon synchrone au build sans SUPABASE_SERVICE_ROLE_KEY (absente sur
  // les déploiements preview Vercel). /taches (page parente) le fait déjà.
  await connection();
  const [listes, tags, comptes] = await Promise.all([getListes(), getTags(), getComptesTachesParListe()]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className={eyebrow}>Tâches</p>
        <h1 className={screenTitle}>Listes &amp; tags</h1>
        <TransitionLink href="/taches" className={linkButton}>
          ← Retour aux tâches
        </TransitionLink>
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className={sectionTitle}>Listes</h2>
        <AddListeToggle />
        <ListesManager listes={listes} comptes={comptes} />
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className={sectionTitle}>Tags</h2>
        <AddTagToggle />
        <TagsManager tags={tags} />
      </div>
    </div>
  );
}
