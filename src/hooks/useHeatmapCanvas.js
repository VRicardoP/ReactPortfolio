import { useCallback, useEffect, useRef } from 'react';

const CANVAS_SETTLE_DELAY_MS = 50;

const renderHeatmap = (canvas, points, theme, width, height) => {
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(10, 10, 30, 0.92)';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = `rgba(${theme.primaryRgb}, 0.08)`;
    context.lineWidth = 1;
    for (let index = 1; index < 10; index++) {
        context.beginPath();
        context.moveTo((width / 10) * index, 0);
        context.lineTo((width / 10) * index, height);
        context.stroke();
        context.beginPath();
        context.moveTo(0, (height / 10) * index);
        context.lineTo(width, (height / 10) * index);
        context.stroke();
    }

    if (!points?.length) {
        context.fillStyle = `rgba(${theme.primaryRgb}, 0.3)`;
        context.font = '12px Courier New';
        context.textAlign = 'center';
        context.fillText('No data', width / 2, height / 2);
        return;
    }

    const maxCount = Math.max(...points.map(point => point.count), 1);
    context.globalCompositeOperation = 'lighter';
    for (const { x, y, count } of points) {
        const pointX = x * width;
        const pointY = y * height;
        const intensity = count / maxCount;
        const radius = 12 + intensity * 28;
        const gradient = context.createRadialGradient(
            pointX, pointY, 0, pointX, pointY, radius
        );
        if (intensity < 0.33) {
            gradient.addColorStop(0, `rgba(0, 100, 255, ${0.25 + intensity * 0.6})`);
        } else if (intensity < 0.66) {
            gradient.addColorStop(0, `rgba(0, 255, 200, ${0.3 + intensity * 0.5})`);
        } else {
            gradient.addColorStop(0, `rgba(255, 80, 0, ${0.4 + intensity * 0.4})`);
        }
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(pointX, pointY, radius, 0, Math.PI * 2);
        context.fill();
    }
    context.globalCompositeOperation = 'source-over';
};

// Ajusta el canvas a píxeles físicos y dibuja usando coordenadas CSS.
const useHeatmapCanvas = (active, points, theme) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const draw = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const pixelRatio = window.devicePixelRatio || 1;
        canvasRef.current.width = rect.width * pixelRatio;
        canvasRef.current.height = rect.height * pixelRatio;
        canvasRef.current.style.width = `${rect.width}px`;
        canvasRef.current.style.height = `${rect.height}px`;
        canvasRef.current.getContext('2d').scale(pixelRatio, pixelRatio);
        renderHeatmap(canvasRef.current, points, theme, rect.width, rect.height);
    }, [points, theme]);

    useEffect(() => {
        if (!active) return undefined;
        const timer = setTimeout(draw, CANVAS_SETTLE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [active, draw]);

    useEffect(() => {
        if (!active || !containerRef.current) return undefined;
        const observer = new ResizeObserver(draw);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [active, draw]);

    return { canvasRef, containerRef };
};

export default useHeatmapCanvas;
