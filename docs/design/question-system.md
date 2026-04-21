# mbai 题目系统与计分算法 v1.1

- 文档状态：开发就绪
- 文档角色：题库、维度映射、结果计算的实现依据
- 当前版本：20 题，单选，4 选项，加权维度匹配

---

## 1. 基本结构

- 总题量：`20`
- 单题选项数：`4`
- 题型：单选
- 预计时长：约 `2` 分钟
- 计算方式：**维度归一化 + 主人格加权 + 二维坐标距离修正**

### 1.1 答题页体验目标

答题页不是传统测试表单，而是：

> **一块在盘问用户真实 AI 说话方式的赛博审问台**

当前落地规则：

- 左侧 / 上方信息栏负责显示题号、进度、答题原则、重开与返回操作
- 右侧 / 下方主舞台只放一个问题，避免多余干扰
- 问题文案必须足够大，首屏先看到题，不先看到按钮
- 选项需要像“行为认领”而不是“标准答案”
- 答题时应保持高节奏，单题选择后直接进入下一题

### 1.2 答题页文案原则

- 标题用具体场景，不用抽象人格学口吻
- 副文案负责提醒用户：`选真实的你，不选体面的你`
- 选项描述必须一眼能让用户代入自己的常用说法
- 辅助提示只做节奏提醒，不做心理解释

---

## 2. 数据结构

### 2.1 选项结构

```ts
interface Option {
  text: string;
  dimensions: {
    control: number;
    emotion: number;
    dependency: number;
    social: number;
    entertainment: number;
    immersion: number;
    multiModel: number;
    urgency: number;
    expression: number;
  };
  tags: string[];
  masterWeights: Record<string, number>;
}
```

### 2.2 维度说明

| 维度 | 说明 |
| --- | --- |
| `control` | 控制欲 |
| `emotion` | 情感投入 |
| `dependency` | 依赖程度 |
| `social` | 社交外包 |
| `entertainment` | 娱乐倾向 |
| `immersion` | 沉浸倾向 |
| `multiModel` | 多模型倾向 |
| `urgency` | 急躁程度 |
| `expression` | 表达姿态 |

### 2.3 归一化规则

因为单题对维度的影响范围是 `-2 ~ +2`，20 题理论总分范围为 `-40 ~ +40`。

为了和主人格的二维坐标 `0 ~ 1` 对齐，计算前需要做归一化：

```ts
function normalizeDimension(raw: number): number {
  return Math.max(0, Math.min(1, (raw + 40) / 80));
}
```

二维人格坐标图只使用：

- `control`
- `emotion`

---

## 3. 题库

### Q1. AI 思考超过 5 秒，你最可能：

- A. 继续等一下
  - `dimensions`: `control:-1, emotion:+1, urgency:-1`
  - `tags`: `[]`
- B. 发一句“继续”
  - `dimensions`: `control:+1, urgency:+1`
  - `tags`: `[SPAM]`
- C. 连发几句“快点”
  - `dimensions`: `control:+2, urgency:+2`
  - `tags`: `[SPAM, RAGE]`
  - `masterWeights`: `{ CTRL: 2 }`
- D. 直接换另一个模型
  - `dimensions`: `multiModel:+2, control:+1`
  - `tags`: `[CHECK]`
  - `masterWeights`: `{ POLY: 2 }`

### Q2. 你更常把什么东西丢给 AI？

- A. 一个模糊任务：你帮我搞定
  - `dimensions`: `control:+1, dependency:+1`
  - `tags`: `[LAZY]`
- B. 一段聊天记录：你帮我回
  - `dimensions`: `social:+2`
  - `tags`: `[SHOW]`
  - `masterWeights`: `{ AGENT: 2 }`
- C. 一坨情绪：你帮我懂
  - `dimensions`: `emotion:+2, dependency:+1`
  - `tags`: `[RAGE]`
  - `masterWeights`: `{ VOID: 2 }`
- D. 一个离谱念头：你帮我整更癫一点
  - `dimensions`: `entertainment:+2`
  - `tags`: `[]`
  - `masterWeights`: `{ LULZ: 2, CO: 1 }`

