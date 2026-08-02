import React from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Item } from '../../store/gameStore';
import { X, ShoppingBag, Coins, Sword, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    onClose: () => void;
}

/**
 * 静态商店物品定义
 * 包含基础属性加成 (Stats) 与 价格 (Price)
 */
const SHOP_ITEMS: Item[] = [
    {
        id: 'shop-1',
        name: '铁剑',
        type: 'weapon',
        description: '一把普通的铁剑，比木棍好用多了。',
        price: 50,
        stats: { attack: 5 }
    },
    {
        id: 'shop-2',
        name: '钢刃',
        type: 'weapon',
        description: '精钢打造的利刃，削铁如泥。',
        price: 200,
        stats: { attack: 15, critRate: 0.05 }
    },
    {
        id: 'shop-3',
        name: '皮甲',
        type: 'armor',
        description: '轻便的皮甲，提供基础防御。',
        price: 40,
        stats: { armor: 8, dodgeRate: 0.02 }
    },
    {
        id: 'shop-4',
        name: '板甲',
        type: 'armor',
        description: '沉重的金属铠甲，防御力卓越。',
        price: 300,
        stats: { armor: 30 }
    }
];

/**
 * 商店面板组件
 * 实现物品浏览、余额显示、购买资产校验等功能
 */
export const ShopPanel: React.FC<Props> = ({ onClose }) => {
    // 从 store 中获取玩家数据和购买动作
    const { player, buyItem } = useGameStore();

    return (
        <div className="modal-overlay">
            {/* 使用 Framer Motion 实现带有垂直位移的出场动画 */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="glass-panel w-full max-w-[500px] max-h-[90vh] flex flex-col p-6 relative overflow-hidden"
            >
                {/* 头部区域：包含标题、实时余额显示和关闭按钮 */}
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
                        <ShoppingBag className="text-emerald-400" size={20} /> 神秘商店
                    </h2>

                    {/* 动态金币显示槽 */}
                    <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-full border border-white/5">
                        <Coins size={14} className="text-gold" />
                        <span className="text-sm font-bold text-gold">{player.gold}</span>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2">
                        <X size={20} />
                    </button>
                </div>

                {/* 物品列表滚动区 */}
                <div className="flex-1 overflow-y-auto pr-1 relative z-10 space-y-4">
                    {SHOP_ITEMS.map((item) => (
                        <div key={item.id} className="glass-panel bg-slate-800/40 p-4 border-white/5 hover:border-emerald-500/30 transition-all flex justify-between items-center group">
                            <div className="flex gap-4">
                                {/* 物品图标容器 */}
                                <div className="w-12 h-12 bg-slate-900/80 rounded-xl border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                    {item.type === 'weapon' ? '⚔️' : '🛡️'}
                                </div>

                                {/* 物品介绍文本：名称、描述、加成属性 */}
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-slate-100">{item.name}</h3>
                                    <p className="text-[11px] text-dim max-w-[200px] mb-1">{item.description}</p>

                                    {/* 动态属性加成标签 */}
                                    <div className="flex gap-3 mt-1">
                                        {item.stats?.attack && (
                                            <span className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                                                <Sword size={10} /> +{item.stats.attack}
                                            </span>
                                        )}
                                        {item.stats?.armor && (
                                            <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                                                <Shield size={10} /> +{item.stats.armor}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 交互：购买按钮 -> 关联 Store 中的 buyItem。余额不足时自动禁用 */}
                            <button
                                onClick={() => buyItem(item)}
                                disabled={player.gold < item.price}
                                className={`px-4 py-2 rounded-xl text-[11px] font-bold flex flex-col items-center transition-all ${player.gold >= item.price
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                <span>购买</span>
                                <span className="text-[9px] opacity-80 mt-0.5">{item.price} G</span>
                            </button>
                        </div>
                    ))}
                </div>

                {/* 底部装饰文案 */}
                <div className="mt-6 pt-4 border-t border-white/5 text-center text-dim text-[10px] uppercase tracking-widest">
                    老板：看中什么尽管挑，我的货绝对地道！
                </div>
            </motion.div>
        </div>
    );
};
