/**
 * DT-184: toda clave `t('…')` que el código use tiene que existir en los SEIS
 * idiomas.
 *
 * Faltaban doce y se pintaban en crudo en pantalla (el mismo síntoma que
 * DT-142, que se arregló a mano sin red). `fallbackLng: 'en'` no cubre nada
 * cuando la clave tampoco está en inglés.
 *
 * El escaneo RETIRA comentarios antes de buscar: la política del proyecto es
 * conservar comentada la versión anterior de un cambio, así que una clave
 * retirada sigue apareciendo en el fichero. Sin esto, el test exigiría claves
 * que el código ya no usa — es justo el falso positivo que cometió la
 * auditoría que abrió esta ficha, contando 13 donde había 12.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'it'];

const sinComentarios = (texto) =>
  texto
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ') // {/* ... */} de JSX
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // /* ... */
    .replace(/(^|[^:])\/\/.*$/gm, '$1'); // // ... (sin tocar http://)

function ficherosDeCodigo(dir, acc = []) {
  for (const nombre of fs.readdirSync(dir)) {
    const p = path.join(dir, nombre);
    if (fs.statSync(p).isDirectory()) {
      if (!/__tests__|node_modules/.test(p)) ficherosDeCodigo(p, acc);
    } else if (/\.jsx?$/.test(nombre)) {
      acc.push(p);
    }
  }
  return acc;
}

function clavesUsadas() {
  const usos = new Map();
  for (const fichero of ficherosDeCodigo(SRC)) {
    const texto = sinComentarios(fs.readFileSync(fichero, 'utf8'));
    for (const m of texto.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
      if (!usos.has(m[1])) usos.set(m[1], new Set());
      usos.get(m[1]).add(path.relative(SRC, fichero));
    }
  }
  return usos;
}

const leer = (lang) =>
  JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', 'locales', `${lang}.json`), 'utf8'));

const tiene = (obj, clave) => clave.split('.').reduce((o, p) => o && o[p], obj) !== undefined;

describe('DT-184 · cobertura de claves de traducción', () => {
  const usos = clavesUsadas();

  it('el escaneo encuentra claves (si no, la regex se ha roto)', () => {
    expect(usos.size).toBeGreaterThan(100);
  });

  for (const lang of LOCALES) {
    it(`${lang}.json tiene todas las claves que usa el código`, () => {
      const locale = leer(lang);
      const faltan = [...usos.entries()]
        .filter(([clave]) => !tiene(locale, clave))
        .map(([clave, ficheros]) => `${clave}  <- ${[...ficheros].join(', ')}`);
      expect(faltan, `claves ausentes en ${lang}.json:\n${faltan.join('\n')}`).toEqual([]);
    });
  }
});