### Q3. 当 AI 说“作为 AI 我不能……”时，你更可能：

- A. 算了，换个问法
  - `dimensions`: `control:-1, emotion:-1`
- B. 给它补设定，继续试
  - `dimensions`: `control:+2, immersion:+1`
  - `tags`: `[TROLL]`
  - `masterWeights`: `{ CAST: 2 }`
- C. 让它别出戏
  - `dimensions`: `immersion:+2`
  - `masterWeights`: `{ CAST: 2 }`
- D. 开始和它讲道理
  - `dimensions`: `emotion:+1`
  - `tags`: `[TROLL]`
  - `masterWeights`: `{ JURY: 2 }`

### Q4. 面对一个重要问题，你会不会同时问多个 AI？

- A. 不会，一个就够了
  - `dimensions`: `multiModel:-2`
  - `masterWeights`: `{ MONO: 3 }`
- B. 偶尔会，对比一下
  - `dimensions`: `multiModel:+1`
  - `tags`: `[CHECK]`
- C. 会，我想看谁更靠谱
  - `dimensions`: `multiModel:+2`
  - `tags`: `[CHECK]`
  - `masterWeights`: `{ POLY: 1 }`
- D. 会，而且我还会把它们的回答互相丢给对方继续吵
  - `dimensions`: `multiModel:+2, entertainment:+1`
  - `tags`: `[SHOW]`
  - `masterWeights`: `{ JURY: 3, POLY: 2 }`

### Q5. 你最希望 AI 给你的，不一定是答案，而是：

- A. 结构化结果
  - `dimensions`: `control:+1, dependency:+1`
  - `tags`: `[CITE]`
  - `masterWeights`: `{ PAPER: 2, CTRL: 1 }`
- B. 情绪支持
  - `dimensions`: `emotion:+2`
  - `masterWeights`: `{ VOID: 2 }`
- C. 陪伴和氛围感
  - `dimensions`: `emotion:+2, immersion:+2`
  - `masterWeights`: `{ VOID: 2, CAST: 1 }`
- D. 乐子和素材
  - `dimensions`: `entertainment:+2`
  - `tags`: `[SHOW]`
  - `masterWeights`: `{ LULZ: 2, CO: 1 }`

### Q6. 你给 AI 发消息的开头通常是：

- A. “请帮我……”
  - `dimensions`: `expression:+1`
  - `tags`: `[FAKE]`
- B. “直接说，我需要……”
  - `dimensions`: `control:+2, expression:+2`
  - `masterWeights`: `{ CTRL: 2 }`
- C. “在吗？”
  - `dimensions`: `emotion:+1, dependency:+1`
  - `masterWeights`: `{ VOID: 1 }`
- D. 直接复制粘贴问题，没有开头
  - `dimensions`: `control:+1, urgency:+1`
  - `tags`: `[LAZY, SPAM]`
  - `masterWeights`: `{ DUMP: 2 }`

### Q7. 当 AI 给了一个不太满意的回答，你会：

- A. 自己改改用
  - `dimensions`: `control:-1, dependency:-1`
- B. 追问“能不能再好一点”
  - `dimensions`: `control:+1`
  - `tags`: `[CHECK]`
  - `masterWeights`: `{ CTRL: 1 }`
- C. 换种问法重新来一遍
  - `dimensions`: `control:+1, multiModel:+1`
  - `tags`: `[CHECK]`
  - `masterWeights`: `{ POLY: 1 }`
- D. 把问题丢给另一个 AI
  - `dimensions`: `multiModel:+2`
  - `tags`: `[CHECK]`
  - `masterWeights`: `{ POLY: 2 }`

### Q8. 你使用 AI 最频繁的场景是：

- A. 工作 / 学习产出
  - `dimensions`: `dependency:+1, control:+1`
  - `tags`: `[CITE]`
  - `masterWeights`: `{ PAPER: 2, CTRL: 1 }`
- B. 情感倾诉 / 深夜陪伴
  - `dimensions`: `emotion:+2, dependency:+2`
  - `masterWeights`: `{ VOID: 2 }`
- C. 社交代劳（回消息、写祝福）
  - `dimensions`: `social:+2`
  - `tags`: `[SHOW]`
  - `masterWeights`: `{ AGENT: 2 }`
