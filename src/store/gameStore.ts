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
 * 怪物实体类型定义
 * 怪物的全部运行时数据由全局 Store 统一托管，3D 组件只负责渲染
 */
export type Monster = {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    position: [number, number, number];
    alive: boolean;
};

/**
 * 主动技能战斗参数配置
 * 独立于 Skill 展示数据，集中管理冷却、耗蓝、伤害与范围等触发细节
 * 伤害公式：(玩家攻击力 * 倍率 + 固定值) * 随机浮动，倍率/固定值随技能等级成长
 */
export type SkillCombatConfig = {
    damageMultiplier?: number;       // 一级时的伤害倍率（相对玩家攻击力）
    damagePerLevel?: number;         // 每提升一级增加的伤害倍率
    damageFlat?: number;             // 一级时的固定伤害加成
    damageFlatPerLevel?: number;     // 每提升一级增加的固定伤害
    damageType?: 'physical' | 'magic';
    healPercent?: number;            // 一级时恢复最大生命值的比例 (0-1)
    healPercentPerLevel?: number;    // 每提升一级增加的恢复比例
    aoeRadius?: number;              // 范围伤害半径（世界单位，以目标怪物为中心；不填则为单体）
    manaCost: number;                // 每次施放的法力消耗
    cooldown: number;                // 施放后的冷却时间（毫秒）
};

/**
 * 法力自然回复速率（点/秒）
 * 战斗中稳定可持续的蓝量回复来源，保证技能可循环施放
 */
export const MANA_REGEN_PER_SEC = 2;

/**
 * 主动技能战斗参数表
 * key 为技能 id，仅配置可施放的主动技能
 */
