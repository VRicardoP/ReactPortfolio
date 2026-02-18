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

        // adjust canvas to window size
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // characters for the matrix effect (katakana + numbers + symbols)
        const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*()';
        const charArray = chars.split('');

        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);
        const trailLength = 20; // number of characters in the trail

        // Y position of each column (where each drop falls)
        const drops = Array(columns).fill(1);

        // random speed for each column (reduced to a quarter)
        const speeds = Array(columns).fill(0).map(() => (Math.random() * 0.5 + 0.5) * 0.25);

        // store the characters of each column with their position and character
        const trails = Array(columns).fill(null).map(() => []);

        const draw = () => {
            // completely clear the canvas
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const x = i * fontSize;
                const currentY = Math.floor(drops[i]);

                // add new character if it has moved one position
                if (trails[i].length === 0 || currentY > trails[i][trails[i].length - 1].y) {
                    const char = charArray[Math.floor(Math.random() * charArray.length)];
                    trails[i].push({ y: currentY, char });

                    // keep only the last trailLength characters
                    if (trails[i].length > trailLength) {
                        trails[i].shift();
                    }
                }

                // draw the trail with opacity gradient
                for (let j = 0; j < trails[i].length; j++) {
                    const trail = trails[i][j];
                    const opacity = (j + 1) / trails[i].length; // more opaque towards the bottom

                    ctx.fillStyle = theme.primary;
                    ctx.globalAlpha = opacity;
                    ctx.fillText(trail.char, x, trail.y * fontSize);
                }

                // when it reaches the bottom or randomly, reset to the top
                if (currentY * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                    trails[i] = [];
                }

                // move down according to its speed
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
