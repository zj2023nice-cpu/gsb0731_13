import React from 'react';
import { Plane, useTexture } from '@react-three/drei';

/**
 * 3D 环境场景组件 (World)
 * 负责渲染基础地形、光照系统控制以及环境装饰物
 */
export const World: React.FC = () => {
    return (
        <group>
            {/* 基础环境光：提供均匀的全局照明 */}
            <ambientLight intensity={0.5} />

            {/* 主向光：模拟太阳光，生成阴影 */}
            <directionalLight
                position={[10, 20, 10]}
                intensity={1}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />

            {/* 地面：大型平面网格 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>

            {/* 网格辅助器：提供空间尺寸参考感 */}
            <gridHelper args={[100, 50, 0x475569, 0x1e293b]} position={[0, 0.01, 0]} />

            {/* 环境装饰物 (Placeholder Assets) */}
            {/* 石块/方块 */}
            <mesh position={[5, 1, 5]} castShadow>
                <boxGeometry args={[2, 2, 2]} />
                <meshStandardMaterial color="#64748b" />
            </mesh>

            {/* 支柱/圆柱体 */}
            <mesh position={[-8, 1.5, -5]} castShadow>
                <cylinderGeometry args={[1, 1, 3]} />
                <meshStandardMaterial color="#475569" />
            </mesh>
        </group>
    );
};

