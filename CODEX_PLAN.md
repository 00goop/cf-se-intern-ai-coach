# AI coach implementation plan

Current source uses Workers AI and Durable Objects, but 1,567 generated/runtime files are tracked. Missing session IDs route to a shared default object. The frontend already generates UUIDs but has an insecure timestamp fallback.

Preserve the Worker/DO architecture and UI. Add ignore rules, untrack dependencies/runtime state without rewriting history, extract a testable HTTP handler, reject invalid sessions and oversized input, and retain profile context. A session UUID is a bearer capability, not authenticated user identity. Production authentication and distributed abuse controls remain separate work.

- [x] Inspect Worker, DO, frontend session code, manifest and Wrangler config.
- [~] Clean current tree and implement session/input validation.
- [ ] Test invalid requests, session isolation, profile forwarding and provider failure.
- [ ] Verify package installation and Worker build.
- [ ] Publish changes and record unresolved history/security concerns.

## Verification
- [x] Four handler regression tests pass.
- [x] Generated dependencies/runtime state untracked; source preserved.
- [!] Local Wrangler dry run blocked by esbuild ancestor-directory access in Windows sandbox; verify in GitHub CI.
- [ ] Authentication and distributed rate limits remain required for production use.
