import React from 'react';
import { useGameStore, SKILL_COMBAT } from '../../store/gameStore';
import { X, Zap, Target, Shield, Wind, Flame, Heart, MousePointerClick, Droplet, Timer } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    onClose: () => void;
}

/**
 * 职业技能树组件
 * 实现技能展示、等级校验、点数分配及被动效果实时反馈
 * 支持把已学会的主动技能绑定到底部动作栏槽位
 */
export const SkillTreePanel: React.FC<Props> = ({ onClose }) => {
    // 获取全局状态：玩家属性、技能列表、剩余技能点、升级动作以及动作栏绑定相关状态
    const {
        player, skills, skillPoints, upgradeSkill,
        bindingSlotIndex, actionBar, bindSkillToSlot, setBindingSlot,
    } = useGameStore();

    const isBindingMode = bindingSlotIndex !== null;

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

    /**
     * 计算某个技能当前被绑定到了哪些动作栏槽位（0/1/2）
     */
    const getBoundSlots = (skillId: string) =>
        actionBar.map((id, idx) => (id === skillId ? idx : -1)).filter(idx => idx >= 0);

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

                {/* 绑定模式提示条：提示玩家选择一个主动技能放入指定槽位 */}
                {isBindingMode && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-purple-500/15 border border-purple-400/40"
                    >
                        <div className="flex items-center gap-2 text-[11px] text-purple-100">
                            <MousePointerClick size={14} className="text-purple-300" />
                            <span>
                                正在为第 <span className="font-black text-purple-300">{bindingSlotIndex! + 1}</span> 格选择主动技能，点击下方已学会的主动技能完成绑定
                            </span>
                        </div>
                        <button
                            onClick={() => setBindingSlot(null)}
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                        >
                            取消
                        </button>
                    </motion.div>
                )}

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
                        // 仅已学会的主动技能可在绑定模式下被点击绑定
                        const canBind = isBindingMode && isUnlocked && skill.type === 'active' && skill.level > 0;
                        const boundSlots = getBoundSlots(skill.id);
                        const isBound = boundSlots.length > 0;
                        // 主动技能展示耗蓝与冷却数值
                        const combatCfg = skill.type === 'active' ? SKILL_COMBAT[skill.id] : null;

                        return (
                            <div
                                key={skill.id}
                                onClick={() => {
                                    if (canBind) {
                                        bindSkillToSlot(bindingSlotIndex!, skill.id);
                                    }
                                }}
                                className={`p-3 rounded-xl border transition-all ${
                                    !isUnlocked
                                        ? 'bg-slate-900/30 border-slate-800 opacity-60 grayscale'
                                        : canBind
                                        ? 'bg-purple-500/10 border-purple-400/60 cursor-pointer hover:bg-purple-500/20 ring-1 ring-purple-400/40'
                                        : isBindingMode
                                        ? 'bg-slate-800/30 border-slate-700/40'
                                        : 'bg-slate-800/40 border-slate-700/50'
                                }`}
                            >
                                <div className="flex gap-3">
                                    {/* 技能图标外框 */}
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-slate-900/60 border shrink-0 ${
                                        canBind ? 'border-purple-400/50' : 'border-white/5'
                                    }`}>
                                        {getIcon(skill.icon, getColor(skill.icon))}
                                    </div>

                                    {/* 技能详细信息 */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                                {skill.name}
                                                {/* 已绑定槽位徽标：显示该技能当前装备在哪些快捷栏格子 */}
                                                {isBound && (
                                                    <span className="flex items-center gap-1">
                                                        {boundSlots.map(idx => (
                                                            <span
                                                                key={idx}
                                                                className="text-[8px] font-bold bg-purple-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center"
                                                                title={`已绑定到第 ${idx + 1} 格`}
                                                            >
                                                                {idx + 1}
                                                            </span>
                                                        ))}
                                                    </span>
                                                )}
                                                {/* 技能类型标签 */}
                                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                    skill.type === 'active'
                                                        ? 'bg-red-500/20 text-red-300'
                                                        : 'bg-blue-500/20 text-blue-300'
                                                }`}>
                                                    {skill.type === 'active' ? '主动' : '被动'}
                                                </span>
                                            </h3>
                                            <span className="text-[10px] font-mono text-dim">等级 {skill.level}/{skill.maxLevel}</span>
                                        </div>
                                        <p className="text-[11px] text-dim leading-snug mb-2">
                                            {skill.description}
                                            {/* 未达到等级需求时显示红色警告提示 */}
                                            {!isUnlocked && <span className="text-red-400 block mt-1">(需求等级: {skill.requirement})</span>}
                                            {/* 绑定模式下，主动且已学会的技能给出可绑定提示 */}
                                            {canBind && <span className="text-purple-300 block mt-1">（点击绑定到第 {bindingSlotIndex! + 1} 格）</span>}
                                        </p>

                                        {/* 主动技能的耗蓝与冷却数值展示 */}
                                        {combatCfg && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">
                                                    <Droplet size={9} /> {combatCfg.manaCost} 法力
                                                </span>
                                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-300 border border-slate-500/20">
                                                    <Timer size={9} /> {(combatCfg.cooldown / 1000).toFixed(1)} 秒
                                                </span>
                                            </div>
                                        )}

                                        {/* 交互：升级按钮。仅在已解锁、点数足够且未满级时可用 */}
                                        {isUnlocked && (
                                            <button
                                                className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${skill.level === skill.maxLevel || skillPoints <= 0
                                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/20'
                                                    }`}
                                                onClick={(e) => {
                                                    // 阻止冒泡，避免在绑定模式下点升级误触发绑定
                                                    e.stopPropagation();
                                                    upgradeSkill(skill.id);
                                                }}
                                                disabled={skill.level === skill.maxLevel || skillPoints <= 0}
                                            >
                                                {skill.level === skill.maxLevel ? '已满级' : skillPoints > 0 ? '升级' : '点数不足'}
                                            </button>
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
