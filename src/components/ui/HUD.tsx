import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Shield, Sword, Coins, Backpack, BookOpen, MessageSquare, ChevronDown, ChevronUp, PlusCircle, Gamepad2, Target, Wind, Flame, Heart, Zap } from 'lucide-react';
import { InventoryPanel } from './InventoryPanel';
import { SkillTreePanel } from './SkillTreePanel';
import { ShopPanel } from './ShopPanel';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 技能图标映射：将 Store 中的图标名解析为 Lucide 组件
 * 与技能树面板保持一致的图标语义
 */
const renderSkillIcon = (iconName: string, size = 18) => {
    switch (iconName) {
        case 'Target': return <Target size={size} />;
        case 'Shield': return <Shield size={size} />;
        case 'Wind': return <Wind size={size} />;
        case 'Flame': return <Flame size={size} />;
        case 'Heart': return <Heart size={size} />;
        default: return <Zap size={size} />;
    }
};

/**
 * HUD (Heads-Up Display) 主组件
 * 它是整个游戏 UI 的总容器，管理各级面板的显隐层级以及 2D 状态反馈
 */
export const HUD: React.FC = () => {
    // 从 Store 中获取数据与控制函数
    const {
        player, logs, addItem, ui, skills, actionBar, selectedSkillId, cooldowns, selectSkill,
        setInventoryOpen, setSkillsOpen, setShopOpen
    } = useGameStore();

    // 控制下方战斗日志面板的折叠状态
    const [isLogExpanded, setIsLogExpanded] = useState(true);

    // 本地时钟：每 100ms 触发一次重渲染，用于动作栏冷却倒计时的实时刷新
    // （冷却终点时间戳存于全局状态，这里只负责驱动 UI 计时显示，不承载业务状态）
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(timer);
    }, []);

    /**
     * 开发者调试函数：增加一个高级装备
     */
    const debugAddItem = () => {
        addItem({
            id: `item-${Date.now()}`,
            name: '龙鳞甲',
            type: 'armor',
            description: '带有微弱火元素的龙鳞护甲，坚不可摧',
            price: 500,
            stats: { armor: 25 }
        });
    };

    /**
     * 层级控制：计算是否有任何全屏模态框打开
     * 用于在面板开启时隐藏背景元素（如人物状态信息），减少视觉干扰
     */
    const isModalOpen = ui.isInventoryOpen || ui.isSkillsOpen || ui.isShopOpen;

    return (
        <div className="hud-layout">
            {/* 左上脚区域：玩家核心状态看板 (HP/MP/Stats) */}
            <AnimatePresence>
                {!isModalOpen && (
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="hud-interactive absolute top-6 left-6 w-[280px]"
                    >
                        <div className="glass-panel p-4 relative overflow-hidden group">
                            {/* 边纹修饰 */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>

                            {/* 角色身份与实时资产显示 */}
                            <div className="flex justify-between items-end mb-3">
                                <div>
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5 block">等级 {player.stats.level}</span>
                                    <h2 className="text-lg font-bold tracking-tight">{player.name}</h2>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-dim font-bold uppercase tracking-tighter">持金量</span>
                                    <span className="text-sm font-bold text-gold flex items-center gap-1">
                                        <Coins size={12} /> {player.gold || 0}
                                    </span>
                                </div>
                            </div>

                            {/* 生命值 (HP) 动态条 */}
                            <div className="space-y-1.5 mb-2">
                                <div className="flex justify-between text-[9px] uppercase font-bold tracking-wider">
                                    <span className="text-red-400 font-black">HP</span>
                                    <span>{player.stats.hp} / {player.stats.maxHp}</span>
                                </div>
                                <div className="status-bar-bg h-1.5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(player.stats.hp / player.stats.maxHp) * 100}%` }}
                                        className="hp-bar-fill h-full rounded-full"
                                    />
                                </div>
                            </div>

                            {/* 法力值 (Mana) 动态条 */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[9px] uppercase font-bold tracking-wider">
                                    <span className="text-blue-400 font-black">MP</span>
                                    <span>{player.stats.mana} / {player.stats.maxMana}</span>
                                </div>
                                <div className="status-bar-bg h-1.5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(player.stats.mana / player.stats.maxMana) * 100}%` }}
                                        className="mana-bar-fill h-full rounded-full"
                                    />
                                </div>
                            </div>

                            {/* 攻击力与防御力实时看板 */}
                            <div className="flex gap-4 mt-3 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-dim">
                                    <Shield size={12} className="text-blue-400" />
                                    <span>防御面板 {player.stats.armor}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-dim">
                                    <Sword size={12} className="text-red-400" />
                                    <span>基础攻击 {player.stats.attack}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 左下脚区域：折叠式实时战斗与系统日志 */}
            <div className="hud-interactive absolute bottom-6 left-6 flex flex-col items-start">
                <AnimatePresence>
                    {isLogExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 160, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="glass-panel w-72 mb-2 overflow-hidden flex flex-col bg-slate-900/60"
                        >
                            <div className="px-3 py-1.5 border-b border-white/5 flex justify-between items-center bg-black/20">
                                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-dim">战斗实时数据</span>
                                <MessageSquare size={10} className="text-dim" />
                            </div>
                            {/* 日志内容滚动区 */}
                            <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] space-y-1 scrollbar-hide">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-slate-300 pl-2 border-l border-blue-500/20 leading-relaxed">
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* 日志展开/收起切换开关 */}
                <button
                    onClick={() => setIsLogExpanded(!isLogExpanded)}
                    className="glass-panel px-3 py-1.5 flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                    {isLogExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    <span className="text-[9px] font-bold uppercase tracking-wider">{isLogExpanded ? '隐藏日志' : '显现日志记录'}</span>
                </button>
            </div>

            {/* 中间下方区域：主功能交互菜单 (Dock) */}
            <div className="hud-interactive absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center p-1.5 glass-panel bg-slate-900/80 rounded-full border-white/10 shadow-2xl">
                <div className="flex items-center gap-1">
                    {/* 背包按钮：开启时自动关闭其他面板 */}
                    <button
                        onClick={() => { setInventoryOpen(!ui.isInventoryOpen); setSkillsOpen(false); setShopOpen(false); }}
                        className={`w-10 h-10 rounded-full transition-all flex items-center justify-center relative group ${ui.isInventoryOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-white/10 text-dim hover:text-white'}`}
                        title="开启背包 (I)"
                    >
                        <Backpack size={20} />
                    </button>

                    {/* 技能树按钮 */}
                    <button
                        onClick={() => { setSkillsOpen(!ui.isSkillsOpen); setInventoryOpen(false); setShopOpen(false); }}
                        className={`w-10 h-10 rounded-full transition-all flex items-center justify-center relative group ${ui.isSkillsOpen ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'hover:bg-white/10 text-dim hover:text-white'}`}
                        title="开启技能树 (K)"
                    >
                        <BookOpen size={20} />
                    </button>

                    <div className="w-px h-6 bg-white/10 mx-1"></div>

                    {/* 动作栏：展示已绑定的快捷技能。点击选中该技能，再点怪物即按技能结算 */}
                    {actionBar.map((skillId, index) => {
                        const skill = skillId ? skills.find(s => s.id === skillId) : undefined;
                        const isSelected = skill ? selectedSkillId === skill.id : false;

                        // 冷却与法力状态：冷却终点时间戳存于全局，这里结合本地时钟换算实时剩余
                        const readyAt = skill ? (cooldowns[skill.id] ?? 0) : 0;
                        const cdRemain = Math.max(0, readyAt - now);
                        const onCooldown = cdRemain > 0;
                        const manaCost = skill?.combat?.manaCost ?? 0;
                        const lackMana = skill ? player.stats.mana < manaCost : false;
                        // 冷却中或蓝不足则禁用：既点不了也无法选中
                        const disabled = !skill || onCooldown || lackMana;

                        return (
                            <button
                                key={index}
                                onClick={() => skill && selectSkill(skill.id)}
                                disabled={disabled}
                                title={
                                    !skill
                                        ? `空槽位 ${index + 1}：可在技能树中绑定主动技能`
                                        : onCooldown
                                            ? `${skill.name} 冷却中（剩余 ${(cdRemain / 1000).toFixed(1)}s）`
                                            : lackMana
                                                ? `${skill.name} 法力不足（需 ${manaCost} 点）`
                                                : `${skill.name} · 耗蓝 ${manaCost}（点击选中后攻击怪物施放）`
                                }
                                className={`w-10 h-10 rounded-full border transition-all flex items-center justify-center relative overflow-hidden ${
                                    !skill
                                        ? 'bg-black/40 border-white/5 text-slate-500 text-xs font-bold'
                                        : disabled
                                            ? 'bg-slate-900/80 border-white/5 text-slate-600 cursor-not-allowed'
                                            : isSelected
                                                ? 'bg-amber-500 border-amber-300 text-white shadow-lg shadow-amber-900/40 ring-2 ring-amber-300'
                                                : 'bg-slate-800/80 border-white/10 text-amber-300 hover:border-amber-400/60'
                                }`}
                            >
                                {skill ? renderSkillIcon(skill.icon) : index + 1}

                                {/* 冷却遮罩：显示剩余秒数，给出灰态倒计时反馈 */}
                                {skill && onCooldown && (
                                    <span className="absolute inset-0 bg-black/70 flex items-center justify-center text-[11px] font-bold text-white">
                                        {(cdRemain / 1000).toFixed(1)}
                                    </span>
                                )}

                                {/* 蓝不足角标：非冷却态下提示法力不足 */}
                                {skill && !onCooldown && lackMana && (
                                    <span className="absolute inset-0 bg-blue-950/60 flex items-center justify-center text-[8px] font-bold text-blue-300">
                                        蓝不足
                                    </span>
                                )}

                                {/* 已绑定技能显示当前等级角标 */}
                                {skill && (
                                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-[8px] font-bold px-1 rounded-full border border-white/10 z-10">
                                        {skill.level}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    <div className="w-px h-6 bg-white/10 mx-1"></div>

                    {/* 快捷开发者工具按钮 */}
                    <button
                        onClick={debugAddItem}
                        className="w-10 h-10 rounded-full hover:bg-white/10 text-dim hover:text-gold transition-all flex items-center justify-center"
                        title="开发者：获取神装"
                    >
                        <PlusCircle size={20} />
                    </button>
                </div>
            </div>

            {/* 右上角区域：极简风格操作指南看板 */}
            <AnimatePresence>
                {!isModalOpen && (
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        className="absolute top-6 right-6"
                    >
                        <div className="glass-panel px-4 py-3 bg-slate-900/60 text-dim text-[10px] font-bold uppercase tracking-widest text-right">
                            <div className="flex items-center gap-2 mb-2 justify-end text-white/40 border-b border-white/5 pb-1">
                                <Gamepad2 size={12} />
                                <span>控制核心</span>
                            </div>
                            <p className="mb-1"><span className="text-blue-400">WASD</span> 执行全向位移</p>
                            <p className="mb-1"><span className="text-red-400">MOUSE L</span> 执行单体打击</p>
                            <p><span className="text-emerald-400">MOUSE L</span> 触发 NPC 交互</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 全屏模态框渲染管线：使用 AnimatePresence 保证优雅的退出过渡动画 */}
            <AnimatePresence>
                {ui.isInventoryOpen && <InventoryPanel onClose={() => setInventoryOpen(false)} />}
                {ui.isSkillsOpen && <SkillTreePanel onClose={() => setSkillsOpen(false)} />}
                {ui.isShopOpen && <ShopPanel onClose={() => setShopOpen(false)} />}
            </AnimatePresence>
        </div>
    );
};
