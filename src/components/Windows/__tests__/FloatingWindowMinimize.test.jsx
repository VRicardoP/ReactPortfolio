/**
 * DT-185: minimizar una ventana NO debe destruir su contenido.
 *
 * El contenido se renderizaba dentro de `{!isMinimized && (...)}`, así que al
 * minimizar React lo desmontaba: se perdía la conversación del chat, el Kanban
 * volvía a pedir sus datos al servidor y el mapa se reconstruía. Ahora sigue
 * montado y lo oculta la regla `.window-collapsed .window-content` del CSS.
 *
 * Lo que de verdad hay que medir no es que el nodo exista, sino que NO se
 * vuelva a montar al minimizar y restaurar: ahí estaba la pérdida de estado.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({
    toggleMinimize: vi.fn(),
    updateSize: vi.fn(),
}));

vi.mock('../../../hooks/useIsMobile', () => ({ default: () => false }));

// Estado de ventanas controlado desde el test: de aquí sale `isMinimized`.
let minimizado = false;
const ventana = () => ({
    isMinimized: minimizado,
    isMaximized: false,
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    zIndex: 1,
});

vi.mock('../../../context/WindowContext', () => ({
    useWindowContext: () => ({
        windows: { w1: ventana() },
        activeWindowId: null,
        registerWindow: vi.fn(),
        unregisterWindow: vi.fn(),
        bringToFront: vi.fn(),
        toggleMinimize: actions.toggleMinimize,
        toggleMaximize: vi.fn(),
        fitToContent: vi.fn(),
        updatePosition: vi.fn(),
        updateSize: actions.updateSize,
    }),
}));

import FloatingWindow from '../FloatingWindow';

describe('DT-185 · minimizar conserva el contenido', () => {
    it('no se vuelve a montar al minimizar y restaurar', () => {
        const montajes = [];
        const Hijo = () => {
            useEffect(() => {
                montajes.push('montado');
            }, []);
            return <p data-testid="contenido">conversación</p>;
        };

        minimizado = false;
        const { rerender } = render(
            <FloatingWindow id="w1" title="Chat">
                <Hijo />
            </FloatingWindow>
        );
        expect(montajes).toHaveLength(1);

        // Minimizar: el contenido debe seguir montado, solo oculto por CSS.
        minimizado = true;
        rerender(
            <FloatingWindow id="w1" title="Chat">
                <Hijo />
            </FloatingWindow>
        );
        expect(screen.getByTestId('contenido')).toBeInTheDocument();
        expect(document.querySelector('.floating-window')).toHaveClass('window-collapsed');

        // Restaurar: sigue siendo el MISMO montaje, no uno nuevo.
        minimizado = false;
        rerender(
            <FloatingWindow id="w1" title="Chat">
                <Hijo />
            </FloatingWindow>
        );
        expect(montajes, 'el hijo se remontó: se habría perdido su estado').toHaveLength(1);
    });

    it('minimizada no expone asas de redimensionado', () => {
        minimizado = true;
        render(
            <FloatingWindow id="w1" title="Chat">
                <p>contenido</p>
            </FloatingWindow>
        );
        expect(document.querySelector('[class*="resize"]')).toBeNull();
    });

    it('sin minimizar sí las expone', () => {
        minimizado = false;
        render(
            <FloatingWindow id="w1" title="Chat">
                <p>contenido</p>
            </FloatingWindow>
        );
        expect(document.querySelector('[class*="resize"]')).toBeTruthy();
    });
    it('Escape dentro de un campo editable no minimiza la ventana', () => {
        minimizado = false;
        actions.toggleMinimize.mockClear();
        render(
            <FloatingWindow id="w1" title="Chat">
                <input aria-label="mensaje" />
            </FloatingWindow>
        );

        fireEvent.keyDown(screen.getByRole('textbox', { name: 'mensaje' }), { key: 'Escape' });

        expect(actions.toggleMinimize).not.toHaveBeenCalled();
    });

    it('redimensiona con pointerdown y captura en el asa', () => {
        minimizado = false;
        actions.updateSize.mockClear();
        render(<FloatingWindow id="w1" title="Chat"><p>contenido</p></FloatingWindow>);
        const dialog = screen.getByRole('dialog');
        dialog.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300 });
        const handle = screen.getByRole('separator', { name: 'Resize window east edge' });
        handle.setPointerCapture = vi.fn();
        handle.hasPointerCapture = vi.fn(() => false);

        fireEvent.pointerDown(handle, { pointerId: 3, button: 0, clientX: 400, clientY: 150 });
        fireEvent.pointerMove(handle, { pointerId: 3, clientX: 450, clientY: 150 });
        fireEvent.pointerUp(handle, { pointerId: 3 });

        expect(handle.setPointerCapture).toHaveBeenCalledWith(3);
        expect(actions.updateSize).toHaveBeenCalledWith('w1', { width: 450, height: 300 });
    });
});
