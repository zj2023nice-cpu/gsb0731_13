import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MessageCircle, ShoppingBag, Heart, X } from 'lucide-react';

interface NPCProps {
    id: string;
    name: string;
    position: [number, number, number];
    dialog: string[];
    role: 'quest' | 'shop' | 'healer';
}

const ROLE_NAMES: Record<string, string> = {
    quest: '任务',
    shop: '商店',
    healer: '治愈者'
};

const ROLE_ICONS: Record<string, any> = {
    quest: MessageCircle,
    shop: ShoppingBag,
    healer: Heart
};

/**
 * NPC 实体组件 (3D + 2D 混合交互)
 * 处理 3D 模型渲染、世界空间 UI 标签、以及近距离交互对话逻辑
 */
export const NPC: React.FC<NPCProps> = ({ id, name, position, dialog, role }) => {
    // 自身对话框显示状态
    const [isOpen, setIsOpen] = useState(false);

    // 获取全局 UI 显隐状态，用于处理遮挡与层级优先级逻辑
    const { addLog, ui, setShopOpen } = useGameStore();

    /**
     * 智能显隐逻辑：
     * 当全局面板（背包、技能树、商店）打开或自身对话框已打开时，隐藏 3D 悬浮名称标签。
     * 这样可以保持场景整洁，并防止 HTML 元素在 3D 空间中产生视觉冲突。
     */
    const showFloatingUI = !ui.isInventoryOpen && !ui.isSkillsOpen && !ui.isShopOpen && !isOpen;

    // 获取当前职业对应的视觉图标
    const RoleIcon = ROLE_ICONS[role] || MessageCircle;

    /**
     * 交互点击处理函数
     * 限制：如果正在操作全局 UI 面板，则禁止与世界中的 NPC 互动
     */
    const handleClick = (e: any) => {
        if (ui.isInventoryOpen || ui.isSkillsOpen || ui.isShopOpen) return;

        e.stopPropagation(); // 阻止事件污染（点击 NPC 时不应触发玩家移动）
        setIsOpen(!isOpen);

        if (!isOpen) {
            addLog(`正在与 ${name} 交谈...`);
        }
    };

    return (
        <group position={position} onClick={handleClick}>
            {/* NPC 3D 角色模型：绿色胶囊体表示友好/中立单位 */}
            <mesh position={[0, 1, 0]}>
                <capsuleGeometry args={[0.6, 1.2, 4]} />
                <meshStandardMaterial color="#10b981" roughness={0.5} />
            </mesh>

            {/* NPC 悬浮标签 (Billboard)：显示职业 Title 和 名字 */}
            <AnimatePresence>
                {showFloatingUI && (
                    <Html position={[0, 2.5, 0]} center>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="flex flex-col items-center pointer-events-none"
                        >
                            {/* 职业徽章 */}
                            <div className="bg-emerald-500/80 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter border border-white/20 mb-1">
                                {ROLE_NAMES[role] || role}
                            </div>
                            {/* NPC 姓名 */}
                            <span className="text-white font-bold text-xs drop-shadow-md">{name}</span>
                        </motion.div>
                    </Html>
                )}
            </AnimatePresence>

            {/* 对话弹窗 (Interaction Modal)：使用 Html 组件将其锚定在 3D 实体正上方 */}
            <Html position={[0, 1.2, 0]} center>
                <AnimatePresence>
                    {/* 仅在未开启全局 UI 且局部对话开启时渲染 */}
                    {isOpen && !ui.isInventoryOpen && !ui.isSkillsOpen && !ui.isShopOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 w-72 glass-panel p-5 text-white z-50 pointer-events-auto border-emerald-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                            style={{
                                background: 'rgba(15, 23, 42, 0.95)',
                                backdropFilter: 'blur(16px)'
                            }}
                        >
                            {/* 弹窗头部：NPC 身份名片 */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
                                        <RoleIcon size={16} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-white">{name}</h3>
                                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{ROLE_NAMES[role]}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                    className="p-1.5 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* 对话正文：使用斜体增强代入感 */}
                            <div className="relative mb-6">
                                <div className="absolute -left-2 top-0 w-0.5 h-full bg-emerald-500/30 rounded-full"></div>
                                <p className="text-[13px] text-slate-300 leading-relaxed pl-3 italic">
                                    "{dialog[0]}"
                                </p>
                            </div>

                            {/* 对话操作组 */}
                            <div className="flex gap-2.5">
                                <button
                                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-[11px] font-bold uppercase transition-all shadow-lg shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsOpen(false);
                                        // 如果是商店 NPC，点击后关闭对话框并拉起全局 UI 商店面板
                                        if (role === 'shop') {
                                            setShopOpen(true);
                                            addLog(`打开了 ${name} 的商店`);
                                        } else {
                                            addLog(`${name}: 很难得见到有勇气的年轻人！`);
                                        }
                                    }}
                                >
                                    <RoleIcon size={14} />
                                    {role === 'shop' ? '开始交易' : '接受任务'}
                                </button>

                                <button
                                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-bold uppercase transition-all border border-white/5 active:scale-95"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsOpen(false);
                                    }}
                                >
                                    暂时离开
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Html>
        </group>
    );
};
