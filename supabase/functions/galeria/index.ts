// Supabase Edge Function: galeria
// Recebe o pedido do painel admin, confere se quem pediu e administrador
// e grava/apaga as fotos direto no repositorio do GitHub (galeria.json + src/assets/galeria).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const CATEGORIES = ["evolucoes", "atletas"];
const OWNER = Deno.env.get("GH_OWNER") || "";
const REPO = Deno.env.get("GH_REPO") || "";
const BRANCH = Deno.env.get("GH_BRANCH") || "main";
const TOKEN = Deno.env.get("GH_TOKEN") || "";
const ADMINS = (Deno.env.get("ADMIN_EMAILS") || "")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const MANIFEST = "galeria.json";

function err(status: number, message: string) {
  const e = new Error(message);
  (e as any).status = status;
  return e;
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function gh(path: string, init: { method?: string; body?: unknown } = {}) {
  return fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "galeria-tiago-cagide",
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

async function getManifest() {
  const res = await gh(`/contents/${MANIFEST}?ref=${BRANCH}`);
  if (res.status === 404) return { data: { evolucoes: [], atletas: [] } as any, sha: undefined };
  if (!res.ok) throw err(502, "Não foi possível ler a lista de fotos no GitHub.");
  const j = await res.json();
  const text = new TextDecoder().decode(Uint8Array.from(atob(String(j.content).replace(/\n/g, "")), (c) => c.charCodeAt(0)));
  const data = JSON.parse(text);
  for (const c of CATEGORIES) if (!Array.isArray(data[c])) data[c] = [];
  return { data, sha: j.sha as string };
}

// mutate recebe a lista atual e devolve a nova (ou null para nao gravar nada)
async function updateManifest(mutate: (d: any) => any, message: string) {
  for (let i = 0; i < 3; i++) {
    const cur = await getManifest();
    const next = mutate(cur.data);
    if (next === null) return null;
    const res = await gh(`/contents/${MANIFEST}`, {
      method: "PUT",
      body: { message, content: btoa(JSON.stringify(next, null, 2) + "\n"), sha: cur.sha, branch: BRANCH },
    });
    if (res.ok) return next;
    if (res.status !== 409 && res.status !== 422) throw err(502, "O GitHub recusou a gravação da lista de fotos.");
  }
  throw err(409, "Outra alteração estava em andamento. Tente novamente.");
}

async function putFile(path: string, contentB64: string, message: string) {
  const res = await gh(`/contents/${path}`, { method: "PUT", body: { message, content: contentB64, branch: BRANCH } });
  if (!res.ok) throw err(502, "O GitHub recusou o envio da foto. Confira o token e as permissões.");
}

async function deleteFile(path: string, message: string) {
  const res = await gh(`/contents/${path}?ref=${BRANCH}`);
  if (!res.ok) return;
  const j = await res.json();
  await gh(`/contents/${path}`, { method: "DELETE", body: { message, sha: j.sha, branch: BRANCH } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    if (req.method !== "POST") throw err(405, "Método não permitido.");
    if (!TOKEN || !OWNER || !REPO) throw err(500, "Servidor sem configuração (GH_TOKEN, GH_OWNER, GH_REPO).");

    // 1) Quem esta pedindo? Precisa estar logado e ser administrador.
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const sb = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_ANON_KEY") || "");
    const { data, error } = await sb.auth.getUser(jwt);
    const email = (data?.user?.email || "").toLowerCase();
    if (error || !email) throw err(401, "Sessão inválida. Entre novamente.");
    if (!ADMINS.includes(email)) throw err(403, "Este usuário não é administrador.");

    const body = await req.json();
    const action = body.action;

    if (action === "list") {
      const m = await getManifest();
      return json({ owner: OWNER, repo: REPO, branch: BRANCH, photos: m.data });
    }

    const category = body.category;
    if (!CATEGORIES.includes(category)) throw err(400, "Galeria inválida.");

    if (action === "add") {
      const image = body.image;
      if (typeof image !== "string" || !image.startsWith("/9j/")) throw err(400, "Envie uma imagem JPEG.");
      if (image.length > 7_000_000) throw err(413, "Imagem muito grande.");
      const path = `src/assets/galeria/${category}/${crypto.randomUUID()}.jpg`;
      await putFile(path, image, `Galeria: adiciona foto em ${category}`);
      try {
        await updateManifest((d) => {
          d[category].unshift({ path, added: new Date().toISOString() });
          return d;
        }, `Galeria: registra foto em ${category}`);
      } catch (e) {
        await deleteFile(path, "Galeria: desfaz envio").catch(() => {});
        throw e;
      }
      return json({ ok: true, path });
    }

    if (action === "remove") {
      const path = String(body.path || "");
      if (!path || path.includes("..")) throw err(400, "Caminho inválido.");
      let found = false;
      await updateManifest((d) => {
        const before = d[category].length;
        d[category] = d[category].filter((p: any) => p.path !== path);
        found = d[category].length !== before;
        return found ? d : null;
      }, `Galeria: remove foto de ${category}`);
      if (!found) throw err(404, "Foto não encontrada na galeria.");
      // So apaga o arquivo se foi enviado pelo painel; as fotos antigas do site continuam no repositorio.
      if (path.startsWith(`src/assets/galeria/${category}/`)) {
        await deleteFile(path, `Galeria: apaga foto de ${category}`).catch(() => {});
      }
      return json({ ok: true });
    }

    throw err(400, "Ação desconhecida.");
  } catch (e) {
    const status = (e as any).status || 500;
    return json({ error: status >= 500 && !(e as any).status ? "Erro interno." : (e as Error).message }, status);
  }
});
