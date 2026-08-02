import { Zap, Target, Shield, Wind, Flame, Heart } from 'lucide-react';

/**
 * 技能图标渲染辅助
 * 根据 Store 中的图标名称映射 Lucide 图标组件
 */
export const getSkillIcon = (iconName: string, color: string) => {
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
 * 技能颜色映射辅助
 * 为不同类型的技能提供视觉区分
 */
export const getSkillColor = (iconName: string) => {
    switch (iconName) {
        case 'Target': return 'text-red-400';
        case 'Shield': return 'text-blue-400';
        case 'Wind': return 'text-green-400';
        case 'Flame': return 'text-orange-400';
        case 'Heart': return 'text-pink-400';
        default: return 'text-purple-400';
    }
};
