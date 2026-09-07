import { getActu } from "@/app/actions/actu";
import { PullToRefresh } from "@/components/PullToRefresh";
import { card, screenTitle, sectionTitle } from "@/lib/ui";
import { formaterDateRelative, tronquerResume, type Article } from "@/lib/actu/compute";

const LONGUEUR_MAX_RESUME = 140;

function ArticleRow({ article }: { article: Article }) {
  return (
    <a
      href={article.lien}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-1 border-b border-line pb-3 last:border-0 last:pb-0"
    >
      <p className="text-[14.5px] font-semibold leading-snug text-ink">{article.titre}</p>
      {article.resume && (
        <p className="text-[13px] text-ink-2">{tronquerResume(article.resume, LONGUEUR_MAX_RESUME)}</p>
      )}
      <p className="text-[12px] font-medium text-ink-3">
        {article.source}
        {formaterDateRelative(article.datePublication) && ` · ${formaterDateRelative(article.datePublication)}`}
      </p>
    </a>
  );
}

function Section({ titre, articles }: { titre: string; articles: Article[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className={sectionTitle}>{titre}</h2>
      {articles.length === 0 ? (
        <div className={`${card} text-[13.5px] text-ink-2`}>Aucun article disponible pour le moment.</div>
      ) : (
        <div className={`${card} flex flex-col gap-3`}>
          {articles.map((article) => (
            <ArticleRow key={article.lien} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function ActualitePage() {
  const { generale, pharma, erreursSources } = await getActu();

  return (
    <PullToRefresh>
      <div className="flex flex-col gap-5">
        <h1 className={screenTitle}>Actualité</h1>

        {erreursSources.length > 0 && (
          <div className="rounded-xl border border-alert/30 bg-alert/5 px-3 py-2 text-[12.5px] text-alert">
            {erreursSources.join(" · ")}
          </div>
        )}

        <Section titre="Actu générale" articles={generale} />
        <Section titre="Actu pharma" articles={pharma} />
      </div>
    </PullToRefresh>
  );
}
