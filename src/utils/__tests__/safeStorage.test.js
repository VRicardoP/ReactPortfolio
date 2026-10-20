/**
 * DT-187: el almacenamiento del navegador no puede tumbar una pantalla.
 *
 * Con las cookies y los datos de sitio bloqueados, Chromium no devuelve null:
 * el propio ACCESO a `localStorage` lanza `SecurityError`. En `ThemeContext`
 * eso ocurría dentro del inicializador de `useState`, o sea durante el primer
 * render, así que el ErrorBoundary de la raíz dejaba la portada en blanco.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { safeLocal, safeSession } from '../safeStorage';

/** Sustituye `window.<tipo>` por un descriptor que LANZA al leerlo. */
function bloquear(tipo) {
    const original = Object.getOwnPropertyDescriptor(window, tipo);
    Object.defineProperty(window, tipo, {
        configurable: true,
        get() {
            throw new DOMException('Access is denied for this document.', 'SecurityError');
        },
    });
    return () => Object.defineProperty(window, tipo, original);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('DT-187 · almacenamiento seguro', () => {
    it('devuelve null al leer cuando el acceso está bloqueado', () => {
        const restaurar = bloquear('localStorage');
        try {
            expect(safeLocal.get('portfolio-theme')).toBeNull();
        } finally {
            restaurar();
        }
    });

    it('no lanza al escribir ni al borrar con el acceso bloqueado', () => {
        const restaurar = bloquear('sessionStorage');
        try {
            expect(safeSession.set('x', '1')).toBe(false);
            expect(safeSession.remove('x')).toBe(false);
            expect(safeSession.keys()).toEqual([]);
        } finally {
            restaurar();
        }
    });

    it('no lanza cuando la cuota está agotada', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('QuotaExceededError', 'QuotaExceededError');
        });
        expect(safeLocal.set('grande', 'x')).toBe(false);
    });

    it('funciona con normalidad cuando el almacenamiento está disponible', () => {
        expect(safeLocal.set('clave', 'valor')).toBe(true);
        expect(safeLocal.get('clave')).toBe('valor');
        expect(safeLocal.keys()).toContain('clave');
        expect(safeLocal.remove('clave')).toBe(true);
        expect(safeLocal.get('clave')).toBeNull();
    });
});
