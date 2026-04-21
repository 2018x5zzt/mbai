# CLAUDE.md — mbai 项目上下文

## 项目定义

mbai（赛博嘴脸图鉴）是一个纯前端轻娱乐人格测试站点。用户通过 25 道单选题，在浏览器本地计算出自己的"AI 使用人格"，生成可截图传播的结果卡。

**一句话**：不是 AI 使用习惯测试，而是"你和 AI 聊起来到底像什么货色"的赛博嘴脸图鉴。

## 技术栈

- **语言**：TypeScript (strict)
- **构建**：Vite 5, ES2020 target
- **框架**：无框架，手写 DOM 渲染
- **依赖**：html2canvas（截图导出）
- **数据**：静态 JSON，前端本地计算

## 目录结构

```
src/
├── main.ts            # 状态管理 + UI渲染 + 事件绑定（765行，待拆分）
├── style.css          # 全局样式
├── types.ts           # 类型定义（69行）
└── lib/
    └── evaluate.ts    # 计分引擎（283行）

data/                  # 静态数据（JSON）
├── master-personalities.json   # 12 主人格
├── questions.json              # 25 题 × 4 选项
├── sub-tags.json               # 13 副标签
└── easter-eggs.json            # 3 彩蛋

docs/
├── design/            # 产品设计文档（PRD、人格数据、题目系统、结果页规范）
├── architecture/      # 架构文档
└── screenshots/       # 设计参考截图（gitignored）
```

## 核心概念

### 三层人格结构

| 层 | 数量 | 作用 |
|----|------|------|
| 主人格 (MasterPersonality) | 12 | 核心身份：CTRL/VOID/POLY/AGENT/JURY/ORACLE/CO/CAST/PAPER/DUMP/LULZ/MONO |
| 副标签 (SubTag) | 13 | 恶习叠加：SPAM/FAKE/TROLL/CHECK/SHOW/RAGE/CITE/LAZY/RITUAL/CHAIN/NOCONTEXT/STICKY/PATIENT |
| 彩蛋 (EasterEgg) | 3 | 条件触发：MARTYR/CULT/TURING |

### 9 维度体系

control / emotion / dependency / social / entertainment / immersion / multiModel / urgency / expression

每题每选项对各维度贡献 -2 ~ +2 分。最终 control 和 emotion 通过动态 min/max 归一化到 [0,1] 形成二维坐标。

### 计分流程

1. 累加 25 题选项的维度分和 masterWeights
2. 动态 min/max 归一化 control/emotion → userPoint
3. 对每个主人格计算 `masterWeights[code] + traitSimilarity * 4 - coordinateDistance * 2`
4. 取最高分为结果人格

### 状态管理

```ts
interface SessionState {
  screen: 'home' | 'quiz' | 'result';
  currentQuestion: number;
  answers: number[];
  promptMode: 'light' | 'vibe' | 'efficiency';
}
```

使用 sessionStorage 持久化，支持断点续答。

## 渲染模式

命令式 innerHTML 替换。每次 state 变更调用 `render()` → 全量替换 `#app` → `attachEvents()` 重绑事件。

## 已知技术债

1. `main.ts` 765 行，混合了状态管理、3 个页面渲染、事件绑定、工具函数，应按职责拆分
2. CSS 中存在 JS inline style 和 CSS class 混用的情况
3. 无测试覆盖
4. 无 lint / formatter 配置

## 文案原则

- 语气：毒舌、犀利、有梗、可截图
- 像一个很懂互联网的损友：损但不脏，狠但能发
- 禁止：过度病理化、下流、羞辱感、诊断口吻

## 开发命令

```bash
npm run dev      # 启动 Vite 开发服务器
npm run build    # 构建生产版本到 dist/
npm run preview  # 预览构建产物
```

## 文档索引

- 产品需求总纲：`docs/design/project.md`
- 人格系统数据：`docs/design/mbai-人格分类草案.md`
- 题目与算法：`docs/design/question-system.md`
- 结果页规范：`docs/design/result-page-template.md`
- 系统架构：`docs/architecture/README.md`
