// Muestra un texto letra por letra, como si se estuviera escribiendo a
// máquina, a la velocidad indicada.

import { useState, useEffect } from 'react';

/**
 * DT-198: lo que se muestra es una función PURA de `text` y `currentIndex`.
 *
 * Antes había además un estado `displayText` que se iba ACUMULANDO
 * (`setDisplayText(prev => prev + text[currentIndex])`), y los dos estados se
 * desincronizaban. Medido en el navegador con el e2e
 * `shows typewriter with "Vicente"`: la portada mostraba
 * `cicente Ricardo Pau Valero > Portfolio` — la "V" perdida y una "c" delante.
 *
 * El mecanismo, ya con la salida del e2e delante: mientras se escribía
 * "Loading portfolio..." el índice llegó a 2, y entonces llegaron los datos y
 * `text` pasó al nombre real. El temporizador pendiente —que había CAPTURADO
 * `currentIndex = 2`— disparó en el hueco anterior a su propia limpieza e hizo
 * dos cosas incoherentes: `setDisplayText('' + text[2])`, con el índice viejo
 * capturado, y `setCurrentIndex(prev => prev + 1)`, con la forma funcional, que
 * sí leyó el 0 ya reiniciado. Resultado: texto "c" e índice 1, y de ahí en
 * adelante escribió correctamente desde text[1]. De ahí "c" + "icente…".
 *
 * Con la salida derivada eso no puede pasar: un temporizador rancio, como
 * mucho, adelanta el índice un tick, y entonces se ve UNA LETRA MÁS del texto
 * correcto. Nunca una letra de otra posición. La invariante que se gana es que
 * lo mostrado es siempre un prefijo de `text`.
 *
 * No se reproduce con temporizadores falsos: el `act` de React vacía los
 * efectos —y con ellos la limpieza que cancela el temporizador— antes de que
 * este pueda disparar. La carrera necesita el reloj real del navegador, así que
 * la prueba de aceptación es el e2e, no un test de unidad.
 */
const useTypewriter = (text, speed = 50) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Si el texto cambia, empieza a escribirlo de nuevo desde el principio.
  useEffect(() => {
    setCurrentIndex(0);
  }, [text]);

  // Va descubriendo una letra más cada vez que pasa el tiempo indicado.
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  // `slice` acota por sí solo: si el índice quedara por delante del texto
  // nuevo, devuelve el texto completo en vez de salirse del rango.
  return text.slice(0, currentIndex);
};

export default useTypewriter;
