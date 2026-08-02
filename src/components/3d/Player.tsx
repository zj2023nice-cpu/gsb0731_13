import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useGameStore } from '../../store/gameStore';
import { usePlayerControls } from '../../hooks/usePlayerControls';

/**
 * 玩家控制角色组件 (Player Entity)
 * 处理角色的 3D 模型渲染、摄像机平滑跟随逻辑
 */
export const Player: React.FC = () => {
    const meshRef = useRef<THREE.Group>(null);
    // 从全局 Store 中获取玩家坐标位置
    const position = useGameStore(state => state.player.position);

    // 启用玩家输入控制钩子 (处理 WASD 移动与输入反馈)
    usePlayerControls(meshRef);

    // 每帧渲染逻辑：实现摄像机跟随
    useFrame((state) => {
        if (meshRef.current) {
            // 计算摄像机相对于角色的偏移量 [水平, 高度, 距离]
            const cameraOffset = new Vector3(0, 10, 15);
            // 计算目标跟随点位置
            const targetPos = meshRef.current.position.clone().add(cameraOffset);
            // 使用线性插值 (lerp) 实现摄像机平滑移动，避免抖动 (0.1 为插值因子)
            state.camera.position.lerp(targetPos, 0.1);
            // 摄像机方向始终聚焦于玩家角色
            state.camera.lookAt(meshRef.current.position);
        }
    });

    return (
        <group ref={meshRef} position={new Vector3(...position)}>
            {/* 角色身体：使用胶囊体几何表示，符合人形体态 */}
            <mesh position={[0, 1, 0]} castShadow>
                <capsuleGeometry args={[0.5, 1, 4, 8]} />
                <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.2} />
            </mesh>

            {/* 角色头部/头盔：使用立方体几何表示 */}
            <mesh position={[0, 1.8, 0]}>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.5} />
            </mesh>

            {/* 角色装饰占位 (后续可添加血条或称号) */}
            <mesh position={[0, 2.5, 0]}>
                {/* Name tag placeholder */}
            </mesh>
        </group>
    );
};

