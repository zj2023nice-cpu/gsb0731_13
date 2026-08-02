import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Shield, Sword, Coins, Backpack, BookOpen, MessageSquare, ChevronDown, ChevronUp, PlusCircle, Gamepad2 } from 'lucide-react';
import { InventoryPanel } from './InventoryPanel';
import { SkillTreePanel } from './SkillTreePanel';
import { ShopPanel } from './ShopPanel';
import { getSkillIcon, getSkillColor } from './skillIcons';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * HUD (Heads-Up Display) 主组件
 * 它是整个游戏 UI 的总容器，管理各级面板的显隐层级以及 2D 状态反馈
 */
export const HUD: React.FC = () => {
    // 从 Store 中获取数据与控制函数
    const {
        player, logs, addItem, ui,
        setInventoryOpen, setSkillsOpen, setShopOpen,
        skills, skillBar, selectedSkillSlot, skillCooldowns,
        bindSkillToSlot, selectSkillSlot, castSkill
    } = useGameStore();

    // 控制下方战斗日志面板的折叠状态
    const [isLogExpanded, setIsLogExpanded] = useState(true);

    // 技能绑定选择器：当前正在选择绑定技能的动作栏槽位索引 (null 表示关闭) —— 纯 UI 状态
    const [bindingSlotIndex, setBindingSlotIndex] = useState<number | null>(null);

    // 冷却倒计时渲染驱动：仅用于刷新槽位剩余秒数显示，冷却时间戳以 Store 为准
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(timer);
    }, []);

    // 已习得 (等级 > 0) 的主动技能列表，可绑定至动作栏
    const bindableSkills = skills.filter(s => s.type === 'active' && s.level > 0);

    /**
     * 动作栏槽位点击：
     * - 空槽位：打开技能绑定选择器
     * - 恢复型技能：无需目标，点击立即对自身施放
     * - 伤害型技能：选定/取消选定，选定后点击场景怪物即施放
     */
    const handleSlotClick = (slotIndex: number) => {
        const skillId = skillBar[slotIndex];
        if (!skillId) {
            setBindingSlotIndex(bindingSlotIndex === slotIndex ? null : slotIndex);
            return;
        }
        const skill = skills.find(s => s.id === skillId);
        if (skill?.effect?.kind === 'heal') {
            castSkill(skillId);
            return;
        }
        selectSkillSlot(selectedSkillSlot === slotIndex ? null : slotIndex);
    };

    /** 右键点击槽位：解除该槽位的技能绑定 */
    const handleSlotContextMenu = (e: React.MouseEvent, slotIndex: number) => {
        e.preventDefault();
        if (skillBar[slotIndex]) bindSkillToSlot(null, slotIndex);
    };

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

                    {/* 动作栏：技能槽位，可绑定已习得的主动技能 */}
                    {skillBar.map((skillId, slotIndex) => {
                        const skill = skillId ? skills.find(s => s.id === skillId) : null;
                        const isSelected = skill !== null && selectedSkillSlot === slotIndex;

                        // 冷却剩余秒数 (时间戳存于 Store，此处仅做显示换算)；蓝量不足判定
                        const cooldownRemaining = skill ? Math.max(0, Math.ceil(((skillCooldowns[skill.id] ?? 0) - now) / 1000)) : 0;
                        const isManaInsufficient = skill ? player.stats.mana < (skill.manaCost ?? 0) : false;

                        // 槽位提示文案：优先展示冷却/蓝量等阻断原因
                        const slotTitle = !skill
                            ? `槽位 ${slotIndex + 1}：点击绑定主动技能`
                            : cooldownRemaining > 0
                                ? `${skill.name}：冷却中，剩余 ${cooldownRemaining} 秒`
                                : isManaInsufficient
                                    ? `${skill.name}：法力不足 (需要 ${skill.manaCost ?? 0} 点法力)`
                                    : `${skill.name}：左键选定施放，右键解除绑定 (耗蓝 ${skill.manaCost ?? 0} / 冷却 ${skill.cooldown ?? 0} 秒)`;

                        return (
                            <button
                                key={slotIndex}
                                onClick={() => handleSlotClick(slotIndex)}
                                onContextMenu={(e) => handleSlotContextMenu(e, slotIndex)}
                                title={slotTitle}
                                className={`w-10 h-10 rounded-full border transition-all flex items-center justify-center font-bold text-xs relative overflow-hidden ${isSelected
                                        ? 'bg-blue-600/40 border-blue-400 text-white shadow-lg shadow-blue-900/40'
                                        : !skill
                                            ? 'bg-black/40 border-white/5 hover:border-white/20 text-slate-500'
                                            : cooldownRemaining > 0
                                                ? 'bg-black/40 border-white/10 text-slate-500'
                                                : isManaInsufficient
                                                    ? 'bg-blue-950/50 border-blue-500/40 text-blue-400'
                                                    : 'bg-black/40 border-white/20 text-slate-300 hover:border-white/40'
                                    }`}
                            >
                                {skill ? getSkillIcon(skill.icon, getSkillColor(skill.icon)) : slotIndex + 1}
                                {/* 冷却遮罩：黑色蒙层 + 剩余秒数 */}
                                {cooldownRemaining > 0 && (
                                    <span className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center text-[11px] font-mono font-bold text-slate-200">
                                        {cooldownRemaining}
                                    </span>
                                )}
                                {/* 蓝量不足指示：右下角蓝色角标 (与选中态叠加也能一眼区分) */}
                                {skill && cooldownRemaining === 0 && isManaInsufficient && (
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-blue-400 border border-slate-900" />
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

                {/* 技能绑定选择器：点击空槽位后弹出，选择已习得的主动技能完成绑定 */}
                <AnimatePresence>
                    {bindingSlotIndex !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 glass-panel bg-slate-900/90 p-2 rounded-xl border-white/10 shadow-2xl"
                        >
                            <div className="text-[9px] font-bold uppercase tracking-widest text-dim px-2 pb-1.5 mb-1 border-b border-white/5">
                                绑定主动技能到槽位 {bindingSlotIndex + 1}
                            </div>
                            {bindableSkills.length === 0 ? (
                                <div className="text-[10px] text-dim px-2 py-2">暂无已习得的主动技能</div>
                            ) : (
                                bindableSkills.map(skill => (
                                    <button
                                        key={skill.id}
                                        onClick={() => { bindSkillToSlot(skill.id, bindingSlotIndex); setBindingSlotIndex(null); }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left"
                                    >
                                        {getSkillIcon(skill.icon, getSkillColor(skill.icon))}
                                        <span className="text-[11px] font-bold text-slate-200 flex-1">{skill.name}</span>
                                        <span className="text-[9px] font-mono text-dim">LV.{skill.level}</span>
                                    </button>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
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
                            <p className="mb-1"><span className="text-purple-400">技能槽</span> 选定技能后点怪施放</p>
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