- D. 整活 / 找乐子
  - `dimensions`: `entertainment:+2`
  - `tags`: `[SHOW]`
  - `masterWeights`: `{ LULZ: 2 }`

### Q9. 你更倾向于让 AI 扮演：

- A. 专业助手（不扮演，就是 AI）
  - `dimensions`: `immersion:-2, control:+1`
  - `masterWeights`: `{ CTRL: 1, PAPER: 1 }`
- B. 某个领域的专家
  - `dimensions`: `control:+1, dependency:+1`
  - `tags`: `[CITE]`
  - `masterWeights`: `{ PAPER: 1 }`
- C. 朋友 / 恋人 / 树洞
  - `dimensions`: `emotion:+2, immersion:+2`
  - `masterWeights`: `{ VOID: 2, CAST: 1 }`
- D. 任意角色（取决于我今天想玩什么）
  - `dimensions`: `entertainment:+2, immersion:+1`
  - `masterWeights`: `{ CAST: 2, LULZ: 1 }`

### Q10. 如果 AI 连续三次都没理解你的意思，你会：

- A. 放弃，自己干
  - `dimensions`: `control:-1, dependency:-1`
- B. 写一段更详细的提示词
  - `dimensions`: `control:+2`
  - `masterWeights`: `{ CTRL: 2 }`
- C. 换模型试试
  - `dimensions`: `multiModel:+2`
  - `tags`: `[CHECK]`
  - `masterWeights`: `{ POLY: 2 }`
- D. 骂它一句然后继续
  - `dimensions`: `emotion:+1`
  - `tags`: `[RAGE, SPAM]`
  - `masterWeights`: `{ CTRL: 1, VOID: 1 }`

### Q11. 你会保存或收藏自己觉得“写得很好”的 AI 回答吗？

- A. 经常，建了一个素材库
  - `dimensions`: `entertainment:+1, dependency:+1`
  - `tags`: `[SHOW]`
  - `masterWeights`: `{ CO: 1, LULZ: 1 }`
- B. 偶尔，觉得有用就存
  - `dimensions`: `dependency:+1`
- C. 很少，用完即走
  - `dimensions`: `dependency:-1`
- D. 从不，AI 写的有什么好存的
  - `dimensions`: `dependency:-2, control:-1`
  - `masterWeights`: `{ MONO: -1 }`

### Q12. 你更常对 AI 说：

- A. “谢谢”
  - `dimensions`: `expression:+1, emotion:+1`
  - `tags`: `[FAKE]`
- B. “不对”
  - `dimensions`: `control:+2`
  - `tags`: `[TROLL]`
  - `masterWeights`: `{ CTRL: 2, JURY: 1 }`
- C. “继续”
  - `dimensions`: `control:+1, urgency:+1`
  - `tags`: `[SPAM]`
  - `masterWeights`: `{ CTRL: 1 }`
- D. “哈哈”
  - `dimensions`: `entertainment:+1, emotion:+1`
  - `masterWeights`: `{ LULZ: 1, CO: 1 }`

### Q13. 你让 AI 帮你回复消息时，你会：

- A. 直接复制发送
  - `dimensions`: `social:+2`
  - `tags`: `[LAZY, SHOW]`
  - `masterWeights`: `{ AGENT: 2 }`
- B. 改一改，让它更像我说话
  - `dimensions`: `social:+1, control:+1`
  - `masterWeights`: `{ AGENT: 1 }`
- C. 只参考思路，自己重写
  - `dimensions`: `social:+1, control:+1, dependency:-1`
- D. 从不让 AI 代劳社交
  - `dimensions`: `social:-2`
  - `masterWeights`: `{ VOID: -1, MONO: -1 }`

### Q14. 当两个 AI 给出相反答案时，你：

- A. 选看起来更权威的
  - `dimensions`: `dependency:+1`
  - `tags`: `[CITE]`
  - `masterWeights`: `{ PAPER: 1 }`
- B. 自己判断哪个更合理
  - `dimensions`: `control:+1, dependency:-1`
