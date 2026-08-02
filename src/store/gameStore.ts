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
 * 技能战斗效果描述
 * 数据化定义主动技能在结算时的表现，便于后续扩展冷却 / 耗蓝 / 触发等细节
 * - physical: 造成物理伤害，倍率基于玩家攻击力，随技能等级线性增强
 * - magic:    造成魔法伤害，基础值固定，随技能等级线性增强
 * - heal:     施放时按最大生命值百分比治疗玩家（不对怪物造成伤害）
 */
export type SkillCombat = {
    kind: 'physical' | 'magic' | 'heal';
    baseMultiplier?: number; // physical: 攻击力倍率基准 (Lv.1 时)
    baseValue?: number;      // magic: 伤害基准值 / heal: 治疗百分比基准
    perLevel?: number;       // 每提升一级带来的额外增益
    manaCost?: number;       // 单次施放消耗的法力值
    cooldown?: number;       // 施放后的冷却时间（毫秒）
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
    combat?: SkillCombat;  // 主动技能的战斗结算配置（被动技能为空）
};

/**
 * 怪物运行时状态
 * 怪物的静态配置由场景声明，运行时血量统一收敛到全局状态中管理
 */
export type MonsterState = {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
};

/**
 * 动作栏槽位数量：底部快捷技能栏固定 3 个空位
 */
export const ACTION_BAR_SIZE = 3;

/**
 * 技能效果结算结果
 * damage: 对怪物造成的伤害；heal: 对玩家的治疗量
 */
export type SkillEffectResult = {
    damage: number;
    heal: number;
};

/**
 * 纯函数：根据技能配置与玩家属性结算一次施放的效果
 * 集中在此处计算，保证 UI 与 3D 组件仅负责触发、不承载数值逻辑
 * 注意：治疗量参照玩家最大生命值，与怪物血量无关
 */
export const computeSkillEffect = (
    skill: Skill,
    stats: PlayerStats
): SkillEffectResult => {
    const combat = skill.combat;
    if (!combat) return { damage: 0, heal: 0 };

    const level = Math.max(1, skill.level);

    switch (combat.kind) {
        case 'physical': {
            const multiplier = (combat.baseMultiplier ?? 1) + (level - 1) * (combat.perLevel ?? 0);
            return { damage: Math.round(stats.attack * multiplier), heal: 0 };
        }
        case 'magic': {
            const damage = (combat.baseValue ?? 0) + level * (combat.perLevel ?? 0);
            return { damage: Math.round(damage), heal: 0 };
        }
        case 'heal': {
            // 治疗百分比参照玩家最大生命值结算
            const percent = (combat.baseValue ?? 0) + (level - 1) * (combat.perLevel ?? 0);
            return { damage: 0, heal: Math.round(stats.maxHp * (percent / 100)) };
        }
        default:
            return { damage: 0, heal: 0 };
    }
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

    // 动作栏：底部三个快捷槽位，存放已绑定的主动技能 id（空位为 null）
    actionBar: (string | null)[];
    // 当前选定待施放的技能 id（点击怪物时按此技能结算，null 表示普通攻击）
    selectedSkillId: string | null;
    // 技能冷却表：以技能 id 为键，值为冷却结束的时间戳（Date.now() 毫秒）
    cooldowns: Record<string, number>;

    // 怪物运行时血量表：以怪物 id 为键，收敛所有怪物的实时状态
    monsters: Record<string, MonsterState>;

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

    equipSkillToSlot: (skillId: string, slotIndex: number) => void;  // 将主动技能绑定到指定动作栏槽位
    selectSkill: (skillId: string | null) => void;                   // 选定/取消选定待施放的技能
    registerMonster: (monster: MonsterState) => void;               // 场景挂载时登记怪物运行时状态
    attackMonster: (monsterId: string) => void;                      // 对怪物发起一次攻击（普通攻击或选定技能施放）
};

/**
 * 使用 Zustand 创建全局游戏状态管理仓库
 * 驱动整个 3D 场景与 Web UI 的同步响应
 */
