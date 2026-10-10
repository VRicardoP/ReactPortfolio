import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MapWindow from '../MapWindow';

const { map, observers } = vi.hoisted(() => ({
    map: { invalidateSize: vi.fn(), getContainer: vi.fn() },
    observers: [],
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
vi.mock('../../Windows/FloatingWindow', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('react-leaflet', () => ({
    MapContainer: ({ children }) => <div>{children}</div>,
    TileLayer: () => null,
    Marker: () => null,
    Popup: () => null,
    useMap: () => map,
}));

beforeEach(() => {
    vi.useFakeTimers();
    map.invalidateSize.mockClear();
    map.getContainer.mockReturnValue({ parentElement: document.createElement('div') });
    observers.length = 0;
    vi.stubGlobal('ResizeObserver', class {
        constructor(callback) { observers.push(callback); }
        observe() {}
        disconnect() {}
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

it('coalesces a burst of map resize notifications', () => {
    const view = render(<MapWindow data={[]} />);
    act(() => {
        observers[0]();
        observers[0]();
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(100);
    });
    expect(map.invalidateSize).toHaveBeenCalledTimes(1);
    view.unmount();
});

it('cancels a pending resize when the map window is minimized', () => {
    const view = render(<MapWindow data={[]} />);
    act(() => observers[0]());
    view.unmount();
    act(() => vi.advanceTimersByTime(100));
    expect(map.invalidateSize).not.toHaveBeenCalled();
});