- C. 让它们继续吵，我看戏
  - `dimensions`: `entertainment:+2`
  - `tags`: `[SHOW]`
  - `masterWeights`: `{ JURY: 2, LULZ: 1 }`
- D. 再问第三个 AI
  - `dimensions`: `multiModel:+2`
  - `tags`: `[CHECK]`
  - `masterWeights`: `{ POLY: 2 }`

### Q15. 你对 AI 犯错的态度是：

- A. 理解，AI 也会犯错
  - `dimensions`: `emotion:+1, control:-1`
- B. 纠正它，教它怎么改
  - `dimensions`: `control:+2`
  - `masterWeights`: `{ CTRL: 2 }`
- C. 截图发出去嘲笑
  - `dimensions`: `entertainment:+2`
  - `tags`: `[SHOW]`
  - `masterWeights`: `{ LULZ: 2 }`
- D. 立刻换一个 AI 问
  - `dimensions`: `multiModel:+2`
  - `tags`: `[CHECK]`
  - `masterWeights`: `{ POLY: 2 }`

### Q16. 你使用 AI 的频率最接近：

- A. 每天多次，离不开
  - `dimensions`: `dependency:+2`
  - `masterWeights`: `{ VOID: 1, CTRL: 1 }`
- B. 每天一次，有需求才用
  - `dimensions`: `dependency:+1`
- C. 每周几次，想起来才用
  - `dimensions`: `dependency:-1`
- D. 很少用，还是信自己
  - `dimensions`: `dependency:-2, control:-1`
  - `masterWeights`: `{ MONO: -1 }`

### Q17. 你给 AI 的提示词通常：

- A. 很长，很详细，有背景设定
  - `dimensions`: `control:+2, immersion:+1`
  - `masterWeights`: `{ CAST: 2, CTRL: 1 }`
- B. 中等长度，说清楚需求
  - `dimensions`: `control:+1`
- C. 很短，一句话
  - `dimensions`: `control:-1, urgency:+1`
  - `tags`: `[SPAM, LAZY]`
  - `masterWeights`: `{ DUMP: 2 }`
- D. 没有固定风格，看心情
  - `dimensions`: `entertainment:+1`
  - `masterWeights`: `{ LULZ: 1, CO: 1 }`

### Q18. 如果 AI 突然不能用了，你：

- A. 立刻找替代方案
  - `dimensions`: `multiModel:+2, dependency:+1`
  - `tags`: `[CHECK]`
  - `masterWeights`: `{ POLY: 2 }`
- B. 等它恢复
  - `dimensions`: `dependency:+1, emotion:+1`
  - `masterWeights`: `{ MONO: 1, VOID: 1 }`
- C. 算了，自己干
  - `dimensions`: `dependency:-1, control:-1`
- D. 去社交媒体吐槽
  - `dimensions`: `entertainment:+1`
  - `tags`: `[SHOW, RAGE]`
  - `masterWeights`: `{ LULZ: 1 }`

### Q19. 你会因为 AI 的某个回答而感动或生气吗？

- A. 经常，把它当人了
  - `dimensions`: `emotion:+2, dependency:+2`
  - `masterWeights`: `{ VOID: 2, CAST: 1 }`
- B. 偶尔，取决于回答质量
  - `dimensions`: `emotion:+1`
- C. 很少，它只是工具
  - `dimensions`: `emotion:-2, immersion:-1`
  - `masterWeights`: `{ CTRL: 1, PAPER: 1 }`
- D. 从不，我只看结果对不对
  - `dimensions`: `emotion:-2, control:+1`
  - `masterWeights`: `{ CTRL: 2, DUMP: 1 }`

### Q20. 描述一下你和 AI 的关系，最接近：

- A. 老板和员工
  - `dimensions`: `control:+2, emotion:-2`
  - `masterWeights`: `{ CTRL: 3 }`
- B. 朋友 / 恋人
  - `dimensions`: `emotion:+2, control:-1`
  - `masterWeights`: `{ VOID: 2, CAST: 1 }`
- C. 工具和使用者
  - `dimensions`: `control:+1, emotion:-2`
  - `masterWeights`: `{ PAPER: 1, DUMP: 1 }`