export const useGameStore = create<GameState>((set, get) => ({
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
        { id: 's1', name: '破军斩', level: 1, maxLevel: 5, description: '对敌人造成 150% 的物理伤害。', type: 'active', icon: 'Target', combat: { kind: 'physical', baseMultiplier: 1.5, perLevel: 0.3, manaCost: 5, cooldown: 2000 } },
        { id: 's2', name: '大地守护', level: 0, maxLevel: 3, description: '增加 10 点基础护甲值。', type: 'passive', icon: 'Shield' },
        { id: 's3', name: '风之优雅', level: 0, maxLevel: 3, description: '永久增加 5% 闪避率。', type: 'passive', icon: 'Wind' },
        { id: 's4', name: '烈焰喷薄', level: 0, maxLevel: 5, description: '造成大范围远程魔法伤害。(需求：Lv.3)', requirement: 3, type: 'active', icon: 'Flame', combat: { kind: 'magic', baseValue: 20, perLevel: 8, manaCost: 15, cooldown: 5000 } },
        { id: 's5', name: '生命洗礼', level: 0, maxLevel: 5, description: '立即恢复 30% 生命值。(需求：Lv.5)', requirement: 5, type: 'active', icon: 'Heart', combat: { kind: 'heal', baseValue: 30, perLevel: 5, manaCost: 20, cooldown: 8000 } },
    ],
    skillPoints: 5, // 初始测试技能点
    // 动作栏三个空位初始均未绑定技能
    actionBar: Array(ACTION_BAR_SIZE).fill(null),
    selectedSkillId: null,
    cooldowns: {},
    // 怪物运行时状态由场景挂载时通过 registerMonster 填充
    monsters: {},
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

    /**
     * 实现：将主动技能绑定到动作栏槽位
     * 仅允许绑定已学习（等级 > 0）的主动技能；重复绑定时先从旧槽位移除以保证唯一性
     */
    equipSkillToSlot: (skillId: string, slotIndex: number) => set((state: GameState) => {
        if (slotIndex < 0 || slotIndex >= state.actionBar.length) return state;

        const skill = state.skills.find(s => s.id === skillId);
        if (!skill || skill.type !== 'active') return state;

        if (skill.level <= 0) {
            return { logs: [...state.logs, `【技能】${skill.name} 尚未学习，无法绑定到动作栏`] };
        }

        // 先清除该技能已占用的其它槽位，再写入目标槽位，保证一个技能只占一个位置
        const newActionBar = state.actionBar.map(id => (id === skillId ? null : id));
        newActionBar[slotIndex] = skillId;

        return {
            actionBar: newActionBar,
            logs: [...state.logs, `【技能】${skill.name} 已绑定到动作栏第 ${slotIndex + 1} 位`]
        };
    }),

    /**
     * 实现：选定/取消选定待施放技能
     * 再次选定同一技能视为取消，回到普通攻击模式
     */
    selectSkill: (skillId: string | null) => set((state: GameState) => ({
        selectedSkillId: state.selectedSkillId === skillId ? null : skillId
    })),

    /**
     * 实现：登记怪物运行时状态
     * 场景挂载怪物时调用；已存在则保留当前血量，避免热更新时被重置
     */
    registerMonster: (monster: MonsterState) => set((state: GameState) => {
        if (state.monsters[monster.id]) return state;
        return { monsters: { ...state.monsters, [monster.id]: monster } };
    }),

    /**
     * 实现：对怪物发起一次攻击
     * 若已选定主动技能，则先校验冷却与法力，通过后扣蓝、挂冷却并按技能效果结算；
     * 否则沿用基础普通攻击。所有状态变化均写回全局状态树，保证 3D 与 UI 同步
     */
    attackMonster: (monsterId: string) => set((state: GameState) => {
        const monster = state.monsters[monsterId];
        if (!monster || monster.hp <= 0) return state;

        const skill = state.selectedSkillId
            ? state.skills.find(s => s.id === state.selectedSkillId)
            : undefined;

        let damage: number;
        let healAmount = 0;
        let castLog: string;
        let player = state.player;
        let cooldowns = state.cooldowns;

        if (skill && skill.combat) {
            const now = Date.now();
            const manaCost = skill.combat.manaCost ?? 0;
            const cooldown = skill.combat.cooldown ?? 0;

            // 校验：技能是否仍在冷却中
            const readyAt = state.cooldowns[skill.id] ?? 0;
            if (readyAt > now) {
                const remain = ((readyAt - now) / 1000).toFixed(1);
                return { logs: [...state.logs, `【技能】${skill.name} 冷却中，剩余 ${remain} 秒`].slice(-20) };
            }

            // 校验：法力值是否充足
            if (state.player.stats.mana < manaCost) {
                return { logs: [...state.logs, `【技能】法力不足，无法施放 ${skill.name}（需 ${manaCost} 点）`].slice(-20) };
            }

            // 通过校验：扣蓝、挂冷却
            player = { ...player, stats: { ...player.stats, mana: player.stats.mana - manaCost } };
            cooldowns = { ...state.cooldowns, [skill.id]: now + cooldown };

            // 主动技能结算：走集中的纯函数计算
            const effect = computeSkillEffect(skill, state.player.stats);
            damage = effect.damage;
            healAmount = effect.heal;
            castLog = `你对 ${monster.name} 施放了【${skill.name}】`;
        } else {
            // 普通攻击：保留原有的 5-10 点随机基础伤害
            damage = Math.floor(Math.random() * 5) + 5;
            castLog = `你攻击了 ${monster.name}`;
        }

        const newHp = Math.max(0, monster.hp - damage);
        const logs = [...state.logs, `${castLog}，造成 ${damage} 点伤害!`];

        // 治疗类技能对玩家生效
        if (healAmount > 0) {
            const healedHp = Math.min(player.stats.maxHp, player.stats.hp + healAmount);
            player = { ...player, stats: { ...player.stats, hp: healedHp } };
            logs.push(`【技能】${skill!.name} 为你恢复了 ${healAmount} 点生命值!`);
        }

        // 击败结算：奖励金币
        if (newHp === 0) {
            logs.push(`${monster.name} 被击败了! 获得 10 金币.`);
            player = { ...player, gold: player.gold + 10 };

            // 怪物重生计时器：5秒后恢复全血并写回全局状态
            setTimeout(() => {
                const current = get().monsters[monsterId];
                if (!current) return;
                set((s: GameState) => ({
                    monsters: { ...s.monsters, [monsterId]: { ...current, hp: current.maxHp } },
                    logs: [...s.logs, `系统：${current.name} 已在其领地重新刷新。`].slice(-20)
                }));
            }, 5000);
        }

        return {
            player,
            cooldowns,
            monsters: {
                ...state.monsters,
                [monsterId]: { ...monster, hp: newHp }
            },
            logs: logs.slice(-20)
        };
    }),
}));




