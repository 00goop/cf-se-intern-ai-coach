# ☁️ Cloudflare SE Intern AI Coach

## Verified setup and session boundaries

Use Node.js 22+ and HTTPS (localhost is also a secure browser context).
Run `npm ci`, `npm test`, and `npm run build` for a deployment dry run.
`npm run dev` starts local Wrangler development. Deployment requires your own
Cloudflare account and bindings from `wrangler.toml`; no deployment is automatic.

Requests require a cryptographically generated UUID session identifier. Missing
or predictable identifiers no longer share a default conversation. The UUID is
a bearer capability stored in localStorage, **not account authentication**; do
not share it. Chat history responses are not cacheable. Inputs are bounded and
provider errors are sanitized. Email stays in the local profile and is not sent
to the coach's prompt/storage by the handler.

Generated `node_modules/` and `.wrangler/` files have been removed from the current
tracked tree. They still exist in Git history; this change does not rewrite history
or certify that historical state contains no private data. Inspect and rotate any
credentials identified in history before making stronger security claims.

An AI-powered web app built on the **Cloudflare Developer Platform** to help candidates prepare and stand out for the **Cloudflare Solutions Engineer Internship**.

The app:

- Collects a short profile (name, email, background, focus area)
- Lets you chat with an AI “coach” about your application
- Uses **Cloudflare Workers AI** to generate guidance and feedback
- Stores conversation context and profile metadata in a **Durable Object**, so each session is stateful and personalized

This project is designed specifically around the requirements from the Cloudflare SE Intern take-home:

> - LLM (Llama 3.3 on Workers AI or another LLM)  
> - Workflow / coordination (Workflows, Workers, or Durable Objects)  
> - User input via chat or voice (Pages or Realtime)  
> - Memory or state  

---

## 🎯 How this project meets the requirements

### 1. LLM (Workers AI / Llama)

- The backend Worker calls **Cloudflare Workers AI** through the `env.AI` binding:
  - In `UserCoachDO` (Durable Object), it builds a prompt from:
    - System instructions (act as a Cloudflare SE intern coach)
    - Stored conversation history
    - User profile (name, email, background, focus)
  - Then calls a Llama-family model, e.g.:

    ```js
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt
    });
    ```

- The result is sent back to the frontend as the coach’s response.

> You can easily switch to Llama 3.3 once it’s available in your account by updating the model name.

---

### 2. Workflow / Coordination

- **Workers + Durable Objects** together act as the coordination layer:

  - `src/worker.js`
    - Exposes `/api/chat` to accept chat messages from the frontend
    - Exposes `/api/history` to retrieve stored conversation history
    - Routes each session to a **Durable Object instance** using `env.USER_COACH.idFromName(sessionId)`
    - Serves static assets (the UI) through the `ASSETS` binding

  - `UserCoachDO` (in `durable-object.js`)
    - Maintains the evolving conversation (`history`) in `state.storage`
    - Incorporates history + user meta into a single, coherent prompt
    - Calls Workers AI and stores the assistant’s reply alongside user messages

- This gives you a durable, stateful “workflow” for each candidate session without having to manage an external database.

---

### 3. User input via chat

- The UI is implemented as a single HTML page: `public/index.html`
  - Modern, glassmorphic dark UI
  - Left: **Profile** card (name, email, background, focus)
  - Right: **Chat** card with:
    - Welcome message
    - Scrollable chat log
    - Typing indicator
    - Textarea + “Send” button

- The frontend JavaScript (inline in `index.html`) handles:

  - Generating a `sessionId` per browser using `localStorage`
  - Saving profile details (also in `localStorage`)
  - Sending chat messages to the backend:

    ```js
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        message,
        name: profile.name,
        email: profile.email,
        background: profile.background,
        focus: profile.focus
      })
    });
    ```

  - Rendering messages in styled bubbles (“You” vs “AI Coach”)
  - Fetching past history from `/api/history` on page load and replaying it

> Voice could be added later by layering speech-to-text / text-to-speech in front of this same API.

---

### 4. Memory or state

- **Durable Objects** are used as the main stateful component:

  - One instance per `sessionId`
  - Stores:

    ```js
    this.history = [
      { role: "user", content: "...", ts, meta },
      { role: "assistant", content: "...", ts },
      ...
    ];
    ```

  - Persists history using `this.state.storage.put("history", this.history)`

- The chat UI also caches the user profile locally via `localStorage`, so refreshing the page keeps basic context.

This combination makes each conversation feel continuous and tailored to the same candidate.

---

## 🧱 Project structure

```text
cf-se-intern-ai-coach/
├── src/
│   ├── worker.js           # Cloudflare Worker: routes /api/chat, /api/history, serves assets
│   └── durable-object.js   # UserCoachDO: per-session memory + Workers AI calls
├── public/
│   └── index.html          # Frontend UI (HTML + CSS + JS, glassmorphic chat)
├── wrangler.toml           # Cloudflare config: assets, AI, Durable Object bindings, observability
├── package.json            # npm scripts + Wrangler dev dependency
├── README.md               # Project docs (this file)
└── prompts.md              # AI-assisted development prompt log
