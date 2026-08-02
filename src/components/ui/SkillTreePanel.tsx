import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { X, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSkillIcon, getSkillColor } from './skillIcons';

interface Props {
    onClose: () => void;
}

/**
 * 职业技能树组件
 * 实现技能展示、等级校验、点数分配及被动效果实时反馈
 */
export const SkillTreePanel: React.FC<Props> = ({ onClose }) => {
    // 获取全局状态：玩家属性、技能列表、剩余技能点以及升级动作
    const { player, skills, skillPoints, upgradeSkill } = useGameStore();

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

                        return (
                            <div
                                key={skill.id}
                                className={`p-3 rounded-xl border transition-all ${isUnlocked ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-900/30 border-slate-800 opacity-60 grayscale'
                                    }`}
                            >
                                <div className="flex gap-3">
                                    {/* 技能图标外框 */}
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-slate-900/60 border border-white/5 shrink-0`}>
                                        {getSkillIcon(skill.icon, getSkillColor(skill.icon))}
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

                                        {/* 主动技能：展示施放消耗与冷却配置 (含范围技能的半径) */}
                                        {skill.type === 'active' && (
                                            <div className="text-[10px] font-mono text-blue-300/70 -mt-1.5 mb-3">
                                                消耗 {skill.manaCost ?? 0} 法力 · 冷却 {skill.cooldown ?? 0} 秒
                                                {skill.effect?.kind === 'damage' && skill.effect.radius ? ` · 范围 ${skill.effect.radius} 米` : ''}
                                            </div>
                                        )}

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
