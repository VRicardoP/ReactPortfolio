import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

const RainEffect = () => {
    const mountRef = useRef(null);
    const animationIdRef = useRef(null);
    const rainMaterialRef = useRef(null);
    const { theme } = useTheme();

    // Update rain color when theme changes — no scene rebuild needed
    useEffect(() => {
        if (rainMaterialRef.current) {
            rainMaterialRef.current.color.set(theme.primary);
        }
    }, [theme]);

    useEffect(() => {
        if (!mountRef.current) return;

        const { innerWidth, innerHeight } = window;

        // create the 3D world
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        // the camera from where we see everything
        const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
        camera.position.set(0, 50, 100);
        camera.lookAt(0, 0, 0);

        // this draws everything on the screen
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(innerWidth, innerHeight);

        // place the canvas fullscreen in the background
        renderer.domElement.className = 'rain-canvas';
        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.zIndex = '-1';

        mountRef.current.appendChild(renderer.domElement);

        // an ambient light so something is visible
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        scene.add(ambientLight);

        // a light coming from one side
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(50, 100, 50);
        scene.add(directionalLight);

        // the black floor where the drops fall
        const floorGeometry = new THREE.PlaneGeometry(500, 500);
        floorGeometry.rotateX(-Math.PI / 2);
        const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.y = 0;
        scene.add(floor);

        // create many raindrops using lines
        const rainCount = 3000;
        const rainGeometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for (let i = 0; i < rainCount; i++) {
            // where each drop starts
            const x = (Math.random() - 0.5) * 400;
            const y = Math.random() * 150;
            const z = (Math.random() - 0.5) * 400;

            // each drop is a small vertical line
            positions.push(x, y, z);
            positions.push(x, y - 2, z); // the length of the drop

            velocities.push(Math.random() * 0.5 + 0.5); // how fast it falls
        }

        rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        // convert theme color to hexadecimal for THREE.js
        const themeColor = new THREE.Color(theme.primary);

        const rainMaterial = new THREE.LineBasicMaterial({
            color: themeColor,
            transparent: true,
            opacity: 0.6,
            linewidth: 1
        });

        // store material ref so theme useEffect can update color without rebuilding
        rainMaterialRef.current = rainMaterial;

        const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
        scene.add(rain);

        // to move the camera with the mouse
        let mouseX = 0;
        let targetRotationY = 0;
        let currentRotationY = 0;

        const onMouseMove = (event) => {
            mouseX = (event.clientX / innerWidth) * 2 - 1;
            targetRotationY = mouseX * 0.3;
        };
        document.addEventListener('mousemove', onMouseMove);

        // the loop that makes everything move
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            const positions = rain.geometry.attributes.position.array;

            // move each drop downward
            for (let i = 0; i < rainCount; i++) {
                const i6 = i * 6; // each drop has 6 numbers for its position
                const velocity = velocities[i];

                // move the drop down a little
                positions[i6 + 1] -= velocity * 0.5;
                positions[i6 + 4] -= velocity * 0.5;

                // if it hits the ground put it back at the top
                if (positions[i6 + 1] < 0) {
                    positions[i6 + 1] = 150;
                    positions[i6 + 4] = 150 - 2;
                    positions[i6] = (Math.random() - 0.5) * 400;
                    positions[i6 + 3] = positions[i6];
                    positions[i6 + 2] = (Math.random() - 0.5) * 400;
                    positions[i6 + 5] = positions[i6 + 2];
                }
            }

            rain.geometry.attributes.position.needsUpdate = true;

            // smoothly move the camera with the mouse
            currentRotationY += (targetRotationY - currentRotationY) * 0.05;
            camera.position.x = Math.sin(currentRotationY) * 100;
            camera.position.z = Math.cos(currentRotationY) * 100;
            camera.lookAt(0, 20, 0);

            renderer.render(scene, camera);
        };

        // when I resize the window adjust the camera
        const onWindowResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', onWindowResize);

        // start the animation
        animate();

        const mountNode = mountRef.current;

        // when the component unmounts clean up everything
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('resize', onWindowResize);

            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }

            if (mountNode && renderer.domElement) {
                mountNode.removeChild(renderer.domElement);
            }

            rainMaterialRef.current = null;
            renderer.dispose();
            rainGeometry.dispose();
            rainMaterial.dispose();
            floorGeometry.dispose();
            floorMaterial.dispose();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

export default RainEffect;
