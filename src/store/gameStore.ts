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
    manaRegen: number;  // 每秒自然回复的法力值
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
 * 技能战斗效果定义
 * 描述主动技能在施放时产生的数值结算，等级相关数值通过 perLevel 叠加
 */
export type SkillEffect = {
    kind: 'damage' | 'heal';                    // 效果类别：伤害 / 治疗
    attackMultiplier?: number;                  // 基于玩家攻击力的倍率（一级时）
    multiplierPerLevel?: number;                // 每级额外提升的倍率
    fixedBonus?: number;                        // 固定附加数值（一级时）
    bonusPerLevel?: number;                     // 每级额外提升的固定数值
    hpPercent?: number;                         // 基于目标（伤害）/自身（治疗）最大生命值的百分比（一级时）
    hpPercentPerLevel?: number;                 // 每级额外提升的百分比
    aoeRadius?: number;                         // 范围伤害半径（世界单位）；缺省视为单体
    manaCost?: number;                          // 施放消耗的法力值
    cooldown?: number;                          // 冷却时间（毫秒）
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
    effects?: SkillEffect[]; // 主动技能的战斗结算效果（被动技能此字段为空）
};

/**
 * 怪物实体类型定义
 * 怪物的运行时状态统一由全局 Store 管理，保证 3D 渲染层与 UI 日志层解耦
 */
