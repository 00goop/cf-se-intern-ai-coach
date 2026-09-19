const SESSION = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const chat = url.pathname === '/api/chat';
  const history = url.pathname === '/api/history';
  if (!chat && !history) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  if (request.method !== (chat ? 'POST' : 'GET')) return json({ error: 'Method not allowed' }, 405);
  let body = {};
  if (chat) {
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'JSON content type required' }, 415);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'JSON body required' }, 400);
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); return json({ error: 'Request exceeds 16 KB' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { body = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return json({ error: 'Invalid JSON body' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Object required' }, 400);
    if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 4000) return json({ error: 'Message must contain 1-4000 characters' }, 400);
    for (const field of ['name', 'email', 'background', 'focus']) {
      if (body[field] != null && (typeof body[field] !== 'string' || body[field].length > 1000)) return json({ error: 'Invalid profile field' }, 400);
    }
  }
  const sessionId = chat ? body.sessionId : url.searchParams.get('sessionId');
  if (typeof sessionId !== 'string' || !SESSION.test(sessionId)) return json({ error: 'A valid session UUID is required' }, 400);
  try {
    const stub = env.USER_COACH.get(env.USER_COACH.idFromName(sessionId));
    const internal = new URL(request.url);
    internal.pathname = chat ? '/internal/chat' : '/internal/history';
    internal.search = '';
    const response = await stub.fetch(new Request(internal, chat ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: body.message.trim(), meta: {
        name: body.name || null, background: body.background || null,
        focus: body.focus || null, role: 'Cloudflare SE Intern applicant'
      } })
    } : { method: 'GET' }));
    if (!response.ok) return json({ error: 'Coach is temporarily unavailable' }, 502);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers });
  } catch { return json({ error: 'Coach is temporarily unavailable' }, 502); }
}
