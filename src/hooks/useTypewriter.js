// Muestra un texto letra por letra, como si se estuviera escribiendo a
// máquina, a la velocidad indicada.

import { useState, useEffect } from 'react';

const useTypewriter = (text, speed = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Si el texto cambia, empieza a escribirlo de nuevo desde el principio.
  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  // Va añadiendo una letra más cada vez que pasa el tiempo indicado.
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return displayText;
};

export default useTypewriter;