export type MonsterEntity = {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    position: [number, number, number];
    alive: boolean; // 是否存活（死亡后等待重生）
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

    // 动作栏系统：三个可绑定主动技能的快捷槽位
    actionBarSlots: (string | null)[]; // 每个槽位存放 skillId 或 null
    selectedSkillId: string | null;    // 当前已选中、准备施放的主动技能 ID（null 表示普通攻击）

    // 技能冷却记录：skillId -> 冷却结束的时间戳（毫秒）
    cooldowns: Record<string, number>;

    // 场景中的怪物实体集合
    monsters: MonsterEntity[];

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

    // 动作栏与技能施放相关动作
    bindSkillToSlot: (skillId: string, slotIndex: number) => void;   // 将主动技能绑定至指定动作栏槽位
    clearSkillSlot: (slotIndex: number) => void;                     // 清空指定动作栏槽位上的技能
    selectSkillSlot: (slotIndex: number) => void;                    // 选中/取消选中某个动作栏槽位
    attackMonster: (monsterId: string) => void;                      // 对指定怪物执行一次攻击（普通攻击或已选中的主动技能）
    respawnMonster: (monsterId: string) => void;                     // 将指定怪物重置为满血存活状态
    getSkillCooldownRemaining: (skillId: string) => number;          // 查询指定技能剩余冷却毫秒数（0 表示就绪）
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
            manaRegen: 3,
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
        {
            id: 's1', name: '破军斩', level: 1, maxLevel: 5,
            description: '对敌人造成 150% 的物理伤害。',
            type: 'active', icon: 'Target',
            effects: [{
                kind: 'damage',
                attackMultiplier: 1.5,
                multiplierPerLevel: 0.3,
                manaCost: 5,
                cooldown: 1500,
            }],
        },
        { id: 's2', name: '大地守护', level: 0, maxLevel: 3, description: '增加 10 点基础护甲值。', type: 'passive', icon: 'Shield' },
        { id: 's3', name: '风之优雅', level: 0, maxLevel: 3, description: '永久增加 5% 闪避率。', type: 'passive', icon: 'Wind' },
        {
            id: 's4', name: '烈焰喷薄', level: 0, maxLevel: 5,
            description: '造成大范围远程魔法伤害。(需求：Lv.3)', requirement: 3,
            type: 'active', icon: 'Flame',
            effects: [{
                kind: 'damage',
                attackMultiplier: 2.0,
                multiplierPerLevel: 0.4,
                fixedBonus: 5,
                bonusPerLevel: 3,
                aoeRadius: 10,
                manaCost: 12,
                cooldown: 3000,
            }],
        },
        {
            id: 's5', name: '生命洗礼', level: 0, maxLevel: 5,
            description: '立即恢复 30% 生命值。(需求：Lv.5)', requirement: 5,
            type: 'active', icon: 'Heart',
            effects: [{
                kind: 'heal',
                hpPercent: 0.3,
                hpPercentPerLevel: 0.05,
                manaCost: 15,
                cooldown: 8000,
            }],
        },
    ],
    skillPoints: 5, // 初始测试技能点

    // 动作栏初始状态：三个空槽位，默认未选中任何技能
    actionBarSlots: [null, null, null],
    selectedSkillId: null,

    // 技能冷却表初始为空（所有技能默认就绪）
    cooldowns: {},

    // 场景怪物初始化（与 GameScene 中生成的怪物一一对应）
    monsters: [
        { id: 'm1', name: '史莱姆', level: 1, hp: 30, maxHp: 30, position: [5, 0, 5], alive: true },
        { id: 'm2', name: '哥布林', level: 2, hp: 50, maxHp: 50, position: [-5, 0, 8], alive: true },
        { id: 'm3', name: '野狼', level: 3, hp: 80, maxHp: 80, position: [8, 0, -5], alive: true },
        { id: 'm4', name: '史莱姆', level: 1, hp: 30, maxHp: 30, position: [10, 0, 0], alive: true },
        { id: 'm5', name: '精英哥布林', level: 5, hp: 150, maxHp: 150, position: [-8, 0, -8], alive: true },
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
     * 实现：将已学习的主动技能绑定到指定动作栏槽位
     * 校验：技能存在、为主动技能、等级大于 0；槽位越界则忽略
     */
    bindSkillToSlot: (skillId: string, slotIndex: number) => set((state: GameState) => {
        if (slotIndex < 0 || slotIndex >= state.actionBarSlots.length) return state;

        const skill = state.skills.find(s => s.id === skillId);
        if (!skill || skill.type !== 'active' || skill.level <= 0) {
            return {
                logs: [...state.logs.slice(-19), `【技能】无法绑定该技能到动作栏。`]
            };
        }

        const newSlots = [...state.actionBarSlots];
        newSlots[slotIndex] = skillId;

        return {
            actionBarSlots: newSlots,
            logs: [...state.logs.slice(-19), `【技能】${skill.name} 已绑定至动作栏槽位 ${slotIndex + 1}。`]
        };
    }),

    /**
     * 实现：清空指定动作栏槽位；若该槽位上的技能正被选中，则一并取消选中
     */
    clearSkillSlot: (slotIndex: number) => set((state: GameState) => {
        if (slotIndex < 0 || slotIndex >= state.actionBarSlots.length) return state;

        const skillId = state.actionBarSlots[slotIndex];
        const newSlots = [...state.actionBarSlots];
        newSlots[slotIndex] = null;

        return {
            actionBarSlots: newSlots,
            selectedSkillId: state.selectedSkillId === skillId ? null : state.selectedSkillId,
        };
    }),

    /**
     * 实现：选中/取消选中动作栏槽位
     * 点击已选中的槽位会取消选中（回到普通攻击）
     */
    selectSkillSlot: (slotIndex: number) => set((state: GameState) => {
        if (slotIndex < 0 || slotIndex >= state.actionBarSlots.length) return state;

        const skillId = state.actionBarSlots[slotIndex];
        if (!skillId) return state; // 空槽位不响应选中

        // 再次点击已选中的槽位则取消选中
        if (state.selectedSkillId === skillId) {
            return { selectedSkillId: null };
        }

        const skill = state.skills.find(s => s.id === skillId);
        return {
            selectedSkillId: skillId,
            logs: [...state.logs.slice(-19), `【战斗】已选中技能：${skill?.name ?? '未知技能'}。`]
        };
    }),

    /**
     * 实现：怪物重生
     * 将怪物 HP 恢复至满血并标记为存活
     */
    respawnMonster: (monsterId: string) => set((state: GameState) => ({
        monsters: state.monsters.map(m =>
            m.id === monsterId ? { ...m, hp: m.maxHp, alive: true } : m
        ),
    })),

    /**
     * 实现：查询指定技能的剩余冷却毫秒数
     * 返回 0 表示技能已就绪；UI 可轮询此值用于倒计时显示
     */
    getSkillCooldownRemaining: (skillId: string) => {
        const endAt = get().cooldowns[skillId];
        if (!endAt) return 0;
        return Math.max(0, endAt - Date.now());
    },

    /**
     * 实现：攻击怪物
     * 统一的战斗结算入口：
     *   - 未选中技能时执行普通攻击（不受冷却/耗蓝限制）
     *   - 选中主动技能时先校验冷却与法力，再按技能 effects 结算
     * 含 aoeRadius 的伤害效果会命中目标周围半径内的所有存活怪物。
     * 所有数值变化、金币奖励、死亡重生、失败日志均通过全局状态派发。
     */
    attackMonster: (monsterId: string) => set((state: GameState) => {
        const target = state.monsters.find(m => m.id === monsterId);
        if (!target || !target.alive) return state;

        const skill = state.selectedSkillId
            ? state.skills.find(s => s.id === state.selectedSkillId)
            : null;

        // 仅主动技能且已学习才参与技能结算，其余情况回退到普通攻击
        const useSkill = !!(skill && skill.type === 'active' && skill.level > 0 && skill.effects);

        const newLogs: string[] = [];
        // 对单个怪物的技能伤害值（AoE 时对所有命中目标使用同一技能伤害）
        let skillDamage = 0;
        let healAmount = 0;
        // 实际被命中的怪物集合（普通攻击/单体技能只有主目标，AoE 技能可能有多只）
        let hitMonsters: MonsterEntity[] = [target];
        const newPlayerStats = { ...state.player.stats };
        const newCooldowns = { ...state.cooldowns };

        if (useSkill && skill!.effects) {
            const levelIndex = skill!.level - 1;

            // 汇总该技能所有 effects 中声明的耗蓝与冷却
            const manaCost = skill!.effects.reduce(
                (sum, e) => sum + (e.manaCost ?? 0), 0
            );
            const cooldownMs = skill!.effects.reduce(
                (max, e) => Math.max(max, e.cooldown ?? 0), 0
            );

            // 1) 冷却校验：未走完冷却则直接拒绝施放，同时记录日志（不产生普攻）
            const cooldownEnd = state.cooldowns[skill!.id];
            const remaining = cooldownEnd ? Math.max(0, cooldownEnd - Date.now()) : 0;
            if (remaining > 0) {
                return {
                    logs: [...state.logs.slice(-19),
                        `【技能】${skill!.name} 冷却中，剩余 ${(remaining / 1000).toFixed(1)} 秒。`]
                };
            }

            // 2) 法力校验：不足则拒绝施放（不产生普攻）
            if (state.player.stats.mana < manaCost) {
                return {
                    logs: [...state.logs.slice(-19),
                        `【技能】法力不足，无法施放 ${skill!.name}（需要 ${manaCost} 点法力）。`]
                };
            }

            // 3) 扣蓝、进入冷却
            newPlayerStats.mana = Math.max(0, state.player.stats.mana - manaCost);
            if (cooldownMs > 0) {
                newCooldowns[skill!.id] = Date.now() + cooldownMs;
            }

            // 4) 按 effects 结算伤害与治疗，并收集 AoE 范围信息
            let aoeRadius = 0;
            for (const effect of skill!.effects) {
                if (effect.kind === 'damage') {
                    const multiplier =
                        (effect.attackMultiplier ?? 0) +
                        (effect.multiplierPerLevel ?? 0) * levelIndex;
                    const bonus =
                        (effect.fixedBonus ?? 0) +
                        (effect.bonusPerLevel ?? 0) * levelIndex;

                    // 技能伤害面板值：基于玩家攻击力（与目标无关，AoE 对所有命中目标相同）
                    skillDamage += Math.max(
                        0,
                        Math.floor(state.player.stats.attack * multiplier + bonus)
                    );

                    // 取所有伤害 effect 中最大的范围半径作为本次技能的 AoE 半径
                    if (effect.aoeRadius && effect.aoeRadius > aoeRadius) {
                        aoeRadius = effect.aoeRadius;
                    }
                } else if (effect.kind === 'heal') {
                    const pct =
                        (effect.hpPercent ?? 0) +
                        (effect.hpPercentPerLevel ?? 0) * levelIndex;
                    healAmount += Math.floor(state.player.stats.maxHp * pct);
                }
            }

            // 5) 确定命中目标集合：若存在 AoE 半径，查找目标周围存活怪物
            if (aoeRadius > 0) {
                const r2 = aoeRadius * aoeRadius;
                hitMonsters = state.monsters.filter(m => {
                    if (!m.alive) return false;
                    const dx = m.position[0] - target.position[0];
                    const dz = m.position[2] - target.position[2];
                    return dx * dx + dz * dz <= r2;
                });
            }
        } else {
            // 普通攻击：基于玩家攻击力并附小幅随机浮动，不消耗法力也不进入冷却
            const base = state.player.stats.attack;
            skillDamage = Math.max(1, Math.floor(base * (0.9 + Math.random() * 0.2)));
        }

        // 对所有命中怪物逐个结算伤害与死亡
        let goldGain = 0;
        const killedIds: string[] = [];
        const newMonsters = state.monsters.map(m => {
            const hit = hitMonsters.find(h => h.id === m.id);
            if (!hit) return m;

            const newHp = Math.max(0, m.hp - skillDamage);
            const killed = newHp === 0;
            if (killed) {
                goldGain += 10;
                killedIds.push(m.id);
            }
            return { ...m, hp: newHp, alive: !killed };
        });

        // 写战斗日志（技能 vs 普攻、单体 vs AoE 分别提示）
        if (useSkill && skill) {
            if (hitMonsters.length > 1) {
                const names = hitMonsters.map(m => m.name).join('、');
                newLogs.push(
                    `你施放了 ${skill.name}，波及 ${hitMonsters.length} 个目标（${names}），各造成 ${skillDamage} 点伤害！`
                );
            } else {
                newLogs.push(
                    `你施放了 ${skill.name}，对 ${target.name} 造成 ${skillDamage} 点伤害！`
                );
            }
        } else {
            newLogs.push(`你攻击了 ${target.name}，造成 ${skillDamage} 点伤害！`);
        }

        // 治疗效果结算
        if (healAmount > 0) {
            const beforeHeal = newPlayerStats.hp;
            newPlayerStats.hp = Math.min(
                state.player.stats.maxHp,
                beforeHeal + healAmount
            );
            const healed = newPlayerStats.hp - beforeHeal;
            newLogs.push(`你恢复了 ${healed} 点生命值。`);
        }

        // 死亡日志与重生计时
        if (killedIds.length > 0) {
            for (const id of killedIds) {
                const m = state.monsters.find(x => x.id === id)!;
                newLogs.push(`${m.name} 被击败了！获得 10 金币。`);
                setTimeout(() => {
                    useGameStore.getState().respawnMonster(id);
                    useGameStore.getState().addLog(`【系统】${m.name} 已在其领地重新刷新。`);
                }, 5000);
            }
        }

        return {
            monsters: newMonsters,
            cooldowns: newCooldowns,
            player: {
                ...state.player,
                gold: state.player.gold + goldGain,
                stats: newPlayerStats,
            },
            logs: [...state.logs.slice(-19), ...newLogs],
        };
    }),
}));

