import { create } from 'zustand';

/**
 * 玩家基础数值属性类型定义
 * 包含生命值、法力值、战斗属性以及等级经验系统
 */
export type PlayerStats = {
    hp: number;         // 当前生命值
    maxHp: number;      // 最大生命值
    mana: number;       // 当前法力值
    maxMana: number;    // 最大法力值
    armor: number;      // 防御力
    attack: number;     // 攻击力
    critRate: number;   // 暴击率 (0-1)
    dodgeRate: number;  // 闪避率 (0-1)
    level: number;      // 等级
    exp: number;        // 当前经验值
    maxExp: number;     // 升级所需经验值
};

/**
 * 物品系统类型定义
 * 用于背包、商店以及装备系统
 */
export type Item = {
    id: string;
    name: string;
    type: 'weapon' | 'armor' | 'consumable' | 'material';
    description: string;
    stats?: Partial<PlayerStats>; // 物品提供的属性加成
    icon?: string;
    price: number;
};

/**
 * 技能类型定义
 * 包含主动与被动技能，支持等级需求校验
 */
export type Skill = {
    id: string;
    name: string;
    level: number;
    maxLevel: number;
    description: string;
    requirement?: number; // 等级需求：玩家等级必须达到此值才能升级
    type: 'active' | 'passive';
    icon: string;
};

/**
 * 全局游戏状态树接口
 * 本项目的单一事实来源 (Single Source of Truth)
 */
export type GameState = {
    // 玩家实体核心数据
    player: {
        name: string;
        stats: PlayerStats;
        gold: number;
        position: [number, number, number]; // 玩家在 3D 空间中的坐标同步
    };
    // 背包物品数组
    inventory: Item[];
    // 装备位系统：映射不同部位的穿着情况
    equipment: {
        weapon: Item | null;
        helmet: Item | null;
        chest: Item | null;
        legs: Item | null;
        boots: Item | null;
        ring: Item | null;
    };
    // 技能列表与剩余技能点
    skills: Skill[];
    skillPoints: number;

    // 交互目标系统：用于锁定敌人或 NPC
    targets: {
        selectedId: string | null;
    };
    // 全局运行日志：记录战斗信息与系统提示
    logs: string[];

    // UI 显隐控制中心
    ui: {
        isInventoryOpen: boolean;
        isSkillsOpen: boolean;
        isShopOpen: boolean;
    };

    // --- 状态更新动作 (Actions) ---

    addLog: (msg: string) => void;                                   // 添加新的日志条目
    updateStats: (stats: Partial<PlayerStats>) => void;               // 增量更新玩家基础属性
    addGold: (amount: number) => void;                               // 增减玩家持金量
    addItem: (item: Item) => void;                                   // 获得新物品并放入背包
    equipItem: (item: Item, slot: keyof GameState['equipment']) => void; // 处理穿戴逻辑与槽位覆盖
    updatePosition: (pos: [number, number, number]) => void;          // 物理引擎同步位置到状态
    setInventoryOpen: (open: boolean) => void;                       // 切换背包面板
    setSkillsOpen: (open: boolean) => void;                          // 切换技能树面板
    setShopOpen: (open: boolean) => void;                            // 切换商店面板
    upgradeSkill: (skillId: string) => void;                         // 处理技能升级逻辑 (含点数消耗与属性加成)
    buyItem: (item: Item) => void;                                   // 商店购买逻辑 (含金币校验与背包新增)
};

/**
 * 使用 Zustand 创建全局游戏状态管理仓库
 * 驱动整个 3D 场景与 Web UI 的同步响应
 */
