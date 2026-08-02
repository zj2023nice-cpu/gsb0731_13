import React, { useEffect } from 'react';
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
 * 仅负责怪物的 3D 渲染与点击触发；血量等运行时状态统一由全局 Store 管理
 * 组件挂载时把静态配置登记到 Store，之后从 Store 读取实时血量
 */
export const Monster: React.FC<MonsterProps> = ({ id, position, name, level, hp: initialHp, maxHp }) => {
    const { ui, monsters, registerMonster, attackMonster } = useGameStore();

    // 挂载时登记怪物运行时状态到全局 Store（已存在则保留当前血量）
    useEffect(() => {
        registerMonster({ id, name, level, hp: initialHp, maxHp });
    }, [id, name, level, initialHp, maxHp, registerMonster]);

    // 从全局状态读取实时血量；登记完成前回退到初始配置值
    const hp = monsters[id]?.hp ?? initialHp;

    // 显隐逻辑：当 UI 面板（背包、技能树、商店）打开时隐藏 3D 悬浮 UI，防止视觉重合
    const showFloatingUI = !ui.isInventoryOpen && !ui.isSkillsOpen && !ui.isShopOpen;

    /**
     * 点击交互处理：将攻击结算交给全局 Store
     * 组件本身不再承载伤害计算与血量记录，保持 UI/3D 与状态解耦
     */
    const handleClick = (e: any) => {
        if (!showFloatingUI) return; // UI 面板打开时锁定世界交互
        e.stopPropagation(); // 阻止点击穿透到地表触发玩家移动

        attackMonster(id);
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
