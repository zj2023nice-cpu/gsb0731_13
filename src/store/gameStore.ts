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
    manaRegen: number;  // 法力回复速度 (点/秒)
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
 * 技能效果类型定义
 * damage: 伤害型，按玩家攻击力 × 倍率结算；radius 为范围半径 (米)，配置后以落点为圆心命中范围内所有怪物，缺省为单体
 * heal:   恢复型，按玩家最大生命值百分比恢复 (无需目标，直接作用于自身)
 */
export type SkillEffect =
    | { kind: 'damage'; multiplier: number; radius?: number }
    | { kind: 'heal'; percent: number };

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
    effect?: SkillEffect; // 主动技能的施放效果定义 (被动技能无此字段)
    manaCost?: number;    // 法力消耗 (主动技能专用)
    cooldown?: number;    // 冷却时间，单位秒 (主动技能专用)
};

/**
 * 怪物实体状态定义
 * 由全局仓库统一管理 (战斗结算的单一事实来源)，3D 组件仅负责渲染与交互转发
 */
export type MonsterState = {
    id: string;
    name: string;
    level: number;
    position: [number, number, number];
    hp: number;
    maxHp: number;
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

    // 动作栏系统：固定槽位，存放已绑定的技能 ID；selectedSkillSlot 为当前已选定待施放的槽位
    skillBar: (string | null)[];
    selectedSkillSlot: number | null;

    // 技能冷却状态：技能 ID → 冷却结束时间戳 (毫秒)；普通攻击不受冷却限制
    skillCooldowns: Record<string, number>;

    // 场景怪物实体列表：生命值与战斗结算由全局仓库统一管理
    monsters: MonsterState[];

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
    attackMonster: (monsterId: string) => void;                      // 基础攻击：对怪物造成随机小额伤害
    castSkill: (skillId: string, targetId?: string) => void;         // 施放主动技能：按技能效果结算伤害 (需目标) 或治疗 (自身)
    bindSkillToSlot: (skillId: string | null, slotIndex: number) => void; // 绑定主动技能到动作栏槽位 (传 null 解除绑定)
    selectSkillSlot: (slotIndex: number | null) => void;             // 选定/取消选定动作栏槽位，选定后点击怪物即施放
};

/**
 * 使用 Zustand 创建全局游戏状态管理仓库
 * 驱动整个 3D 场景与 Web UI 的同步响应
 */
// 全局周期计时器句柄 (模块单例，防止 HMR 重复启动)
let manaRegenTimer: ReturnType<typeof setInterval> | null = null;
let cooldownWatchTimer: ReturnType<typeof setInterval> | null = null;

