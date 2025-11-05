# AI Prompts Log – Cloudflare SE Intern AI Coach

This project was built with **AI-assisted development**, with me leading the design and implementation and using **ChatGPT (GPT-5 Thinking)** as a coding and architecture assistant.

The goal:  
Build an AI app on the **Cloudflare Developer Platform** that:

- Uses **Workers AI** (Llama-family model) as the LLM  
- Uses **Workers + Durable Objects** for workflow/coordination and memory  
- Accepts **user input via a chat UI**  
- Can be run locally and deployed, with full documentation for the SE Intern application

Below are representative prompts that show how I used AI as a **copilot**, not a substitute for understanding.

---

## Prompt 1 – Shaping the idea around the SE Intern brief

**My intent:**  
I already knew I wanted something that directly supports the SE intern application and clearly hits the required boxes (LLM, coordination, chat, state). I used AI to bounce around ideas and pressure-test the concept.

**Prompt (paraphrased):**

> “For my Cloudflare SE intern app it’s asking me to build within these requirements and an AI app that would get my application fast tracked:
> - LLM (Llama 3.3 on Workers AI or external)
> - Workflow / coordination (Workflows, Workers, or Durable Objects)
> - User input via chat or voice
> - Memory or state  
> I’m thinking of an AI coach that helps me with my SE intern application. Help me frame this idea so it clearly aligns with the brief.”

**How the assistant helped:**  
It confirmed the AI coach concept was strong for this use case, and suggested mapping:

- Workers AI → LLM  
- Workers + Durable Objects → coordination + memory  
- Static HTML/JS UI → chat interface  

I then committed to the **“Cloudflare SE Intern AI Coach”** direction and drove the rest of the decisions around that.

---

## Prompt 2 – Repo layout and initial Cloudflare setup

**My intent:**  
I knew I wanted a clean repo structure (for reviewers) and a simple way to run it via Wrangler. I used AI to save time on boilerplate and to make sure I followed Cloudflare conventions.

**Prompt (paraphrased):**

> “I need to submit this in a GitHub repo with a README, clear local running instructions, a deployed link, and a `prompts.md` documenting AI use.  
> Give me a suggested project structure and the basic files (package.json, wrangler.toml, etc.) for a Worker + Durable Object + static frontend app.”

**How the assistant helped:**  

It suggested a structure like:

```text
cf-se-intern-ai-coach/
├── src/worker.js
├── src/durable-object.js
├── public/index.html
├── wrangler.toml
├── package.json
├── README.md
└── prompts.md
