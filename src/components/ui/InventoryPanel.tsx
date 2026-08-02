import React from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Item } from '../../store/gameStore';
import { X, Shield, Sword, Package } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    onClose: () => void;
}

const SLOT_NAMES: Record<string, string> = {
    weapon: '武器',
    helmet: '头部',
    chest: '身体',
    legs: '腿部',
    boots: '脚部',
    ring: '饰品'
};

export const InventoryPanel: React.FC<Props> = ({ onClose }) => {
    const { inventory, equipment, equipItem, player } = useGameStore();

    const handleEquip = (item: Item) => {
        if (item.type === 'weapon') equipItem(item, 'weapon');
        if (item.type === 'armor') equipItem(item, 'chest');
    };

    return (
        <div className="modal-overlay">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel w-full max-w-[500px] max-h-[90vh] flex flex-col p-6 relative overflow-hidden"
            >
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
                        <Package className="text-blue-400" size={20} /> 背包与装备
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 relative z-10 overflow-y-auto">
                    {/* Equipment Section */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-dim">当前装备</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(equipment).map(([slot, item]) => (
                                <div key={slot} className="aspect-square glass-panel bg-slate-900/40 flex flex-col items-center justify-center p-1 group relative cursor-pointer hover:border-blue-500/50 transition-all">
                                    {item ? (
                                        <div className="text-xl">⚔️</div>
                                    ) : (
                                        <div className="text-[8px] text-dim font-semibold text-center">{SLOT_NAMES[slot] || slot}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-dim">角色属性</h3>
                        <div className="glass-panel bg-slate-900/40 p-3 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-dim flex items-center gap-1.5"><Sword size={12} /> 攻击力</span>
                                <span className="font-bold text-yellow-400">{player.stats.attack}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-dim flex items-center gap-1.5"><Shield size={12} /> 防御力</span>
                                <span className="font-bold text-blue-400">{player.stats.armor}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inventory Grid */}
                <div className="flex-1 overflow-hidden flex flex-col relative z-10">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-dim mb-3">物品栏 ({inventory.length}/25)</h3>
                    <div className="flex-1 overflow-y-auto pr-1">
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                            {inventory.map((item, idx) => (
                                <div
                                    key={item.id + idx}
                                    className="aspect-square glass-panel bg-slate-800/40 hover:bg-slate-700/60 cursor-pointer flex items-center justify-center group relative"
                                    onClick={() => handleEquip(item)}
                                >
                                    <span className="text-xl">📦</span>
                                    {/* Minimal label for mobile */}
                                    <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                                        <span className="text-[8px] bg-black/60 w-full text-center truncate px-0.5">{item.name}</span>
                                    </div>
                                </div>
                            ))}
                            {Array.from({ length: Math.max(0, 20 - inventory.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square glass-panel bg-white/5 border-dashed border-white/5"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