export const SKILL_COMBAT: Record<string, SkillCombatConfig> = {
    // 破军斩：150% 物理伤害起，每级 +30% 倍率；耗蓝 8，冷却 3 秒（单体）
    s1: { damageMultiplier: 1.5, damagePerLevel: 0.3, damageType: 'physical', manaCost: 8, cooldown: 3000 },
    // 烈焰喷薄：200% 魔法伤害 + 10 点固定伤害，每级 +40% 倍率与 5 点固定伤害；半径 6 范围；耗蓝 18，冷却 6 秒
    s4: { damageMultiplier: 2.0, damagePerLevel: 0.4, damageFlat: 10, damageFlatPerLevel: 5, damageType: 'magic', aoeRadius: 6, manaCost: 18, cooldown: 6000 },
    // 生命洗礼：恢复 30% 最大生命值，每级 +5%；耗蓝 15，冷却 8 秒
    s5: { healPercent: 0.3, healPercentPerLevel: 0.05, manaCost: 15, cooldown: 8000 },
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

    // 怪物实体表：场景中全部怪物的运行时数据（血量、存活状态等）
    monsters: Monster[];

    // 底部动作栏：固定 3 个槽位，值为技能 id 或 null
    actionBar: (string | null)[];
    // 当前选中待施放的主动技能 id（null 表示普通攻击）
    selectedSkillId: string | null;
    // 正在等待绑定技能的槽位索引（null 表示未处于绑定模式）
    bindingSlotIndex: number | null;

    // 冷却系统：skillId -> 冷却结束时间戳（毫秒）
    cooldowns: Record<string, number>;
    // 冷却结束反馈：skillId -> 冷却结束的时间戳（毫秒），用于动作栏播放"就绪"脉冲
    readyFlash: Record<string, number>;
    // 全局时钟（毫秒），在有技能冷却或蓝量未满时跳动，驱动倒计时与回蓝
    now: number;

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

    // --- 动作栏与战斗动作 ---
    setBindingSlot: (slotIndex: number | null) => void;              // 进入/退出某个槽位的绑定模式（绑定时自动拉起技能树）
    bindSkillToSlot: (slotIndex: number, skillId: string) => void;   // 将指定主动技能绑定到动作栏槽位
    unbindSlot: (slotIndex: number) => void;                         // 解除某个槽位的技能绑定
    selectSkill: (skillId: string | null) => void;                   // 选中/取消选中待施放的主动技能
    attackMonster: (monsterId: string) => void;                      // 对指定怪物结算一次攻击（按选中技能或普通攻击）
    respawnMonster: (monsterId: string) => void;                     // 怪物死亡后定时刷新
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
        { id: 's1', name: '破军斩', level: 1, maxLevel: 5, description: '对敌人造成 150% 的物理伤害。', type: 'active', icon: 'Target' },
        { id: 's2', name: '大地守护', level: 0, maxLevel: 3, description: '增加 10 点基础护甲值。', type: 'passive', icon: 'Shield' },
        { id: 's3', name: '风之优雅', level: 0, maxLevel: 3, description: '永久增加 5% 闪避率。', type: 'passive', icon: 'Wind' },
        { id: 's4', name: '烈焰喷薄', level: 0, maxLevel: 5, description: '造成大范围远程魔法伤害。(需求：Lv.3)', requirement: 3, type: 'active', icon: 'Flame' },
        { id: 's5', name: '生命洗礼', level: 0, maxLevel: 5, description: '立即恢复 30% 生命值。(需求：Lv.5)', requirement: 5, type: 'active', icon: 'Heart' },
    ],
    skillPoints: 5, // 初始测试技能点
    // 初始化场景怪物（与原 GameScene 中手动配置的怪物保持一致）
    monsters: [
        { id: 'm1', name: '史莱姆', level: 1, hp: 30, maxHp: 30, position: [5, 0, 5], alive: true },
        { id: 'm2', name: '哥布林', level: 2, hp: 50, maxHp: 50, position: [-5, 0, 8], alive: true },
        { id: 'm3', name: '野狼', level: 3, hp: 80, maxHp: 80, position: [8, 0, -5], alive: true },
        { id: 'm4', name: '史莱姆', level: 1, hp: 30, maxHp: 30, position: [10, 0, 0], alive: true },
        { id: 'm5', name: '精英哥布林', level: 5, hp: 150, maxHp: 150, position: [-8, 0, -8], alive: true },
    ],
    // 底部动作栏初始为空（3 个槽位）
    actionBar: [null, null, null],
    selectedSkillId: null,
    bindingSlotIndex: null,
    // 冷却系统初始无冷却记录，时钟取当前时间
    cooldowns: {},
    readyFlash: {},
    now: Date.now(),
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
        ui: { ...state.ui, isSkillsOpen: open },
        // 关闭技能树时同步退出绑定模式，避免悬空状态
        bindingSlotIndex: open ? state.bindingSlotIndex : null,
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
     * 实现：进入/退出某个动作栏槽位的绑定模式
     * 进入绑定时自动拉起技能树面板，方便玩家选择要绑定的主动技能
     */
    setBindingSlot: (slotIndex) => set((state: GameState) => ({
        bindingSlotIndex: slotIndex,
        ui: slotIndex !== null ? { ...state.ui, isSkillsOpen: true } : state.ui,
    })),

    /**
     * 实现：将主动技能绑定到指定动作栏槽位
     * 仅允许绑定已学会（level > 0）的主动技能；绑定后自动退出绑定模式
     */
    bindSkillToSlot: (slotIndex, skillId) => set((state: GameState) => {
        // 槽位越界保护
        if (slotIndex < 0 || slotIndex >= state.actionBar.length) return state;

        const skill = state.skills.find(s => s.id === skillId);
        // 仅主动且已学会的技能可绑定
        if (!skill || skill.type !== 'active' || skill.level <= 0) return state;

        const newBar = [...state.actionBar];
        newBar[slotIndex] = skillId;

        return {
            actionBar: newBar,
            bindingSlotIndex: null,
            logs: [...state.logs.slice(-19), `【快捷栏】${skill.name} 已绑定到第 ${slotIndex + 1} 格。`],
        };
    }),

    /**
     * 实现：解除指定槽位的技能绑定
     * 若被解绑的技能正处于选中状态，同步取消选中
     */
    unbindSlot: (slotIndex) => set((state: GameState) => {
        if (slotIndex < 0 || slotIndex >= state.actionBar.length) return state;
        const skillId = state.actionBar[slotIndex];
        if (!skillId) return state;

        const skill = state.skills.find(s => s.id === skillId);
        const newBar = [...state.actionBar];
        newBar[slotIndex] = null;

        return {
            actionBar: newBar,
            selectedSkillId: state.selectedSkillId === skillId ? null : state.selectedSkillId,
            logs: [...state.logs.slice(-19), `【快捷栏】已移除第 ${slotIndex + 1} 格技能${skill ? ` ${skill.name}` : ''}。`],
        };
    }),

    /**
     * 实现：选中/取消选中待施放的主动技能
     * 再次点击已选中的技能即取消，回到普通攻击；点击其它技能则切换
     */
    selectSkill: (skillId) => set((state: GameState) => ({
        selectedSkillId: state.selectedSkillId === skillId ? null : skillId,
    })),

    /**
     * 实现：对指定怪物结算一次攻击
     * - 选中已学会的主动技能时：先校验冷却与法力，通过后扣蓝、进入冷却并按技能参数结算
     *   · 治疗类：只恢复自身生命
     *   · 范围技能（aoeRadius）：以目标为中心命中半径内全部存活怪物
     *   · 其他伤害类：单体结算
     * - 未选中技能（或技能不可用）时：执行普通攻击，不受冷却与法力限制
     * 每个被击杀的怪物各自结算金币并安排 5 秒后刷新
     */
    attackMonster: (monsterId) => {
        const state = get();
        const monster = state.monsters.find(m => m.id === monsterId);
        if (!monster || !monster.alive) return;

        const castTime = Date.now();
        const skillId = state.selectedSkillId;
        const skill = skillId ? state.skills.find(s => s.id === skillId) : null;
        const cfg = skillId ? SKILL_COMBAT[skillId] : null;
        const isSkillCast = !!(skill && cfg && skill.level > 0);

        // 主动技能施放前的资源/冷却校验（普通攻击跳过这些限制）
        if (isSkillCast && skill && cfg) {
            // 冷却校验：记录中的结束时间晚于当前时间即视为冷却中
            const cooldownEnd = state.cooldowns[skill.id] ?? 0;
            if (cooldownEnd > castTime) {
                const remain = ((cooldownEnd - castTime) / 1000).toFixed(1);
                set({
                    logs: [...state.logs.slice(-19), `【${skill.name}】技能冷却中，剩余 ${remain} 秒。`]
                });
                return;
            }
            // 法力校验：当前法力不足时阻断施放并提示
            if (state.player.stats.mana < cfg.manaCost) {
                set({
                    logs: [...state.logs.slice(-19), `【${skill.name}】法力不足，需要 ${cfg.manaCost} 点法力。`]
                });
                return;
            }
        }

        // 计算本次施放的伤害或治疗量（同一次施放的伤害值固定，范围技能对所有目标相同）
        let damage = 0;
        let heal = 0;
        let isHeal = false;

        if (isSkillCast && skill && cfg) {
            if (cfg.healPercent) {
                // 治疗类技能：恢复自身生命值，不对怪物造成伤害
                isHeal = true;
                const pct = cfg.healPercent + (skill.level - 1) * (cfg.healPercentPerLevel ?? 0);
                heal = Math.floor(state.player.stats.maxHp * pct);
            } else {
                // 伤害类技能：(攻击力 * 倍率 + 固定值) * 随机浮动
                const mult = (cfg.damageMultiplier ?? 1) + (skill.level - 1) * (cfg.damagePerLevel ?? 0);
                const flat = (cfg.damageFlat ?? 0) + (skill.level - 1) * (cfg.damageFlatPerLevel ?? 0);
                const base = state.player.stats.attack;
                const variance = 0.9 + Math.random() * 0.2; // 0.9 ~ 1.1
                damage = Math.max(1, Math.floor((base * mult + flat) * variance));
            }
        } else {
            // 普通攻击：保留原有的随机伤害区间
            damage = Math.floor(Math.random() * 6) + 5;
        }

        // 确定本次攻击命中的目标集合
        let targets: Monster[];
        if (isHeal) {
            targets = []; // 治疗不命中任何怪物
        } else if (isSkillCast && cfg?.aoeRadius) {
            // 范围技能：以被点击怪物为中心，收集半径内所有存活怪物（按 xz 平面距离）
            const radius = cfg.aoeRadius;
            targets = state.monsters.filter(m => {
                if (!m.alive) return false;
                const dx = m.position[0] - monster.position[0];
                const dz = m.position[2] - monster.position[2];
                return Math.sqrt(dx * dx + dz * dz) <= radius;
            });
        } else {
            targets = [monster];
        }

        // 对每个目标结算伤害与死亡
        const killedIds: string[] = [];
        let goldGain = 0;
        const newMonsters = state.monsters.map(m => {
            const hit = targets.find(t => t.id === m.id);
            if (!hit) return m;
            const newHp = Math.max(0, m.hp - damage);
            const died = newHp <= 0;
            if (died) {
                killedIds.push(m.id);
                goldGain += 10;
            }
            return { ...m, hp: newHp, alive: !died };
        });

        // 玩家属性结算：治疗回血 + 技能扣蓝
        let newStats = state.player.stats;
        if (heal > 0) {
            newStats = {
                ...newStats,
                hp: Math.min(newStats.maxHp, newStats.hp + heal),
            };
        }
        if (isSkillCast && cfg) {
            newStats = {
                ...newStats,
                mana: Math.max(0, newStats.mana - cfg.manaCost),
            };
        }

        // 组装日志
        const logs = [...state.logs.slice(-19)];
        if (isHeal && skill) {
            logs.push(`【${skill.name} LV.${skill.level}】生命洗礼，恢复了 ${heal} 点生命值！`);
        } else if (isSkillCast && skill && cfg) {
            const typeLabel = cfg.damageType === 'magic' ? '魔法' : '物理';
            if (cfg.aoeRadius) {
                const hitNames = targets.map(t => t.name).join('、');
                logs.push(`【${skill.name} LV.${skill.level}】${typeLabel}爆发命中 ${hitNames} 共 ${targets.length} 只怪物，各造成 ${damage} 点伤害！（消耗 ${cfg.manaCost} 法力）`);
            } else {
                logs.push(`【${skill.name} LV.${skill.level}】命中 ${monster.name}，造成 ${damage} 点${typeLabel}伤害！（消耗 ${cfg.manaCost} 法力）`);
            }
        } else {
            logs.push(`你攻击了 ${monster.name}, 造成 ${damage} 点伤害!`);
        }
        for (const id of killedIds) {
            const killed = state.monsters.find(m => m.id === id);
            if (killed) logs.push(`${killed.name} 被击败了! 获得 10 金币.`);
        }

        // 技能施放成功：写入冷却结束时间戳并启动游戏时钟（驱动倒计时与回蓝）
        let newCooldowns = state.cooldowns;
        if (isSkillCast && skill && cfg) {
            newCooldowns = { ...state.cooldowns, [skill.id]: castTime + cfg.cooldown };
            startGameTicker();
        }

        set({
            monsters: newMonsters,
            player: {
                ...state.player,
                stats: newStats,
                gold: state.player.gold + goldGain,
            },
            logs,
            cooldowns: newCooldowns,
        });

        // 每个被击杀的怪物各自 5 秒后在原位置刷新
        for (const id of killedIds) {
            setTimeout(() => {
                get().respawnMonster(id);
            }, 5000);
        }
    },

    /**
     * 实现：怪物刷新
     * 将指定怪物血量回满并置为存活，记录刷新日志
     */
    respawnMonster: (monsterId) => set((state: GameState) => {
        const monster = state.monsters.find(m => m.id === monsterId);
        if (!monster) return state;
        return {
            monsters: state.monsters.map(m =>
                m.id === monsterId ? { ...m, hp: m.maxHp, alive: true } : m
            ),
            logs: [...state.logs.slice(-19), `系统：${monster.name} 已在其领地重新刷新。`],
        };
    }),
}));

