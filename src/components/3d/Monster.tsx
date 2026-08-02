import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

interface MonsterProps {
    id: string;
    position: [number, number, number];
    name: string;
    level: number;
    hp: number;
    maxHp: number;
}

/**
 * 怪物实体组件 (Monster Entity)
 * 处理怪物的 3D 渲染、简单的点击战斗逻辑及世界空间血条展示
 */
export const Monster: React.FC<MonsterProps> = ({ id, position, name, level, hp: initialHp, maxHp }) => {
    // 怪物当前生命值状态 (局部状态，实际项目中应同步至 Store 以便全场景同步)
    const [hp, setHp] = useState(initialHp);
    const { addLog, addGold, ui } = useGameStore();

    // 显隐逻辑：当 UI 面板（背包、技能树、商店）打开时隐藏 3D 悬浮 UI，防止视觉重合
    const showFloatingUI = !ui.isInventoryOpen && !ui.isSkillsOpen && !ui.isShopOpen;

    /**
     * 点击交互处理：模拟基础攻击逻辑
     * 只有在 UI 闭合状态下才允许点击世界中的怪物进行战斗
     */
    const handleClick = (e: any) => {
        if (!showFloatingUI) return; // UI 面板打开时锁定世界交互
        e.stopPropagation(); // 阻止点击穿透到地表触发玩家移动

        // --- 模拟战斗计算 ---
        // 随机产生 5-10 点的基础伤害
        const damage = Math.floor(Math.random() * 5) + 5;
        const newHp = Math.max(0, hp - damage);

        setHp(newHp);
        addLog(`你攻击了 ${name}, 造成 ${damage} 点伤害!`);

        // --- 死亡与重生处理逻辑 ---
        if (newHp === 0) {
            addLog(`${name} 被击败了! 获得 10 金币.`);
            addGold(10); // 结算战利品

            // 怪物重生计时器：5秒后恢复全血并重新渲染
            setTimeout(() => {
                setHp(maxHp);
                addLog(`系统：${name} 已在其领地重新刷新。`);
            }, 5000);
        }
    };

    // 如果怪物血量为0（已死亡且未刷新阶段），不渲染模型核心
    if (hp <= 0) return null;

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
};
