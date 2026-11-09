/**
 * DT-215: el CV viaja en el HTML servido, no solo dentro de React.
 *
 * Lo que fija esto es una propiedad que NINGÚN test de componentes puede ver:
 * el contenido que inyecta el build. Si el generador se rompe —o si alguien
 * cambia la forma del JSON del CV—, la aplicación sigue funcionando igual y
 * el único síntoma es que Google vuelve a leer una página vacía. Silencioso.
 *
 * Medido el 2026-11-09, antes de esto: el HTML servido tenía 0 palabras de CV;
 * Google (mobile-first) veía 761 de las 1.599 del CV porque las secciones
 * cerradas no renderizan nada.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { construirHtmlEstatico, construirJsonLd, seoPrerender } from '../../seo-prerender.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const datos = JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'public', 'portfolio-data.json'), 'utf8'),
);

const aTexto = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('DT-215 · el CV como HTML real', () => {
  it('incluye las ocho secciones del CV', () => {
    const html = construirHtmlEstatico(datos);
    for (const s of [
      'Profile',
      'Experience',
      'Education',
      'Technical skills',
      'Languages',
      'Projects',
      'Achievements',
      'Contact',
    ]) {
      expect(html).toContain(`<h2>${s}</h2>`);
    }
  });

  it('lleva encabezados reales, no solo ARIA', () => {
    // En móvil la app renderizaba h1=1, h2=0, h3=0: los títulos de ventana son
    // `<span role="heading">`. El HTML inyectado sí da jerarquía al rastreador.
    const html = construirHtmlEstatico(datos);
    expect((html.match(/<h2>/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect((html.match(/<h3>/g) ?? []).length).toBeGreaterThanOrEqual(10);
  });

  it('traslada el grueso del CV, no un resumen', () => {
    const palabras = aTexto(construirHtmlEstatico(datos)).split(' ').length;
    // El CV completo ronda las 1.600 palabras; por debajo de 1.000 es que el
    // generador ha dejado de entender alguna sección del JSON.
    expect(palabras).toBeGreaterThan(1000);
  });

  it('escapa el HTML del contenido', () => {
    const html = construirHtmlEstatico({
      name: 'Ada & <script>alert(1)</script>',
      experience: [{ title: 'Dev "senior"', company: 'A & B' }],
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&amp;');
    expect(html).toContain('&lt;script&gt;');
  });

  it('no deja separadores sueltos cuando un campo falta', () => {
    const html = construirHtmlEstatico({ name: 'Ada', experience: [{ title: 'Dev' }] });
    expect(html).toContain('<h3>Dev</h3>'); // sin el " — " de la empresa ausente
    expect(aTexto(html)).not.toMatch(/·\s*$|—\s*</);
  });
});

describe('DT-215 · datos estructurados Person', () => {
  const ld = JSON.parse(construirJsonLd(datos).replaceAll('<\\/', '</'));

  it('declara una Person con lo que el JSON afirma de verdad', () => {
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('Person');
    expect(ld.name).toBe(datos.name);
    expect(ld.jobTitle).toBe(datos.title);
    expect(ld.sameAs).toEqual(expect.arrayContaining([datos.contact.social.linkedin]));
  });

  it('no publica claves vacías ni indefinidas', () => {
    for (const [k, v] of Object.entries(ld)) {
      expect(v, `${k} vacía`).toBeDefined();
      if (Array.isArray(v)) expect(v.length, `${k} vacía`).toBeGreaterThan(0);
    }
  });

  it('neutraliza un </script> incrustado', () => {
    // Sin esto, un `</script>` en cualquier texto del CV cerraría la etiqueta
    // antes de tiempo y volcaría el resto del JSON como HTML.
    const crudo = construirJsonLd({ name: 'Ada</script><img src=x>' });
    expect(crudo).not.toContain('</script>');
    expect(crudo).toContain('<\\/script>');
  });
});

describe('DT-215 · el plugin de build', () => {
  const plugin = seoPrerender(() => datos);
  const htmlBase = '<html><head></head><body><div id="root"></div></body></html>';

  it('inyecta el CV y el JSON-LD', () => {
    const salida = plugin.transformIndexHtml(htmlBase);
    expect(salida).toContain('<h2>Experience</h2>');
    expect(salida).toContain('application/ld+json');
    expect(salida).not.toContain('<div id="root"></div>'); // ya no está vacío
  });

  it('solo se aplica en build, para no tocar el servidor de desarrollo', () => {
    expect(plugin.apply).toBe('build');
  });

  it('rompe el build si el contenedor cambia, en vez de publicar un HTML vacío', () => {
    // Un fallo silencioso aquí devolvería el sitio a la casilla de salida sin
    // que nadie se entere hasta revisar Search Console semanas después.
    expect(() => plugin.transformIndexHtml('<html><body><div id="app"></div></body></html>')).toThrow(
      /no encuentro/i,
    );
  });
});
