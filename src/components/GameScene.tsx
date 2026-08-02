import React from 'react';
import { Canvas } from '@react-three/fiber';
import { World } from './3d/World';
import { Player } from './3d/Player';
import { Monster } from './3d/Monster';
import { NPC } from './3d/NPC';

/**
 * 游戏主场景组件 (R3F)
 * 负责渲染 3D 世界、玩家、NPC 以及怪物
 */
export const GameScene: React.FC = () => {
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

            {/* 场景怪物生成区域 (Mob Spawning) */}
            {/* 根据坐标、等级和数值手动配置各区域怪物 */}
            <Monster id="m1" position={[5, 0, 5]} name="史莱姆" level={1} hp={30} maxHp={30} />
            <Monster id="m2" position={[-5, 0, 8]} name="哥布林" level={2} hp={50} maxHp={50} />
            <Monster id="m3" position={[8, 0, -5]} name="野狼" level={3} hp={80} maxHp={80} />
            <Monster id="m4" position={[10, 0, 0]} name="史莱姆" level={1} hp={30} maxHp={30} />
            <Monster id="m5" position={[-8, 0, -8]} name="精英哥布林" level={5} hp={150} maxHp={150} />

        </Canvas>
    );
};

