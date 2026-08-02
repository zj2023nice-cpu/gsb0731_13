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
 * 仅负责 3D 渲染与点击事件转发；怪物血量、存活状态、伤害结算全部由全局 Store 托管，
 * 保持 UI / 3D 渲染层与战斗状态逻辑解耦。
 */
export const Monster = React.memo(function Monster({ id }: MonsterProps) {
    // 订阅该怪物自身的数据切片：只有当这只怪物数据变化时才重渲染
    const monster = useGameStore(s => s.monsters.find(m => m.id === id));
    const attackMonster = useGameStore(s => s.attackMonster);
    const ui = useGameStore(s => s.ui);

    // 显隐逻辑：当 UI 面板（背包、技能树、商店）打开时隐藏 3D 悬浮 UI，防止视觉重合
    const showFloatingUI = !ui.isInventoryOpen && !ui.isSkillsOpen && !ui.isShopOpen;

    // 怪物不存在或已死亡（等待刷新）时不渲染模型
    if (!monster || !monster.alive) return null;

    const { position, name, level, hp, maxHp } = monster;

    /**
     * 点击交互处理：将攻击结算委托给全局 Store
     * 由 Store 根据当前选中的主动技能决定技能伤害或普通攻击
     */
    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        if (!showFloatingUI) return; // UI 面板打开时锁定世界交互
        e.stopPropagation(); // 阻止点击穿透到地表触发玩家移动
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
                                        background: 'linear-gradient(90deg, #dc2626, #f87171)', // 典型的血红色渐变
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
});
