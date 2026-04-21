# mbai 系统架构

## 整体架构

mbai 是一个纯前端静态站点，无后端依赖。所有数据和计算均在浏览器本地完成。

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│                   (入口 HTML)                        │
├─────────────────────────────────────────────────────┤
│                    main.ts                           │
│              ┌──────────┬──────────┐                 │
│              │ 状态管理  │ UI 渲染  │                 │
│              │ SessionState │ render() │              │
│              └────┬─────┴────┬─────┘                 │
│                   │          │                        │
│              ┌────▼──────────▼─────┐                 │
│              │   事件绑定层          │                 │
│              │   attachEvents()     │                 │
│              └──────────────────────┘                 │
├─────────────────────────────────────────────────────┤
│                  lib/evaluate.ts                      │
│              ┌──────────────────────┐                 │
│              │   计分引擎            │                 │
│              │   calculateMaster()  │                 │
│              │   calculateSubTags() │                 │
│              │   calculateEasterEgg()│                │
│              └──────────┬───────────┘                 │
│                         │                             │
│              ┌──────────▼───────────┐                 │
│              │   静态数据 (JSON)      │                 │
│              │   master-personalities │                │
│              │   questions            │                │
│              │   sub-tags             │                │
│              │   easter-eggs          │                │
│              └──────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

## 数据流

```
用户选择选项
    │
    ▼
state.answers[currentQuestion] = optionIndex
    │
    ▼
sessionStorage 持久化 (断点续答)
    │
    ▼ (答完 20 题)
evaluateMbaiResult(answers)
    │
    ├─→ calculateMaster(answers)
    │     ├─ 累加 9 维度原始分
    │     ├─ 累加 masterWeights
    │     ├─ 归一化 control/emotion → userPoint [0~1, 0~1]
    │     └─ 距离修正 + 权重排序 → bestMaster
    │
    ├─→ calculateSubTags(answers)
    │     ├─ 统计 tag 触发次数 × 权重
    │     └─ 取 score >= 2 的 top 2
    │
    └─→ calculateEasterEgg(answers, dimensions, masterCode)
          ├─ MARTYR: 温和选项 >= 5 且 random < 0.3
          ├─ CULT: multiModel > 0.8 且 emotion > 0.8 且 random < 0.25
          └─ TURING: JURY 且 TROLL+CHECK >= 7 且 random < 0.4
```

## 模块依赖

```
index.html
  └── src/main.ts
        ├── src/style.css
        ├── src/types.ts
        ├── src/lib/evaluate.ts
        │     ├── data/master-personalities.json
        │     ├── data/questions.json
        │     ├── data/sub-tags.json
        │     └── data/easter-eggs.json
        └── html2canvas (npm)
```

## 状态管理

使用单一 `SessionState` 对象 + `sessionStorage` 持久化：

```ts
interface SessionState {
  screen: 'home' | 'quiz' | 'result';  // 当前页面
  currentQuestion: number;              // 当前题号 (0-indexed)
  answers: number[];                    // 每题选项索引
  promptMode: 'light' | 'vibe' | 'efficiency'; // 提示词版本
}
```

状态变更 → `saveState()` → `render()` → `attachEvents()` 循环。

## 渲染架构

采用命令式 DOM 渲染（无虚拟 DOM、无框架）：

1. `render()` 根据 `state.screen` 分发到 `renderHero()` / `renderQuiz()` / `renderResult()`
2. 每次渲染完全替换 `#app` 的 innerHTML
3. `attachEvents()` 在每次渲染后重新绑定事件监听

## 计分引擎详解

### 9 维度体系

| 维度 | 含义 | 取值范围 |
|------|------|----------|
| control | 控制欲 | -2 ~ +2 / 题 |
| emotion | 情感投入 | -2 ~ +2 / 题 |
| dependency | 依赖程度 | -2 ~ +2 / 题 |
| social | 社交外包 | -2 ~ +2 / 题 |
| entertainment | 娱乐倾向 | -2 ~ +2 / 题 |
| immersion | 沉浸倾向 | -2 ~ +2 / 题 |
| multiModel | 多模型倾向 | -2 ~ +2 / 题 |
| urgency | 急躁程度 | -2 ~ +2 / 题 |
| expression | 表达姿态 | -2 ~ +2 / 题 |

### 归一化公式

```
normalized = max(0, min(1, (raw + 40) / 80))
```

20 题理论总分范围 -40 ~ +40，映射到 0 ~ 1。

### 主人格匹配

```
totalScore = masterWeights[code] - distance(userPoint, master.dimension) * 5
```

取 totalScore 最高的主人格。distance 为欧氏距离，权重系数 5 用于平衡维度距离与直接投票权重。

## 页面结构

### 首页 (home)

- Hero 区：品牌标语 + 开始按钮
- 样张区：3 个人格卡片预览 (CTRL / VOID / POLY)
- 介绍区：产品说明 + 功能预览
- 断点续答横幅（条件显示）

### 答题页 (quiz)

- 桌面端：左侧暗色信息栏 + 右侧答题区
- 移动端：上方信息区 + 下方答题区
- 进度条实时更新
- 选完自动跳下一题

### 结果页 (result)

- Hero 区：人格代号 + 封号 + 判词 + 维度分数
- 主栏：人格档案 / 恶习叠加 / 人格提示词
- 侧栏：传播模块 / 关系网络 / 坐标图 / 使用建议
- 隐藏导出区：html2canvas 截图用
