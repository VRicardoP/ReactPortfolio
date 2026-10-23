import { useEffect, useRef } from 'react';

// Posee el ciclo de vida común de una escena Three.js montada en un nodo React.
// Effects provide construction, animation and resource-specific disposal only.
export default function useThreeScene(mountRef, build) {
    const scene = useRef(null);
    const camera = useRef(null);
    const renderer = useRef(null);

    useEffect(() => {
        const mountNode = mountRef.current;
        if (!mountNode) return;

        const resources = build({ width: window.innerWidth, height: window.innerHeight });
        scene.current = resources.scene;
        camera.current = resources.camera;
        renderer.current = resources.renderer;
        mountNode.appendChild(resources.renderer.domElement);

        let animationId;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            resources.animate?.();
            resources.renderer.render(resources.scene, resources.camera);
        };
        const resize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            resources.camera.aspect = width / height;
            resources.camera.updateProjectionMatrix();
            resources.renderer.setSize(width, height);
            resources.onResize?.({ width, height });
        };

        window.addEventListener('resize', resize);
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
            if (resources.renderer.domElement.parentNode === mountNode) {
                mountNode.removeChild(resources.renderer.domElement);
            }
            resources.dispose?.();
            resources.renderer.dispose();
            scene.current = null;
            camera.current = null;
            renderer.current = null;
        };
    }, [build, mountRef]);

    return { scene, camera, renderer };
}
