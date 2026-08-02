import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { X, Zap, Target, Shield, Wind, Flame, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    onClose: () => void;
}

/**
 * 职业技能树组件
 * 实现技能展示、等级校验、点数分配及被动效果实时反馈
 */
export const SkillTreePanel: React.FC<Props> = ({ onClose }) => {
    // 获取全局状态：玩家属性、技能列表、剩余技能点、动作栏以及相关动作
    const { player, skills, skillPoints, actionBar, upgradeSkill, equipSkillToSlot } = useGameStore();

    /**
     * 图标渲染辅助函数
     * 根据 Store 中的图标名称映射 Lucide 图标组件
     */
    const getIcon = (iconName: string, color: string) => {
        switch (iconName) {
            case 'Target': return <Target className={color} size={16} />;
            case 'Shield': return <Shield className={color} size={16} />;
            case 'Wind': return <Wind className={color} size={16} />;
            case 'Flame': return <Flame className={color} size={16} />;
            case 'Heart': return <Heart className={color} size={16} />;
            default: return <Zap className={color} size={16} />;
        }
    };

    /**
     * 颜色映射辅助函数
     * 为不同类型的技能提供视觉区分
     */
    const getColor = (iconName: string) => {
        switch (iconName) {
            case 'Target': return 'text-red-400';
            case 'Shield': return 'text-blue-400';
            case 'Wind': return 'text-green-400';
            case 'Flame': return 'text-orange-400';
            case 'Heart': return 'text-pink-400';
            default: return 'text-purple-400';
        }
    };

    return (
        <div className="modal-overlay">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel w-full max-w-[480px] max-h-[90vh] flex flex-col p-6 relative overflow-hidden"
            >
                {/* 头部区域：标题与关闭按钮 */}
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
                        <Zap className="text-purple-400" fill="currentColor" size={20} /> 职业技能树
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* 资源统计：显示当前可用的技能分配点数 */}
                <div className="glass-panel bg-purple-500/10 p-4 mb-6 flex justify-between items-center border-purple-500/20 relative z-10">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-dim uppercase tracking-widest">可用技能点</span>
                        <span className="text-lg font-bold text-blue-400">{skillPoints}</span>
                    </div>
                </div>

                {/* 技能列表区 */}
                <div className="flex-1 overflow-y-auto pr-1 relative z-10 space-y-3">
                    {skills.map((skill) => {
                        // 实时计算该技能是否满足玩家当前的等级解锁条件
                        const isUnlocked = !skill.requirement || player.stats.level >= skill.requirement;
                        // 已学习的主动技能才可绑定到动作栏
                        const canEquip = skill.type === 'active' && skill.level > 0;
                        // 该技能当前占用的动作栏槽位（未绑定则为 -1）
                        const equippedSlot = actionBar.findIndex(id => id === skill.id);

                        return (
                            <div
                                key={skill.id}
                                className={`p-3 rounded-xl border transition-all ${isUnlocked ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-900/30 border-slate-800 opacity-60 grayscale'
                                    }`}
                            >
                                <div className="flex gap-3">
                                    {/* 技能图标外框 */}
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-slate-900/60 border border-white/5 shrink-0`}>
                                        {getIcon(skill.icon, getColor(skill.icon))}
                                    </div>

                                    {/* 技能详细信息 */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-sm font-bold text-slate-100">{skill.name}</h3>
                                            <span className="text-[10px] font-mono text-dim">等级 {skill.level}/{skill.maxLevel}</span>
                                        </div>
                                        <p className="text-[11px] text-dim leading-snug mb-3">
                                            {skill.description}
                                            {/* 未达到等级需求时显示红色警告提示 */}
                                            {!isUnlocked && <span className="text-red-400 block mt-1">(需求等级: {skill.requirement})</span>}
                                        </p>

                                        {/* 交互：升级按钮。仅在已解锁、点数足够且未满级时可用 */}
                                        {isUnlocked && (
                                            <button
                                                className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${skill.level === skill.maxLevel || skillPoints <= 0
                                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/20'
                                                    }`}
                                                onClick={() => upgradeSkill(skill.id)}
                                                disabled={skill.level === skill.maxLevel || skillPoints <= 0}
                                            >
                                                {skill.level === skill.maxLevel ? '已满级' : skillPoints > 0 ? '升级' : '点数不足'}
                                            </button>
                                        )}

                                        {/* 交互：绑定到动作栏。仅已学习的主动技能可用 */}
                                        {canEquip && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-dim uppercase tracking-widest shrink-0">动作栏</span>
                                                <div className="flex gap-1.5">
                                                    {actionBar.map((_, slotIndex) => (
                                                        <button
                                                            key={slotIndex}
                                                            onClick={() => equipSkillToSlot(skill.id, slotIndex)}
                                                            title={`绑定到第 ${slotIndex + 1} 号快捷位`}
                                                            className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${
                                                                equippedSlot === slotIndex
                                                                    ? 'bg-amber-500 text-white shadow shadow-amber-900/30'
                                                                    : 'bg-slate-900/60 text-slate-400 border border-white/10 hover:border-amber-400/60'
                                                            }`}
                                                        >
                                                            {slotIndex + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
};
