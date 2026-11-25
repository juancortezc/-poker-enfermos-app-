/**
 * Paridad con la web: cada token de @poker/design debe valer lo mismo que hoy
 * en apps/web/src/styles/clean-poker-tokens.css. Mientras la web no lea este
 * paquete, esta prueba es la que avisa si los dos se separan.
 *
 * Resuelve el CSS como lo haria el navegador: `:root` primero; `.cp-light` y
 * `.cp-paper` heredan los valores ya resueltos de `:root` y sobrescriben solo
 * lo que declaran.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cssVariableMap, tokens, toCssVariables } from '../src/index';

const here = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(resolve(here, '../../../apps/web/src/styles/clean-poker-tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

function block(selector: string): Record<string, string> {
  const re = new RegExp(`(^|\\n)\\s*${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`);
  const m = CSS.match(re);
  assert.ok(m, `no encontre ${selector} en clean-poker-tokens.css`);
  const out: Record<string, string> = {};
  for (const decl of m[2].split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const name = decl.slice(0, i).trim();
    if (!name.startsWith('--cp-')) continue;
    out[name] = decl.slice(i + 1).replace(/\s+/g, ' ').trim();
  }
  return out;
}

/** Sustituye var(--cp-x) por su valor en `scope`; deja intactas las ajenas (--font-inter). */
function resolveVars(decls: Record<string, string>, inherited: Record<string, string>) {
  const scope = { ...inherited, ...decls };
  const out: Record<string, string> = { ...inherited };
  const solve = (v: string, depth = 0): string =>
    depth > 10 ? v : v.replace(/var\((--cp-[a-z0-9-]+)\)/g, (_, n: string) => solve(scope[n] ?? `var(${n})`, depth + 1));
  for (const [k, v] of Object.entries(decls)) out[k] = solve(v);
  return out;
}

const norm = (v: string) => v.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim().toLowerCase();

const root = resolveVars(block(':root'), {});
const expected = {
  dark: root,
  light: resolveVars(block('.cp-light'), root),
  paper: resolveVars(block('.cp-paper'), root),
};

for (const tone of ['dark', 'light', 'paper'] as const) {
  test(`tono ${tone}: cada --cp-* coincide con clean-poker-tokens.css`, () => {
    const mine = cssVariableMap(tone);
    const theirs = expected[tone];
    for (const [name, value] of Object.entries(theirs)) {
      assert.ok(name in mine, `${tone}: falta ${name} en @poker/design`);
      assert.equal(norm(mine[name]), norm(value), `${tone}: ${name}`);
    }
    for (const name of Object.keys(mine)) {
      assert.ok(name in theirs, `${tone}: ${name} no existe en la web`);
    }
  });
}

test('toCssVariables arma declaraciones validas', () => {
  const css = toCssVariables('light');
  assert.match(css, /--cp-surface-0: #FAF7F2;/);
  assert.match(css, /--cp-primary-light: #C62828;/);
});

test('tokens: accesos tipados', () => {
  assert.equal(tokens.color.primary, '#E53935');
  assert.equal(tokens.tone.light.surface0, '#FAF7F2');
  assert.equal(tokens.radius.tile, 20);
});
