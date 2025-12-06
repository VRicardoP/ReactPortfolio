import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

const MatrixEffect = () => {
    const canvasRef = useRef(null);
    const animationIdRef = useRef(null);
    const { theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // ajustar canvas al tamaño de la ventana
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // caracteres para el efecto matrix (katakana + numeros + simbolos)
        const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*()';
        const charArray = chars.split('');

        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);
        const trailLength = 20; // numero de caracteres en la estela

        // posicion Y de cada columna (donde cae cada gota)
        const drops = Array(columns).fill(1);

        // velocidad aleatoria para cada columna (reducida a un cuarto)
        const speeds = Array(columns).fill(0).map(() => (Math.random() * 0.5 + 0.5) * 0.25);

        // almacenar los caracteres de cada columna con su posicion y caracter
        const trails = Array(columns).fill(null).map(() => []);

        const draw = () => {
            // limpiar completamente el canvas
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const x = i * fontSize;
                const currentY = Math.floor(drops[i]);

                // añadir nuevo caracter si se ha movido una posicion
                if (trails[i].length === 0 || currentY > trails[i][trails[i].length - 1].y) {
                    const char = charArray[Math.floor(Math.random() * charArray.length)];
                    trails[i].push({ y: currentY, char });

                    // mantener solo los ultimos trailLength caracteres
                    if (trails[i].length > trailLength) {
                        trails[i].shift();
                    }
                }

                // dibujar la estela con degradado de opacidad
                for (let j = 0; j < trails[i].length; j++) {
                    const trail = trails[i][j];
                    const opacity = (j + 1) / trails[i].length; // mas opaco hacia abajo

                    ctx.fillStyle = theme.primary;
                    ctx.globalAlpha = opacity;
                    ctx.fillText(trail.char, x, trail.y * fontSize);
                }

                // cuando llega abajo o aleatoriamente, reiniciar arriba
                if (currentY * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                    trails[i] = [];
                }

                // mover hacia abajo segun su velocidad
                drops[i] += speeds[i];
            }

            ctx.globalAlpha = 1;
            animationIdRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [theme]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                background: '#000000'
            }}
        />
    );
};

export default MatrixEffect;
