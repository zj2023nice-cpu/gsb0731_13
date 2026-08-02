import React from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import { Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

interface MonsterProps {
    id: string;
}

/**
 * 怪物实体组件 (Monster Entity)
 * 纯渲染层：从全局 Store 读取怪物状态，点击时派发 attackMonster action。
 * 所有战斗数值结算均在 Store 中完成，保持 UI/3D 解耦。
 */
export const Monster: React.FC<MonsterProps> = ({ id }) => {
    const monster = useGameStore(state => state.monsters.find(m => m.id === id));
    const attackMonster = useGameStore(state => state.attackMonster);
    const ui = useGameStore(state => state.ui);

    // 显隐逻辑：当 UI 面板（背包、技能树、商店）打开时隐藏 3D 悬浮 UI，防止视觉重合
    const showFloatingUI = !ui.isInventoryOpen && !ui.isSkillsOpen && !ui.isShopOpen;

    // 怪物尚未初始化或已死亡（等待重生）时不渲染
    if (!monster || !monster.alive) return null;

    const { position, name, level, hp, maxHp } = monster;

    /**
     * 点击交互处理：将攻击意图派发至 Store 统一结算
     * 只有在 UI 闭合状态下才允许点击世界中的怪物进行战斗
     */
    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        if (!showFloatingUI) return;
        e.stopPropagation();
        attackMonster(id);
    };

    return (
        <group position={position} onClick={handleClick}>
            {/* 怪物主体模型：红色立方体表示敌方危险单位 */}
            <mesh position={[0, 0.75, 0]} castShadow>
                <boxGeometry args={[1, 1.5, 1]} />
                <meshStandardMaterial color="#ef4444" roughness={0.4} />
            </mesh>

            {/* 世界空间悬浮血条 (Billboard): 使用 Framer Motion 实现丝滑的出场与进度缩放 */}
            <AnimatePresence>
                {showFloatingUI && (
                    <Html position={[0, 2, 0]} center>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center pointer-events-none whitespace-nowrap"
                        >
                            {/* 怪物名称与等级标签 */}
                            <span className="text-white text-[10px] font-bold drop-shadow-lg scale-110 mb-1">
                                <span className="text-red-500 mr-1">LV.{level}</span> {name}
                            </span>

                            {/* 血条外框背景 */}
                            <div className="w-16 h-1.5 bg-black/40 rounded-full border border-white/10 overflow-hidden">
                                {/* 血条进度填充：平滑补间动画方案 */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(hp / maxHp) * 100}%` }}
                                    className="h-full"
                                    style={{
                                        background: 'linear-gradient(90deg, #dc2626, #f87171)',
                                        borderRadius: 'inherit'
                                    }}
                                />
                            </div>
                        </motion.div>
                    </Html>
                )}
            </AnimatePresence>
        </group>
    );
};
