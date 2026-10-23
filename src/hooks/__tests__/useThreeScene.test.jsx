import { fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useThreeScene from '../useThreeScene';

describe('useThreeScene', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('owns mount, resize, animation and cleanup', () => {
        const canvas = document.createElement('canvas');
        const resources = {
            scene: {},
            camera: { aspect: 1, updateProjectionMatrix: vi.fn() },
            renderer: {
                domElement: canvas,
                setSize: vi.fn(),
                render: vi.fn(),
                dispose: vi.fn(),
            },
            animate: vi.fn(),
            dispose: vi.fn(),
        };
        const build = vi.fn(() => resources);
        vi.stubGlobal('requestAnimationFrame', vi.fn(() => 42));
        vi.stubGlobal('cancelAnimationFrame', vi.fn());

        const Harness = () => {
            const mountRef = useRef(null);
            useThreeScene(mountRef, build);
            return <div data-testid="mount" ref={mountRef} />;
        };
        const { getByTestId, unmount } = render(<Harness />);

        expect(getByTestId('mount')).toContainElement(canvas);
        expect(resources.animate).toHaveBeenCalledTimes(1);
        expect(resources.renderer.render).toHaveBeenCalledWith(resources.scene, resources.camera);
        fireEvent(window, new Event('resize'));
        expect(resources.camera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
        expect(resources.renderer.setSize).toHaveBeenCalledWith(window.innerWidth, window.innerHeight);

        unmount();
        expect(resources.dispose).toHaveBeenCalledTimes(1);
        expect(resources.renderer.dispose).toHaveBeenCalledTimes(1);
        expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
        expect(canvas.parentNode).toBeNull();
    });
});
