// Faux Supabase (PostgREST) pour le rig instant() local — voir instant-nav.rig.md.
//
// Le sandbox cloud bloque l'accès sortant à Supabase : ce serveur répond à la
// place de https://vsmtkopkqasrdnjceegp.supabase.co pendant `next build` et
// `next start` (variable E2E_SUPABASE_URL lue par next.config.ts). Il ne sert
// qu'à rendre les pages avec des données plausibles (listes vides sauf
// quelques fixtures) et une latence réseau réaliste, pour que le streaming
// derrière les <Suspense> soit observable.
//
// Usage : node e2e/mock-supabase.mjs  (port MOCK_SUPABASE_PORT, défaut 54321)

import http from "node:http";

const PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54321);
const LATENCY_MS = Number(process.env.MOCK_SUPABASE_LATENCY_MS ?? 400);

const fixtures = {
  // Même contenu que la ligne réelle (vérifié via Supabase MCP le 2026-09-24) :
  // barre du bas personnalisée, différente de DEFAULT_MODULES_BARRE_BASSE.
  preferences_navigation: [
    {
      id: 1,
      ordre_grille_plus: ["/", "/agenda", "/budget", "/taches", "/courses", "/collection", "/objectifs", "/notes", "/nutrition", "/habitudes", "/reglages"],
      modules_barre_basse: ["/", "/agenda", "/taches", "/notes"],
      updated_at: "2026-09-05T06:53:58.575119+00:00",
    },
  ],
  reglages_nettoyage: [
    {
      id: 1,
      actif: true,
      delai_jours: 30,
      derniere_execution: null,
      updated_at: "2026-09-11T00:00:00+00:00",
    },
  ],
};

const initialFixtures = JSON.parse(JSON.stringify(fixtures));

function send(res, status, body, headers = {}) {
  setTimeout(() => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(body === undefined ? "" : JSON.stringify(body));
  }, LATENCY_MS);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Remise à zéro des fixtures entre deux tests de mutation.
  if (url.pathname === "/__reset") {
    for (const key of Object.keys(fixtures)) delete fixtures[key];
    Object.assign(fixtures, JSON.parse(JSON.stringify(initialFixtures)));
    res.writeHead(204).end();
    return;
  }

  const match = url.pathname.match(/^\/rest\/v1\/(rpc\/)?([^/]+)$/);
  if (!match) {
    send(res, 404, { message: "not mocked" });
    return;
  }
  const [, isRpc, table] = match;
  const wantsObject = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  const body = req.method === "GET" || req.method === "HEAD" ? null : await readBody(req);

  if (isRpc) {
    send(res, 200, []);
    return;
  }

  const rows = fixtures[table] ?? [];

  if (req.method === "PATCH" && body && fixtures[table]) {
    fixtures[table] = rows.map((row) => ({ ...row, ...body }));
  }

  const result = req.method === "GET" || req.method === "HEAD" ? rows : fixtures[table] ?? (Array.isArray(body) ? body : body ? [body] : []);

  if (wantsObject) {
    if (result.length !== 1) {
      send(res, 406, { code: "PGRST116", details: `${result.length} rows`, hint: null, message: "JSON object requested, multiple (or no) rows returned" });
      return;
    }
    send(res, 200, result[0]);
    return;
  }

  send(res, 200, result, { "content-range": `0-${Math.max(result.length - 1, 0)}/${result.length}` });
});

server.listen(PORT, () => {
  console.log(`mock-supabase listening on http://localhost:${PORT} (latency ${LATENCY_MS}ms)`);
});
