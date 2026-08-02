import { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

export const usePlayerControls = (ref: React.RefObject<THREE.Group>) => {
    const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
    const updatePosition = useGameStore((state) => state.updatePosition);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: true }));
        const handleKeyUp = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: false }));

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useFrame((_, delta) => {
        if (!ref.current) return;

        const speed = 5 * delta;
        const direction = new THREE.Vector3();

        if (keys['KeyW'] || keys['ArrowUp']) direction.z -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) direction.z += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) direction.x -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) direction.x += 1;

        if (direction.length() > 0) {
            direction.normalize().multiplyScalar(speed);
            ref.current.position.add(direction);

            // Sync to store
            const { x, y, z } = ref.current.position;
            updatePosition([x, y, z]);
        }
    });

    return keys;
};
