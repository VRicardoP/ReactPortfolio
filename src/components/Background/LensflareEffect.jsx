import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { useTheme } from '../../context/ThemeContext';

const LensflareEffect = () => {
    const mountRef = useRef(null);
    const animationIdRef = useRef(null);
    const boxMaterialRef = useRef(null);
    const sceneRef = useRef(null);
    const { theme } = useTheme();

    // Update material and scene background when theme changes — no scene rebuild needed
    useEffect(() => {
        if (boxMaterialRef.current) {
            boxMaterialRef.current.color.set(theme.primary);
        }
        if (sceneRef.current) {
            sceneRef.current.background.set(theme.background);
        }
    }, [theme]);

    useEffect(() => {
        if (!mountRef.current) return;

        const { innerWidth, innerHeight } = window;

        // create the scene with dark background and fog like the original
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        scene.fog = new THREE.Fog(0x000000, 2500, 10000);
        sceneRef.current = scene;

        // the camera
        const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 1, 15000);
        camera.position.set(0, 0, 250);

        // the renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(innerWidth, innerHeight);

        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.zIndex = '-1';

        mountRef.current.appendChild(renderer.domElement);

        // create the floating cubes using InstancedMesh for performance
        const boxGeometry = new THREE.BoxGeometry(250, 250, 250);
        const boxMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(theme.primary),
            specular: 0xffffff,
            shininess: 50
        });
        boxMaterialRef.current = boxMaterial;

        const instanceCount = 3000;
        const instancedMesh = new THREE.InstancedMesh(boxGeometry, boxMaterial, instanceCount);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < instanceCount; i++) {
            dummy.position.set(
                8000 * (2.0 * Math.random() - 1.0),
                8000 * (2.0 * Math.random() - 1.0),
                8000 * (2.0 * Math.random() - 1.0)
            );
            dummy.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        scene.add(instancedMesh);

        // directional light to illuminate the cubes
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.15);
        dirLight.position.set(0, -1, 0).normalize();
        scene.add(dirLight);

        // function to create lensflare textures procedurally
        const createFlareTexture = (size, type) => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            const centerX = size / 2;
            const centerY = size / 2;
            const radius = size / 2;

            if (type === 'main') {
                // main flare texture - intense central glow
                const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
                grd.addColorStop(0, 'rgba(255, 255, 255, 1)');
                grd.addColorStop(0.05, 'rgba(255, 255, 220, 0.9)');
                grd.addColorStop(0.1, 'rgba(255, 220, 150, 0.7)');
                grd.addColorStop(0.3, 'rgba(255, 150, 50, 0.3)');
                grd.addColorStop(0.6, 'rgba(200, 100, 20, 0.1)');
                grd.addColorStop(1, 'rgba(100, 50, 0, 0)');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, size, size);
            } else {
                // secondary halos
                const grd = ctx.createRadialGradient(centerX, centerY, radius * 0.7, centerX, centerY, radius);
                grd.addColorStop(0, 'rgba(255, 200, 100, 0)');
                grd.addColorStop(0.5, 'rgba(255, 180, 80, 0.15)');
                grd.addColorStop(0.8, 'rgba(255, 150, 50, 0.1)');
                grd.addColorStop(1, 'rgba(200, 100, 20, 0)');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, size, size);
            }

            return new THREE.CanvasTexture(canvas);
        };

        const textureFlare0 = createFlareTexture(512, 'main');

        // function to add lights with lensflare
        const addLight = (h, s, l, x, y, z) => {
            const light = new THREE.PointLight(0xffffff, 1.5, 2000, 0);
            light.color.setHSL(h, s, l);
            light.position.set(x, y, z);
            scene.add(light);

            const lensflare = new Lensflare();
            lensflare.addElement(new LensflareElement(textureFlare0, 700, 0, light.color));
            light.add(lensflare);

            return light;
        };

        // add the lights - one main orange/yellow and others with various colors
        addLight(0.08, 0.9, 0.5, 0, 0, -1000);
        addLight(0.55, 0.8, 0.5, 2000, 1000, -3000);
        addLight(0.995, 0.8, 0.5, -2000, -1000, -2000);

        // camera control
        let mouseX = 0; // normalized -1 to 1
        let mouseY = 0; // normalized -1 to 1
        let moveForward = false;
        let moveBackward = false;

        // direction where the camera looks (relative to its position)
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        const cameraUp = new THREE.Vector3(0, 1, 0);

        const onMouseMove = (event) => {
            // normalize between -1 and 1 (0 at the center)
            mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            mouseY = (event.clientY / window.innerHeight) * 2 - 1;
        };

        const onMouseDown = (event) => {
            if (event.button === 0) {
                moveForward = true;
            } else if (event.button === 2) {
                moveBackward = true;
            }
        };

        const onMouseUp = (event) => {
            if (event.button === 0) {
                moveForward = false;
            } else if (event.button === 2) {
                moveBackward = false;
            }
        };

        // prevent the right-click context menu
        const onContextMenu = (event) => {
            event.preventDefault();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        renderer.domElement.addEventListener('contextmenu', onContextMenu);

        // animation loop
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            // calculate rotation speed based on distance from center
            // farther from center = faster, at center = static
            const rotationSpeed = 0.03;
            const rotationX = -mouseX * Math.abs(mouseX) * rotationSpeed; // yaw (left/right)
            const rotationY = -mouseY * Math.abs(mouseY) * rotationSpeed; // pitch (up/down)

            // rotate the camera direction horizontally (yaw)
            cameraDirection.applyAxisAngle(cameraUp, rotationX);

            // rotate the camera direction vertically (pitch)
            // calculate the perpendicular axis for pitch
            const rightAxis = new THREE.Vector3();
            rightAxis.crossVectors(cameraDirection, cameraUp).normalize();
            cameraDirection.applyAxisAngle(rightAxis, rotationY);

            // normalize the direction
            cameraDirection.normalize();

            // forward/backward movement with mouse buttons
            const moveSpeed = 50;
            if (moveForward) {
                camera.position.addScaledVector(cameraDirection, moveSpeed);
            }
            if (moveBackward) {
                camera.position.addScaledVector(cameraDirection, -moveSpeed);
            }

            // the camera looks in the calculated direction
            const lookAtPoint = new THREE.Vector3();
            lookAtPoint.copy(camera.position).add(cameraDirection);
            camera.lookAt(lookAtPoint);

            renderer.render(scene, camera);
        };

        // when the window size changes
        const onWindowResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', onWindowResize);

        animate();

        const mountNode = mountRef.current;

        // cleanup when the component unmounts
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mouseup', onMouseUp);
            renderer.domElement.removeEventListener('contextmenu', onContextMenu);
            window.removeEventListener('resize', onWindowResize);

            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }

            if (mountNode && renderer.domElement) {
                mountNode.removeChild(renderer.domElement);
            }

            boxMaterialRef.current = null;
            sceneRef.current = null;
            scene.clear(); // dispose all meshes from scene
            boxGeometry.dispose();
            boxMaterial.dispose();
            renderer.dispose();
            textureFlare0.dispose();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

export default LensflareEffect;
