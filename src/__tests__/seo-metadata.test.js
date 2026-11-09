/**
 * DT-213/DT-214: los metadatos de SEO y difusión viven en `index.html` y en
 * `public/`, fuera del árbol de React — nadie los renderiza, así que si se
 * pierden en un refactor NINGÚN test de componentes se entera y el síntoma es
 * silencioso: el enlace compartido deja de mostrar vista previa y el sitemap
 * vuelve a responder HTML.
 *
 * El estudio que los motivó: `estudio-seo-portfolio-2026-11-09.md`.
 *
 * Estas guardas comprueban PRESENCIA y forma, no redacción: el texto puede
 * cambiar cuando cambie el perfil.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const indexHtml = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const publico = (f) => fs.readFileSync(path.join(RAIZ, 'public', f), 'utf8');

// Mismo criterio que `i18n/__tests__/key-coverage.test.js`: los ficheros de
// este proyecto llevan comentarios que explican el porqué, y esos comentarios
// NOMBRAN lo que documentan (`/login`, `X-Robots-Tag`, `vite.svg`...). Buscar
// sobre el texto crudo daría falsos positivos contra la propia documentación,
// así que se retiran antes de afirmar nada.
const sinComentariosHtml = (t) => t.replace(/<!--[\s\S]*?-->/g, ' ');
const sinComentariosAlmohadilla = (t) =>
  t
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('#'))
    .join('\n');

const DOMINIO = 'https://vicentepau.is-a.dev';

describe('DT-213 · metadatos de difusión en el HTML servido', () => {
  it('tiene descripción y canonical', () => {
    expect(indexHtml).toMatch(/<meta\s+name="description"/);
    expect(indexHtml).toContain(`rel="canonical" href="${DOMINIO}/"`);
  });

  // Sin estas, LinkedIn/WhatsApp/Slack muestran el enlace sin imagen ni texto:
  // no ejecutan JavaScript, así que es lo único que pueden leer.
  it.each(['og:type', 'og:url', 'og:title', 'og:description', 'og:image'])(
    'declara %s',
    (prop) => {
      expect(indexHtml).toMatch(new RegExp(`property="${prop}"`));
    },
  );

  it.each(['twitter:card', 'twitter:title', 'twitter:image'])('declara %s', (name) => {
    expect(indexHtml).toMatch(new RegExp(`name="${name}"`));
  });

  it('las URL de og:image y og:url son absolutas', () => {
    // Una ruta relativa aquí es el error clásico: el validador no se queja y
    // la vista previa sale sin imagen.
    for (const prop of ['og:url', 'og:image']) {
      const m = indexHtml.match(new RegExp(`property="${prop}"\\s+content="([^"]+)"`));
      expect(m, `falta ${prop}`).not.toBeNull();
      expect(m[1]).toMatch(/^https:\/\//);
    }
  });

  it('el título lleva el perfil, no solo el nombre, y cabe en un resultado', () => {
    const titulo = indexHtml.match(/<title>([^<]*)<\/title>/)[1];
    expect(titulo).toMatch(/Vicente Pau/);
    expect(titulo.length).toBeGreaterThan(30);
    expect(titulo.length).toBeLessThanOrEqual(65); // ~60 antes de que Google lo corte
  });

  it('el favicon ya no es el logotipo de Vite', () => {
    const icono = sinComentariosHtml(indexHtml).match(/rel="icon"[^>]*href="([^"]+)"/);
    expect(icono, 'no hay <link rel="icon">').not.toBeNull();
    expect(icono[1]).toBe('/favicon.svg');
  });
});

describe('DT-214 · ficheros que el catch-all de la SPA tapaba', () => {
  it('robots.txt existe, excluye el panel y declara el sitemap', () => {
    const robots = sinComentariosAlmohadilla(publico('robots.txt'));
    expect(robots).toMatch(/Disallow:\s*\/login/);
    expect(robots).toMatch(/Disallow:\s*\/dashboard/);
    expect(robots).toContain(`Sitemap: ${DOMINIO}/sitemap.xml`);
  });

  it('sitemap.xml es XML válido y no publica rutas privadas', () => {
    const sitemap = publico('sitemap.xml');
    expect(sitemap.startsWith('<?xml')).toBe(true);
    // Se afirma sobre las URL declaradas, no sobre el fichero entero.
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toContain(`${DOMINIO}/`);
    expect(locs.some((l) => /login|dashboard/.test(l))).toBe(false);
  });

  it('_headers marca noindex en las rutas privadas', () => {
    const headers = sinComentariosAlmohadilla(publico('_headers'));
    for (const ruta of ['/login', '/dashboard']) expect(headers).toContain(ruta);
    expect(headers.match(/X-Robots-Tag:\s*noindex/g) ?? []).toHaveLength(2);
  });

  it('la imagen social existe y pesa lo razonable para un previsualizador', () => {
    const bytes = fs.statSync(path.join(RAIZ, 'public', 'og-image.png')).size;
    expect(bytes).toBeGreaterThan(10_000); // que no sea un placeholder vacío
    expect(bytes).toBeLessThan(2_000_000); // límite práctico de LinkedIn/WhatsApp
  });
});
