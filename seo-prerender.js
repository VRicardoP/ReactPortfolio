/**
 * Inyecta el CV como HTML real dentro de `index.html` durante el build
 * (DT-215, estudio SEO del 2026-11-09).
 *
 * EL PROBLEMA: esto es una SPA, así que el HTML servido iba vacío
 * (`<div id="root"></div>`, 1.458 bytes). Medido contra producción: Google
 * indexa *mobile-first*, y en móvil solo 3 de las 9 secciones existen en el
 * DOM —una sección cerrada no renderiza nada—, o sea 761 palabras de las
 * 1.599 del CV. En escritorio el auto-minimizado deja el 91 % del contenido
 * en `display:none`, que Google descuenta.
 *
 * POR QUÉ ESTO Y NO SSR: el CV ya es un JSON estático que se conoce en tiempo
 * de compilación (`public/portfolio-data.json`, el mismo del que tira el
 * frontend y que hace de respaldo en DT-209). Montar SSR o migrar a Next.js
 * para servir un contenido que no cambia entre peticiones sería pagar un
 * servidor y una reescritura por nada.
 *
 * POR QUÉ NO HAY RIESGO DE DESAJUSTE: `main.jsx` monta con
 * `createRoot().render()`, no con `hydrateRoot`. React VACÍA el contenedor en
 * el primer render (~200 ms), así que este HTML no tiene que parecerse al
 * árbol de React — que sería el requisito caro. El visitante no llega a verlo;
 * el rastreador, y quien navegue sin JavaScript, sí.
 *
 * NO ES CLOAKING: se sirve exactamente el mismo HTML a todo el mundo. Que
 * desaparezca es que la aplicación arranca, igual que en cualquier sitio
 * pre-renderizado.
 */

const SITIO = 'https://vicentepau.is-a.dev';

// Escapa lo que va como TEXTO dentro del HTML. El contenido viene de un JSON
// propio, pero escapar es lo correcto igualmente: un `&` sin escapar en un
// título rompe el documento.
const esc = (v) =>
  String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const lista = (xs) => (Array.isArray(xs) ? xs : []);

// Une partes opcionales sin dejar separadores sueltos cuando alguna falta.
const unir = (partes, sep = ' · ') => partes.filter(Boolean).map(esc).join(sep);

const seccion = (titulo, cuerpo) =>
  cuerpo ? `<section><h2>${esc(titulo)}</h2>${cuerpo}</section>` : '';

/** Construye el CV como HTML semántico. Función PURA: entra el JSON, sale texto. */
export function construirHtmlEstatico(d) {
  const cabecera = [
    `<h1>${esc(d.name)}</h1>`,
    d.title ? `<p>${esc(d.title)}</p>` : '',
    unir([d.location, d.email]) ? `<p>${unir([d.location, d.email])}</p>` : '',
  ].join('');

  const perfil = d.profile?.description ? `<p>${esc(d.profile.description)}</p>` : '';

  const experiencia = lista(d.experience)
    .map((e) =>
      [
        '<article>',
        `<h3>${unir([e.title, e.company], ' — ')}</h3>`,
        unir([e.location, e.date]) ? `<p>${unir([e.location, e.date])}</p>` : '',
        e.description ? `<p>${esc(e.description)}</p>` : '',
        '</article>',
      ].join(''),
    )
    .join('');

  const formacion = lista(d.education)
    .map((e) =>
      [
        '<article>',
        `<h3>${esc(e.title)}</h3>`,
        unir([e.institution, e.date]) ? `<p>${unir([e.institution, e.date])}</p>` : '',
        e.description ? `<p>${esc(e.description)}</p>` : '',
        '</article>',
      ].join(''),
    )
    .join('');

  // `techSkills` es un objeto de categorías -> lista de tecnologías.
  const tecnicas = Object.entries(d.techSkills ?? {})
    .map(([categoria, xs]) => {
      const items = lista(xs)
        .map((s) => esc(typeof s === 'string' ? s : (s?.name ?? s?.skill ?? '')))
        .filter(Boolean);
      return items.length
        ? `<li><strong>${esc(categoria)}:</strong> ${items.join(', ')}</li>`
        : '';
    })
    .join('');

  const idiomas = lista(d.languages)
    .map((l) => `<li>${unir([l.language, l.level], ': ')}</li>`)
    .join('');

  const proyectos = lista(d.portfolio)
    .map((p) => {
      const enlace = p.gitlab || p.demo;
      const titulo = enlace
        ? `<a href="${esc(enlace)}" rel="noopener">${esc(p.title)}</a>`
        : esc(p.title);
      return [
        '<article>',
        `<h3>${titulo}</h3>`,
        lista(p.tech).length ? `<p>${lista(p.tech).map(esc).join(', ')}</p>` : '',
        p.description ? `<p>${esc(p.description)}</p>` : '',
        '</article>',
      ].join('');
    })
    .join('');

  const logros = lista(d.achievements)
    .map((a) => `<li>${unir([a.value, a.metric], ' — ')}</li>`)
    .join('');

  const social = Object.values(d.contact?.social ?? {})
    .filter(Boolean)
    .map((u) => `<li><a href="${esc(u)}" rel="noopener">${esc(u)}</a></li>`)
    .join('');
  const contacto = [
    d.contact?.message ? `<p>${esc(d.contact.message)}</p>` : '',
    d.email ? `<p><a href="mailto:${esc(d.email)}">${esc(d.email)}</a></p>` : '',
    social ? `<ul>${social}</ul>` : '',
  ].join('');

  return [
    // `seo-estatico` NO lleva `display:none` a propósito: ocultar lo que
    // quieres que se indexe es justo el problema que esto viene a resolver.
    '<div class="seo-estatico">',
    `<header>${cabecera}</header>`,
    seccion('Profile', perfil),
    seccion('Experience', experiencia),
    seccion('Education', formacion),
    seccion('Technical skills', tecnicas ? `<ul>${tecnicas}</ul>` : ''),
    seccion('Languages', idiomas ? `<ul>${idiomas}</ul>` : ''),
    seccion('Projects', proyectos),
    seccion('Achievements', logros ? `<ul>${logros}</ul>` : ''),
    seccion('Contact', contacto),
    '</div>',
  ]
    .filter(Boolean)
    .join('');
}

