// Appelée une fois par jour par pg_cron (cf.
// scripts/migration-cron-rappels-documents-2026-09-11.sql). Pour chaque
// document dont la date d'échéance tombe dans 30, 7 ou 1 jour(s), envoie une
// notification push à tous les abonnements enregistrés (mono-utilisateur
// mais potentiellement plusieurs devices/navigateurs abonnés).
//
// web-push (npm) est utilisé pour la signature VAPID et le chiffrement du
// payload (aes128gcm) : sa dépendance à node:crypto (createECDH,
// createCipheriv, createSign) est supportée par la compatibilité NPM des
// Supabase Edge Functions (Deno). Aucune librairie Deno-native équivalente
// n'a été trouvée à jour, donc c'est le choix retenu — cf. limitation
// documentée dans le rapport de la Phase 4.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT");

// Secrets VAPID partagés avec les autres Edge Functions du projet (cf.
// envoyer-rappels-taches). On échoue proprement (200, pas d'exception non
// gérée) plutôt que de laisser webpush.setVapidDetails lever au chargement
// du module si jamais ils ne sont pas encore configurés.
const vapidConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
if (vapidConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Seuils d'alerte avant l'échéance d'un document (en jours). Le job pg_cron
// (rappels-documents) appelle cette fonction une fois par jour : chaque
// document ne peut donc franchir qu'un seul seuil par jour, pas de risque de
// double-alerte le même jour pour un même document.
const SEUILS_JOURS = [30, 7, 1] as const;

function aujourdhuiISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateDansNJours(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() + n);
  return date.toISOString().slice(0, 10);
}

Deno.serve(async () => {
  if (!vapidConfigured) {
    return new Response(
      JSON.stringify({ error: "Secrets VAPID non configurés (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT)." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const aujourdhui = aujourdhuiISO();

  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let documentsNotifies = 0;
  let sent = 0;
  let expired = 0;

  for (const seuil of SEUILS_JOURS) {
    const dateCible = dateDansNJours(seuil);

    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, nom")
      .eq("date_echeance", dateCible)
      .or(`derniere_alerte_envoyee_le.is.null,derniere_alerte_envoyee_le.neq.${aujourdhui}`);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!documents || documents.length === 0) continue;

    for (const document of documents) {
      const jourLabel = seuil === 1 ? "1 jour" : `${seuil} jours`;
      const payload = JSON.stringify({
        title: "Document à échéance proche",
        body: `${document.nom} arrive à échéance dans ${jourLabel}.`,
        url: `/documents/${document.id}`,
      });

      for (const sub of subscriptions ?? []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            expired++;
          }
          // Autres erreurs (timeout, 5xx du service push, ...) : ignorées
          // pour ne pas bloquer les autres abonnements/documents.
          // derniere_alerte_envoyee_le est quand même marquée ci-dessous
          // pour ne pas spammer en boucle.
        }
      }

      const { error: updateError } = await supabase
        .from("documents")
        .update({ derniere_alerte_envoyee_le: aujourdhui })
        .eq("id", document.id);
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      documentsNotifies++;
    }
  }

  return new Response(JSON.stringify({ documentsNotifies, sent, expired }), {
    headers: { "Content-Type": "application/json" },
  });
});