export const useGameStore = create<GameState>((set) => ({
    // 初始玩家状态配置
    player: {
        name: '勇者',
        stats: {
            hp: 100,
            maxHp: 100,
            mana: 50,
            maxMana: 50,
            armor: 5,
            attack: 10,
            critRate: 0.05,
            dodgeRate: 0.05,
            level: 1,
            exp: 0,
            maxExp: 100,
        },
        gold: 100,
        position: [0, 0, 0],
    },
    inventory: [],
    equipment: {
        weapon: null,
        helmet: null,
        chest: null,
        legs: null,
        boots: null,
        ring: null,
    },
    // 初始化技能列表
    skills: [
        { id: 's1', name: '破军斩', level: 1, maxLevel: 5, description: '对敌人造成 150% 的物理伤害。', type: 'active', icon: 'Target' },
        { id: 's2', name: '大地守护', level: 0, maxLevel: 3, description: '增加 10 点基础护甲值。', type: 'passive', icon: 'Shield' },
        { id: 's3', name: '风之优雅', level: 0, maxLevel: 3, description: '永久增加 5% 闪避率。', type: 'passive', icon: 'Wind' },
        { id: 's4', name: '烈焰喷薄', level: 0, maxLevel: 5, description: '造成大范围远程魔法伤害。(需求：Lv.3)', requirement: 3, type: 'active', icon: 'Flame' },
        { id: 's5', name: '生命洗礼', level: 0, maxLevel: 5, description: '立即恢复 30% 生命值。(需求：Lv.5)', requirement: 5, type: 'active', icon: 'Heart' },
    ],
    skillPoints: 5, // 初始测试技能点
    targets: {
        selectedId: null,
    },
    logs: ['欢迎来到神秘世界！'],
    ui: {
        isInventoryOpen: false,
        isSkillsOpen: false,
        isShopOpen: false,
    },

    // 动作实现：添加日志并保持队列长度
    addLog: (msg: string) => set((state: GameState) => ({
        logs: [...state.logs.slice(-19), msg]
    })),

    // 动作实现：合并式更新属性对象
    updateStats: (newStats: Partial<PlayerStats>) => set((state: GameState) => ({
        player: {
            ...state.player,
            stats: { ...state.player.stats, ...newStats }
        }
    })),

    // 动作实现：增减玩家资产
    addGold: (amount: number) => set((state: GameState) => ({
        player: { ...state.player, gold: state.player.gold + amount }
    })),

    // 动作实现：向背包末尾追加物品
    addItem: (item: Item) => set((state: GameState) => ({
        inventory: [...state.inventory, item]
    })),

    // 动作实现：在指定槽位放置装备
    equipItem: (item: Item, slot: keyof GameState['equipment']) => set((state: GameState) => ({
        equipment: { ...state.equipment, [slot]: item }
    })),

    // 动作实现：3D 物理位置同步
    updatePosition: (pos: [number, number, number]) => set((state: GameState) => ({
        player: { ...state.player, position: pos }
    })),

    // 面板显隐控制组
    setInventoryOpen: (open: boolean) => set((state: GameState) => ({
        ui: { ...state.ui, isInventoryOpen: open }
    })),

    setSkillsOpen: (open: boolean) => set((state: GameState) => ({
        ui: { ...state.ui, isSkillsOpen: open }
    })),

    setShopOpen: (open: boolean) => set((state: GameState) => ({
        ui: { ...state.ui, isShopOpen: open }
    })),

    /**
     * 实现：技能升级逻辑
     * 处理点数消耗、等级限制、需求校验以及被动属性实时应用
     */
    upgradeSkill: (skillId: string) => set((state: GameState) => {
        const skill = state.skills.find(s => s.id === skillId);

        // 校验：技能是否存在、是否有余点、是否已满级
        if (!skill || state.skillPoints <= 0 || skill.level >= skill.maxLevel) return state;

        // 校验：玩家等级是否达到技能的前置条件
        if (skill.requirement && state.player.stats.level < skill.requirement) {
            return {
                logs: [...state.logs, `【系统】无法升级 ${skill.name}，需要等级 ${skill.requirement}`]
            };
        }

        // 构建新的技能数组
        const newSkills = state.skills.map(s =>
            s.id === skillId ? { ...s, level: s.level + 1 } : s
        );

        // 特殊逻辑：如果是被动技能，在这里直接修改玩家面板属性
        if (skillId === 's2') {
            // 大地守护：每升一级永久增加 10 点护甲
            return {
                skills: newSkills,
                skillPoints: state.skillPoints - 1,
                player: {
                    ...state.player,
                    stats: { ...state.player.stats, armor: state.player.stats.armor + 10 }
                },
                logs: [...state.logs, `【技能】${skill.name} 已提升至 LV.${skill.level + 1}，防御力获得提升！`]
            };
        }

        // 普通升级逻辑
        return {
            skills: newSkills,
            skillPoints: state.skillPoints - 1,
            logs: [...state.logs, `【技能】${skill.name} 已提升至 LV.${skill.level + 1}！`]
        };
    }),

    /**
     * 实现：购买逻辑
     * 处理金库校验、金币扣除、背包空间新增与日志记录
     */
    buyItem: (item: Item) => set((state: GameState) => {
        // 校验金币是否足够
        if (state.player.gold < item.price) {
            return {
                logs: [...state.logs, `【商店】金币不足，无法购买 ${item.name}`]
            };
        }

        // 执行交易：扣钱、加货、记账
        return {
            player: { ...state.player, gold: state.player.gold - item.price },
            inventory: [...state.inventory, { ...item, id: `bought-${Date.now()}` }],
            logs: [...state.logs, `【商店】花费 ${item.price} 金币购买了 ${item.name}`]
        };
    }),
}));