/** Datos estructurados `Person`. Solo afirma lo que el JSON dice de verdad. */
export function construirJsonLd(d) {
  const [localidad, resto] = String(d.location ?? '').split(',');
  // "Valencia, Spain (EU Citizen — CET timezone)" -> localidad / país.
  const pais = (resto ?? '').split('(')[0].trim();

  const actual = lista(d.experience).find((e) => /present|actual/i.test(e.date ?? ''));
  const tecnologias = Object.values(d.techSkills ?? {})
    .flatMap((xs) => lista(xs))
    .map((s) => (typeof s === 'string' ? s : (s?.name ?? s?.skill ?? '')))
    .filter(Boolean);

  const persona = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: d.name,
    jobTitle: d.title,
    description: d.profile?.description,
    url: `${SITIO}/`,
    image: `${SITIO}/og-image.png`,
    email: d.email ? `mailto:${d.email}` : undefined,
    address:
      localidad && pais
        ? { '@type': 'PostalAddress', addressLocality: localidad.trim(), addressCountry: pais }
        : undefined,
    sameAs: Object.values(d.contact?.social ?? {}).filter(Boolean),
    knowsAbout: tecnologias.length ? tecnologias : undefined,
    knowsLanguage: lista(d.languages)
      .map((l) => l.language)
      .filter(Boolean),
    alumniOf: lista(d.education)
      .map((e) => e.institution)
      .filter(Boolean)
      .map((name) => ({ '@type': 'EducationalOrganization', name })),
    worksFor: actual?.company ? { '@type': 'Organization', name: actual.company } : undefined,
  };

  // Sin claves vacías: un `undefined` en JSON-LD es ruido para el validador.
  const limpio = Object.fromEntries(
    Object.entries(persona).filter(
      ([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0),
    ),
  );
  // `</script>` dentro del JSON cerraría la etiqueta antes de tiempo.
  return JSON.stringify(limpio).replaceAll('</', '<\\/');
}

/**
 * Plugin de Vite. Mismo patrón que `hardenCspOnBuild`: solo en build, para
 * que `npm run dev` siga sirviendo el `index.html` tal cual.
 */
export function seoPrerender(leerDatos) {
  return {
    name: 'seo-prerender',
    apply: 'build',
    transformIndexHtml(html) {
      const datos = leerDatos();
      const estatico = construirHtmlEstatico(datos);
      const jsonLd = construirJsonLd(datos);

      if (!html.includes('<div id="root"></div>')) {
        // Si alguien cambia el contenedor, es mejor romper el build que
        // publicar en silencio un HTML otra vez vacío.
        throw new Error(
          'seo-prerender: no encuentro <div id="root"></div> en index.html; ' +
            'el CV no se ha inyectado (DT-215)',
        );
      }

      return html
        .replace('<div id="root"></div>', `<div id="root">${estatico}</div>`)
        .replace('</head>', `  <script type="application/ld+json">${jsonLd}</script>\n</head>`);
    },
  };
}