/**
 * 全局游戏循环（轻量 tick，每 1000ms 一次）
 * 职责：
 *   1. 按 player.stats.manaRegen 自然回复法力（不超过上限）
 *   2. 检测已结束的技能冷却，从 cooldowns 表中清理并写入就绪日志
 * 所有状态变化仍通过 store action 派发，组件层只负责渲染。
 */
const TICK_INTERVAL_MS = 1000;
if (typeof window !== 'undefined') {
    window.setInterval(() => {
        const state = useGameStore.getState();
        const now = Date.now();

        // 1) 法力自然回复
        if (state.player.stats.mana < state.player.stats.maxMana) {
            const nextMana = Math.min(
                state.player.stats.maxMana,
                state.player.stats.mana + state.player.stats.manaRegen
            );
            if (nextMana !== state.player.stats.mana) {
                useGameStore.setState({
                    player: {
                        ...state.player,
                        stats: { ...state.player.stats, mana: nextMana },
                    },
                });
            }
        }

        // 2) 冷却结束检测：找出所有已到期的 skillId
        const expiredIds = Object.entries(state.cooldowns)
            .filter(([, endAt]) => endAt <= now)
            .map(([id]) => id);

        if (expiredIds.length > 0) {
            const nextCooldowns = { ...state.cooldowns };
            const readyLogs: string[] = [];
            for (const id of expiredIds) {
                delete nextCooldowns[id];
                const skill = state.skills.find(s => s.id === id);
                if (skill) {
                    readyLogs.push(`【技能】${skill.name} 冷却结束，可以再次施放。`);
                }
            }
            useGameStore.setState({
                cooldowns: nextCooldowns,
                logs: [...useGameStore.getState().logs.slice(-19), ...readyLogs],
            });
        }
    }, TICK_INTERVAL_MS);
}




