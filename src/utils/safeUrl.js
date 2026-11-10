// Decide qué URL puede acabar en un `href`, un `src` o un `window.open`
// (DT-219, auditoría de seguridad 2026-11-10).
//
// Las ofertas que el panel pinta las scrapea el núcleo de portales de empleo
// externos: su título, su empresa y SU URL son datos de un tercero. Quien
// publique una oferta en uno de esos portales con una URL `javascript:…`
// acaba con ese enlace en el panel del administrador. Hoy el CSP
// (`script-src 'self'`) lo bloquea, pero es un solo control, y vive en un
// <meta> de index.html que un cambio puede relajar sin que nada avise. Esto
// es el segundo control: solo http(s) llega a los atributos.
//
// Una URL relativa o malformada devuelve '' a propósito: para un dato de
// tercero no es "un enlace raro", es "no hay enlace".

const ESQUEMAS_PERMITIDOS = new Set(['http:', 'https:']);

export function hrefSeguro(url) {
  if (typeof url !== 'string' || url === '') return '';
  try {
    return ESQUEMAS_PERMITIDOS.has(new URL(url).protocol) ? url : '';
  } catch {
    return '';
  }
}
