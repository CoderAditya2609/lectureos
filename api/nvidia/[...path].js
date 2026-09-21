/**
 * Same-origin NVIDIA proxy for production (Vercel).
 * Vite already proxies `/nvidia-api` in local `dev` / `preview`.
 * The user's BYOK key is forwarded as Authorization and is never logged.
 */
export const config = { runtime: "edge" };

const UPSTREAM = "https://integrate.api.nvidia.com";

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const url = new URL(request.url);
  const suffix = url.pathname.replace(/^\/api\/nvidia/, "") || "/";
  const target = `${UPSTREAM}${suffix}${url.search}`;

  const headers = new Headers();
  const auth = request.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Accept", request.headers.get("accept") || "application/json");

  const init = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  try {
    const upstream = await fetch(target, init);
    const out = new Headers();
    const pass = ["content-type", "cache-control"];
    for (const key of pass) {
      const value = upstream.headers.get(key);
      if (value) out.set(key, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch {
    return Response.json(
      { message: "Lecture OS could not reach the NVIDIA AI service." },
      { status: 502 },
    );
  }
}
