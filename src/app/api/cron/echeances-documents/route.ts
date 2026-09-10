import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { envoyerNotificationPush } from "@/lib/push/send";

// Seuils d'alerte avant l'échéance d'un document (en jours). Le cron
// GitHub Actions (.github/workflows/echeances-documents.yml) appelle cette
// route une fois par jour : chaque document ne peut donc franchir qu'un
// seul seuil par jour, pas de risque de double-alerte le même jour pour un
// même document.
const SEUILS_JOURS = [30, 7, 1] as const;

function aujourdhuiISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateDansNJours(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() + n);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const supabase = await createClient();
  const aujourdhui = aujourdhuiISO();

  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("*");
  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 });

  let documentsNotifies = 0;

  for (const seuil of SEUILS_JOURS) {
    const dateCible = dateDansNJours(seuil);

    const { data: documents, error } = await supabase
      .from("documents")
      .select("*")
      .eq("date_echeance", dateCible)
      .or(`derniere_alerte_envoyee_le.is.null,derniere_alerte_envoyee_le.neq.${aujourdhui}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!documents || documents.length === 0) continue;

    for (const document of documents) {
      const jourLabel = seuil === 1 ? "1 jour" : `${seuil} jours`;
      const payload = {
        title: "Document à échéance proche",
        body: `${document.nom} arrive à échéance dans ${jourLabel}.`,
        url: `/documents/${document.id}`,
      };

      for (const subscription of subscriptions ?? []) {
        await envoyerNotificationPush(subscription, payload);
      }

      const { error: updateError } = await supabase
        .from("documents")
        .update({ derniere_alerte_envoyee_le: aujourdhui })
        .eq("id", document.id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

      documentsNotifies++;
    }
  }

  return NextResponse.json({ ok: true, documentsNotifies });
}
