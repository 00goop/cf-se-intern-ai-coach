import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/handler.js';

const id = 'c6a19f65-5e35-4433-b781-435362e1e001';
function environment() {
  const calls = [];
  return { calls, USER_COACH: {
    idFromName(value) { calls.push(value); return value; },
    get() { return { async fetch(request) { calls.push(request); return Response.json({ reply: 'hello' }); } }; }
  } };
}
const post = (data) => new Request('https://coach.test/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

test('missing, predictable and malformed sessions never reach a Durable Object', async () => {
  for (const sessionId of [undefined, '', 'default-session', '1234567890123', {}, 'invalid']) {
    const env = environment();
    assert.equal((await handleRequest(post({ message: 'hello', sessionId }), env)).status, 400);
    assert.equal(env.calls.length, 0);
  }
});
test('sessions route independently and forward profile context without email', async () => {
  const env = environment();
  const response = await handleRequest(post({ message: ' hello ', sessionId: id, name: 'Test', background: 'CS student', focus: 'interviews', email: 'private@example.com' }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(env.calls[0], id);
  const body = await env.calls[1].json();
  assert.equal(body.message, 'hello');
  assert.equal(body.meta.background, 'CS student');
  assert.equal(body.meta.email, undefined);
  const second = 'c6a19f65-5e35-4433-b781-435362e1e002';
  await handleRequest(new Request(`https://coach.test/api/history?sessionId=${second}`), env);
  assert.equal(env.calls[2], second);
});
test('invalid content and oversized requests fail before routing', async () => {
  for (const [body, status] of [[null, 400], [{message:' ',sessionId:id},400], [{message:'a'.repeat(4001),sessionId:id},400], [{message:'a'.repeat(17000),sessionId:id},413]]) {
    assert.equal((await handleRequest(post(body), environment())).status, status);
  }
});
test('provider failures do not expose raw error details', async () => {
  const env = environment();
  env.USER_COACH.get = () => ({ fetch() { throw new Error('private provider details'); } });
  const response = await handleRequest(post({message:'hello',sessionId:id}), env);
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes('private'), false);
});
