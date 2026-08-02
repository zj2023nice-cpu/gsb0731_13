# ⚔️ React 3D MMORPG - 神秘世界之证

一个基于 **React**, **Three.js (React Three Fiber)** 和 **Zustand** 构建的高品质 3D MMO 角色扮演游戏演示项目。

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-19-61DAFB)
![ThreeJS](https://img.shields.io/badge/Three.js-r182-black)

## ✨ 项目特色

本项目不仅是一个 3D 渲染演示，更是对 Web 端游戏 **UI 解耦逻辑** 与 **状态同步机制** 的深度探索。

- **🎮 实时 3D 交互环境**: 采用高质量光影、指数级大雾系统及 Billboard 技术，构建沉浸式神秘氛围。
- **🎒 基于 Zustand 的状态机**:
  - 全球单一状态树，实现 3D 场景数据（如角色位置、怪物血量）与 2D UI 面板的毫秒级同步。
  - 自动化的冲突管理：在此版本中，我们实现了**智能显隐逻辑**——当玩家操作复杂的 2D UI（如商店、技能树）时，3D 世界中的干扰性交互和标签会自动淡出。
- **📜 深度 RPG 核心循环**:
  - **动态商店系统**: 支持金币校验、资产扣除、背包即时新增及战斗日志记录。
  - **职业技能树 (Skill Tree)**: 包含 5 种核心技能，支持等级前置校验。实现了**被动属性加成路由**，升级技能会即时反馈到玩家的攻击/防御面板上。
  - **战斗系统**: 点击式打击逻辑，包含随机伤害波动、怪物死亡掉落金币及自动重生机制。
- **💎 玻璃拟态 UI 设计**: 采用 Glassmorphism 设计语言，配合 Framer Motion 物理动效，打造极具“高级感”的视觉体验。

## 🕹️ 操作说明

| 键位 / 动作 | 功能 |
| :--- | :--- |
| **W / A / S / D** | 移动角色 |
| **鼠标左键 (怪物)** | 执行打击动作 |
| **鼠标左键 (NPC)** | 开启交互对话 |
| **背包图标 / I 键** | 开启/关闭背包 |
| **技能图标 / K 键** | 开启技能树 |
| **🎁 按钮** | 开发者模式：一键获取测试神装 |

## 🏗️ 目录结构说明

```text
src/
├── store/          # 核心：全局游戏状态机 (gameStore.ts) - 包含所有交易、升级逻辑
├── components/
│   ├── 3d/         # 3D 实体层 (Player, Monster, NPC) - 负责渲染与基础物理碰撞
│   ├── ui/         # UI 表现层 (Shop, SkillTree, HUD) - 负责高感度交互呈现
│   └── GameScene   # 场景总入口，配置环境光照与物理引擎
├── styles/         # 全局样式，包含玻璃拟态 (Glassmorphism) 通用类
└── hooks/          # 自定义逻辑钩子，如位移平滑处理
```

## 🛠️ 技术实现细节 (核心逻辑说明)

1. **UI 堆栈与优先级**: 
   在 `NPC.tsx` 中，我们通过监听 `ui.isShopOpen` 等全局状态，计算 `showFloatingUI` 变量，解决了 HTML 面板在 3D 空间中层级混乱的问题。
2. **状态更新路由**: 
   在 `gameStore.ts` 的 `upgradeSkill` 动作中，我们采用函数式更新方式，确保在升级技能的同时，能够根据技能 ID 动态路由到属性增益逻辑（如增加防御），保证一套代码管理多种增益形式。
3. **性能优化**: 
   所有的 3D 浮动标签均采用了 `AnimatePresence` 和 `Html@react-three/drei` 的组合，并在不必要的 UI 打开时卸载 3D 对应节点，确保大场景下的帧率稳定。

## 🚀 快速开始

```bash
# 安装项目依赖
npm install

# 启动 Vite 高速开发服务器
npm run dev
```

---

Designed by **Antigravity**
"A combination of pure logic and visual aesthetic."
