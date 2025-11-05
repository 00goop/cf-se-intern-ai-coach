// src/durable-object.js
import { DurableObject } from "cloudflare:workers";

/**
 * UserCoachDO
 *  - Keeps per-session chat history in Durable Object storage
 *  - Calls Workers AI (Llama) to generate coaching responses
 */
export class UserCoachDO extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.state = state;
    this.env = env;
    this.history = null;
  }

  async #ensureLoaded() {
    if (!this.history) {
      const stored = await this.state.storage.get("history");
      this.history = stored || [];
    }
  }

  #buildPrompt(message, meta) {
    const { name, role, email } = meta || {};

    const systemPrompt = `You are a friendly, helpful Cloudflare Solutions Engineer intern coach.

Your role:
- Help students with their Cloudflare SE intern application
- Be conversational and natural - match the user's tone and energy
- For casual greetings, respond warmly and briefly
- For specific questions, give concrete, actionable advice
- When discussing their application, highlight how they can mention projects like this AI app (built on Workers AI + Durable Objects)

Key guidelines:
- Keep responses concise and focused on what the user actually asked
- Don't over-explain unless they ask for details
- Be encouraging but realistic
- Use a friendly, mentor-like tone
- If they're just chatting casually, keep it light and brief
- Save the detailed advice for when they ask specific questions about resumes, interviews, or projects`;

    const historyText =
      this.history.length === 0
        ? ""
        : this.history
            .slice(-10) // Only use last 10 messages for context
            .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
            .join("\n");

    const userContext = name ? `The user's name is ${name}.` : "";

    // Build a focused prompt
    let fullPrompt = systemPrompt;
    
    if (userContext) {
      fullPrompt += `\n\n${userContext}`;
    }
    
    if (historyText) {
      fullPrompt += `\n\nConversation history:\n${historyText}`;
    }
    
    fullPrompt += `\n\nUser: ${message}\n\nAssistant:`;

    return fullPrompt;
  }

  async fetch(request) {
    await this.#ensureLoaded();
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname.endsWith("/chat")) {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { message, meta } = body || {};
      if (!message || typeof message !== "string") {
        return new Response(
          JSON.stringify({ error: "`message` is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const prompt = this.#buildPrompt(message, meta);

      // Call Workers AI with better parameters for concise responses
      const aiResult = await this.env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          prompt,
          max_tokens: 500, // Limit response length
          temperature: 0.7, // Slightly lower for more focused responses
        }
      );

      // Workers AI responses are usually of shape { response: string }
      let reply =
        (aiResult && (aiResult.response || aiResult.result)) ||
        "Sorry, I couldn't generate a response.";

      // Clean up the response - remove any extra spacing or formatting issues
      reply = reply.trim();

      const ts = Date.now();
      this.history.push({ role: "user", content: message, ts, meta });
      this.history.push({ role: "assistant", content: reply, ts });

      // Keep last 20 turns to cap token usage
      this.history = this.history.slice(-20);
      await this.state.storage.put("history", this.history);

      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method === "GET" && url.pathname.endsWith("/history")) {
      await this.#ensureLoaded();
      return new Response(JSON.stringify({ history: this.history }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
}