- D. 玩具和玩家
  - `dimensions`: `entertainment:+2, control:-1`
  - `masterWeights`: `{ LULZ: 2, CO: 1 }`

---

## 4. 主人格计算

### 4.1 计算原则

主人格不是简单累加得分，而是三步：

1. 累加全部题目的原始维度分
2. 将 `control` 与 `emotion` 归一化到 `0~1`
3. 将用户点位和主人格坐标做距离比较，再叠加 `masterWeights`

### 4.2 参考实现

```py
from math import sqrt

DIM_KEYS = [
    'control', 'emotion', 'dependency', 'social',
    'entertainment', 'immersion', 'multiModel',
    'urgency', 'expression'
]


def normalize_dimension(raw: int) -> float:
    return max(0.0, min(1.0, (raw + 40) / 80))


def calculate_master(answers, master_personalities):
    dimensions = {k: 0 for k in DIM_KEYS}
    master_scores = {m['code']: 0 for m in master_personalities}

    for ans in answers:
        option = ans['option']

        for key, value in option['dimensions'].items():
            dimensions[key] += value

        for code, weight in option.get('masterWeights', {}).items():
            master_scores[code] += weight

    user_point = [
        normalize_dimension(dimensions['control']),
        normalize_dimension(dimensions['emotion']),
    ]

    best_master = None
    best_score = float('-inf')

    for master in master_personalities:
        mx, my = master['dimension']
        distance = sqrt((user_point[0] - mx) ** 2 + (user_point[1] - my) ** 2)
        total_score = master_scores[master['code']] - distance * 5

        if total_score > best_score:
            best_score = total_score
            best_master = master

    return {
        'master': best_master,
        'dimensions': dimensions,
        'userPoint': user_point,
        'masterScores': master_scores,
    }
```

备注：

- 这里修正了早期伪代码中“用距离变量比较总分”的错误
- 当前版本以 `best_score` 作为最终选择依据

---

## 5. 副标签计算

### 5.1 计算原则

副标签使用“触发次数 × 标签权重”累计，避免轻度触发就抢占结果页。

### 5.2 参考实现

```py
def calculate_tags(answers, sub_tags):
    tag_weight_map = {t['code']: t['weight'] for t in sub_tags}
    tag_scores = {t['code']: 0 for t in sub_tags}

    for ans in answers:
        for tag in ans['option'].get('tags', []):
            tag_scores[tag] += tag_weight_map.get(tag, 1)

    sorted_tags = sorted(tag_scores.items(), key=lambda item: item[1], reverse=True)

    result = []
    for code, score in sorted_tags:
        if score >= 2.0:
            result.append(code)
        if len(result) == 2:
            break

    return result
```

---

## 6. 彩蛋检测

### 6.1 触发原则

彩蛋人格只做隐藏角标，不覆盖主人格。

### 6.2 参考实现

```py
import random


def check_easter_egg(answers, dimensions, master_code):
    normalized_multi = normalize_dimension(dimensions['multiModel'])
    normalized_emotion = normalize_dimension(dimensions['emotion'])

    patient_count = sum(
        1 for ans in answers if ans['option']['dimensions'].get('urgency', 0) < 0
    )
    if patient_count >= 5 and random.random() < 0.30:
        return 'MARTYR'

    if normalized_multi > 0.80 and normalized_emotion > 0.80:
        if random.random() < 0.25:
            return 'CULT'

    troll_check = sum(
        1
        for ans in answers
        if 'TROLL' in ans['option'].get('tags', [])
        or 'CHECK' in ans['option'].get('tags', [])
    )
    if master_code == 'JURY' and troll_check >= 7 and random.random() < 0.40:
        return 'TURING'

    return None
```

---

## 7. 输出结果建议

### 7.1 评估函数最终返回

```ts
interface MbaiEvaluationResult {
  master: string;
  subTags: string[];
  easterEgg?: string;
  dimensions: Record<string, number>;
  userPoint: [number, number];
}
```

### 7.2 接口建议

- 请求：20 个选项 ID 数组
- 响应：主人格、两枚副标签、可选彩蛋、归一化坐标点

如果采用纯前端实现，也建议保留相同数据结构，避免后续迁移困难。
