/**
 * DT-219: solo http(s) llega a un `href`, un `src` o un `window.open`.
 *
 * Las ofertas del panel las scrapea el núcleo de portales externos: su URL es
 * dato de un tercero. Hoy el CSP bloquea `javascript:`; esto es el segundo
 * control, y la guarda del normalizador fija que el filtro se aplica UNA vez
 * para las 20 fuentes — si alguien lo quita de `jobSources.js`, muerde aquí.
 */
import { describe, expect, it } from 'vitest';

import { normalizeCoreJob, normalizeJob } from '../../config/jobSources';
import { hrefSeguro } from '../safeUrl';

describe('hrefSeguro', () => {
  it.each([
    'https://example.com/job/1',
    'http://example.com/job/1?x=1#y',
    'HTTPS://EXAMPLE.COM', // el esquema no distingue mayúsculas
  ])('deja pasar %s', (url) => {
    expect(hrefSeguro(url)).toBe(url);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.com/x',
    '/relativa/no-es-externa',
    'sin-esquema.example.com',
    '',
    null,
    undefined,
    42,
  ])('devuelve cadena vacía para %s', (url) => {
    expect(hrefSeguro(url)).toBe('');
  });
});

describe('DT-219 · el normalizador filtra la URL una vez para todas las fuentes', () => {
  it('una oferta scrapeada con URL javascript: queda sin enlace', () => {
    const oferta = { id: 'x', title: 'Dev', url: 'javascript:alert(1)' };
    expect(normalizeJob(oferta, 'remotive').url).toBe('');
    expect(normalizeJob(oferta, 'fuente-desconocida').url).toBe('');
    expect(normalizeCoreJob(oferta, 'arbeitnow').url).toBe('');
  });

  it('una URL http(s) legítima sobrevive intacta', () => {
    const oferta = { id: 'x', title: 'Dev', url: 'https://remotive.com/job/1' };
    expect(normalizeJob(oferta, 'remotive').url).toBe('https://remotive.com/job/1');
  });

  it('los campos alternativos de URL también pasan por el filtro', () => {
    // jsearch lee `job_apply_link` antes que `url`.
    const oferta = { job_id: 'j', job_title: 'Dev', job_apply_link: 'javascript:void(0)' };
    expect(normalizeJob(oferta, 'jsearch').url).toBe('');
  });
});
