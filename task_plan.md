# Task Plan: mbai v1.2 人格系统优化

## Goal
基于评审意见，修复计分系统、补齐弱人格题目入口、优化文案、升级关系网络，使 12 主人格都能被稳定算出且值得传播。

## Phases
- [x] Phase 1: 研究分析 — 验证评论中的问题（权重分布、彩蛋可达性）
- [x] Phase 2: 更新设计文档 — 将评审意见落入 docs/ 形成正式规格
- [x] Phase 3: 修复计分引擎 — normalizeDimension + 彩蛋触发 + traitVector
- [x] Phase 4: 更新数据文件 — 人格文案、副标签、题库、关系网络
- [x] Phase 5: 更新 UI 渲染 — 适配新数据结构
- [x] Phase 6: 验证与文档同步 — 确保代码/文档/数据一致

## Priority (from review)
1. 修彩蛋触发和归一化 (正确性)
2. 补 ORACLE/MONO/DUMP/CO 题目和权重 (覆盖率)
3. 改 3 个过狠标题 (传播性)
4. 关系网络改成定制文案 (世界观感)

## Decisions Made
- 归一化改为动态 min/max 边界（遍历题库求每维度理论极值），取代固定 (raw+40)/80
- 主人格匹配改为三项公式：masterWeights + traitSimilarity*4 - coordinateDistance*2
- 彩蛋触发改为确定性标签计数条件，移除所有随机概率
- 副标签从 8 个扩展到 13 个（+RITUAL/CHAIN/NOCONTEXT/STICKY/PATIENT）
- 题库从 20 题扩展到 25 题，覆盖弱人格入口
- 每个人格新增 traitVector、enemyLine、partnerLine 字段

## Errors Encountered
- (none)

## Status
**v1.2 全部完成** — 代码/数据/文档已同步，TypeScript 零错误，Vite 构建通过。
