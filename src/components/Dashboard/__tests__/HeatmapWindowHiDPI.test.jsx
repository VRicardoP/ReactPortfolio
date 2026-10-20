/**
 * DT-186: el mapa de calor se dibujaba fuera del lienzo en pantallas de alta
 * densidad.
 *
 * `drawHeatmap` fija `canvas.width = rect.width * dpr` y después aplica
 * `scale(dpr, dpr)` al contexto. `renderHeatmap` leía las medidas de
 * `canvas.width`/`canvas.height`, que están en píxeles FÍSICOS, sobre un
 * contexto ya escalado: con dpr=2 todo se pintaba al doble y solo se veía el
 * cuarto superior izquierdo. Ahora las medidas llegan en píxeles CSS.
 *
 * Se comprueba sobre el contexto 2D: el texto "No data" tiene que quedar en el
 * centro de las medidas CSS, no en el doble de ellas.
 */
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../hooks/useIsMobile', () => ({ default: () => false }));
vi.mock('../../../hooks/useHeatmapData', () => ({
    useHeatmapData: () => ({ heatmapData: [], engagementStats: null, loading: false }),
}));
vi.mock('../../Windows/FloatingWindow', () => ({
    default: ({ children }) => <div>{children}</div>,
}));
vi.mock('../../../context/ThemeContext', () => ({
    useTheme: () => ({
        theme: { primary: '#0ff', primaryRgb: '0, 255, 255', text: '#fff', textHighlight: '#fff', warning: '#fc0', chartColors: ['#0ff'] },
    }),
}));

import HeatmapWindow from '../HeatmapWindow';

const ANCHO_CSS = 400;
const ALTO_CSS = 300;
const DPR = 2;

let llamadas;

beforeEach(() => {
    llamadas = { fillText: [], scale: [] };
    vi.useFakeTimers();
    window.devicePixelRatio = DPR;

    // El contenedor mide en píxeles CSS.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        width: ANCHO_CSS,
        height: ALTO_CSS,
        top: 0,
        left: 0,
        right: ANCHO_CSS,
        bottom: ALTO_CSS,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    });

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        createRadialGradient: () => ({ addColorStop: vi.fn() }),
        scale: (...a) => llamadas.scale.push(a),
        fillText: (...a) => llamadas.fillText.push(a),
        set fillStyle(_v) {},
        set font(_v) {},
        set textAlign(_v) {},
        set globalCompositeOperation(_v) {},
        set lineWidth(_v) {},
        set strokeStyle(_v) {},
    }));

    global.ResizeObserver = class {
        observe() {}
        disconnect() {}
    };
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('DT-186 · escalado del mapa de calor', () => {
    it('dibuja usando píxeles CSS, no físicos', () => {
        render(<HeatmapWindow />);
        vi.advanceTimersByTime(100); // el redibujado va tras un setTimeout de 50 ms

        expect(llamadas.scale).toContainEqual([DPR, DPR]);

        const [texto, x, y] = llamadas.fillText.at(-1);
        expect(texto).toBe('No data');
        // Centro en píxeles CSS. Antes salía en (ANCHO_CSS*DPR/2, ALTO_CSS*DPR/2),
        // es decir fuera de la parte visible del lienzo.
        expect(x).toBe(ANCHO_CSS / 2);
        expect(y).toBe(ALTO_CSS / 2);
    });
});
