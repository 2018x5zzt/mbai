# mbai｜赛博嘴脸图鉴

> 测一测你和 AI 聊起来到底像什么货色。20 题，2 分钟，生成赛博人格结果卡。

## 项目定位

mbai 是一个轻娱乐人格图腾产品，不是严肃心理测试。核心目标：让用户测完想截图发出去。

- 12 个主人格图腾
- 8 个副标签恶习
- 3 个条件触发彩蛋人格
- 3 版可复制的人格提示词

## 技术栈

| 技术 | 用途 |
|------|------|
| TypeScript | 核心语言 |
| Vite 5 | 构建工具 |
| html2canvas | 结果卡截图导出 |
| 纯 DOM | 无框架，手写渲染 |

## 目录结构

```
mbai/
├── index.html              # 入口 HTML
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
├── src/
│   ├── main.ts             # 主程序：状态管理 + UI 渲染 + 事件绑定
│   ├── style.css           # 全局样式
│   ├── types.ts            # TypeScript 类型定义
│   └── lib/
│       └── evaluate.ts     # 计分引擎：人格计算 + 副标签 + 彩蛋检测
├── data/
│   ├── master-personalities.json  # 12 主人格完整数据
│   ├── questions.json             # 20 道题目 + 选项 + 维度权重
│   ├── sub-tags.json              # 8 个副标签定义
│   └── easter-eggs.json           # 3 个彩蛋触发条件
└── docs/
    ├── design/                    # 产品设计文档
    │   ├── project.md             # 产品需求 & 设计总纲 (PRD)
    │   ├── mbai-人格分类草案.md     # 人格系统数据规格
    │   ├── question-system.md     # 题目系统 & 计分算法
    │   └── result-page-template.md # 结果页 & 分享卡规范
    ├── architecture/              # 架构文档
    │   └── README.md              # 系统架构总览
    └── screenshots/               # 设计参考截图（不入 Git）
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 交互链路

```
首页 → 开始测试 → 20 题单选答题 → 本地计算人格结果 → 结果页
  └── 截图保存 / 复制文案 / 再测一次
```

## 核心页面

1. **首页** — 杂志封面式 Hero + 样张预览区 + 断点续答
2. **答题页** — 审问台式双栏结构（桌面端），进度条 + 即时跳转
3. **结果页** — 人格 Hero + 档案主栏 + 传播侧栏 + 截图导出

## 文档索引

| 文档 | 内容 |
|------|------|
| [产品需求总纲](docs/design/project.md) | 产品定义、版本范围、验收标准 |
| [人格分类草案](docs/design/mbai-人格分类草案.md) | 12 主人格 + 8 副标签 + 3 彩蛋完整数据 |
| [题目系统](docs/design/question-system.md) | 20 题内容、维度映射、计分算法 |
| [结果页规范](docs/design/result-page-template.md) | 结果页结构、分享卡内容层级、视觉规范 |
| [系统架构](docs/architecture/README.md) | 数据流、模块依赖、计分引擎说明 |
