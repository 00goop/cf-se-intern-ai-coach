// src/worker.js
import { UserCoachDO } from "./durable-object.js";

// Export DO so the runtime can find it
export { UserCoachDO };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Chat endpoint -> route into Durable Object
    if (url.pathname === "/api/chat" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { message, sessionId, name, email } = body || {};
      if (!message || typeof message !== "string") {
        return new Response(
          JSON.stringify({ error: "`message` is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const sid = sessionId || "default-session";
      const id = env.USER_COACH.idFromName(sid);
      const stub = env.USER_COACH.get(id);

      const doUrl = new URL(request.url);
      doUrl.pathname = "/internal/chat";

      const resp = await stub.fetch(
        new Request(doUrl.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            meta: {
              name: name || null,
              email: email || null,
              role: "Cloudflare SE Intern applicant"
            }
          })
        })
      );

      return resp;
    }

    // Optional history endpoint
    if (url.pathname === "/api/history" && request.method === "GET") {
      const sid = url.searchParams.get("sessionId") || "default-session";
      const id = env.USER_COACH.idFromName(sid);
      const stub = env.USER_COACH.get(id);

      const doUrl = new URL(request.url);
      doUrl.pathname = "/internal/history";

      return stub.fetch(
        new Request(doUrl.toString(), { method: "GET" })
      );
    }

    // Static assets (index.html, styles.css, main.js)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};