export const useGameStore = create<GameState>((set, get) => {
    /**
     * 内部结算辅助：对怪物造成实际伤害
     * 统一处理扣血、战斗日志、击杀奖励与 5 秒重生计时
     * 基础攻击与技能伤害均经由此处结算，保证数值口径一致
     */
    const settleMonsterDamage = (monsterId: string, damage: number, attackLog: string) => {
        const monster = get().monsters.find(m => m.id === monsterId);

        // 校验：怪物存在且处于存活状态
        if (!monster || monster.hp <= 0) return;

        const newHp = Math.max(0, monster.hp - damage);
        const isKilled = newHp === 0;

        set((state: GameState) => ({
            monsters: state.monsters.map(m => m.id === monsterId ? { ...m, hp: newHp } : m),
            player: isKilled ? { ...state.player, gold: state.player.gold + 10 } : state.player,
            logs: [
                ...state.logs,
                attackLog,
                ...(isKilled ? [`${monster.name} 被击败了! 获得 10 金币.`] : []),
            ].slice(-20),
        }));

        // 怪物重生计时：被击败 5 秒后恢复满血并重新出现
        if (isKilled) {
            setTimeout(() => {
                set((state: GameState) => ({
                    monsters: state.monsters.map(m => m.id === monsterId ? { ...m, hp: m.maxHp } : m),
                    logs: [...state.logs, `系统：${monster.name} 已在其领地重新刷新。`].slice(-20),
                }));
            }, 5000);
        }
    };

    // --- 全局周期驱动：不依赖组件挂载，状态变化全部经由 Store ---

    // 法力回复：每秒按 manaRegen 稳定回复，不超过上限；满蓝时不写入，避免无效渲染
    if (!manaRegenTimer) {
        manaRegenTimer = setInterval(() => {
            const { player } = get();
            if (player.stats.mana >= player.stats.maxMana) return;
            set((state: GameState) => ({
                player: {
                    ...state.player,
                    stats: { ...state.player.stats, mana: Math.min(state.player.stats.maxMana, state.player.stats.mana + state.player.stats.manaRegen) }
                }
            }));
        }, 1000);
    }

    // 冷却结束检测：移除过期冷却条目并写日志，给玩家"又能施放了"的明确反馈
    if (!cooldownWatchTimer) {
        cooldownWatchTimer = setInterval(() => {
            const { skillCooldowns, skills } = get();
            const now = Date.now();
            const finishedIds = Object.keys(skillCooldowns).filter(id => (skillCooldowns[id] ?? 0) <= now);
            if (finishedIds.length === 0) return;

            set((state: GameState) => {
                const nextCooldowns = { ...state.skillCooldowns };
                finishedIds.forEach(id => delete nextCooldowns[id]);
                return {
                    skillCooldowns: nextCooldowns,
                    logs: [...state.logs, ...finishedIds.map(id => {
                        const skill = skills.find(s => s.id === id);
                        return `【技能】${skill?.name ?? id} 冷却完毕，可以再次施放!`;
                    })].slice(-20),
                };
            });
        }, 500);
    }

    return {
    // 初始玩家状态配置
    player: {
        name: '勇者',
        stats: {
            hp: 100,
            maxHp: 100,
            mana: 50,
            maxMana: 50,
            manaRegen: 2,
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
    // 初始化技能列表 (effect 为主动技能的施放效果定义，manaCost/cooldown 为施放消耗与冷却)
    skills: [
        { id: 's1', name: '破军斩', level: 1, maxLevel: 5, description: '对敌人造成 150% 的物理伤害。', type: 'active', icon: 'Target', effect: { kind: 'damage', multiplier: 1.5 }, manaCost: 10, cooldown: 3 },
        { id: 's2', name: '大地守护', level: 0, maxLevel: 3, description: '增加 10 点基础护甲值。', type: 'passive', icon: 'Shield' },
        { id: 's3', name: '风之优雅', level: 0, maxLevel: 3, description: '永久增加 5% 闪避率。', type: 'passive', icon: 'Wind' },
        // 烈焰喷薄：范围技能，以落点为圆心命中 8 米内所有怪物，按 200% 倍率结算
        { id: 's4', name: '烈焰喷薄', level: 0, maxLevel: 5, description: '造成大范围远程魔法伤害。(需求：Lv.3)', requirement: 3, type: 'active', icon: 'Flame', effect: { kind: 'damage', multiplier: 2, radius: 8 }, manaCost: 20, cooldown: 8 },
        { id: 's5', name: '生命洗礼', level: 0, maxLevel: 5, description: '立即恢复 30% 生命值。(需求：Lv.5)', requirement: 5, type: 'active', icon: 'Heart', effect: { kind: 'heal', percent: 0.3 }, manaCost: 15, cooldown: 10 },
    ],
    skillPoints: 5, // 初始测试技能点

    // 动作栏初始状态：3 个空槽位，待玩家绑定主动技能
    skillBar: [null, null, null],
    selectedSkillSlot: null,

    // 技能冷却初始状态：无冷却中的技能
    skillCooldowns: {},

    // 初始化场景怪物列表：数值配置与原场景生成器保持一致
    monsters: [
        { id: 'm1', name: '史莱姆', level: 1, position: [5, 0, 5], hp: 30, maxHp: 30 },
        { id: 'm2', name: '哥布林', level: 2, position: [-5, 0, 8], hp: 50, maxHp: 50 },
        { id: 'm3', name: '野狼', level: 3, position: [8, 0, -5], hp: 80, maxHp: 80 },
        { id: 'm4', name: '史莱姆', level: 1, position: [10, 0, 0], hp: 30, maxHp: 30 },
        { id: 'm5', name: '精英哥布林', level: 5, position: [-8, 0, -8], hp: 150, maxHp: 150 },
    ],
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
     * 实现：基础攻击逻辑
     * 保留原有手感，随机造成 5-10 点伤害
     */
    attackMonster: (monsterId: string) => {
        const monster = get().monsters.find(m => m.id === monsterId);
        if (!monster) return;

        const damage = Math.floor(Math.random() * 5) + 5;
        settleMonsterDamage(monsterId, damage, `你攻击了 ${monster.name}, 造成 ${damage} 点伤害!`);
    },

    /**
     * 实现：主动技能施放逻辑
     * 校验链：已习得 → 冷却中拦截 → 法力不足拦截 → 目标校验；
     * 全部通过后扣除法力并进入冷却，再按技能效果结算
     * 伤害型技能需指定怪物目标，恢复型技能直接作用于自身；普通攻击不受此限制
     */
    castSkill: (skillId: string, targetId?: string) => {
        const { skills, player, skillCooldowns } = get();
        const skill = skills.find(s => s.id === skillId);

        // 校验：技能存在、为主动技能、已习得 (至少 1 级) 且定义了效果
        if (!skill || skill.type !== 'active' || skill.level <= 0 || !skill.effect) return;

        // 冷却校验：冷却未结束时禁止重复施放，日志提示剩余秒数
        const now = Date.now();
        const cooldownEnd = skillCooldowns[skillId] ?? 0;
        if (now < cooldownEnd) {
            const remaining = Math.ceil((cooldownEnd - now) / 1000);
            set((state: GameState) => ({
                logs: [...state.logs, `【技能】${skill.name} 冷却中，剩余 ${remaining} 秒，无法施放`].slice(-20),
            }));
            return;
        }

        // 法力校验：蓝量不足时禁止施放，日志提示所需法力
        const manaCost = skill.manaCost ?? 0;
        if (player.stats.mana < manaCost) {
            set((state: GameState) => ({
                logs: [...state.logs, `【技能】法力不足，无法施放 ${skill.name} (需要 ${manaCost} 点法力)`].slice(-20),
            }));
            return;
        }

        // 目标校验 (仅伤害型)：目标不存在或已死亡时，不消耗法力与冷却
        let targetMonster: MonsterState | undefined;
        if (skill.effect.kind === 'damage') {
            if (!targetId) return;
            targetMonster = get().monsters.find(m => m.id === targetId);
            if (!targetMonster || targetMonster.hp <= 0) return;
        }

        // 施放成功：扣除法力并记录冷却结束时间戳
        set((state: GameState) => ({
            player: { ...state.player, stats: { ...state.player.stats, mana: state.player.stats.mana - manaCost } },
            skillCooldowns: { ...state.skillCooldowns, [skillId]: now + (skill.cooldown ?? 0) * 1000 },
        }));

        // 按技能效果结算
        if (skill.effect.kind === 'damage' && targetMonster) {
            const damage = Math.round(player.stats.attack * skill.effect.multiplier);
            const radius = skill.effect.radius;

            // 范围结算：以落点为圆心，命中半径内所有存活怪物；未配置半径时按单体结算
            if (radius) {
                const [tx, , tz] = targetMonster.position;
                const hitMonsters = get().monsters.filter(m =>
                    m.hp > 0 && Math.hypot(m.position[0] - tx, m.position[2] - tz) <= radius
                );
                hitMonsters.forEach(m =>
                    settleMonsterDamage(m.id, damage, `你施放了【${skill.name}】，对 ${m.name} 造成 ${damage} 点技能伤害!`)
                );
            } else {
                settleMonsterDamage(targetMonster.id, damage, `你施放了【${skill.name}】，对 ${targetMonster.name} 造成 ${damage} 点技能伤害!`);
            }
            return;
        }

        if (skill.effect.kind === 'heal') {
            const amount = Math.round(player.stats.maxHp * skill.effect.percent);
            set((state: GameState) => ({
                player: {
                    ...state.player,
                    stats: { ...state.player.stats, hp: Math.min(state.player.stats.maxHp, state.player.stats.hp + amount) }
                },
                logs: [...state.logs, `你施放了【${skill.name}】，恢复 ${amount} 点生命值!`].slice(-20),
            }));
        }
    },

    /**
     * 实现：动作栏绑定逻辑
     * 仅允许绑定已习得 (至少 1 级) 的主动技能；传 null 解除该槽位绑定
     */
    bindSkillToSlot: (skillId: string | null, slotIndex: number) => {
        const { skillBar, skills } = get();

        // 校验：槽位索引合法
        if (slotIndex < 0 || slotIndex >= skillBar.length) return;

        // 校验：目标技能可绑定 (存在、主动、已习得)
        if (skillId !== null) {
            const skill = skills.find(s => s.id === skillId);
            if (!skill || skill.type !== 'active' || skill.level <= 0) return;
        }

        set((state: GameState) => ({
            skillBar: state.skillBar.map((id, i) => (i === slotIndex ? skillId : id)),
            // 若当前已选定的槽位被换绑或清空，同步取消选定状态
            selectedSkillSlot: state.selectedSkillSlot === slotIndex ? null : state.selectedSkillSlot,
        }));
    },

    /**
     * 实现：选定/取消选定动作栏槽位
     * 选定后点击场景中的怪物即施放该槽位技能；空槽位不可选定
     */
    selectSkillSlot: (slotIndex: number | null) => set((state: GameState) => ({
        selectedSkillSlot: slotIndex !== null && state.skillBar[slotIndex] ? slotIndex : null
    })),
    };
});




