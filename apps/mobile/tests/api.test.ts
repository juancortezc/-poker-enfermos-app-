/**
 * api.ts: credencial, errores y el 401 que cierra sesión.
 */
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { apiFetch, ApiError, setAuthPin, setUnauthorizedHandler } from '../src/lib/api';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  setAuthPin(null);
  setUnauthorizedHandler(null);
});

function respondWith(status: number, body: string, seen?: Headers[]) {
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    seen?.push(new Headers(init?.headers));
    return new Response(status === 204 ? null : body, { status });
  }) as typeof fetch;
}

test('manda Bearer PIN:<clave> y lee JSON', async () => {
  const seen: Headers[] = [];
  respondWith(200, '{"ok":true}', seen);
  setAuthPin('1234');
  assert.deepEqual(await apiFetch('/api/x'), { ok: true });
  assert.equal(seen[0].get('Authorization'), 'Bearer PIN:1234');
});

test('skipAuth no manda la clave guardada', async () => {
  const seen: Headers[] = [];
  respondWith(200, '{}', seen);
  setAuthPin('1234');
  await apiFetch('/api/auth/login', { method: 'POST', json: {}, skipAuth: true });
  assert.equal(seen[0].get('Authorization'), null);
  assert.equal(seen[0].get('Content-Type'), 'application/json');
});

test('204 y cuerpo vacío devuelven undefined', async () => {
  respondWith(204, '');
  assert.equal(await apiFetch('/api/x'), undefined);
});

test('el error usa el mensaje en español de la API', async () => {
  respondWith(400, '{"error":"La clave es muy corta"}');
  await assert.rejects(apiFetch('/api/x'), (e: unknown) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.status, 400);
    assert.equal(e.message, 'La clave es muy corta');
    return true;
  });
});

test('error sin JSON: mensaje genérico con el código', async () => {
  respondWith(502, '<html>Bad gateway</html>');
  await assert.rejects(apiFetch('/api/x'), /HTTP Error: 502/);
});

test('401 con clave cargada cierra sesión; 403 no', async () => {
  let calls = 0;
  setUnauthorizedHandler(() => calls++);
  setAuthPin('1234');
  respondWith(403, '{"error":"Sin permiso"}');
  await assert.rejects(apiFetch('/api/x'));
  assert.equal(calls, 0);
  respondWith(401, '{"error":"No autorizado"}');
  await assert.rejects(apiFetch('/api/x'));
  assert.equal(calls, 1);
});

test('401 sin clave (login fallido) no dispara el cierre de sesión', async () => {
  let calls = 0;
  setUnauthorizedHandler(() => calls++);
  respondWith(401, '{"error":"Clave incorrecta"}');
  await assert.rejects(apiFetch('/api/auth/login', { method: 'POST', skipAuth: true }));
  assert.equal(calls, 0);
});

test('un 401 de la clave anterior no saca al usuario que entró después', async () => {
  let calls = 0;
  setUnauthorizedHandler(() => calls++);
  setAuthPin('vieja');
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  globalThis.fetch = (async () => {
    await gate;
    return new Response('{"error":"No autorizado"}', { status: 401 });
  }) as typeof fetch;
  const pending = apiFetch('/api/x');
  // Mientras tanto: cerró sesión y entró con otra clave.
  setAuthPin('nueva');
  release();
  await assert.rejects(pending);
  assert.equal(calls, 0);
});

test('formato nuevo { success, data }: devuelve data', async () => {
  respondWith(200, '{"success":true,"data":[1,2]}');
  assert.deepEqual(await apiFetch('/api/x'), [1, 2]);
  respondWith(200, '{"success":true,"data":null}');
  assert.equal(await apiFetch('/api/x'), null);
});

test('formato viejo pasa tal cual (incluido el sobre que ya traían algunas rutas)', async () => {
  respondWith(200, '{"tournament":{"id":3}}');
  assert.deepEqual(await apiFetch('/api/x'), { tournament: { id: 3 } });
  respondWith(200, '{"success":true,"data":{"all":[]},"total":0}');
  assert.deepEqual(await apiFetch('/api/x'), { all: [] });
  respondWith(200, '{"success":true}');
  assert.deepEqual(await apiFetch('/api/x'), { success: true });
});

test('error formato nuevo: message, code, errorId, errors y details', async () => {
  respondWith(
    409,
    JSON.stringify({
      success: false,
      error: {
        code: 'POSITION_ALREADY_TAKEN',
        message: 'La posición ya está registrada',
        errors: [{ field: 'position', message: 'ocupada' }],
        details: { hint: 'revisá la lista' },
        errorId: 'abc',
        timestamp: '2026-11-25T00:00:00.000Z',
        path: '/api/eliminations',
      },
    })
  );
  await assert.rejects(apiFetch('/api/x'), (e: unknown) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.status, 409);
    assert.equal(e.message, 'La posición ya está registrada');
    assert.equal(e.code, 'POSITION_ALREADY_TAKEN');
    assert.equal(e.errorId, 'abc');
    assert.deepEqual(e.errors, [{ field: 'position', message: 'ocupada' }]);
    assert.equal(e.details.hint, 'revisá la lista');
    assert.ok(e.info.includes('POSITION_ALREADY_TAKEN'));
    return true;
  });
});

test('error formato viejo: code y extras en la raíz', async () => {
  respondWith(409, '{"error":"Ya eliminado","code":"PLAYER_ALREADY_ELIMINATED","hint":"mirá"}');
  await assert.rejects(apiFetch('/api/x'), (e: unknown) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.message, 'Ya eliminado');
    assert.equal(e.code, 'PLAYER_ALREADY_ELIMINATED');
    assert.equal(e.errorId, undefined);
    assert.equal(e.details.hint, 'mirá');
    return true;
  });
  respondWith(400, '{"message":"Email inválido"}');
  await assert.rejects(apiFetch('/api/x'), /Email inválido/);
});

test('401 en formato nuevo también cierra sesión', async () => {
  let calls = 0;
  setUnauthorizedHandler(() => calls++);
  setAuthPin('1234');
  respondWith(401, '{"success":false,"error":{"code":"UNAUTHORIZED","message":"Acceso no autorizado","errorId":"x","timestamp":"","path":"/api/x"}}');
  await assert.rejects(apiFetch('/api/x'), /Acceso no autorizado/);
  assert.equal(calls, 1);
});
