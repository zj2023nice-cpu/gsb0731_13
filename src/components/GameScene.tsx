import React from 'react';
import { Canvas } from '@react-three/fiber';
import { World } from './3d/World';
import { Player } from './3d/Player';
import { Monster } from './3d/Monster';
import { NPC } from './3d/NPC';
import { useGameStore } from '../store/gameStore';

/**
 * 游戏主场景组件 (R3F)
 * 负责渲染 3D 世界、玩家、NPC 以及怪物
 */
export const GameScene: React.FC = () => {
    // 怪物列表由全局 Store 统一托管，场景层只负责遍历渲染
    const monsters = useGameStore(state => state.monsters);

    return (
        <Canvas shadows camera={{ position: [0, 10, 15], fov: 50 }}>
            {/* 场景环境配置：深蓝色迷雾，营造神秘氛围 */}
            <fog attach="fog" args={['#0f172a', 10, 50]} />

            {/* 渲染地形与静态世界物体 */}
            <World />

            {/* 玩家控制器对象 */}
            <Player />

            {/* NPC 列表：包含向导与商人 */}
            {/* 村长 NPC：提供任务引导对话 */}
            <NPC
                id="npc-guide"
                name="村长"
                position={[2, 0, 2]}
                role="quest"
                dialog={[
                    "欢迎来到这个世界，年轻的勇士。",
                    "森林里有很多怪物，请务必小心。",
                    "如果你准备好了，去击败5只史莱姆吧！"
                ]}
            />

            {/* 神秘商人 NPC：提供商店功能接口 */}
            <NPC
                id="npc-shop"
                name="神秘商人"
                position={[-3, 0, 2]}
                role="shop"
                dialog={[
                    "嘿嘿，想要点好东西吗？",
                    "只要你有金币，我这里应有尽有。"
                ]}
            />

            {/* 场景怪物：从全局 Store 读取，Monster 自行订阅各自的血量与存活状态 */}
            {monsters.map(m => (
                <Monster key={m.id} id={m.id} />
            ))}

        </Canvas>
    );
};