/**
 * 游戏时钟（模块级单例）
 * 在「有技能冷却中」或「蓝量未回满」时运行，每 100ms 推进一次：
 *   1. 推进全局时钟 now，驱动动作栏冷却倒计时
 *   2. 清理已到期的冷却记录；技能刚从冷却中恢复时写入 readyFlash 并提示日志
 *   3. 按 MANA_REGEN_PER_SEC 稳定回复法力（带小数累加器，避免低速率下不回蓝）
 * 全部冷却结束且蓝量回满后自动停止，避免空转。
 */
let gameTimer: ReturnType<typeof setInterval> | null = null;
let lastTickAt = 0;
let manaFraction = 0;

function startGameTicker() {
    if (gameTimer) return;
    lastTickAt = Date.now();
    gameTimer = setInterval(tick, 100);
}

function tick() {
    const state = useGameStore.getState();
    const now = Date.now();
    const delta = now - lastTickAt;
    lastTickAt = now;

    // 1. 冷却清理：分离仍在冷却与刚刚结束的技能
    let hasActiveCooldown = false;
    const nextCooldowns: Record<string, number> = {};
    const justReady: string[] = [];
    for (const id in state.cooldowns) {
        if (state.cooldowns[id] > now) {
            nextCooldowns[id] = state.cooldowns[id];
            hasActiveCooldown = true;
        } else {
            justReady.push(id);
        }
    }

    // 2. 冷却结束反馈：写入 readyFlash 时间戳（驱动动作栏脉冲）并添加日志
    const nextReadyFlash = { ...state.readyFlash };
    const newLogs: string[] = [];
    for (const id of justReady) {
        nextReadyFlash[id] = now;
        const skill = state.skills.find(s => s.id === id);
        if (skill) newLogs.push(`【${skill.name}】冷却结束，可以再次施放。`);
    }
    // 清理超过 2 秒的就绪脉冲记录，避免状态无限增长
    for (const id in nextReadyFlash) {
        if (now - nextReadyFlash[id] > 2000) delete nextReadyFlash[id];
    }

    // 3. 法力自然回复：按真实经过时间累加，攒满 1 点才写入状态
    const stats = state.player.stats;
    let manaGain = 0;
    if (stats.mana < stats.maxMana) {
        manaFraction += (MANA_REGEN_PER_SEC / 1000) * delta;
        if (manaFraction >= 1) {
            manaGain = Math.floor(manaFraction);
            manaFraction -= manaGain;
        }
    } else {
        manaFraction = 0;
    }

    const manaFull = stats.mana >= stats.maxMana;

    // 无事可做且没有冷却、蓝已满：停表
    if (!hasActiveCooldown && manaFull && justReady.length === 0 && manaGain === 0) {
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
        return;
    }

    const updates: Partial<GameState> = {
        now,
        cooldowns: nextCooldowns,
        readyFlash: nextReadyFlash,
    };
    if (manaGain > 0) {
        updates.player = {
            ...state.player,
            stats: { ...stats, mana: Math.min(stats.maxMana, stats.mana + manaGain) },
        };
    }
    if (newLogs.length > 0) {
        updates.logs = [...state.logs.slice(-19), ...newLogs].slice(-20);
    }
    useGameStore.setState(updates);
}


